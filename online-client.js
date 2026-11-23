export function createOnlineClient({ update, notify }) {
  let credentials = null, current = null, timer, active = false, busy = false, connected = false, generation = 0;
  const key = "neighborhood-room-v1";
  try {
    const stored = sessionStorage.getItem(key);
    if (stored) {
      const value = JSON.parse(stored);
      if (!/^[A-F0-9]{6}$/.test(value.room) || !/^[a-f0-9]{64}$/.test(value.token)) throw new Error("חיבור שמור אינו תקין.");
      credentials = value;
    }
  } catch (error) { console.error("Room session unavailable:", error); notify(error.message, true); }
  async function request(path, body) {
    const response = await fetch(path, {
      method: body ? "POST" : "GET", cache: "no-store", signal: AbortSignal.timeout(8000),
      headers: { "Content-Type": "application/json", ...(credentials ? { Authorization: `Bearer ${credentials.token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (!response.headers.get("Content-Type")?.includes("application/json"))
      throw new Error("משחק רשת דורש את שרת Node של המשחק; GitHub Pages לבדו אינו מספיק.");
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error || `שגיאת שרת ${response.status}`); error.status = response.status; throw error;
    }
    return result;
  }
  function receive(result, emit) {
    if (!current || result.state.online.revision >= current.state.online.revision) {
      current = result; if (emit) update(result);
    }
  }
  function schedule() {
    clearTimeout(timer);
    const version = generation;
    timer = setTimeout(async () => {
      try {
        const result = await request(`/api/rooms/${credentials.room}`);
        if (!active || version !== generation) return;
        const recovered = !connected; connected = true; receive(result, true);
        if (recovered) notify("החיבור לחדר חזר.");
      } catch (error) {
        if (!active || version !== generation) return;
        if (connected) notify(`החיבור נעצר. הפקודות מושהות עד לחיבור מחדש. ${error.message}`, true);
        connected = false;
      } finally { if (active && version === generation) schedule(); }
    }, 1000);
  }
  return {
    get active() { return active; }, get busy() { return busy; },
    get connected() { return connected; }, get resumable() { return Boolean(credentials); },
    get restore() { return credentials?.resume === true; },
    async connect(mode, data = {}) {
      if (busy) throw new Error("בקשת חיבור כבר מתבצעת.");
      busy = true;
      try {
        if (mode === "resume" && !credentials) throw new Error("אין חיבור שמור בלשונית הזאת.");
        const result = mode === "resume" ? await request(`/api/rooms/${credentials.room}`) :
          await request(mode === "create" ? "/api/rooms" : "/api/rooms/join", data);
        if (result.credentials) credentials = result.credentials;
        credentials.resume = true;
        try { sessionStorage.setItem(key, JSON.stringify(credentials)); }
        catch (error) { console.error("Cannot save room session:", error); notify("לא ניתן לשמור את החיבור. רענון עלול לנתק אותך מהחדר.", true); }
        active = connected = true; generation++; current = null;
        receive(result, false); schedule(); return result;
      } finally { busy = false; }
    },
    async command(kind, id = "") {
      if (!active || !connected) throw new Error("אין חיבור פעיל לשרת המשחק.");
      if (busy) throw new Error("ממתינים לאישור הפעולה הקודמת.");
      busy = true;
      try {
        const result = await request(`/api/rooms/${credentials.room}/commands`, {
          requestId: Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join(""),
          version: current.state.online.version, kind, id
        });
        receive(result, false);
        return { ...result, state: current.state };
      } catch (error) {
        if (!error.status || error.status >= 500) {
          connected = false;
          throw new Error(`לא התקבל אישור לפעולה. יש לבדוק את המצב אחרי חזרת החיבור לפני ניסיון נוסף. ${error.message}`, { cause: error });
        }
        throw error;
      } finally { busy = false; }
    },
    stop() {
      active = false; connected = false; generation++; clearTimeout(timer); current = null;
      if (credentials) {
        credentials.resume = false;
        try { sessionStorage.setItem(key, JSON.stringify(credentials)); }
        catch (error) { console.error("Cannot update room session:", error); notify("לא ניתן לשמור את היציאה מהחדר.", true); }
      }
    }
  };
}
