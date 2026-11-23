import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRoomStore } from "./room-store.js";
import { COFFEE_RECIPES } from "./characters.js";

async function pair(options) {
  const store = createRoomStore(options);
  const a = (await store.write("create", null, null, { difficulty: "relaxed" })).credentials;
  const b = (await store.write("join", null, null, { code: a.room })).credentials;
  const read = who => store.read(who.room, who.token);
  const command = async (who, kind, id = "") => {
    const snapshot = await read(who);
    return store.write("command", who.room, who.token, { requestId: randomUUID(), version: snapshot.state.online.version, kind, id });
  };
  return { store, a, b, read, command };
}

test("rooms authenticate each seat, wait for a peer, isolate rooms and hide credentials", async () => {
  const store = createRoomStore();
  const created = await store.write("create", null, null, { difficulty: "relaxed" });
  const a = created.credentials;
  await assert.rejects(store.write("command", a.room, a.token, { requestId: randomUUID(), version: 0, kind: "travel", id: "cafe" }), /ממתינים/);
  await assert.rejects(store.read(a.room, "0".repeat(64)), /לא נמצאו/);
  await store.write("join", null, null, { code: a.room });
  await assert.rejects(store.write("join", null, null, { code: a.room }), /מלא/);
  const other = (await store.write("create", null, null, { difficulty: "relaxed" })).credentials;
  await assert.rejects(store.read(other.room, a.token), /לא נמצאו/);
  const view = await store.read(a.room, a.token);
  assert.doesNotMatch(JSON.stringify(view), /digest|token|credentials/);
  assert.equal(view.state.online.waiting, false);
});

test("authoritative commands ignore supplied balances, reject stale versions and pay once", async () => {
  const { store, a, b, read, command } = await pair();
  await command(a, "travel", "cafe");
  await command(a, "action", "apply-cafe");
  const before = await read(a);
  const input = { kind: "action", id: "work", requestId: randomUUID(), version: before.state.online.version,
    state: { cash: 999999, won: true } };
  const result = await store.write("command", a.room, a.token, input);
  assert.equal(result.state.cash, before.state.cash + 270);
  const duplicate = await store.write("command", a.room, a.token, input);
  assert.equal(duplicate.state.cash, result.state.cash);
  assert.equal(duplicate.state.hours, result.state.hours);
  await assert.rejects(store.write("command", a.room, a.token, { ...input, id: "friends" }), /מזהה/);
  await assert.rejects(store.write("command", a.room, a.token, { ...input, requestId: randomUUID() }), /המצב השתנה/);
  const peer = await read(b);
  assert.equal(peer.state.opponent.cash, result.state.cash);
  assert.equal(peer.state.rivalReplay.at(-1).id, "work");
  assert.equal(peer.state.experience, 0);
  await assert.rejects(command(a, "action", "gig"), /המקומי בלבד/);
});

test("weekly barrier settles both players once with the same news and survives restart", async () => {
  let saved;
  const { a, b, read, command } = await pair({ random: () => .25, save: async rooms => { saved = structuredClone(rooms); } });
  const waiting = await command(a, "end");
  assert.equal(waiting.state.week, 1);
  assert.equal(waiting.state.online.ready, true);
  assert.equal(waiting.report, null);
  await assert.rejects(command(a, "action", "rest"), /מחכים/);
  const second = await command(b, "end");
  const first = await read(a);
  assert.equal(first.state.week, 2);
  assert.equal(second.state.week, 2);
  assert.equal(first.state.cash, 1040);
  assert.equal(first.state.experience, 0);
  assert.deepEqual(first.state.news, second.state.news);
  assert.equal(first.state.news[0].id, "refund");
  const restored = createRoomStore({ initial: saved });
  const reconnect = await restored.read(a.room, a.token);
  assert.equal(reconnect.state.cash, first.state.cash);
  assert.deepEqual(reconnect.state.news, first.state.news);
  assert.equal(reconnect.state.online.ready, false);
});

test("failed durable writes roll back commands and queued readers cannot see uncommitted state", async () => {
  let fail = false, release, writing;
  const began = new Promise(resolve => { writing = resolve; });
  const { store, a, read } = await pair({ save: async () => {
    if (fail) { writing(); await new Promise(resolve => { release = resolve; }); throw new Error("disk full"); }
  } });
  const before = await read(a);
  fail = true;
  const mutation = store.write("command", a.room, a.token, {
    requestId: randomUUID(), version: before.state.online.version, kind: "travel", id: "cafe"
  });
  await began;
  let observed = false;
  const reader = read(a).then(result => { observed = true; return result; });
  await Promise.resolve(); assert.equal(observed, false);
  const rejection = assert.rejects(mutation, /disk full/);
  release(); await rejection;
  assert.deepEqual((await reader).state, before.state);
});

test("simultaneous settlement can tie and a finished room rejects further economic commands", async () => {
  let saved;
  const { a, b } = await pair({ save: async rooms => { saved = structuredClone(rooms); } });
  for (const p of saved[0].players) Object.assign(p.state, { cash: 7000, happiness: 74, education: 3, experience: 36, job: "tech" });
  const store = createRoomStore({ initial: saved, random: () => .5 });
  for (const who of [a, b]) await store.write("command", who.room, who.token, { requestId: randomUUID(), version: 0, kind: "end", id: "" });
  const result = await store.read(a.room, a.token);
  assert.equal(result.state.online.tie, true);
  assert.equal(result.state.won, true);
  assert.equal(result.state.opponent.won, true);
  await assert.rejects(store.write("command", a.room, a.token, { requestId: randomUUID(), version: result.state.online.version, kind: "action", id: "rest" }), /הסתיים/);
});

test("room authentication and joining expire at the 24-hour boundary", async () => {
  let now = 100000;
  const store = createRoomStore({ now: () => now });
  const { credentials } = await store.write("create", null, null, { difficulty: "relaxed" });
  now += 86400000;
  await assert.rejects(store.read(credentials.room, credentials.token), error => error.status === 410);
  await assert.rejects(store.write("join", null, null, { code: credentials.room }), error => error.status === 410);
});

test("active coffee survives reconnect, blocks settlement and exposes serving feedback without double pay", async () => {
  let saved;
  const { a, b, read, command } = await pair({ save: async rooms => { saved = structuredClone(rooms); } });
  await command(a, "travel", "cafe");
  await command(a, "action", "apply-cafe");
  const started = await command(a, "action", "coffee-start");
  await assert.rejects(command(a, "end"), /מגישים/);
  assert.deepEqual((await read(b)).state.opponent.cafeOrder, started.state.cafeOrder);
  const store = createRoomStore({ initial: saved });
  let current = await store.read(a.room, a.token);
  const order = current.state.cafeOrder;
  for (const ingredient of COFFEE_RECIPES[order.recipe].order) {
    current = await store.write("command", a.room, a.token, { requestId: randomUUID(), version: current.state.online.version, kind: "mix", id: ingredient });
  }
  const input = { requestId: randomUUID(), version: current.state.online.version, kind: "serve", id: "" };
  const served = await store.write("command", a.room, a.token, input);
  assert.equal(served.state.cash, started.state.cash + 165);
  assert.equal(served.coffeeResult.correct, true);
  const retry = await store.write("command", a.room, a.token, input);
  assert.deepEqual(retry.coffeeResult, served.coffeeResult);
  assert.equal(retry.state.cash, served.state.cash);
});
