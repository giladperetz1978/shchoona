import { createServer } from "node:http";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createRoomStore, RoomError } from "./room-store.js";

const files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/city.css", ["city.css", "text/css; charset=utf-8"]],
  ["/city-world.js", ["city-world.js", "text/javascript; charset=utf-8"]],
  ["/city-layout.js", ["city-layout.js", "text/javascript; charset=utf-8"]],
  ["/city-interface.js", ["city-interface.js", "text/javascript; charset=utf-8"]],
  ["/city-activities.js", ["city-activities.js", "text/javascript; charset=utf-8"]],
  ["/city-surfaces.js", ["city-surfaces.js", "text/javascript; charset=utf-8"]],
  ["/city-news.js", ["city-news.js", "text/javascript; charset=utf-8"]],
  ["/online-client.js", ["online-client.js", "text/javascript; charset=utf-8"]],
  ["/courier-scene.js", ["courier-scene.js", "text/javascript; charset=utf-8"]],
  ["/courier-world.js", ["courier-world.js", "text/javascript; charset=utf-8"]],
  ["/vendor/three.module.min.js", ["node_modules/three/build/three.module.min.js", "text/javascript; charset=utf-8"]],
  ["/vendor/three-LICENSE.txt", ["node_modules/three/LICENSE", "text/plain; charset=utf-8"]],
  ["/engine.js", ["engine.js", "text/javascript; charset=utf-8"]],
  ["/characters.js", ["characters.js", "text/javascript; charset=utf-8"]],
  ["/creatures.js", ["creatures.js", "text/javascript; charset=utf-8"]],
  ["/creature-model.js", ["creature-model.js", "text/javascript; charset=utf-8"]],
  ["/art.js", ["art.js", "text/javascript; charset=utf-8"]]
]);
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const directory = new URL("./server-data/", import.meta.url);
await mkdir(directory, { recursive: true });
let initial = [];
try { initial = JSON.parse(await readFile(new URL("rooms.json", directory), "utf8")); }
catch (error) { if (error.code !== "ENOENT") throw error; }
if (!Array.isArray(initial)) throw new Error("Invalid room store");
const rooms = createRoomStore({ initial, save: async data => {
  await writeFile(new URL("rooms.tmp", directory), JSON.stringify(data), { mode: 0o600 });
  await rename(new URL("rooms.tmp", directory), new URL("rooms.json", directory));
} });
const limits = new Map();
function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(body));
}
async function api(req, res, path) {
  try {
    if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host)
      throw new RoomError("גישה ממקור אחר אינה מורשית.", 403);
    const time = Date.now(), address = req.socket.remoteAddress;
    for (const [ip, value] of limits) if (time - value.start > 60000) limits.delete(ip);
    const limit = limits.get(address) || { start: time, count: 0, rooms: 0 };
    limit.count++; limits.set(address, limit);
    if (limit.count > 300 || limits.size > 1000) throw new RoomError("יותר מדי בקשות. נסו שוב בעוד דקה.", 429);
    const match = /^\/api\/rooms\/([A-F0-9]{6})(\/commands)?$/.exec(path);
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    if (req.method === "GET" && match && !match[2]) { json(res, 200, await rooms.read(match[1], token)); return; }
    if (req.method !== "POST") throw new RoomError("נתיב רשת לא נמצא.", 404);
    if (!req.headers["content-type"]?.startsWith("application/json")) throw new RoomError("נדרש JSON.", 415);
    let size = 0, body = "";
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 2048) throw new RoomError("הבקשה גדולה מדי.", 413);
      body += chunk.toString("utf8");
    }
    let data;
    try { data = JSON.parse(body); } catch { throw new RoomError("JSON לא תקין."); }
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new RoomError("בקשה לא תקינה.");
    if (path === "/api/rooms" || path === "/api/rooms/join") {
      if (++limit.rooms > 12) throw new RoomError("יותר מדי בקשות לחדרים. נסו שוב בעוד דקה.", 429);
      json(res, 200, await rooms.write(path.endsWith("/join") ? "join" : "create", null, null, data));
    } else if (match?.[2]) json(res, 200, await rooms.write("command", match[1], token, data));
    else throw new RoomError("נתיב רשת לא נמצא.", 404);
  } catch (error) {
    if (!(error instanceof RoomError)) console.error("Room request failed:", error);
    json(res, error instanceof RoomError ? error.status : 500,
      { error: error instanceof RoomError ? error.message : "שגיאת שרת. הפעולה לא אושרה; התחברו מחדש לפני ניסיון נוסף." });
  }
}
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (path.startsWith("/api/")) { await api(req, res, path); return; }
  const item = files.get(path);
  if (!item) { res.writeHead(404); res.end("Not found"); return; }
  try {
    const content = await readFile(fileURLToPath(new URL(item[0], import.meta.url)));
    res.writeHead(200, { "Content-Type": item[1], "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" });
    res.end(content);
  } catch (error) {
    console.error("Failed to serve file:", error);
    res.writeHead(500); res.end("Unable to read application file");
  }
});
server.on("error", error => { console.error(error.message); process.exitCode = 1; });
server.requestTimeout = 15000;
server.listen(port, host, () => console.log(`Game ready at http://${host}:${port}`));
