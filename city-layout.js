export const CITY_SITES = Array.from({ length: 10 }, (_, index) => ({
  x: (index % 5 - 2) * 14,
  z: index < 5 ? -20 : 20,
  doorZ: index < 5 ? -11 : 11,
  height: [11, 9, 16, 20, 26, 18, 9, 13, 0, 11][index]
}));

export function canWalk(x, z, indoors = false) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (indoors) return Math.abs(x) < 6.8 && z > -5.8 && z < 7;
  return Math.abs(x) < 39 && Math.abs(z) < 32 &&
    !CITY_SITES.some(site => site.height && Math.abs(x - site.x) < 6.1 && Math.abs(z - site.z) < 7.6);
}

export function walkingRoute(position, index) {
  const site = CITY_SITES[index];
  if (!site) throw new Error("יעד לא מוכר בעיר.");
  // Use the open boulevard instead of steering through building footprints.
  return [
    ...(Math.abs(position.z) >= 27.6 ? [{ x: Math.sign(position.x || 1) * 37, z: position.z }] : []),
    { x: Math.abs(position.z) >= 27.6 ? Math.sign(position.x || 1) * 37 : position.x, z: 0 },
    { x: site.x, z: 0 },
    { x: site.x, z: site.doorZ }
  ];
}
