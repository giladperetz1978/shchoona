import { PLACES, travelCost } from "./engine.js";
import { CHARACTERS } from "./characters.js";
import { creaturePortrait } from "./creatures.js";

export function characterArt(place, mood = "idle") {
  return creaturePortrait(CHARACTERS[place].creature, mood);
}

export function icon(name, size = 22) {
  const paths = {
    home: '<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    wallet: '<path d="M20 8V5H5a2 2 0 0 0 0 4h16v11H5a2 2 0 0 1-2-2V7m18 6h-5v3h5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
    heart: '<path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-5 5 3 11 8 15 5-4 13-10 8-15Z"/>',
    book: '<path d="M12 5v16M3 3c4 0 6 0 9 2 3-2 5-2 9-2v15c-4 0-6 0-9 3-3-3-5-3-9-3Z"/>',
    work: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12c6 4 12 4 18 0M10 13h4v4h-4Z"/>',
    map: '<path d="m2 5 6-2 8 3 6-3v17l-6 2-8-3-6 2Zm6-2v16m8-13v16"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/>',
    save: '<path d="M4 3h14l3 3v15H3V3Zm3 0v6h10V3M7 21v-8h10v8"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5m0 3v1"/>',
    energy: '<path d="m13 2-9 12h7l-1 8 10-13h-7Z"/>',
    food: '<path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v19M19 3c-5 3-5 10 0 10m0-10v19"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    leaf: '<path d="M20 3C4 0 1 14 9 18c8 4 13-5 11-15ZM4 22 16 8"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
    bag: '<path d="M4 7h16l1 14H3ZM8 8V6a4 4 0 0 1 8 0v2"/>'
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.sun}</svg>`;
}

function tree(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cy="10" rx="20" ry="8" fill="#385e4820"/><path d="M0 8v-42" stroke="#8a775d" stroke-width="6"/><path d="m0-18-12-10M0-30l10-7" stroke="#8a775d" stroke-width="3"/><circle cy="-43" r="23" fill="#688c67"/><circle cx="-10" cy="-48" r="16" fill="#81a179"/><circle cx="8" cy="-57" r="14" fill="#95b48a"/></g>`;
}

function person(x, y, id, scale = 1) {
  return `<g transform="translate(${x - 22 * scale} ${y - 60 * scale}) scale(${.24 * scale})">${creaturePortrait(id)}</g>`;
}

function building(place, x, y, current, hours) {
  const windows = [20, 53, 86, 119].map(wx => `<rect x="${wx}" y="45" width="23" height="28" rx="2" fill="#526e74"/><rect x="${wx + 2}" y="47" width="9" height="24" fill="#a7c2c0"/><path d="M${wx} 58h23" stroke="#e6dbc8" stroke-width="2"/>`).join("");
  const stripes = Array.from({ length: 9 }, (_, i) => `<path d="M${13 + i * 16} 95h16l6 18h-18Z" fill="${i % 2 ? "#f7eddb" : place.color}"/>`).join("");
  const plants = `<rect x="17" y="142" width="15" height="12" rx="3" fill="#ad7c59"/><ellipse cx="24" cy="136" rx="12" ry="10" fill="#759372"/>`;
  const shop = ["cafe", "shop", "market", "gym"].includes(place.id);
  const selected = current ? `<ellipse cx="88" cy="182" rx="23" ry="9" fill="#244e4620"/><circle cx="88" cy="171" r="13" fill="#28594e" stroke="#fff9ed" stroke-width="3"/><path d="m83 171 4 4 7-8" fill="none" stroke="white" stroke-width="2"/>` : "";
  return `<g class="map-building${current ? " is-here" : ""}" role="button" tabindex="0" aria-label="כניסה אל ${place.name}${current ? ", המיקום שלך" : ""}" data-go="${place.id}" transform="translate(${x} ${y})">
    <title>${place.name} — ${place.label} · ${hours} ש׳ נסיעה</title>
    <rect class="building-hit" x="-8" y="-5" width="187" height="205" rx="12" fill="transparent"/>
    <ellipse cx="88" cy="160" rx="87" ry="13" fill="#76644c18"/>
    <path d="m163 30 17-12v125l-17 15Z" fill="#b6a791"/>
    <rect x="8" y="30" width="155" height="127" rx="3" fill="#eae0cb"/>
    <path d="M8 30 24 16h156l-17 14Z" fill="#f4eddf"/>
    <path d="M4 26h163v10H4Z" fill="${place.color}"/>
    ${windows}
    <rect x="17" y="82" width="138" height="17" rx="3" fill="${place.color}"/>
    <text x="86" y="94" fill="#253b3d" text-anchor="middle" font-size="11" font-weight="700">${place.name}</text>
    <rect x="20" y="108" width="44" height="40" fill="#779a9a"/>
    <path d="M22 110h19v36H22Z" fill="#b4d0c7"/><path d="M42 110v36" stroke="#f0e5d4" stroke-width="3"/>
    <rect x="76" y="106" width="30" height="51" fill="#577d7c"/><rect x="80" y="109" width="22" height="31" fill="#b1ceca"/>
    <circle cx="100" cy="142" r="2" fill="#eee3c4"/><path d="M70 157h42v4H70" fill="#b7ae99"/>
    <rect x="117" y="109" width="31" height="35" fill="#8da8a2"/><path d="m120 137 25-24v24Z" fill="#a8c5b7"/>
    ${shop ? stripes : `<path d="M71 103h41l5 5H66Z" fill="${place.color}"/>`}
    ${plants}
    ${place.id === "home" ? '<path d="m2 26 83-29 87 29Z" fill="#ba7c68"/><path d="m2 26 83-22 87 22" fill="none" stroke="#ce937b" stroke-width="5"/>' : ""}
    ${place.id === "tech" ? '<rect x="119" y="0" width="33" height="20" rx="2" fill="#586b83"/><path d="m128 5-4 5 4 5m14-10 4 5-4 5" stroke="#d9e8e5" stroke-width="2" fill="none"/>' : ""}
    ${place.id === "bank" ? '<path d="m8 24 78-25 78 25Z" fill="#cbc1a3"/><circle cx="86" cy="14" r="9" fill="#f8efdb"/><text x="86" y="18" text-anchor="middle" font-size="12" fill="#786c50">₪</text>' : ""}
    <text x="86" y="180" text-anchor="middle" fill="#506459" font-size="10">${current ? "" : `${place.label} · ${hours} ש׳`}</text>
    ${selected}
  </g>`;
}

export function cityArt(state) {
  const coords = [[810, 34], [617, 34], [424, 34], [231, 34], [38, 34], [38, 410], [231, 410], [424, 410], [617, 410], [810, 410]];
  return `<svg class="city-svg" viewBox="0 0 1030 620" aria-label="מפת השכונה, עשרה מקומות שאפשר להיכנס אליהם">
    <defs><pattern id="grass" width="30" height="30" patternUnits="userSpaceOnUse"><path d="m5 8 2-3m15 18 2-3" stroke="#88a57b" stroke-width="1" opacity=".35"/></pattern></defs>
    <rect width="1030" height="620" rx="16" fill="#ebe9d9"/>
    <path d="M0 249h1030v122H0Z" fill="#d1d4c7"/>
    <path d="M0 261h1030M0 359h1030" stroke="#f6f3e4" stroke-width="3"/>
    <path d="M0 309h1030" stroke="#f8f4e6" stroke-width="2" stroke-dasharray="19 16"/>
    <rect x="169" y="269" width="692" height="82" rx="40" fill="#adbda0" stroke="#f3efdd" stroke-width="8"/>
    <rect x="178" y="277" width="674" height="66" rx="32" fill="url(#grass)"/>
    <path d="M417 269v82m196-82v82" stroke="#e3d7b9" stroke-width="19"/>
    <ellipse cx="516" cy="310" rx="50" ry="27" fill="#e6decc"/><ellipse cx="516" cy="307" rx="40" ry="21" fill="#88b9b8"/><ellipse cx="516" cy="303" rx="28" ry="12" fill="#abd2cc"/><path d="M516 306v-29m-10 13q10-30 20 0" stroke="#e9f7e8" fill="none" stroke-width="3"/>
    ${[205, 269, 337, 678, 745, 814].map((x, i) => tree(x, 320, .8 + i % 2 * .1)).join("")}
    <g fill="#eeeedd">${[0, 1, 2, 3, 4].map(i => `<rect x="100" y="${267 + i * 18}" width="35" height="10"/><rect x="892" y="${267 + i * 18}" width="35" height="10"/>`).join("")}</g>
    <g class="city-car"><rect x="10" y="277" width="48" height="20" rx="7" fill="#bf8069"/><rect x="21" y="279" width="21" height="16" rx="3" fill="#d4dbce"/><path d="M18 275h8m14 0h8m-30 24h8m14 0h8" stroke="#555f5b" stroke-width="4"/></g>
    <g transform="translate(967 324)"><rect width="46" height="20" rx="7" fill="#719b9c"/><rect x="12" y="2" width="20" height="16" rx="3" fill="#d4dbce"/></g>
    ${PLACES.map((p, i) => building(p, ...coords[i], p.id === state.location, travelCost(state, p.id))).join("")}
    ${tree(20, 224, .72)}${tree(1010, 224, .72)}${tree(20, 584, .7)}${tree(1008, 584, .7)}
    ${person(470, 247, "firefly", .6)}${person(720, 384, "mushroom", .65)}${person(196, 239, "mint", .65)}
    <g fill="#879078"><circle cx="372" cy="390" r="3"/><circle cx="382" cy="395" r="3"/><circle cx="389" cy="385" r="3"/></g>
  </svg>`;
}

function plant(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-16 0h32l-5 29h-22Z" fill="#bd8066"/><path d="M0 0v-70" stroke="#5f795a" stroke-width="4"/><path d="M0-10q-42-5-30-35Q0-40 0-10m0-24q37-5 29-34Q0-64 0-34m0-17q-29-9-20-28Q0-75 0-51" fill="#76976b"/></g>`;
}
function desk(x, y, color = "#c69d79") {
  return `<g transform="translate(${x} ${y})"><path d="M8 8v66m150-66v66" stroke="#657b79" stroke-width="8"/><rect width="170" height="12" rx="3" fill="${color}"/><rect x="55" y="-58" width="65" height="45" rx="4" fill="#415d63"/><rect x="60" y="-53" width="55" height="35" fill="#b2d1c8"/><path d="M86-12v12m-16 0h33" stroke="#415d63" stroke-width="5"/><path d="M24-8h24" stroke="#e9e1cf" stroke-width="7"/></g>`;
}

export function interiorArt(place) {
  const outdoor = place.id === "park";
  let furniture = "";
  if (place.id === "home") {
    furniture = `<rect x="120" y="220" width="245" height="75" rx="17" fill="#a9b29c"/><rect x="108" y="255" width="271" height="76" rx="14" fill="#889984"/><path d="M125 331v17m236-17v17" stroke="#826e58" stroke-width="8"/><rect x="132" y="230" width="68" height="56" rx="9" fill="#e9cc9d"/><rect x="269" y="231" width="64" height="54" rx="9" fill="#c5826b"/><ellipse cx="422" cy="343" rx="89" ry="23" fill="#d6b38f"/><path d="M361 350v35m122-35v35" stroke="#8d765e" stroke-width="7"/><rect x="403" y="320" width="40" height="14" rx="2" fill="#80928c"/>${desk(648, 276)}<path d="M82 315V149m-42 3h84l-17-54H56Z" fill="#ead3a6" stroke="#9f8a69" stroke-width="4"/>`;
  } else if (place.id === "cafe") {
    furniture = `${person(430, 280, "jelly", 2.2)}<rect x="80" y="212" width="485" height="111" rx="4" fill="#c09778"/><path d="M80 235h485v88H80Z" fill="#d6b291"/><path d="M91 249h462m-462 17h462m-462 17h462m-462 17h462" stroke="#c09b7b"/><rect x="70" y="200" width="505" height="18" rx="4" fill="#5a7169"/><rect x="148" y="143" width="103" height="56" rx="6" fill="#718582"/><rect x="158" y="153" width="83" height="24" fill="#374f50"/><path d="M176 183v10m45-10v10" stroke="#e8e5d3" stroke-width="5"/><path d="M297 200v-22h19v22m13 0v-22h19v22" fill="#f9edd9"/><ellipse cx="727" cy="286" rx="91" ry="22" fill="#bc9775"/><path d="M727 306v77" stroke="#6e7564" stroke-width="9"/><path d="M647 331v52m160-52v52" stroke="#9d775e" stroke-width="8"/><rect x="628" y="322" width="48" height="12" rx="4" fill="#8ea48e"/><rect x="783" y="322" width="48" height="12" rx="4" fill="#8ea48e"/>`;
  } else if (["office", "tech"].includes(place.id)) {
    furniture = `${desk(110, 275)}${desk(373, 275)}${desk(648, 275)}${person(600, 334, "nebula", 1.5)}<path d="M120 128h116m-116 12h75m-75 12h95" stroke="#c9ad81" stroke-width="6"/><rect x="418" y="100" width="133" height="80" rx="4" fill="#faf4e7"/><path d="m440 157 23-19 27 7 37-29" stroke="#89a692" stroke-width="5" fill="none"/>`;
  } else if (place.id === "college") {
    furniture = `<rect x="280" y="88" width="380" height="140" rx="5" fill="#b69870"/><rect x="290" y="98" width="360" height="120" fill="#486d61"/><text x="470" y="145" text-anchor="middle" font-size="25" fill="#f8f2d9">כל יום לומדים משהו חדש</text><path d="M365 176h205m-180 17h155" stroke="#b8ccb2" stroke-width="3"/>${[145, 400, 655].map(x => `<g transform="translate(${x} 290)"><path d="M0 0h145v12H0Z" fill="#c2a482"/><path d="M10 12v73m125-73v73" stroke="#6c827e" stroke-width="7"/><rect x="43" y="-9" width="56" height="9" fill="#a4b5c2"/><rect x="40" y="40" width="63" height="12" rx="4" fill="#8b9fa0"/></g>`).join("")}${person(743, 260, "oracle", 1.5)}`;
  } else if (place.id === "bank") {
    furniture = `${person(171, 281, "moss", 2.1)}<rect x="85" y="229" width="524" height="107" fill="#b6ad92"/><rect x="75" y="215" width="544" height="17" rx="3" fill="#e1d8bc"/><path d="M267 231v103m171-103v103" stroke="#968f79" stroke-width="3"/><path d="M93 215V128h511v87" stroke="#9fb6b3" fill="#c2d7ce55" stroke-width="5"/><path d="M267 130v83m171-83v83" stroke="#9fb6b3" stroke-width="5"/><rect x="736" y="172" width="100" height="166" rx="7" fill="#6f8d88"/><rect x="752" y="193" width="68" height="51" rx="3" fill="#cee1cd"/><path d="M757 270h59m-49 21h41" stroke="#405b56" stroke-width="6"/><circle cx="355" cy="120" r="31" fill="#dfd0a6"/><text x="355" y="133" text-anchor="middle" font-size="40" fill="#776c51">₪</text>`;
  } else if (place.id === "market") {
    const colors = ["#c7866b", "#b8bd82", "#dcb56e", "#809c8b"];
    furniture = [120, 370, 620].map(x => `<g transform="translate(${x} 110)"><rect width="185" height="192" rx="3" fill="#b6a17f"/>${[0, 1, 2].map(row => `<rect x="5" y="${row * 60 + 53}" width="175" height="7" fill="#e9d6b2"/>${[0, 1, 2, 3, 4].map(i => `<rect x="${15 + i * 32}" y="${row * 60 + 13}" width="23" height="38" rx="3" fill="${colors[(i + row) % 4]}"/><rect x="${18 + i * 32}" y="${row * 60 + 24}" width="17" height="12" fill="#f4e8ca"/>`).join("")}`).join("")}</g>`).join("") + `<path d="M140 328h199v60H140Z" fill="#c09972"/><path d="M154 341h171m-171 16h171m-171 17h171" stroke="#a17f5b" stroke-width="4"/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<circle cx="${157 + i * 26}" cy="323" r="14" fill="${i % 2 ? "#b2b16c" : "#c88861"}"/>`).join("")}`;
  } else if (place.id === "shop") {
    furniture = `${desk(123, 245, "#ddd3c1")}${desk(379, 245, "#ddd3c1")}<g transform="translate(738 304)" stroke="#577b77" fill="none" stroke-width="5"><circle cx="-60" r="42"/><circle cx="60" r="42"/><path d="m-60 0 32-58L5 0h-65m32-58h66L5 0m33-58 22 58m-91-58-7-16m-13 0h25m64 16 4-24h18"/></g><rect x="153" y="107" width="370" height="64" rx="6" fill="#e0d0d2"/><text x="338" y="148" text-anchor="middle" font-size="27" fill="#7f6a79">שדרוג קטן. אפשרויות גדולות.</text>`;
  } else if (place.id === "gym") {
    furniture = `<rect x="260" y="87" width="450" height="157" rx="3" fill="#b9cfcb" stroke="#e8dec9" stroke-width="7"/><path d="m278 98 142 137m32-137 140 137" stroke="#d3dfd3" stroke-width="16"/><ellipse cx="354" cy="342" rx="141" ry="31" fill="#b49fab"/><ellipse cx="701" cy="342" rx="121" ry="31" fill="#9cac8d"/><g stroke="#586b69" stroke-width="9"><path d="M96 281h89m-73-21v42m56-42v42M800 225h81m-68-21v42m55-42v42"/></g>${person(359, 330, "sunny", 1.8)}`;
  } else {
    furniture = `${tree(140, 315, 3.2)}${tree(816, 302, 3.5)}${tree(640, 200, 1.8)}<path d="M0 400Q340 195 1000 348" stroke="#ddc8a7" stroke-width="64" fill="none"/><path d="M336 282h200v15H336m0 12h200v15H336m-192 0v43m180-43v43" stroke="#967655" stroke-width="8"/>${person(590, 345, "mint", 1.6)}${person(665, 355, "mushroom", 1.5)}`;
  }
  return `<svg class="interior-svg" viewBox="0 0 1000 430" role="img" aria-label="פנים ${place.name} — איור מקורי">
    <defs><pattern id="floor" width="100" height="38" patternUnits="userSpaceOnUse" patternTransform="skewX(-30)"><path d="M0 0h100v38" fill="none" stroke="#b8a686" stroke-opacity=".3"/></pattern></defs>
    <rect width="1000" height="430" fill="${outdoor ? "#d9e5d5" : "#eee4d3"}"/>
    <rect y="283" width="1000" height="147" fill="${outdoor ? "#aebe96" : "#dac7a6"}"/>
    ${outdoor ? '<circle cx="477" cy="82" r="39" fill="#f7e9b9"/>' : `<rect y="283" width="1000" height="147" fill="url(#floor)"/><path d="M0 279h1000" stroke="#c0ac8c" stroke-width="9"/><path d="M0 0h1000v17H0Z" fill="${place.color}"/>
    <rect x="42" y="62" width="124" height="115" rx="3" fill="#f9efdc"/><rect x="50" y="70" width="108" height="99" fill="#b6d0ca"/><path d="M54 144q30-60 48-15 40-50 54 5v29H54Z" fill="#8daa8a"/><path d="M104 68v103M50 121h108" stroke="#f9efdc" stroke-width="6"/><path d="M500 0v40" stroke="#7d8070" stroke-width="3"/><path d="M467 65q0-45 66 0Z" fill="#718b7c"/><ellipse cx="500" cy="65" rx="31" ry="6" fill="#f8e6b2"/>`}
    ${furniture}
    ${outdoor ? "" : plant(914, 292, 1.2)}
    <rect y="414" width="1000" height="16" fill="#314f4420"/>
  </svg>`;
}
