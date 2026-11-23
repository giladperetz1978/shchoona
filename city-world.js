import * as T from "./vendor/three.module.min.js";
import { PLACES } from "./engine.js";
import { CHARACTERS } from "./characters.js";
import { CITY_SITES, canWalk, walkingRoute } from "./city-layout.js";
import { activityFor, activityStage } from "./city-activities.js";
import { createCreatureFactory } from "./creature-model.js";
import { CROWD_CREATURES, PLAYER_CREATURE, RIVAL_CREATURE } from "./creatures.js";
import { createSurfaces } from "./city-surfaces.js";

export function buildCity(canvas, { onEnter, onExit, onTalk, onPrompt, onPosition, onError, onActivity, isPaused }) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  const scene = new T.Scene();
  const surfaces = createSurfaces(renderer);
  scene.background = surfaces.sky; scene.environment = surfaces.environment;
  scene.fog = new T.Fog("#c1d3da", 60, 155);
  const camera = new T.PerspectiveCamera(48, 1, .1, 220);
  const city = new T.Group(), room = new T.Group();
  scene.add(city, room);
  scene.add(new T.HemisphereLight("#d6e8ff", "#73604d", 1.35));
  const sun = new T.DirectionalLight("#ffe0b6", 3.1);
  sun.position.set(-28, 32, 23);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 38, bottom: -38, far: 120 });
  sun.shadow.bias = -.0005;
  scene.add(sun);
  const geometries = new Set(), materials = new Map(), textures = new Set();
  const box = new T.BoxGeometry();
  const sphere = new T.SphereGeometry(1, 14, 10);
  const cylinder = new T.CylinderGeometry(1, 1, 1, 12);
  const creatures = createCreatureFactory();
  geometries.add(box); geometries.add(sphere); geometries.add(cylinder);
  function material(color, glow = false) {
    const key = `${color}:${glow}`;
    if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({
      color, roughness: .72, metalness: .12,
      ...(glow ? { emissive: color, emissiveIntensity: .65 } : {})
    }));
    return materials.get(key);
  }
  function part(parent, color, x, y, z, w, h, d, geometry = box, glow = false) {
    const mesh = new T.Mesh(geometry, material(color, glow));
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
    mesh.castShadow = !glow; mesh.receiveShadow = true; parent.add(mesh);
    return mesh;
  }
  function sign(parent, text, x, y, z, width, color = "#abffda", rotate = false) {
    const label = document.createElement("canvas");
    label.width = 768; label.height = 144;
    const ctx = label.getContext("2d");
    ctx.fillStyle = "#101e32"; ctx.fillRect(0, 0, 768, 144);
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.strokeRect(5, 5, 758, 134);
    ctx.fillStyle = color; ctx.textAlign = "center"; ctx.direction = "rtl";
    ctx.font = "bold 64px Arial"; ctx.fillText(text, 384, 94, 720);
    const texture = new T.CanvasTexture(label); texture.colorSpace = T.SRGBColorSpace; textures.add(texture);
    const mat = new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide });
    materials.set(`sign-${materials.size}`, mat);
    const mesh = new T.Mesh(box, mat);
    mesh.position.set(x, y, z); mesh.scale.set(width, width * .1875, .08);
    if (rotate) mesh.rotation.y = Math.PI;
    parent.add(mesh);
  }
  function tree(parent, x, z, scale = 1) {
    part(parent, "#76513c", x, 1.4 * scale, z, .3, 2.8 * scale, .3, cylinder);
    part(parent, "#39796b", x, 3.5 * scale, z, 1.5 * scale, 1.9 * scale, 1.5 * scale, sphere);
    part(parent, "#69a488", x - .6, 4.1 * scale, z, 1.1 * scale, 1.2 * scale, 1.2 * scale, sphere);
  }
  function bench(parent, x, z) {
    part(parent, "#be8963", x, .65, z, 2.6, .18, .8).material = surfaces.material("wood", "#be8963", 2, 1);
    part(parent, "#be8963", x, 1.1, z + .35, 2.6, .8, .13).material = surfaces.material("wood", "#be8963", 2, 1);
    for (const dx of [-1, 1]) part(parent, "#243348", x + dx, .3, z, .12, .6, .65);
  }
  part(city, "#617d78", 0, -.5, 0, 180, .7, 150);
  part(city, "#25344b", 0, -.08, 0, 86, .15, 13).material = surfaces.material("asphalt", "#49545e", 36, 6);
  for (const side of [-1, 1]) {
    part(city, "#b4b7b9", 0, -.04, side * 9.4, 84, .24, 5.6).material = surfaces.material("paving", "#c3beb1", 28, 2);
    part(city, "#e0d9c8", 0, .02, side * 6.7, 84, .24, .25);
    for (let x = -39; x < 40; x += 3) part(city, "#d1ccc2", x, .09, side * 9.4, .035, .015, 5);
  }
  for (let x = -40; x < 40; x += 6) part(city, "#e5d7a4", x, .015, 0, 2.6, .02, .13);
  for (const x of [-35, -7, 21]) {
    for (let z = -5; z <= 5; z += 1.35) part(city, "#e6e5d8", x, .02, z, 3, .02, .65);
  }
  const doors = [], residents = [], roomCache = new Map(), buildings = [];
  CITY_SITES.forEach((site, i) => {
    const place = PLACES[i], front = Math.sign(site.doorZ), faceZ = site.z - front * 7.05;
    const group = new T.Group(); city.add(group);
    if (site.height) {
      buildings.push({ group, bounds: new T.Box3(
        new T.Vector3(site.x - 6, 0, site.z - 7.3),
        new T.Vector3(site.x + 6, site.height + .5, site.z + 7.3)
      ) });
      const facade = ["#d4bda5", "#a99f8c", "#d0b19b", "#aab4b6", "#687d88"][i % 5];
      part(group, facade, site.x, site.height / 2, site.z, 11.4, site.height, 14).material =
        surfaces.material(i % 2 ? "brick" : "plaster", facade, 4, site.height / 2);
      part(group, "#27384b", site.x, 2, faceZ, 10.8, 3.7, .12);
      part(group, "#72b6bf", site.x, 1.5, faceZ - front * .1, 2.2, 2.8, .12).material = surfaces.material("glass", "#658b9c");
      part(group, "#c6fff0", site.x + 1, 1.45, faceZ - front * .2, .07, .4, .08, box, true);
      for (let y = 5.4; y < site.height - 1; y += 3.1) for (let dx = -3.8; dx <= 4; dx += 2.5) {
        const lit = (Math.round(y * 10) + Math.round(dx * 10) + i) % 3 !== 0;
        part(group, "#273f51", site.x + dx, y, faceZ, 1.65, 2.05, .16);
        part(group, lit ? "#c7bd9c" : "#68869d", site.x + dx, y, faceZ - front * .1, 1.45, 1.85, .13).material =
          surfaces.material("glass", lit ? "#c7bd9c" : "#68869d");
        part(group, "#30465a", site.x + dx, y, faceZ - front * .1, .06, 1.85, .14);
        part(group, "#ddd0b8", site.x + dx, y - 1, faceZ - front * .16, 1.85, .13, .4);
      }
      for (let y = 5.4; y < site.height - 1; y += 3.1) for (const side of [-1, 1]) for (const dz of [-3.5, 3.5])
        part(group, "#68869d", site.x + side * 5.73, y, site.z + dz, .12, 1.8, 1.6).material = surfaces.material("glass", "#59758b");
      for (const dx of [-5.1, 5.1]) part(group, "#697177", site.x + dx, site.height / 2, faceZ - front * .18, .1, site.height, .1, cylinder);
      part(group, "#d9d1c0", site.x + 3.8, 2.5, faceZ - front * .28, 1.45, .7, .5);
      for (let vent = 0; vent < 5; vent++) part(group, "#60717b", site.x + 3.8, 2.29 + vent * .1, faceZ - front * .55, 1.2, .025, .025);
      part(group, "#d7c9b9", site.x, site.height + .1, site.z, 12, .35, 14.5);
      part(group, "#536171", site.x + 2, site.height + .8, site.z, 2.5, 1.3, 2.4);
      part(group, place.color, site.x, 3.7, faceZ - front * .7, 10.8, .26, 1.8);
      sign(group, place.name, site.x, 4.5, faceZ - front * .95, 8.9, "#d5ffe9", front > 0);
      if (place.id === "cafe") {
        for (let stripe = 0; stripe < 12; stripe++) part(group, stripe % 2 ? "#e0cfae" : "#466a63",
          site.x - 4.95 + stripe * .9, 3.55, faceZ - front * .9, .9, .12, 2);
        for (const dx of [-3.6, 3.6]) {
          part(group, "#c99774", site.x + dx, .85, site.doorZ, 1.2, .12, 1.2, cylinder);
          part(group, "#26384b", site.x + dx, .4, site.doorZ, .13, .8, .13, cylinder);
        }
      }
    } else {
      part(group, "#78a58c", site.x, .02, site.z, 12, .2, 14);
      for (const dx of [-4, 4]) for (const dz of [-4, 4]) tree(group, site.x + dx, site.z + dz);
      bench(group, site.x, site.z + 3);
      part(group, "#c2d3ca", site.x, .35, site.z, 2.4, .6, 2.4, cylinder);
      part(group, "#65b9c9", site.x, .7, site.z, 2.15, .12, 2.15, cylinder, true);
      sign(group, place.name, site.x, 3, site.doorZ + 1, 7, "#baffe0", true);
    }
    const ringGeometry = new T.TorusGeometry(.9, .055, 8, 36); geometries.add(ringGeometry);
    const ring = new T.Mesh(ringGeometry, material("#91ffd0", true));
    ring.rotation.x = Math.PI / 2; ring.position.set(site.x, .16, site.doorZ); city.add(ring);
    doors.push(ring);
    const resident = creatures.create(CHARACTERS[place.id].creature);
    resident.position.set(site.x - 2, 0, site.doorZ); resident.rotation.y = front < 0 ? 0 : Math.PI;
    city.add(resident); residents.push(resident);
  });
  function addCar(x, z, color) {
    const car = new T.Group();
    part(car, color, 0, .65, 0, 3.3, .75, 1.5);
    part(car, "#617c96", -.2, 1.2, 0, 1.8, .6, 1.35);
    for (const dx of [-1, 1]) for (const dz of [-.76, .76]) {
      const wheel = part(car, "#172238", dx, .4, dz, .35, .15, .35, cylinder); wheel.rotation.x = Math.PI / 2;
    }
    part(car, "#fff0bc", 1.66, .72, 0, .04, .22, 1.1, box, true);
    car.position.set(x, 0, z); city.add(car); return car;
  }
  const cars = [addCar(-20, 3.1, "#eab56b"), addCar(15, -3.1, "#85acc2")];
  for (const x of [-37, -21, -7, 7, 21, 37]) for (const side of [-1, 1]) {
    if (Math.abs(x) !== 7) tree(city, x, side * 10.6, .8);
    part(city, "#33455d", x, 3, side * 7, .12, 6, .12, cylinder);
    part(city, "#dffff0", x, 6, side * 7, .65, .15, .5, box, true);
  }
  for (let i = 0; i < 18; i++) {
    const x = (i % 9 - 4) * 16, z = i < 9 ? -47 : 47, h = 14 + (i * 13 % 27);
    part(city, i % 2 ? "#6b7e94" : "#8395aa", x, h / 2, z, 12, h, 13);
    for (let y = 4; y < h; y += 4) part(city, "#a8bfd1", x, y, z + (i < 9 ? 6.6 : -6.6), 10, .7, .1);
  }
  const pedestrians = [];
  for (let i = 0; i < 10; i++) {
    const mesh = creatures.create(CROWD_CREATURES[(i + 4) % CROWD_CREATURES.length]);
    city.add(mesh); pedestrians.push(mesh);
  }
  const player = creatures.create(PLAYER_CREATURE), rival = creatures.create(RIVAL_CREATURE);
  scene.add(player); city.add(rival); rival.visible = false;
  part(rival, "#ffb778", 0, .05, 0, .6, .025, .6, cylinder, true);
  let networkPeer = null;
  const ringGeometry = new T.RingGeometry(.55, .7, 32); geometries.add(ringGeometry);
  const playerRing = new T.Mesh(ringGeometry, new T.MeshBasicMaterial({ color: "#91ffdd", side: T.DoubleSide }));
  materials.set("player-ring", playerRing.material);
  playerRing.rotation.x = -Math.PI / 2; playerRing.position.y = .07; player.add(playerRing);
  let indoor = false, placeIndex = 0, npc, frame, last = performance.now(), lastPrompt = "";
  let width = 0, height = 0, yaw = 0, zoom = 1, path = [], replay = null;
  let disposed = false, lastPosition = 0;
  let activity = null;
  const activityKits = new Map(), activityRoot = new T.Group();
  scene.add(activityRoot); activityRoot.visible = false;
  const rivalStreet = new T.Vector3();
  const keys = new Set(), held = new Map(), controller = new AbortController();
  const options = { signal: controller.signal };
  const mapping = { KeyW: "up", ArrowUp: "up", KeyS: "down", ArrowDown: "down", KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right" };
  const goal = new T.Vector3(), follow = new T.Vector3(), look = new T.Vector3();
  const sightline = new T.Ray(), hit = new T.Vector3(), direction = new T.Vector3();
  const error = event => { event.preventDefault(); onError("תצוגת התלת־ממד נעצרה. אפשר לטעון מחדש או לעבור לתצוגה הקלה."); };
  canvas.addEventListener("webglcontextlost", error, options);
  function buildRoom(index) {
    room.clear();
    player.position.set(0, 0, 4.8); player.rotation.y = Math.PI;
    if (roomCache.has(index)) {
      const cached = roomCache.get(index);
      room.add(...cached.children); npc = cached.npc; return;
    }
    const place = PLACES[index], c = CHARACTERS[place.id];
    room.visible = true;
    part(room, "#b7b3ae", 0, -.12, 0, 16, .2, 16).material =
      surfaces.material(place.id === "home" ? "wood" : "paving", place.id === "home" ? "#cba57b" : "#c7c1b5", 5, 5);
    part(room, "#405268", 0, 2.6, -7.8, 16, 5.4, .25);
    for (const side of [-1, 1]) part(room, side > 0 ? "#728292" : "#8b999d", side * 7.8, 2.2, -1, .25, 4.5, 13.5);
    for (let x = -6; x <= 6; x += 2) part(room, "#dad4c7", x, .002, 0, .02, .01, 15);
    sign(room, place.name, 0, 4, -7.6, 8);
    part(room, place.color, 0, 1.05, -2.5, 6.2, 2.1, 1.4);
    part(room, "#263449", 0, 2.15, -2.5, 6.5, .13, 1.6);
    npc = creatures.create(c.creature); npc.position.set(-1, 0, -.6); room.add(npc);
    for (const side of [-1, 1]) {
      tree(room, side * 6.3, -6, .65);
      bench(room, side * 5, 3);
      part(room, "#c0f5e8", side * 5.8, 3, -7.6, 2.4, 2, .1, box, true);
    }
    if (["office", "tech", "college", "bank", "home", "shop"].includes(place.id)) {
      for (const x of [-2, 0, 2]) {
        part(room, "#233043", x, 2.7, -2.5, 1.4, .85, .12);
        part(room, "#87cbd0", x, 2.7, -2.41, 1.2, .65, .04, box, true);
      }
    }
    if (["cafe", "market"].includes(place.id)) {
      for (let i = 0; i < 9; i++) part(room, ["#e2a566", "#86b993", "#e1d6be"][i % 3], -2.6 + i * .65, 2.43, -2.5, .23, .45, .23, cylinder);
      part(room, "#34475a", -4.6, 1.4, -6, 2, 2.8, 1.6);
      sign(room, place.id === "cafe" ? "קפה. עבודה. אנשים." : "טרי מהשוק", -4.6, 2, -5.1, 2);
    }
    if (place.id === "home") {
      part(room, "#8ba7b3", 4.5, .6, -4, 2.6, 1, 4);
      part(room, "#e4dbc8", 4.5, 1.2, -5, 2.3, .3, 1);
    }
    if (place.id === "gym") for (const x of [-4.5, 4.5]) {
      part(room, "#2a3747", x, 1.4, -4, 3, .12, .12, cylinder).rotation.z = Math.PI / 2;
      for (const dx of [-1, 1]) part(room, "#324053", x + dx, 1.4, -4, .25, .7, .7);
    }
    if (place.id === "park") {
      part(room, "#76a488", 0, -.05, 0, 15, .1, 15);
      for (const x of [-5, 5]) tree(room, x, -3, 1.2);
    }
    part(room, "#8cffd5", 0, .03, 6.2, 2.3, .05, 1, box, true);
    roomCache.set(index, { children: [...room.children], npc });
  }
  function activityKit(profile) {
    const key = `${profile.prop}:${profile.id === "laptop" ? "laptop" : profile.location}`;
    if (activityKits.has(key)) return activityKits.get(key);
    const root = new T.Group(), hand = new T.Group(), leftHand = new T.Group(), companions = [];
    const kit = { root, hand, leftHand, companions, steam: [] };
    const type = profile.prop;
    const table = () => {
      part(root, "#b78b69", 0, 1, 0, 2.5, .14, 1.4);
      for (const x of [-1, 1]) part(root, "#26394e", x, .47, 0, .12, .94, .9);
    };
    const cup = (parent, x = 0, y = 0, z = 0) => {
      part(parent, "#f2e4c8", x, y, z, .12, .22, .12, cylinder);
      part(parent, "#684432", x, y + .12, z, .105, .012, .105, cylinder);
    };
    const companion = (creature, x, z, rotation = 0) => {
      const c = CHARACTERS[profile.location];
      const mesh = creatures.create(creature || c.creature);
      mesh.position.set(x, 0, z); mesh.rotation.y = rotation; root.add(mesh); companions.push(mesh);
      return mesh;
    };
    if (["social", "eat", "study", "type"].includes(profile.pose) && type !== "picnic") {
      part(root, "#59768a", 0, .47, 1.05, .85, .12, .85);
      part(root, "#334a61", 0, .22, 1.05, .14, .44, .14);
      part(root, "#59768a", 0, .85, 1.45, .85, .8, .1);
    }
    if (["coffee", "table", "meal", "stove", "desk", "computer", "bank", "interview"].includes(type)) table();
    if (type === "coffee") {
      part(root, "#627b8d", -.65, 1.45, -.15, .8, .8, .65);
      part(root, "#192c41", -.65, 1.35, .19, .65, .35, .06);
      part(root, "#9effd8", -.65, 1.7, .19, .45, .08, .07, box, true);
      cup(root, -.65, 1.2, .28); cup(hand);
      companion(null, 1.7, -.25, -.7);
      for (let i = 0; i < 4; i++) kit.steam.push(part(root, "#d6ebed", -.65, 1.7, .28, .06, .08, .06, sphere));
    }
    if (type === "table" || type === "picnic") {
      if (type === "picnic") part(root, "#bc747a", 0, .03, .3, 3.7, .04, 2.8);
      cup(hand); cup(root, -.75, type === "table" ? 1.2 : .2, .15); cup(root, .75, type === "table" ? 1.2 : .2, .15);
      companion("firefly", -1.6, .1, Math.PI / 2);
      companion("mushroom", 1.6, .1, -Math.PI / 2);
      if (type === "table") for (const x of [-1.6, 1.6]) {
        part(root, "#59768a", x, .47, .1, .85, .12, .85);
        part(root, "#334a61", x, .22, .1, .12, .44, .12);
      }
    }
    if (type === "meal") {
      part(root, "#e5ebdf", 0, 1.13, .12, .55, .06, .45, cylinder);
      for (let i = 0; i < 4; i++) part(root, i % 2 ? "#94b96d" : "#d99358", -.25 + i * .17, 1.23, .12, .15, .1, .14, sphere);
      part(hand, "#d9a561", 0, 0, 0, .22, .12, .14);
    }
    if (type === "stove") {
      part(root, "#374657", 0, 1.13, 0, 1.5, .12, 1);
      part(root, "#edaf67", 0, 1.22, 0, .48, .06, .4, cylinder, true);
      part(root, "#25374b", 0, 1.3, 0, .52, .12, .44, cylinder);
      part(hand, "#caa27a", 0, -.05, .2, .05, .05, .65);
    }
    if (type === "bed") {
      part(root, "#6f8aa3", 0, .4, 1, 3.2, .65, 1.2);
      part(root, "#d1d9ce", 1.1, .8, 1, .65, .16, 1);
      part(root, "#bbd3d0", -.2, .74, 1, 1.7, .1, 1.15);
    }
    if (["desk", "interview", "bank"].includes(type)) {
      part(root, "#f2eedc", 0, 1.11, .12, .85, .035, .6);
      for (let i = 0; i < 4; i++) part(root, "#577284", 0, 1.135, -.06 + i * .1, .55, .01, .013);
      part(hand, "#31546b", 0, -.03, .1, .025, .24, .025);
      if (type !== "desk") companion(null, 0, -1, 0);
      if (type === "bank") {
        part(root, "#415d75", .8, 1.28, .1, .4, .3, .35);
        part(root, "#90efc8", .8, 1.44, .1, .3, .02, .22, box, true);
      }
    }
    if (type === "computer" || profile.id === "laptop") {
      part(root, "#26394e", 0, 1.15, .12, 1.3, .08, .75);
      part(root, "#26394e", 0, 1.6, -.22, 1.3, .85, .07);
      part(root, "#86c5d0", 0, 1.6, -.175, 1.1, .65, .02, box, true);
      for (let i = 0; i < 5; i++) part(root, "#d4ffee", -.13, 1.8 - i * .08, -.155, .65 - i % 2 * .2, .015, .01, box, true);
    }
    if (type === "shelf") {
      for (const x of [-.9, .9]) part(root, "#537184", x, .85, -.2, .1, 1.7, .6);
      for (const y of [.55, 1.15]) {
        part(root, "#b78b69", 0, y, -.2, 2, .12, .75);
        for (let i = 0; i < 5; i++) part(root, ["#cc9870", "#81ab80", "#dba978"][i % 3], -.75 + i * .36, y + .21, -.2, .15, .2, .15, sphere);
      }
      part(hand, "#d1b184", 0, -.18, 0, .5, .55, .3);
    }
    if (type === "bike") {
      const geometry = new T.TorusGeometry(.5, .065, 8, 24); geometries.add(geometry);
      for (const x of [-.85, .85]) {
        const wheel = new T.Mesh(geometry, material("#24354a")); wheel.position.set(x, .53, 0); root.add(wheel);
      }
      part(root, "#94d7bc", 0, .78, 0, 1.7, .08, .08);
      part(root, "#94d7bc", 0, 1, 0, .08, .6, .08);
      part(root, "#24354a", 0, 1.3, 0, .4, .08, .16);
      part(root, "#24354a", .8, 1.25, 0, .08, .7, .08);
    }
    if (type === "weights") {
      part(root, "#607d8c", 0, .02, .7, 2.7, .04, 2);
      for (const grip of [hand, leftHand]) {
        part(grip, "#aabcca", 0, 0, 0, .5, .08, .08);
        for (const x of [-.22, .22]) part(grip, "#314963", x, 0, 0, .12, .3, .3);
      }
    }
    if (type === "park") { tree(root, -3.5, -.4, .65); tree(root, 3.5, -.4, .65); }
    if (type === "delivery" || type === "boxes") {
      for (const x of [-1, 1]) part(root, "#ba9269", x, .4, -.2, .8, .8, .7);
      part(hand, "#ceb08b", 0, -.05, .15, .5, .55, .45);
      if (type === "delivery") companion("mint", 0, -.65);
    }
    if (type === "conversation") companion(null, 0, -.2);
    root.add(hand, leftHand); hand.visible = false; leftHand.visible = false;
    activityKits.set(key, kit);
    return kit;
  }
  function finishActivity(notify = true) {
    if (!activity) return;
    const finished = activity; activity = null;
    finished.kit.root.add(finished.kit.hand, finished.kit.leftHand);
    finished.kit.hand.visible = false; finished.kit.leftHand.visible = false;
    finished.actor.userData.animate(0, 0);
    if (finished.profile.pose === "walk" || finished.profile.pose === "carry")
      finished.actor.position.set(0, 0, 3.5);
    if (npc) npc.visible = true;
    activityRoot.clear(); activityRoot.visible = false;
    delete canvas.dataset.activity; delete canvas.dataset.activityPhase; delete canvas.dataset.activityActor;
    if (notify) finished.done?.();
  }
  function startActivity(profile, actor, done, rate = 1, playing = true) {
    finishActivity(false);
    if (profile.interactive) return false;
    const kit = activityKit(profile);
    activityRoot.clear(); activityRoot.add(kit.root); activityRoot.position.set(0, 0, 1.5); activityRoot.visible = true;
    const x = profile.pose === "rest" ? -1 : 0;
    const side = actor.position.x < 0 ? -4.2 : 4.2;
    activity = {
      profile, actor, kit, done, rate, playing, elapsed: 0,
      route: [
        ...(actor.position.z < -1.3 && Math.abs(actor.position.x) < 3.7 ?
          [{ x: side, z: actor.position.z }, { x: side, z: 4.5 }] : [{ x: actor.position.x, z: 4.5 }]),
        { x, z: 4.5 }, { x, z: 2.5 }
      ]
    };
    if (npc) npc.visible = false;
    path = []; keys.clear(); held.clear();
    canvas.dataset.activity = profile.id;
    canvas.dataset.activityActor = actor === player ? "player" : "rival";
    canvas.dataset.activityPhase = "approach";
    return true;
  }
  function animateActivity(dt, paused) {
    if (!activity) return;
    const a = activity, step = paused || !a.playing ? 0 : dt * a.rate;
    if (a.route.length) {
      const target = a.route[0], dx = target.x - a.actor.position.x, dz = target.z - a.actor.position.z;
      const length = Math.hypot(dx, dz);
      if (length < .08) a.route.shift();
      else if (step) {
        a.actor.position.x += dx / length * Math.min(length, step * 7);
        a.actor.position.z += dz / length * Math.min(length, step * 7);
        a.actor.rotation.y = Math.atan2(dx, dz);
      }
      a.actor.userData.animate(a.elapsed += step, step ? 1 : 0);
      if (!a.route.length) {
        a.elapsed = 0; a.actor.rotation.y = Math.PI;
        a.kit.hand.position.set(0, -.6, 0); a.kit.leftHand.position.set(0, -.6, 0);
        a.kit.hand.visible = a.kit.leftHand.visible = true;
        a.actor.userData.hands[0].add(a.kit.hand); a.actor.userData.hands[1].add(a.kit.leftHand);
        canvas.dataset.activityPhase = "perform";
      }
      if (a.actor === player) onActivity({ progress: 0, label: "ניגשים לעמדה" });
      return;
    }
    a.elapsed += step;
    const stage = activityStage(a.profile, a.elapsed);
    a.actor.userData.pose(a.profile.pose === "brew" && stage.progress > 2 / 3 ? "serve" : a.profile.pose, a.elapsed);
    a.kit.companions.forEach((person, index) => person.userData.pose(
      ["social", "eat"].includes(a.profile.pose) ? "social" : "talk", a.elapsed + index));
    a.kit.steam.forEach((mesh, i) => {
      const cycle = (a.elapsed * .8 + i / 4) % 1;
      mesh.position.y = 1.5 + cycle * .8; mesh.scale.setScalar(.04 + cycle * .09);
    });
    if (a.profile.pose === "walk" || a.profile.pose === "carry") {
      const angle = a.elapsed * 1.4;
      a.actor.position.set(Math.sin(angle) * 1.8, 0, 3.3 + Math.cos(angle) * .55);
      a.actor.rotation.y = Math.atan2(Math.cos(angle) * 1.8, -Math.sin(angle) * .55);
    }
    if (a.actor === player) onActivity(stage);
    if (stage.progress >= 1) finishActivity();
  }
  function sync(location, inside) {
    const index = PLACES.findIndex(place => place.id === location);
    if (index < 0) throw new Error("מיקום המשחק אינו מוכר.");
    if (index === placeIndex && indoor === inside && player.userData.placed) return;
    placeIndex = index; indoor = inside; path = []; keys.clear(); held.clear(); yaw = 0;
    city.visible = !inside; room.visible = inside;
    if (inside) buildRoom(index);
    else { player.position.set(CITY_SITES[index].x, 0, CITY_SITES[index].doorZ); player.rotation.y = index < 5 ? 0 : Math.PI; }
    player.userData.placed = true;
    follow.copy(player.position);
  }
  function prompt() {
    if (activity) return { text: activity.profile.label, action: null };
    if (replay) return { text: "צופים בשבוע של דני", action: null };
    if (indoor) {
      if (player.position.distanceTo(new T.Vector3(0, 0, 6.2)) < 2) return { text: "חזרה לרחוב", action: "exit" };
      if (npc && player.position.distanceTo(npc.position) < 3.3) return { text: `לדבר עם ${CHARACTERS[PLACES[placeIndex].id].name}`, action: "talk" };
      return { text: "להתקרב לדמות כדי לדבר · הדלת מאחוריך", action: null };
    }
    const index = CITY_SITES.findIndex(site => Math.hypot(site.x - player.position.x, site.doorZ - player.position.z) < 2.6);
    return index >= 0 ? { text: `כניסה · ${PLACES[index].name}`, action: "enter", index } :
      { text: path.length ? "בדרך ליעד · תנועה ידנית מבטלת ניווט" : "מתקרבים לכניסה מוארת · E כדי להיכנס", action: null };
  }
  function interact() {
    if (isPaused() || replay || activity) return;
    const p = prompt();
    if (p.action === "enter") onEnter(PLACES[p.index].id);
    if (p.action === "exit") onExit();
    if (p.action === "talk") onTalk();
  }
  for (const type of ["keydown", "keyup"]) window.addEventListener(type, event => {
    if (event.target.matches("input, textarea, select") || isPaused()) { keys.clear(); return; }
    if (type === "keydown" && event.code === "KeyE" && !event.repeat) { event.preventDefault(); interact(); }
    if (mapping[event.code] || ["KeyQ", "KeyR", "ShiftLeft", "ShiftRight"].includes(event.code)) {
      event.preventDefault();
      if (type === "keydown") keys.add(event.code); else keys.delete(event.code);
    }
  }, options);
  window.addEventListener("blur", () => { keys.clear(); held.clear(); }, options);
  canvas.addEventListener("wheel", event => {
    event.preventDefault(); zoom = T.MathUtils.clamp(zoom + event.deltaY * .0008, .65, 1.5);
  }, { ...options, passive: false });
  let pointer = null;
  canvas.addEventListener("pointerdown", event => { pointer = { id: event.pointerId, x: event.clientX }; canvas.setPointerCapture(event.pointerId); }, options);
  canvas.addEventListener("pointermove", event => {
    if (!pointer || pointer.id !== event.pointerId || isPaused()) return;
    yaw -= (event.clientX - pointer.x) * .005; pointer.x = event.clientX;
  }, options);
  canvas.addEventListener("lostpointercapture", () => { pointer = null; }, options);
  function tick(now) {
    if (disposed) return;
    const dt = Math.max(0, Math.min(.04, (now - last) / 1000)), time = now / 1000; last = now;
    const paused = isPaused();
    if (paused) { keys.clear(); held.clear(); }
    const directions = new Set([...Array.from(keys, code => mapping[code]), ...held.values()]);
    let dx = +directions.has("right") - +directions.has("left");
    let dz = +directions.has("down") - +directions.has("up");
    let moving = false;
    if (!paused && !replay && !activity) {
      if (keys.has("KeyQ")) yaw += dt;
      if (keys.has("KeyR")) yaw -= dt;
      if (dx || dz) {
        path = [];
        const x = dx * Math.cos(yaw) + dz * Math.sin(yaw);
        dz = dz * Math.cos(yaw) - dx * Math.sin(yaw); dx = x;
      } else if (path.length) {
        const target = path[0]; dx = target.x - player.position.x; dz = target.z - player.position.z;
        if (Math.hypot(dx, dz) < .15) { path.shift(); dx = 0; dz = 0; }
      }
      const length = Math.hypot(dx, dz);
      if (length) {
        const speed = (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 8 : 5.5) * dt;
        const x = player.position.x + dx / length * Math.min(speed, length);
        const z = player.position.z + dz / length * Math.min(speed, length);
        const clear = (x, z) => canWalk(x, z, indoor) && (!indoor || !(Math.abs(x) < 3.7 && z > -3.7 && z < -1.3));
        if (clear(x, player.position.z)) { player.position.x = x; moving = true; }
        if (clear(player.position.x, z)) { player.position.z = z; moving = true; }
        player.rotation.y = Math.atan2(dx, dz);
      }
    }
    player.userData.animate(time, moving ? 1 : 0);
    if (npc) npc.userData.animate(time, 0);
    residents.forEach(mesh => mesh.userData.animate(time, 0));
    pedestrians.forEach((mesh, i) => {
      mesh.position.set(((time * (i % 2 ? 1.1 : -.9) + i * 8) % 78 + 78) % 78 - 39, 0, i % 2 ? 8 : -8);
      mesh.rotation.y = i % 2 ? Math.PI / 2 : -Math.PI / 2;
      mesh.userData.animate(time + i, 1);
    });
    cars.forEach((car, i) => { car.position.x = ((time * (i ? -3 : 3) + i * 30) % 96 + 96) % 96 - 48; car.rotation.y = i ? Math.PI : 0; });
    doors.forEach((ring, i) => { ring.scale.setScalar(1 + Math.sin(time * 2 + i) * .08); });
    const focus = replay ? rival : player;
    if (!replay) {
      rival.visible = Boolean(networkPeer && (!indoor || networkPeer.location === PLACES[placeIndex].id));
      if (rival.visible) {
        if (rival.parent !== scene) scene.add(rival);
        const site = CITY_SITES[PLACES.findIndex(place => place.id === networkPeer.location)];
        rival.position.set(indoor ? 2.4 : site.x + 2, 0, indoor ? 3.1 : site.doorZ);
        rival.rotation.y = indoor || site.doorZ > 0 ? Math.PI : 0;
        rival.userData.animate(time, 0);
      }
    }
    if (replay) {
      const site = CITY_SITES[PLACES.findIndex(place => place.id === replay.location)];
      goal.set(site.x, 0, site.doorZ);
      const dist = rival.position.distanceTo(goal);
      // Spectator movement follows the same open street route as player navigation.
      if (rival.userData.path?.length) {
        const target = rival.userData.path[0];
        const vx = target.x - rival.position.x, vz = target.z - rival.position.z, length = Math.hypot(vx, vz);
        if (length < .2) rival.userData.path.shift();
        else { rival.position.x += vx / length * Math.min(length, dt * 24); rival.position.z += vz / length * Math.min(length, dt * 24); rival.rotation.y = Math.atan2(vx, vz); }
      }
      rival.userData.animate(time, replay.kind === "action" ? .2 : dist > .3 ? 1 : 0);
    }
    animateActivity(dt, paused);
    follow.lerp(focus.position, 1 - Math.exp(-dt * 6));
    const distance = (activity ? 8 : (indoor && !replay) || replay?.kind === "action" ? 13 : 21) * zoom;
    const angle = activity ? -2.2 : yaw;
    camera.position.set(follow.x + Math.sin(angle) * distance, distance * (activity ? .8 : .83), follow.z + Math.cos(angle) * distance);
    look.copy(follow); look.y = 1; camera.lookAt(look);
    sightline.set(look, direction.subVectors(camera.position, look).normalize());
    const cameraDistance = camera.position.distanceTo(look);
    for (const building of buildings) {
      const intersection = sightline.intersectBox(building.bounds, hit);
      building.group.visible = !intersection || intersection.distanceTo(look) > cameraDistance;
    }
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w !== width || h !== height) {
      width = w; height = h;
      renderer.setSize(Math.max(1, w), Math.max(1, h), false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
    }
    const p = prompt(), key = `${p.text}:${p.action}`;
    if (key !== lastPrompt) { lastPrompt = key; onPrompt(p); }
    renderer.render(scene, camera);
    if (now - lastPosition > 100) {
      const position = replay?.kind === "action" ? rivalStreet : indoor && !replay ? { x: CITY_SITES[placeIndex].x, z: CITY_SITES[placeIndex].doorZ } : focus.position;
      onPosition(position.x, position.z); lastPosition = now;
    }
    frame = requestAnimationFrame(tick);
  }
  sync("home", false);
  frame = requestAnimationFrame(tick);
  return {
    sync,
    presence(peer) { networkPeer = peer; },
    interact,
    play(profile, done) { return startActivity(profile, player, done); },
    skip() { finishActivity(); },
    arrived() { return !rival.userData.path?.length && !activity; },
    hold(id, direction) { held.set(id, direction); },
    release(id) { held.delete(id); },
    navigate(id) {
      if (indoor) return false;
      const index = PLACES.findIndex(place => place.id === id);
      path = walkingRoute(player.position, index);
      yaw = index >= 5 ? Math.PI : 0;
      return true;
    },
    watch(value, playing = true, rate = 1) {
      if (value && value === replay) {
        if (activity) { activity.playing = playing; activity.rate = rate; }
        return;
      }
      finishActivity(false);
      const savedPosition = player.position.clone(), savedRotation = player.rotation.y;
      if (value && !replay) {
        const site = CITY_SITES[placeIndex]; rival.position.set(site.x, 0, site.doorZ); yaw = 0;
      }
      const action = value?.kind === "action";
      if (action) {
        const index = PLACES.findIndex(place => place.id === value.location), site = CITY_SITES[index];
        rivalStreet.set(site.x, 0, site.doorZ);
        buildRoom(index); room.add(rival);
        rival.position.set(1, 0, 1); rival.rotation.y = Math.PI; rival.userData.path = [];
        startActivity(activityFor(value.id, value.location), rival, null, rate, playing);
      } else {
        city.add(rival);
        if (replay?.kind === "action") rival.position.copy(rivalStreet);
        if (value && value.location !== replay?.location)
          rival.userData.path = walkingRoute(rival.position, PLACES.findIndex(place => place.id === value.location));
      }
      replay = value; rival.visible = Boolean(value); player.visible = !value;
      if (!value && indoor) buildRoom(placeIndex);
      player.position.copy(savedPosition); player.rotation.y = savedRotation;
      city.visible = value ? !action : !indoor; room.visible = value ? action : indoor;
    },
    dispose() {
      finishActivity(false);
      disposed = true; cancelAnimationFrame(frame); controller.abort();
      creatures.dispose();
      surfaces.dispose();
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(mat => mat.dispose()); textures.forEach(texture => texture.dispose());
      renderer.dispose();
    }
  };
}
