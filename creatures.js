export const CREATURES = {
  cloud: { name: "פוף העננים", kind: "fur", color: "#56bce9", belly: "#b2edff", accent: "#8e70d1", eyes: 2, description: "פרווה כחולה, אוזניים מחודדות ואף קטן", source: "reference" },
  moss: { name: "מוגי", kind: "horns", color: "#83bd55", belly: "#c3df7d", accent: "#548b58", eyes: 3, description: "יצור ירוק ועגלגל עם שלוש עיניים וקרניים", source: "reference" },
  jelly: { name: "לולי", kind: "jelly", color: "#ad67e3", belly: "#d6a0f0", accent: "#7c43ba", eyes: 2, scale: .92, description: "יצור סגלגל ורך עם מחושים קצרים", source: "reference" },
  sprout: { name: "נבט", kind: "leaves", color: "#efb668", belly: "#ffe0a0", accent: "#cc7a47", eyes: 2, scale: 1.12, description: "יצור זהוב וגבוה עם מניפת עלים", source: "reference" },
  star: { name: "פיצי כוכב", kind: "star", color: "#ec82c5", belly: "#ffb9dc", accent: "#9e4bc5", eyes: 2, description: "כדור ורוד עם עיני כוכב וקרניים קטנות", source: "reference" },
  oracle: { name: "ששוני", kind: "longneck", color: "#4ac5bc", belly: "#91ead4", accent: "#7bffbf", eyes: 6, description: "צוואר ארוך, שש עיניים ומחושים זוהרים", source: "reference" },
  sunny: { name: "זיג שמש", kind: "sun", color: "#edc547", belly: "#ffe699", accent: "#ce9144", eyes: 1, description: "עין גדולה אחת ורעמת קוצים זהובה", source: "reference" },
  mint: { name: "מינטו", kind: "ears", color: "#6dc6ab", belly: "#c0ead6", accent: "#a1d9d4", eyes: 2, description: "אוזניים ארוכות ונפולות ובטן בהירה", source: "reference" },
  pine: { name: "אצטרובל", kind: "scales", color: "#d98651", belly: "#eaaa69", accent: "#82ad45", eyes: 2, description: "קשקשים כתומים וכתר עלים ירוק", source: "reference" },
  nebula: { name: "נבי", kind: "spots", color: "#3266ab", belly: "#5ba9cf", accent: "#68eee2", eyes: 4, scale: .8, description: "יצור כחול־לילה מנוקד באורות", source: "reference" },
  comet: { name: "ניצי", kind: "comet", color: "#8cddd2", belly: "#e1fff0", accent: "#a888eb", eyes: 2, description: "גור שביט עם אוזני סהר וזנב מאיר · הדמות שלך", source: "original" },
  ember: { name: "להבון", kind: "ember", color: "#f29b69", belly: "#ffe1ae", accent: "#d96388", eyes: 2, description: "יצור להבה עם סנפירי גב וקרניים · הדמות של דני", source: "original" },
  firefly: { name: "שביב", kind: "wings", color: "#7abbd1", belly: "#c6f6dc", accent: "#c8aeff", eyes: 2, description: "יצור מכונף עם מחושים ופנס בזנב", source: "original" },
  mushroom: { name: "פטרי", kind: "mushroom", color: "#b7cd7b", belly: "#e5edb8", accent: "#bd8fda", eyes: 2, description: "יצור יער קטן עם כובע פטרייה מנוקד", source: "original" }
};

export const PLAYER_CREATURE = "comet";
export const RIVAL_CREATURE = "ember";
export const CROWD_CREATURES = Object.keys(CREATURES);
export const RESIDENT_CREATURES = {
  home: "cloud", cafe: "jelly", college: "oracle", office: "sprout", tech: "nebula",
  bank: "moss", market: "pine", shop: "star", park: "mint", gym: "sunny"
};

export function creatureDesign(id) {
  if (!Object.hasOwn(CREATURES, id)) throw new Error(`יצור לא מוכר: ${id}`);
  return CREATURES[id];
}

export function eyeLayout(count) {
  if (count === 1) return [[0, .05, .24]];
  if (count === 2) return [[-.23, .08, .17], [.23, .08, .17]];
  if (count === 3) return [[-.24, 0, .15], [.24, 0, .15], [0, .31, .13]];
  if (count === 4) return [[-.22, .22, .14], [.22, .22, .14], [-.2, -.04, .12], [.2, -.04, .12]];
  if (count === 6) return [[-.23, .25, .115], [0, .32, .115], [.23, .25, .115], [-.23, -.02, .12], [0, .03, .12], [.23, -.02, .12]];
  throw new Error("מספר עיניים לא נתמך.");
}

export function starPoints(radius = 1) {
  return Array.from({ length: 10 }, (_, i) => {
    const angle = Math.PI / 2 + i * Math.PI / 5, r = radius * (i % 2 ? .45 : 1);
    return [Math.cos(angle) * r, Math.sin(angle) * r];
  });
}

export function creaturePortrait(id, mood = "idle") {
  const c = creatureDesign(id), long = c.kind === "longneck", cy = long ? 80 : 98;
  const points = starPoints(12).map(([x, y]) => `${x},${-y}`).join(" ");
  let features = "";
  if (["fur", "sun", "ember"].includes(c.kind)) {
    features += Array.from({ length: c.kind === "sun" ? 15 : 11 }, (_, i) => {
      const angle = i * 360 / (c.kind === "sun" ? 15 : 11);
      return `<path d="M-7 -42 0 -66 9 -42Z" fill="${c.kind === "ember" ? c.accent : c.color}" transform="translate(95 ${cy}) rotate(${angle})"/>`;
    }).join("");
  }
  if (["horns", "star", "jelly", "comet", "ember"].includes(c.kind))
    features += `<path d="M58 ${cy - 32}Q35 ${cy - 79} 68 ${cy - 59}L78 ${cy - 34}M112 ${cy - 34}l16-31q28-12 6 36" fill="${c.accent}"/>`;
  if (["ears", "fur", "comet"].includes(c.kind))
    features += `<ellipse cx="40" cy="${cy + (c.kind === "ears" ? 20 : -5)}" rx="15" ry="39" transform="rotate(20 40 ${cy})" fill="${c.color}"/><ellipse cx="150" cy="${cy + (c.kind === "ears" ? 20 : -5)}" rx="15" ry="39" transform="rotate(-20 150 ${cy})" fill="${c.color}"/>`;
  if (["leaves", "scales", "mushroom"].includes(c.kind))
    features += c.kind === "mushroom" ? `<path d="M32 ${cy - 15}q10-90 63-65 55-14 64 65Z" fill="${c.accent}"/><circle cx="77" cy="${cy - 53}" r="9" fill="#f4e8ca"/><circle cx="119" cy="${cy - 46}" r="7" fill="#f4e8ca"/>` :
      [-30, 0, 30].map(angle => `<ellipse cx="95" cy="${cy - 65}" rx="10" ry="30" fill="${c.kind === "scales" ? c.accent : c.color}" transform="rotate(${angle} 95 ${cy - 30})"/>`).join("");
  if (["longneck", "spots", "wings"].includes(c.kind))
    features += [-1, 0, 1].map(side => `<path d="M${95 + side * 19} ${cy - 33}q${side * 16} -18 ${side * 14} -37" stroke="${c.color}" stroke-width="5" fill="none"/><circle cx="${95 + side * 33}" cy="${cy - 70}" r="5" fill="${c.accent}"/>`).join("");
  const eyes = eyeLayout(c.eyes).map(([x, y, radius]) => {
    const ex = 95 + x * 100, ey = cy - y * 85, r = radius * 95;
    return c.kind === "star" ? `<g transform="translate(${ex} ${ey})"><g class="toon-eyes"><polygon points="${points}" fill="${c.accent}"/><circle cx="-3" cy="-4" r="3" fill="#fff6df"/></g></g>` :
      `<g class="toon-eyes"><ellipse cx="${ex}" cy="${ey}" rx="${r}" ry="${r * 1.1}" fill="#f8ffff"/><circle cx="${ex + 1}" cy="${ey + 2}" r="${r * .62}" fill="#234961"/><circle cx="${ex + 2}" cy="${ey + 3}" r="${r * .39}" fill="#131c39"/><circle cx="${ex - r * .2}" cy="${ey - r * .25}" r="${r * .19}" fill="white"/></g>`;
  }).join("");
  return `<svg class="toon creature-portrait toon-${["happy", "surprised"].includes(mood) ? mood : "idle"}" width="190" height="255" viewBox="0 0 190 255" role="img" aria-label="${c.name}">
    <ellipse cx="95" cy="236" rx="58" ry="8" fill="#19254424"/>
    <g class="toon-body">
      ${c.kind === "wings" ? `<ellipse cx="40" cy="154" rx="28" ry="40" fill="${c.accent}" opacity=".7"/><ellipse cx="150" cy="154" rx="28" ry="40" fill="${c.accent}" opacity=".7"/>` : ""}
      <ellipse cx="65" cy="226" rx="22" ry="11" fill="${c.color}"/><ellipse cx="124" cy="226" rx="22" ry="11" fill="${c.color}"/>
      <ellipse cx="95" cy="${long ? 184 : 175}" rx="${long ? 30 : 50}" ry="${long ? 41 : 54}" fill="${c.color}"/>
      <ellipse cx="95" cy="${long ? 190 : 184}" rx="${long ? 22 : 30}" ry="${long ? 29 : 37}" fill="${c.belly}"/>
      <path d="M52 153q-29 10-26 31m112-31q27 9 25 32" stroke="${c.color}" stroke-width="17" stroke-linecap="round" fill="none"/>
      ${long ? `<path d="M95 151V82" stroke="${c.color}" stroke-width="22"/>` : ""}
      ${features}<ellipse cx="95" cy="${cy}" rx="${long ? 39 : 52}" ry="${long ? 38 : 48}" fill="${c.color}"/>
      ${["spots", "scales", "jelly"].includes(c.kind) ? Array.from({ length: 10 }, (_, i) => `<ellipse cx="${55 + i % 5 * 20}" cy="${143 + Math.floor(i / 5) * 24}" rx="${c.kind === "scales" ? 10 : 4}" ry="${c.kind === "scales" ? 12 : 5}" fill="${c.kind === "spots" ? c.accent : c.belly}"/>`).join("") : ""}
      ${eyes}<ellipse cx="95" cy="${cy + 21}" rx="6" ry="4" fill="${c.accent}"/>
      ${mood === "surprised" ? `<ellipse cx="95" cy="${cy + 32}" rx="8" ry="10" fill="#3b274e"/>` : `<path d="M76 ${cy + 28}q19 25 39 0q-20 10-39 0" fill="#3b274e"/><path d="M82 ${cy + 31}h26l-3 5H86Z" fill="#fff5d6"/>`}
    </g></svg>`;
}
