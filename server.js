import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/courier-scene.js", ["courier-scene.js", "text/javascript; charset=utf-8"]],
  ["/courier-world.js", ["courier-world.js", "text/javascript; charset=utf-8"]],
  ["/vendor/three.module.min.js", ["node_modules/three/build/three.module.min.js", "text/javascript; charset=utf-8"]],
  ["/vendor/three-LICENSE.txt", ["node_modules/three/LICENSE", "text/plain; charset=utf-8"]],
  ["/engine.js", ["engine.js", "text/javascript; charset=utf-8"]],
  ["/characters.js", ["characters.js", "text/javascript; charset=utf-8"]],
  ["/art.js", ["art.js", "text/javascript; charset=utf-8"]]
]);
const port = Number(process.env.PORT || 4173);
const server = createServer(async (req, res) => {
  const item = files.get(new URL(req.url, "http://localhost").pathname);
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
server.listen(port, "127.0.0.1", () => console.log(`Game ready at http://127.0.0.1:${port}`));
