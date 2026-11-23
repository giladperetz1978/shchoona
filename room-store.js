import { createHash, randomBytes } from "node:crypto";
import { createGame, parseSave, perform, travel, mixCoffee, serveCoffee, endWeek, career } from "./engine.js";

export class RoomError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const digest = token => createHash("sha256").update(token).digest("hex");
const requireValue = (condition, message, status) => { if (!condition) throw new RoomError(message, status); };
const event = (kind, id, message, state) => ({
  kind, id, message, location: state.location, week: state.week, hours: state.hours, cash: state.cash,
  energy: state.energy, food: state.food, happiness: state.happiness, education: state.education, career: career(state)
});

export function createRoomStore({ initial = [], save = async () => {}, random = Math.random, now = Date.now } = {}) {
  let rooms = new Map(), queue = Promise.resolve();
  for (const room of initial) {
    requireValue(room && /^[A-F0-9]{6}$/.test(room.id) && Array.isArray(room.players) &&
      room.players.length >= 1 && room.players.length <= 2 && Number.isSafeInteger(room.revision) &&
      Number.isFinite(room.created) && Array.isArray(room.winners), "קובץ חדרי הרשת פגום.");
    for (const player of room.players) {
      requireValue(/^[a-f0-9]{64}$/.test(player.digest) && Number.isSafeInteger(player.version) &&
        typeof player.ready === "boolean" && Array.isArray(player.requests) && player.requests.length <= 20 &&
        Array.isArray(player.history) && player.history.length <= 80, "שמירת שחקן הרשת פגומה.");
      player.state = parseSave(JSON.stringify(player.state));
      requireValue(!player.state.rival && !player.state.courier, "מצב רשת לא נתמך בשמירה.");
      player.seen = 0;
    }
    rooms.set(room.id, room);
  }
  function identify(code, token) {
    requireValue(typeof token === "string" && /^[a-f0-9]{64}$/.test(token), "חיבור החדר אינו תקף.", 401);
    const room = rooms.get(code);
    const seat = room?.players.findIndex(p => p.digest === digest(token)) ?? -1;
    requireValue(seat >= 0, "החדר או החיבור לא נמצאו.", 404);
    requireValue(now() - room.created < 86400000, "תוקף החדר הסתיים. צרו חדר חדש.", 410);
    return { room, seat, player: room.players[seat] };
  }
  function snapshot(room, seat) {
    const own = room.players[seat], peer = room.players[1 - seat];
    const state = structuredClone(own.state);
    state.rival = Boolean(peer); state.opponent = peer ? structuredClone(peer.state) : null;
    state.rivalReplay = peer ? structuredClone(peer.history) : [];
    state.online = {
      room: room.id, seat, revision: room.revision, version: own.version,
      waiting: !peer, ready: own.ready, peerReady: Boolean(peer?.ready),
      peerConnected: Boolean(peer && now() - peer.seen < 15000),
      finished: room.winners.length > 0, tie: room.winners.length === 2
    };
    return { state, report: own.report || null };
  }
  function player(token, difficulty) {
    const state = createGame(difficulty);
    return { digest: digest(token), state, version: 0, ready: false, seen: now(), requests: [],
      report: null, history: [event("start", "", "הצטרף לחדר", state)] };
  }
  function apply(room, seat, input) {
    const p = room.players[seat];
    requireValue(input && typeof input.requestId === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(input.requestId), "מזהה פקודה לא תקין.");
    const fingerprint = JSON.stringify([input.kind, input.id, input.version]);
    const prior = p.requests.find(item => item.id === input.requestId);
    if (prior) {
      requireValue(prior.fingerprint === fingerprint, "מזהה הפקודה כבר שימש לפקודה אחרת.", 409);
      return prior.result;
    }
    requireValue(room.players.length === 2, "ממתינים לשחקן השני לפני תחילת המרוץ.", 409);
    requireValue(!room.winners.length, "המרוץ הסתיים.", 409);
    requireValue(input.version === p.version, "המצב השתנה. החיבור יתעדכן; נסו שוב.", 409);
    requireValue(!p.ready, "סיימת את השבוע. מחכים ליריב.", 409);
    requireValue(typeof input.id === "string" && input.id.length <= 40, "פקודה לא תקינה.");
    let result;
    if (input.kind === "end") {
      requireValue(!p.state.cafeOrder, "קודם מגישים את ההזמנה בבית הקפה.");
      p.ready = true;
      result = { message: "סיימת את השבוע. ממתינים ליריב.", report: null };
      if (room.players.every(other => other.ready)) {
        const rolls = [random(), random()];
        room.players.forEach(other => {
          let index = 0;
          const settled = endWeek(other.state, () => rolls[index++]);
          requireValue(!settled.error, settled.error || "לא ניתן לסכם את השבוע.");
          other.state = settled.state; other.report = settled.report; other.ready = false; other.version++;
          other.history.push(event("settle", "", settled.message, other.state));
          other.history = other.history.slice(-80);
        });
        result = { message: "שבוע חדש התחיל לשני השחקנים.", report: p.report };
      }
    } else {
      requireValue(!(input.kind === "action" && input.id === "gig"), "משלוחי הרכיבה זמינים כרגע במשחק המקומי בלבד.");
      if (input.kind === "travel") result = travel(p.state, input.id);
      else if (input.kind === "action") result = perform(p.state, input.id, now());
      else if (input.kind === "mix") result = mixCoffee(p.state, input.id);
      else if (input.kind === "serve") result = serveCoffee(p.state);
      else throw new RoomError("סוג פקודה לא מוכר.");
      requireValue(!result.error, result.error || "הפעולה נדחתה.");
      p.state = result.state;
      const id = input.kind === "mix" ? `mix-${input.id}` : input.kind === "serve" ? "serve-coffee" : input.id;
      p.history.push(event(input.kind === "travel" ? "travel" : "action", id, result.message, p.state));
      p.history = p.history.slice(-80);
      result = { message: result.message, ...(result.coffeeResult ? { coffeeResult: result.coffeeResult } : {}) };
    }
    p.version++; room.revision++;
    room.winners = room.players.flatMap((other, index) => other.state.won ? [index] : []);
    p.requests.push({ id: input.requestId, fingerprint, result }); p.requests = p.requests.slice(-20);
    return result;
  }
  return {
    async read(code, token) {
      await queue;
      const { room, seat, player } = identify(code, token);
      player.seen = now();
      return snapshot(room, seat);
    },
    write(operation, code, token, input = {}) {
      const job = queue.then(async () => {
        const before = structuredClone(rooms);
        try {
          let room, seat, extra = {};
          if (operation === "create") {
            for (const [id, old] of rooms) if (now() - old.created > 86400000) rooms.delete(id);
            requireValue(rooms.size < 100, "השרת מלא כרגע. נסו מאוחר יותר.", 503);
            requireValue(["relaxed", "classic"].includes(input.difficulty), "מסלול לא תקין.");
            let id;
            do { id = randomBytes(3).toString("hex").toUpperCase(); } while (rooms.has(id));
            token = randomBytes(32).toString("hex");
            room = { id, created: now(), revision: 0, winners: [], players: [player(token, input.difficulty)] };
            rooms.set(id, room); seat = 0; extra.credentials = { room: id, token };
          } else if (operation === "join") {
            requireValue(typeof input.code === "string" && /^[A-F0-9]{6}$/.test(input.code), "קוד חדר כולל שש אותיות או ספרות.");
            room = rooms.get(input.code);
            requireValue(room, "החדר לא נמצא.", 404);
            requireValue(now() - room.created < 86400000, "תוקף החדר הסתיים. צרו חדר חדש.", 410);
            requireValue(room.players.length === 1, "החדר כבר מלא.", 409);
            token = randomBytes(32).toString("hex"); seat = 1;
            room.players.push(player(token, room.players[0].state.difficulty)); room.revision++;
            extra.credentials = { room: room.id, token };
          } else {
            ({ room, seat } = identify(code, token));
            extra = apply(room, seat, input);
          }
          await save([...rooms.values()]);
          return { ...snapshot(room, seat), ...extra };
        } catch (error) { rooms = before; throw error; }
      });
      queue = job.then(() => undefined, () => undefined);
      return job;
    }
  };
}
