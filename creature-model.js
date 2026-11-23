import * as T from "./vendor/three.module.min.js";
import { creatureDesign, eyeLayout, starPoints } from "./creatures.js";

export function createCreatureFactory() {
  const sphere = new T.SphereGeometry(1, 20, 14);
  const cone = new T.ConeGeometry(1, 1, 10);
  const cylinder = new T.CylinderGeometry(1, 1, 1, 10);
  const cap = new T.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const shape = new T.Shape(starPoints().map(([x, y]) => new T.Vector2(x, y)));
  const star = new T.ExtrudeGeometry(shape, { depth: .08, bevelEnabled: false });
  const geometries = [sphere, cone, cylinder, cap, star], materials = new Map(), instances = new Set();
  const up = new T.Vector3(0, 1, 0);
  let disposed = false;
  function material(color, glow = false) {
    const key = `${color}:${glow}`;
    if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({
      color, roughness: .46, metalness: .04,
      ...(glow ? { emissive: color, emissiveIntensity: .4 } : {})
    }));
    return materials.get(key);
  }
  function part(parent, color, position, scale, geometry = sphere, glow = false) {
    const mesh = new T.Mesh(geometry, material(color, glow));
    mesh.position.set(...position); mesh.scale.set(...scale);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
    return mesh;
  }
  function stem(parent, color, start, end, radius = .035) {
    const direction = new T.Vector3(...end).sub(new T.Vector3(...start));
    const mesh = part(parent, color, start.map((v, i) => (v + end[i]) / 2), [radius, direction.length(), radius], cylinder);
    mesh.quaternion.setFromUnitVectors(up, direction.normalize());
  }
  function details(parent, color, transforms, geometry = cone) {
    const mesh = new T.InstancedMesh(geometry, material(color), transforms.length), dummy = new T.Object3D();
    transforms.forEach(({ position, scale, normal }, index) => {
      dummy.position.set(...position); dummy.scale.set(...scale);
      dummy.quaternion.setFromUnitVectors(up, new T.Vector3(...normal).normalize());
      dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = true; mesh.receiveShadow = true;
    instances.add(mesh); parent.add(mesh);
  }
  function fuzz(parent, color, size, count, length = .16) {
    const transforms = [];
    for (let i = 0; i < count; i++) {
      const y = 1 - 2 * (i + .5) / count, r = Math.sqrt(1 - y * y), angle = i * 2.399963;
      const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
      if (z > .45 && Math.abs(x) < .75) continue;
      transforms.push({
        position: [x * size[0], y * size[1], z * size[2]],
        scale: [.055, length * (1 + i % 3 * .15), .055], normal: [x, y + .2, z]
      });
    }
    details(parent, color, transforms);
  }
  function create(id) {
    if (disposed) throw new Error("מפעל היצורים כבר נסגר.");
    const c = creatureDesign(id), long = c.kind === "longneck";
    const group = new T.Group(), body = new T.Group(), head = new T.Group();
    group.name = `creature:${id}`; group.userData.creature = id; group.add(body); body.add(head);
    group.scale.setScalar(c.scale ?? 1);
    const wide = ["horns", "star"].includes(c.kind) ? .71 : .57;
    const torso = part(body, c.color, [0, 1.05, 0], [long ? .32 : wide, long ? .7 : .73, long ? .29 : .44]);
    part(body, c.belly, [0, .99, long ? .25 : .38], [long ? .21 : .4, .47, .105]);
    const headY = long ? 2.45 : c.kind === "leaves" || c.kind === "scales" ? 1.95 : 1.82;
    head.position.y = headY;
    const faceDepth = long ? .31 : .42;
    if (long) stem(body, c.color, [0, 1.35, 0], [0, 2.45, 0], .17);
    part(head, c.color, [0, 0, 0], [long ? .43 : .6, long ? .43 : .5, faceDepth]);
    const eyes = eyeLayout(c.eyes).map(([x, y, radius]) => {
      const eye = new T.Group(); eye.name = "eye"; eye.position.set(x, y, faceDepth * .86); head.add(eye);
      part(eye, "#f4fffa", [0, 0, 0], [radius, radius * 1.08, radius * .66]);
      if (c.kind === "star") {
        part(eye, c.accent, [0, 0, radius * .65], [radius * .95, radius * .95, .16], star, true);
      } else {
        part(eye, c.kind === "sun" ? "#864f90" : "#347f99", [0, -.012, radius * .61], [radius * .66, radius * .74, radius * .18]);
        part(eye, "#16243e", [0, -.012, radius * .76], [radius * .4, radius * .49, radius * .09]);
      }
      part(eye, "#ffffff", [-radius * .23, radius * .3, radius * .87], [radius * .19, radius * .2, radius * .07], sphere, true);
      return eye;
    });
    const mouth = part(head, "#392745", [0, -.245, faceDepth * .95], [long ? .13 : .225, .105, .045]);
    mouth.name = "mouth";
    part(head, "#e499af", [0, -.295, faceDepth + .025], [.115, .032, .016]);
    for (const side of [-1, 1]) {
      part(head, "#fff4d6", [side * .086, -.206, faceDepth + .032], [.039, .051, .018]);
      part(head, c.belly, [side * .4, -.16, faceDepth * .73], [.09, .05, .035]);
    }
    if (!long && c.kind !== "sun") part(head, c.accent, [0, -.12, faceDepth + .08], [.07, .046, .047]);
    const ears = [], decorations = [];
    function ear(side, floppy = false) {
      const root = new T.Group(); root.position.set(side * .52, floppy ? -.06 : .36, -.025);
      root.rotation.z = side * (floppy ? .3 : -.4); head.add(root);
      part(root, c.color, [side * .1, floppy ? -.25 : .25, 0], [.19, floppy ? .46 : .36, .14]);
      part(root, c.accent, [side * .1, floppy ? -.25 : .25, .115], [.095, floppy ? .31 : .24, .04]);
      ears.push({ root, rest: root.rotation.z });
    }
    if (["fur", "ears", "comet"].includes(c.kind)) { ear(-1, c.kind === "ears"); ear(1, c.kind === "ears"); }
    if (c.kind === "fur") {
      fuzz(head, c.color, [.6, .5, .4], 90);
      fuzz(torso, c.color, [1, 1, 1], 60, .18);
      part(body, c.accent, [0, 1.11, .36], [.43, .48, .1]);
      for (const side of [-1, 1]) part(body, c.belly, [side * .17, 1.2, .45], [.09, .26, .025]);
    }
    if (["horns", "star", "ember"].includes(c.kind)) for (const side of [-1, 1]) {
      const horn = part(head, c.accent, [side * .47, .5, -.04], [.115, .5, .11], cone);
      horn.rotation.z = -side * .4;
      if (c.kind === "horns") part(head, c.color, [side * .43, .3, -.04], [.17, .16, .14]);
    }
    if (["jelly", "longneck", "spots", "wings"].includes(c.kind)) {
      const count = c.kind === "longneck" ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const side = count === 3 ? i - 1 : i * 2 - 1;
        const tip = [side * .5, c.kind === "longneck" ? .92 - Math.abs(side) * .15 : .68, -.03];
        stem(head, c.color, [side * .24, .29, -.08], tip, .032);
        decorations.push(part(head, c.accent, tip, [.065, .07, .065], sphere, true));
      }
    }
    if (["leaves", "scales"].includes(c.kind)) for (let i = 0; i < 5; i++) {
      const side = (i - 2) / 2, root = new T.Group(); root.position.set(side * .12, .4, -.04); head.add(root);
      root.rotation.z = -side * .6;
      part(root, c.kind === "scales" ? c.accent : "#edc07b", [0, .24, 0], [.095, .32, .06]);
      stem(root, c.kind === "scales" ? "#587e38" : c.accent, [0, 0, .055], [0, .5, .055], .011);
      ears.push({ root, rest: root.rotation.z });
    }
    if (c.kind === "leaves") {
      fuzz(torso, c.color, [1, 1, 1], 60, .13);
      for (let i = 0; i < 4; i++) part(body, c.accent, [0, .75 + i * .2, .42], [.25 - i * .02, .035, .018]);
    }
    if (c.kind === "scales") {
      const transforms = [];
      for (let row = 0; row < 6; row++) for (let i = 0; i < 10; i++) {
        const angle = (i + row % 2 * .5) * Math.PI / 5, y = .55 + row * .22, r = .52 * Math.sqrt(1 - Math.pow((y - 1.1) / .85, 2));
        transforms.push({ position: [Math.sin(angle) * r, y, Math.cos(angle) * r * .8], scale: [.14, .18, .06], normal: [0, 1, 0] });
      }
      details(body, "#ef9f61", transforms, sphere);
    }
    if (c.kind === "sun") {
      details(head, c.accent, Array.from({ length: 16 }, (_, i) => {
        const angle = i * Math.PI / 8;
        return { position: [Math.sin(angle) * .58, Math.cos(angle) * .52, -.04], scale: [.095, .38, .09], normal: [Math.sin(angle), Math.cos(angle), 0] };
      }));
      fuzz(torso, c.color, [1, 1, 1], 55, .18);
    }
    if (["spots", "jelly", "comet"].includes(c.kind)) {
      for (let i = 0; i < 11; i++) {
        const angle = i * 2.4, y = .6 + i % 4 * .22;
        part(body, c.kind === "jelly" ? c.belly : c.accent, [Math.sin(angle) * wide * .9, y, Math.cos(angle) * .43],
          [.042, .047, .032], sphere, c.kind !== "jelly");
      }
    }
    if (["comet", "wings", "ember"].includes(c.kind)) {
      const tail = new T.Group(); tail.position.set(0, .75, -.37); body.add(tail);
      for (let i = 0; i < 3; i++) part(tail, c.color, [i * .12, -.08 * i, -.19 * i], [.17 - i * .025, .16, .24]);
      decorations.push(part(tail, c.accent, [.32, -.13, -.6], [.16, .17, .17], sphere, true));
      ears.push({ root: tail, rest: 0 });
    }
    if (c.kind === "wings") for (const side of [-1, 1]) {
      const wing = new T.Group(); wing.position.set(side * .35, 1.3, -.2); body.add(wing);
      part(wing, c.accent, [side * .3, .17, 0], [.37, .54, .075], sphere, true);
      part(wing, c.belly, [side * .23, -.34, .02], [.26, .28, .07], sphere, true);
      ears.push({ root: wing, rest: side * .1 });
    }
    if (c.kind === "ember") {
      for (let i = 0; i < 5; i++)
        part(body, c.accent, [0, .65 + i * .26, -.4], [.1, .35, .17], cone).rotation.x = -.7;
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++)
        part(head, c.accent, [side * (.54 + i * .04), -.2 + i * .18, -.04], [.085, .32, .1], cone).rotation.z = -side * 1.1;
    }
    if (c.kind === "mushroom") {
      part(head, c.accent, [0, .27, -.02], [.82, .43, .63], cap);
      part(head, "#e7d6d9", [0, .27, -.02], [.79, .05, .6]);
      for (let i = 0; i < 7; i++) {
        const angle = i * 2.4, x = Math.sin(angle) * .5, z = Math.cos(angle) * .37;
        const y = .27 + .43 * Math.sqrt(1 - (x / .82) ** 2 - (z / .63) ** 2);
        part(head, c.belly, [x, y + .02, z], [.085, .035, .085]);
      }
    }
    const limbs = [];
    for (const side of [-1, 1]) {
      const arm = new T.Group(); arm.position.set(side * (long ? .4 : .61), 1.52, 0); body.add(arm);
      part(arm, c.color, [0, -.23, 0], [.17, .35, .19]);
      part(arm, c.color, [0, -.57, .025], [.19, .19, .17]);
      const leg = new T.Group(); leg.position.set(side * .26, .73, 0); body.add(leg);
      part(leg, c.color, [0, -.24, 0], [.2, .31, .2]);
      part(leg, c.color, [0, -.59, .12], [.25, .15, .31]);
      for (const dx of [-.09, .09]) part(leg, c.belly, [dx, -.6, .385], [.055, .042, .065]);
      limbs.push(arm, leg);
    }
    group.userData.hands = [limbs[2], limbs[0]];
    group.userData.animate = (time, speed) => {
      body.rotation.set(0, 0, 0); head.rotation.y = Math.sin(time * .8) * .035;
      const stride = Math.sin(time * 9) * Math.min(speed, 1) * .6;
      limbs.forEach((limb, i) => { limb.rotation.set(stride * (i < 2 ? 1 : -1) * (i % 2 ? -1 : 1), 0, 0); });
      body.position.y = Math.sin(time * (speed ? 18 : 2)) * (speed ? .045 : .018);
      const blink = time % 4.7;
      eyes.forEach(eye => { eye.scale.y = blink > 4.5 ? .08 + Math.abs(blink - 4.6) * 9.2 : 1; });
      ears.forEach(({ root, rest }, i) => { root.rotation.z = rest + Math.sin(time * 2 + i) * .07; });
      decorations.forEach((mesh, i) => { mesh.rotation.y = time * .5 + i; });
      mouth.scale.y = .105;
    };
    group.userData.pose = (pose, time) => {
      group.userData.animate(time, 0);
      const pulse = Math.sin(time * 5), drink = (Math.sin(time * 2.5) + 1) / 2;
      if (["social", "eat", "study", "type"].includes(pose)) {
        body.position.y = -.25; limbs[1].rotation.x = limbs[3].rotation.x = -1.45;
      }
      if (["social", "eat"].includes(pose)) {
        limbs[2].rotation.x = -.8 - drink * .9;
        limbs[2].rotation.z = -.12 - drink * .88;
        limbs[0].rotation.x = -.7;
      }
      if (["brew", "cook", "pour", "serve", "type", "study", "bank", "shop", "carry"].includes(pose)) {
        limbs[0].rotation.x = -1.1 + pulse * .16; limbs[2].rotation.x = -1.3 - pulse * .22;
        if (["cook", "brew", "pour"].includes(pose)) limbs[2].rotation.z = Math.sin(time * 4) * .3;
        if (pose === "serve") limbs[2].rotation.x = -1.6;
      }
      if (pose === "rest") { body.rotation.z = Math.PI / 2; body.position.y = .75 + Math.sin(time * 2) * .025; }
      if (pose === "talk" || pose === "social") {
        limbs[0].rotation.z = -.35 - drink * .25; limbs[0].rotation.x = -.45 - drink * .3;
        mouth.scale.y = .07 + drink * .07;
      }
      if (pose === "exercise") {
        limbs[0].rotation.z = .3; limbs[2].rotation.z = -.3;
        limbs[0].rotation.x = limbs[2].rotation.x = -drink * 2.8; body.position.y = -.1 * drink;
      }
      if (pose === "walk") group.userData.animate(time, 1);
      if (pose === "ride") {
        body.rotation.x = .12;
        limbs[0].rotation.x = limbs[2].rotation.x = -1.25;
        limbs[1].rotation.x = Math.sin(time * 9) * .5;
        limbs[3].rotation.x = -Math.sin(time * 9) * .5;
      }
    };
    return group;
  }
  return {
    create,
    dispose() {
      if (disposed) return;
      disposed = true; instances.forEach(mesh => mesh.dispose());
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(mat => mat.dispose());
      instances.clear(); materials.clear();
    }
  };
}
