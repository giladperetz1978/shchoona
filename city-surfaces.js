import * as T from "./vendor/three.module.min.js";

export function createSurfaces(renderer) {
  const textures = [], materials = new Map();
  let seed = 71;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  function texture(kind, x, y) {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#aaa"; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 14000; i++) {
      const v = Math.floor(125 + random() * 100);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(random() * 256, random() * 256, kind === "wood" ? 1 : 2, kind === "wood" ? 12 : 2);
    }
    if (kind === "brick" || kind === "paving") {
      const row = kind === "brick" ? 32 : 64;
      ctx.strokeStyle = "#666"; ctx.lineWidth = 2;
      for (let y = 0; y <= 256; y += row) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
        for (let x = -64; x < 256; x += 64) {
          const offset = y / row % 2 * 32;
          ctx.beginPath(); ctx.moveTo(x + offset, y); ctx.lineTo(x + offset, y + row); ctx.stroke();
        }
      }
    }
    if (kind === "wood") for (let x = 0; x < 256; x += 64) {
      ctx.fillStyle = "#777"; ctx.fillRect(x, 0, 2, 256);
    }
    const map = new T.CanvasTexture(canvas);
    map.wrapS = map.wrapT = T.RepeatWrapping; map.repeat.set(x, y);
    map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    textures.push(map); return map;
  }
  const sky = document.createElement("canvas"); sky.width = 512; sky.height = 256;
  const ctx = sky.getContext("2d"), gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, "#4f83b4"); gradient.addColorStop(.42, "#bcd8e5");
  gradient.addColorStop(.52, "#ffe1b0"); gradient.addColorStop(.65, "#9b917e"); gradient.addColorStop(1, "#4c5660");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 512, 256);
  const glow = ctx.createRadialGradient(360, 90, 2, 360, 90, 55);
  glow.addColorStop(0, "#fff5da"); glow.addColorStop(.1, "#fff1cacc"); glow.addColorStop(1, "#fff1ca00");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 512, 256);
  const panorama = new T.CanvasTexture(sky);
  panorama.colorSpace = T.SRGBColorSpace; panorama.mapping = T.EquirectangularReflectionMapping;
  textures.push(panorama);
  const pmrem = new T.PMREMGenerator(renderer), environment = pmrem.fromEquirectangular(panorama);
  pmrem.dispose();
  return {
    sky: panorama, environment: environment.texture,
    material(kind, color, x = 1, y = 1) {
      const key = `${kind}:${color}:${x}:${y}`;
      if (!materials.has(key)) {
        const map = kind === "glass" ? null : texture(kind, x, y);
        materials.set(key, new T.MeshStandardMaterial({
          color, map, bumpMap: map, bumpScale: kind === "brick" ? .08 : .025,
          roughness: kind === "glass" ? .16 : kind === "wood" ? .67 : .91,
          metalness: kind === "glass" ? .55 : .02, envMapIntensity: kind === "glass" ? 1.4 : .35
        }));
      }
      return materials.get(key);
    },
    dispose() { materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); environment.dispose(); }
  };
}
