import { PLACES, JOBS, GOALS, createGame, money, progress, actionsFor, unavailable, perform, travel, endWeek, parseSave, mixCoffee, serveCoffee, ride, courierTarget, handoffStatus, raceOver } from "./engine.js";
import { createCityInterface } from "./city-interface.js";
import { streetScene } from "./courier-scene.js";
import { icon, cityArt, interiorArt, characterArt } from "./art.js";
import { CHARACTERS, COFFEE_RECIPES, INGREDIENTS } from "./characters.js";
import { CREATURES, PLAYER_CREATURE, creaturePortrait } from "./creatures.js";
import { newsFor } from "./city-news.js";
import { createOnlineClient } from "./online-client.js";

const SAVE_KEY = "neighborhood-life-v1";
const app = document.querySelector("#app");
const dialog = document.querySelector("#dialog");
const toast = document.querySelector("#toast");
let state = createGame();
let inside = false;
let saveStatus = "שמירה אוטומטית";
let toastTimer;
let startupError = "";
let restored = false;
let cityUI;
let classicMode = false;
let voiceEnabled = false;
const demo = new URLSearchParams(location.search).has("ride-demo");
try {
  const saved = !demo && localStorage.getItem(SAVE_KEY);
  if (saved) { state = parseSave(saved); restored = true; }
} catch (error) { startupError = error.message; }
if (state.cafeOrder || state.courier) inside = true;
const escape = text => String(text).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const online = createOnlineClient({ notify, update: receiveOnline });
const rivalName = () => state.online ? "היריב ברשת" : "דני";

function receiveOnline(result) {
  if (!online.active) return;
  const previous = state;
  state = result.state;
  if (previous.online?.revision !== state.online.revision || previous.online?.peerConnected !== state.online.peerConnected) render();
  if (!cityUI?.busy && !previous.won && state.won) victory();
  else if (!cityUI?.busy && !previous.opponent?.won && state.opponent?.won) defeat();
  else if (state.week > previous.week && result.report) { inside = false; render(); weeklyReport(result.report); }
}
async function serverResult(kind, id = "") {
  try { return await online.command(kind, id); }
  catch (error) { console.error("Online command rejected:", error); return { state, error: error.message }; }
}
async function connectRoom(mode, data = {}) {
  try {
    const result = await online.connect(mode, data);
    cityUI?.dispose(); cityUI = null; state = result.state; inside = Boolean(state.cafeOrder);
    classicMode = false; dialog.close(); render();
    notify(`חדר ${state.online.room} · שחקן ${state.online.seat + 1}. השמירה המקומית שלך לא השתנתה.`);
    if (state.won) victory();
    else if (state.opponent?.won) defeat();
  } catch (error) { console.error("Room connection failed:", error); notify(error.message, true); }
}
function networkMenu() {
  if (online.active) {
    showDialog("חדר הרשת שלך", `<p>קוד להזמנת חבר: <strong class="room-code" dir="ltr">${state.online.room}</strong></p><p>שחקן ${state.online.seat + 1} · ${online.connected ? "מחובר לשרת" : "החיבור נעצר — מנסים להתחבר מחדש"}</p><p>שני השחקנים פועלים במקביל. שבוע חדש מתחיל אחרי ששניכם מסיימים. היריב, הפעולות והחדשות מתעדכנים מהשרת.</p><button class="secondary" data-command="offline">לחזור למשחק המקומי</button><p class="dialog-footnote">החדר נשמר בשרת. אפשר לחזור אליו מהלשונית הזאת; החדר אינו מתפנה ביציאה.</p>`);
    return;
  }
  showDialog("משחק רשת · שני שחקנים", `<p>מרוץ פרטי עם חבר, לא יריב ממוחשב. השרת מאמת כסף, זמן ופעולות. השמירה המקומית נשארת נפרדת.</p>
    <form id="room-create"><button class="primary start-button" type="submit">ליצור חדר חדש · מרוץ קצר</button></form>
    <form id="room-join"><label>קוד חדר <input name="code" class="room-input" dir="ltr" maxlength="6" pattern="[a-fA-F0-9]{6}" required autocomplete="off" placeholder="A1B2C3"></label><button class="secondary" type="submit">להצטרף לחבר</button></form>
    ${online.resumable ? '<button class="text-button" data-command="resume-room">לחזור לחדר השמור בלשונית</button>' : ""}
    <p class="dialog-footnote">נדרש שרת Node של המשחק באותה כתובת. GitHub Pages מציג את המשחק המקומי בלבד. שרת הרשת שומר חדרים עד 24 שעות; משלוחי רכיבה זמינים בינתיים במצב המקומי.</p>`, "network-dialog");
}

function notify(message, error = false) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `visible${error ? " error" : ""}`;
  toastTimer = setTimeout(() => { toast.className = ""; }, error ? 8000 : 4500);
}

function persist() {
  if (demo || online.active) return true;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    saveStatus = "כל השינויים נשמרו";
    return true;
  } catch (error) {
    saveStatus = "השמירה נכשלה";
    notify(`לא ניתן לשמור בדפדפן: ${error.message}. המשחק ממשיך בזיכרון בלבד.`, true);
    return false;
  }
}

function meter(label, value, kind) {
  return `<div class="need"><div class="need-label">${icon(kind, 16)}<span>${label}</span><strong>${Math.round(value)}<small>/100</small></strong></div><div class="meter ${kind}${value < 20 ? " low" : ""}" role="progressbar" aria-label="${label}" aria-valuenow="${Math.round(value)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${value}%"></span></div></div>`;
}

let stopRiding;
function courierScreen() {
  app.innerHTML = `<main class="ride-screen"><canvas aria-label="רחובות השכונה במבט מאחורי הרוכב"></canvas>
    <header><div><small>מחוז הגפן · משמרת שליחים</small><b id="ride-goal"></b></div><span id="ride-clock"></span><button data-ride="cancel">ביטול</button></header>
    <aside class="ride-handoff"><span id="ride-tip"></span><button id="ride-interact" disabled>איסוף · E</button></aside>
    <div class="ride-controls"><small>חיצים או WASD · במגע מחזיקים כדי לרכוב ולפנות</small><div dir="ltr">
    <button data-key="Left" aria-label="פנייה שמאלה">◀</button><button data-key="Right" aria-label="פנייה ימינה">▶</button>
    <button data-key="Down">בלם</button><button data-key="Up">גז</button></div></div></main>`;
  const preview = app.querySelector("canvas");
  let draw = streetScene(preview), navigator;
  const goal = app.querySelector("#ride-goal"), clock = app.querySelector("#ride-clock");
  const prompt = app.querySelector("#ride-tip"), handoff = app.querySelector("#ride-interact");
  let interact = false;
  handoff.onclick = () => { interact = true; };
  const keys = new Set(), touches = new Map(), controller = new AbortController();
  const options = { signal: controller.signal };
  const mapping = { ArrowUp:"Up",KeyW:"Up",ArrowDown:"Down",KeyS:"Down",ArrowLeft:"Left",KeyA:"Left",ArrowRight:"Right",KeyD:"Right" };
  for (const type of ["keydown","keyup"]) window.addEventListener(type, e => {
    if (e.code === "KeyE" && type === "keydown" && !e.repeat) interact = true;
    if (!mapping[e.code]) return;
    e.preventDefault();
    if (type === "keydown") keys.add(e.code); else keys.delete(e.code);
  }, options);
  for (const button of app.querySelectorAll("[data-key]")) {
    button.onpointerdown = e => { e.preventDefault(); button.setPointerCapture(e.pointerId); touches.set(e.pointerId, button.dataset.key); };
    button.onlostpointercapture = e => touches.delete(e.pointerId);
  }
  window.addEventListener("blur", () => { keys.clear(); touches.clear(); }, options);
  window.addEventListener("pagehide", persist, options);
  let last = performance.now(), lastSave = last, frame;
  stopRiding = () => { cancelAnimationFrame(frame); controller.abort(); draw.dispose?.(); stopRiding = null; };
  import("./courier-world.js").then(({ buildStreet }) => {
    if (controller.signal.aborted) return;
    const canvas = preview.cloneNode(false);
    const world = buildStreet(canvas);
    preview.replaceWith(canvas);
    draw = world;
    canvas.dataset.renderer = "three";
    canvas.insertAdjacentHTML("afterend", `<svg class="ride-nav" viewBox="-0.6 -0.6 7.2 5.2" aria-label="מפת רחובות ויעד" role="img">
      <path d="M0 0H6V4H0ZM0 2H6M2 0V4M4 0V4" fill="none" stroke="#acb9ac" stroke-width=".12"/>
      <circle r=".22" fill="#ffcf49"/><path class="bike-pin" d="M0 -.32L.2 .19L0 .11L-.2 .19Z" fill="#6cffe4"/></svg>`);
    navigator = canvas.nextElementSibling;
  }).catch(error => {
    if (!controller.signal.aborted) { console.warn("3D courier scene unavailable:", error); notify("תלת־ממד לא זמין בדפדפן הזה. ממשיכים בתצוגת הרכיבה הקלה."); }
  });
  function tick(t) {
    const held = new Set([...Array.from(keys, code => mapping[code]), ...touches.values()]);
    const result = ride(state, { dt: Math.min(.1, Math.max(0,(t-last)/1000)), steer: +held.has("Right") - +held.has("Left"), throttle: +held.has("Up") - +held.has("Down"), interact });
    interact = false;
    last = t;
    if (result.error) { stopRiding(); notify(result.error, true); return; }
    if (!result.state.courier) { accept(result, "gig"); return; }
    state = result.state;
    if (result.message || t-lastSave > 1000) { lastSave = t; if (persist() && result.message) notify(result.message); }
    const o = state.courier, target = courierTarget(o);
    draw(o, target, t);
    if (navigator) {
      navigator.querySelector("circle").setAttribute("transform", `translate(${target.x} ${target.y})`);
      navigator.querySelector(".bike-pin").setAttribute("transform", `translate(${o.x} ${o.y}) rotate(${o.angle*180/Math.PI})`);
    }
    goal.textContent = `${o.picked ? "מסירה" : "איסוף"} · ${target.name}`;
    const status = handoffStatus(o);
    handoff.disabled = status !== "ready";
    handoff.textContent = o.picked ? "למסור · E" : "לאסוף · E";
    prompt.textContent = status === "ready" ? (o.picked ? "הלקוח כאן. אפשר למסור!" : "ניסו: שתי מנות חמות, בדיוק בזמן!") : status === "brake" ? "הגעת! להחזיק בלם ↓ ולעצור" : o.picked ? "לחפש את הלקוח ליד הסימון הזהוב" : "ישר בשדרת הגפן, עד הסוכך המפוספס";
    clock.textContent = `${Math.max(0,Math.ceil((o.deadline-Date.now())/1000))} שנ׳ · ${Math.round(20*Math.hypot(o.x-target.x,o.y-target.y))} מ׳`;
    frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
}

function moveCourier(command) {
  const result = ride(state, command);
  if (result.error) { notify(result.error, true); return; }
  if (!result.state.courier) { accept(result, "gig"); return; }
}

function render() {
  stopRiding?.();
  document.body.classList.toggle("city-mode", !classicMode && !state.courier && !demo);
  if (state.courier || classicMode || demo) { cityUI?.dispose(); cityUI = null; }
  if (state.courier) { courierScreen(); return; }
  if (demo) {
    app.innerHTML = `<main class="courier card"><div class="eyebrow">נסיעת ניסיון · ללא שינוי בשמירה שלך</div><h1>משלוח בשכונה</h1><p>${restored ? escape(state.log[0]) : "האופניים מוכנים. רוכבים ישר לקפה, אוספים ומנווטים לפי המפה אל הלקוח."}</p><p>חץ למעלה להאצה · ימינה ושמאלה להיגוי · למטה לבלימה</p><button class="primary" data-try>לקבל הזמנה ולרכוב</button></main>`;
    app.querySelector("[data-try]").onclick = () => {
      state = createGame(); state.location = "park"; state.inventory.bike = true; restored = true;
      accept(perform(state,"gig"));
    };
    return;
  }
  if (!classicMode) {
    cityUI ??= createCityInterface(app, {
      enter, command: handleCommand, notify, coffeeView, benefits: choiceBenefits, paused: () => dialog.open
    });
    cityUI.update(state, inside);
    return;
  }
  const place = PLACES.find(p => p.id === state.location);
  const goals = progress(state);
  const total = Math.floor(goals.reduce((sum, g) => sum + g.percent, 0) / 4);
  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#" data-command="map" aria-label="החיים בשכונה — מפת העיר"><span class="brand-mark">${icon("home", 28)}</span><span>החיים בשכונה<small>הסיפור שלך, הקצב שלך.</small></span></a>
      <nav aria-label="ניווט ראשי"><button data-command="city">לעיר התלת־ממדית</button><button aria-label="השכונה" class="${!inside ? "active" : ""}" data-command="map">${icon("map", 18)}<span>השכונה</span></button><button aria-label="הטלפון שלי" data-command="phone">${icon("phone", 18)}<span>הטלפון שלי</span></button><button data-command="news">חדשות</button><button data-command="network">רשת</button><button aria-label="איך משחקים" data-command="help">${icon("help", 18)}<span>איך משחקים</span></button></nav>
      <button class="save-button" data-command="save" aria-label="שמירת משחק — ${saveStatus}">${icon("save", 17)}<span>${saveStatus}</span><i class="${saveStatus.includes("נכשלה") ? "failed" : ""}"></i></button>
    </header>
    <main class="layout">
      <aside class="sidebar">
        <section class="profile card"><div class="profile-top"><div class="avatar">${avatar()}</div><div><span class="eyebrow">נעים להכיר, אלה החיים שלך</span><h2>הסיפור רק מתחיל</h2><p>${state.job ? JOBS[state.job].name : "בין עבודות, עם המון אפשרויות"}</p></div></div><div class="profile-badges"><span>${icon("home", 13)} ${state.housing === "basic" ? "דירת התחלה" : "דירה משודרגת"}</span><span>${icon("work", 13)} ${state.experience} ש׳ ניסיון</span></div></section>
        <section class="goals card"><div class="section-heading"><h2>החיים, בארבע מטרות</h2><span class="goal-total">${total}%</span></div><p class="section-note">לא רק להתפרנס. גם לחיות טוב.</p>
          ${goals.map((g, i) => `<div class="goal"><div class="goal-icon" style="--goal-color:${g.color}">${icon(["wallet", "heart", "book", "work"][i], 18)}</div><div class="goal-content"><div class="goal-heading"><h3>${g.name}</h3><span>${Math.floor(g.percent)}%</span></div><div class="meter" role="progressbar" aria-label="${g.name}" aria-valuenow="${Math.floor(g.percent)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${g.percent}%;background:${g.color}"></span></div><p>${g.format(g.value)} <span>מתוך ${g.format(g.target)}</span></p></div></div>`).join("")}
          <div class="goal-foot">${icon("leaf", 15)} ${GOALS[state.difficulty].name} · בלי מגבלת שבועות</div>
        </section>
        <section class="needs card"><h2>לפני הכול, לדאוג לעצמך</h2>${meter("אנרגיה", state.energy, "energy")}${meter("שובע", state.food, "food")}<div class="inventory">${icon("bag", 16)} ${state.inventory.groceries === 1 ? "מנה אחת" : `${state.inventory.groceries} מנות`} בתיק <span>${[state.inventory.bike && "אופניים", state.inventory.laptop && "מחשב"].filter(Boolean).join(" · ")}</span></div></section>
        <section class="tip-card"><span class="tip-icon">${icon("sun", 23)}</span><div><h3>צעד קטן לשבוע הזה</h3><p>${tip()}</p></div></section>
        ${state.opponent ? `<section class="card rival"><strong>${rivalName()} · היריב שלך</strong><p>${Math.floor(progress(state.opponent).reduce((sum, goal) => sum + goal.percent, 0) / 4)}% מהמטרות</p><button data-command="rival">לצפות בפעולות שלו</button><small>אותם חוקים. הראשון שמשלים את כל המטרות מנצח.</small></section>` : ""}
        <button class="new-game" data-command="new">להתחיל סיפור חדש</button>
      </aside>
      <div class="main-column">
        <section class="welcome-line"><div><div class="eyebrow">יום חדש. הזדמנויות חדשות.</div><h1>${inside ? place.name : "בוקר טוב, השכונה מחכה לך."}</h1><p>${inside ? place.label : "יש זמן לעבוד, יש זמן לחלום. לאן הולכים היום?"}</p></div><div class="week-badge">${icon("sun", 19)}<span>שבוע <b>${state.week}</b></span></div></section>
        <section class="stats" aria-label="מצב השבוע">
          <div class="stat"><span class="stat-icon">${icon("wallet", 23)}</span><div><span>הכסף שלך</span><strong>${money(state.cash)}</strong></div><small>זמין לשימוש</small></div>
          <div class="stat"><span class="stat-icon lavender">${icon("clock", 23)}</span><div><span>הזמן שנותר</span><strong>${state.hours} <small>שעות</small></strong></div><div class="time-dots" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i class="${state.hours > i * 6 ? "filled" : ""}"></i>`).join("")}</div></div>
          <div class="stat"><span class="stat-icon peach">${icon("home", 23)}</span><div><span>שכירות שבועית</span><strong>${money(state.rent)}</strong></div><small>בסוף השבוע</small></div>
        </section>
        ${state.food < 15 || state.energy < 20 ? `<div class="warning" role="status">${icon("energy", 17)} ${state.food < 15 ? "הגיע הזמן לאכול. אפשר להכין ארוחה בבית או לקנות אוכל." : "האנרגיה נמוכה. מנוחה בבית היא בחינם."}</div>` : ""}
        ${inside ? interiorView(place) : mapView(place)}
        <div class="below-grid"><section class="journal card"><div class="section-heading"><h2>${icon("book", 17)} הסיפור של השבוע</h2><button class="text-button" data-command="journal">ליומן המלא ${icon("arrow", 14)}</button></div><ol>${state.log.slice(0, 3).map((entry, i) => `<li><span class="log-dot ${i === 0 ? "latest" : ""}"></span>${escape(entry)}</li>`).join("")}</ol></section><section class="week-end card"><div><span class="eyebrow">לפעמים צריך פשוט להמשיך</span><h2>מוכנים לשבוע הבא?</h2><p>השכירות תשולם, האנרגיה תתחדש,<br>וסיפור חדש יתחיל.</p></div><button class="primary" data-command="end" ${state.won ? "disabled" : ""}>לסיים את השבוע ${icon("arrow", 18)}</button></section></div>
        <footer><span>החיים בשכונה <span class="footer-dot">◆</span> לקחת את החיים בקצב שלך</span><span>בהשראת משחקי סימולציית החיים הקלאסיים</span></footer>
      </div>
    </main>`;
}

function avatar() {
  return creaturePortrait(PLAYER_CREATURE);
}
function tip() {
  if (state.food < 20) return "קודם משהו לאכול. אפשר לבשל בבית או לקנות כריך. בלי כסף ועם פחות מ־15 שובע, יש ארוחה קהילתית חינם בפארק.";
  if (state.energy < 30) return "מנוחה בבית מחזירה 38 אנרגיה. לא כל שעה צריכה להיות שעת עבודה.";
  if (!state.job) return "בקפה פינה מגייסים בלי ניסיון. להיכנס, להגיש מועמדות ולהתחיל להרוויח.";
  if (state.cash + state.savings < state.rent) return "כדאי להשאיר כסף לשכירות. מה שלא יכוסה בסוף השבוע יצטרף לחוב.";
  if (!state.education) return `ארבעה שיעורים = תעודה ראשונה. כבר השלמת ${state.lessons} מתוך 4.`;
  if (state.education < 3) return "שלוש תעודות ו־36 שעות ניסיון פותחות דלת לפיקסל טק. יש למה לשאוף.";
  return "כל ארבע המטרות צריכות להתמלא יחד. קצת עבודה, קצת לימודים והרבה איזון.";
}

function mapView(place) {
  return `<section class="map-panel card"><div class="map-toolbar"><div><span class="live-dot"></span><h2>השכונה שלך</h2><span class="map-subtitle">עולם קטן, אפשרויות גדולות</span></div><span class="weather">${icon("sun", 16)} יום נעים לצאת</span></div><div class="city-wrap">${cityArt(state)}<div class="map-caption">${icon("map", 15)} בוחרים בניין ונכנסים פנימה</div></div><div class="map-bottom"><span><i class="location-dot"></i> כרגע: <strong>${place.name}</strong></span><span>${state.inventory.bike ? "נוסעים באופניים" : "מתניידים ברגל"} · כל מעבר צורך זמן</span><button class="text-button" data-go="${place.id}">להיכנס ${icon("arrow", 15)}</button></div></section>`;
}

function interiorView(place) {
  const actions = actionsFor(state).filter(a => !a.id.startsWith("talk-"));
  const character = CHARACTERS[place.id];
  const encounter = state.encounters[place.id];
  const talked = encounter?.week === state.week;
  const line = talked ? character.choices[encounter.choice].reply : encounter ? character.returnGreeting : character.greeting;
  return `<section class="interior-panel card"><div class="map-toolbar"><div><span class="live-dot"></span><h2>${place.name}</h2></div><button class="text-button" data-command="map">${icon("arrow", 16)} חזרה לשכונה</button></div><div class="interior-scene">${interiorArt(place)}<button class="character-spot" data-command="talk" aria-label="לדבר עם ${character.name}"><span class="speech-bubble">${line}<small>${talked ? "יש לנו כבר בדיחה פרטית" : "לחצו עליי. יש לי מה להגיד!"}</small></span>${characterArt(place.id, talked ? "happy" : "idle")}<span class="character-name">${character.name} ${icon("heart", 13)}</span></button></div>
    <div class="character-intro"><div><strong>${character.name}</strong><span>${character.role}</span></div><button class="primary" data-command="talk">${talked ? "השיחה שלנו" : "בואו נדבר"} ${icon("arrow", 16)}</button></div>
    ${state.cafeOrder ? coffeeView() : `<div class="greeting"><span class="clerk-avatar">${icon(place.id === "home" ? "home" : "heart", 22)}</span><p>${place.greeting}</p></div>`}
    ${place.id === "bank" ? `<div class="bank-summary"><span>חיסכון: <b>${money(state.savings)}</b></span><span>חוב: <b>${money(state.debt)}</b></span></div>` : ""}${place.id === "college" || place.id === "home" ? `<div class="lesson-status">${icon("book", 16)} ${state.education} תעודות · ${state.lessons}/4 שיעורים לתעודה הבאה</div>` : ""}<div class="actions-heading"><h3>מה עושים עכשיו?</h3><span>${state.hours} שעות נשארו השבוע</span></div><div class="actions-grid">${actions.map(action => {
    const reason = unavailable(state, action);
    return `<button class="action-card ${reason ? "locked" : ""}" data-action="${action.id}" ${reason ? "disabled" : ""}><span class="action-title">${action.title}${icon(reason ? "lock" : "arrow", 17)}</span><span class="action-description">${action.description}</span><span class="action-meta"><span>${icon("clock", 13)} ${action.hours} ש׳</span><span class="${action.cost < 0 ? "income" : ""}">${action.cost === 0 ? "ללא עלות" : action.cost < 0 ? `+${money(-action.cost)}` : money(action.cost)}</span>${Object.entries(action.effects).map(([key, value]) => `<span aria-label="${{ energy: "אנרגיה", food: "שובע", happiness: "אושר" }[key]} ${value > 0 ? "בתוספת" : "בהפחתת"} ${Math.abs(value)}">${icon(key === "happiness" ? "heart" : key, 13)} <bdi>${value > 0 ? "+" : "−"}${Math.abs(value)}</bdi></span>`).join("")}</span>${reason ? `<span class="locked-reason">${reason}</span>` : ""}</button>`;
  }).join("")}</div></section>`;
}

function choiceBenefits(action) {
  const stats = { energy: "אנרגיה", food: "שובע", happiness: "אושר" };
  return [`${action.hours} ש׳`, action.cost ? `${action.cost < 0 ? "+" : "−"}${money(Math.abs(action.cost))}` : "ללא עלות",
    ...Object.entries(action.effects).map(([key, value]) => `${value > 0 ? "+" : "−"}${Math.abs(value)} ${stats[key]}`)].map(text => `<bdi>${text}</bdi>`).join("<span> · </span>");
}

function talk() {
  const c = CHARACTERS[state.location];
  const encounter = state.encounters[state.location];
  const talked = encounter?.week === state.week;
  const line = talked ? c.choices[encounter.choice].reply : encounter ? `${c.returnGreeting} ${c.greeting}` : c.greeting;
  const choices = actionsFor(state).filter(a => a.id.startsWith("talk-"));
  showDialog(c.name, `<div class="conversation-head">${classicMode ? `<div class="conversation-portrait">${characterArt(state.location, talked ? "happy" : "idle")}</div>` : ""}<div><span class="character-role">${c.role}</span><p class="conversation-line">${line}</p><span class="friendship">${icon("heart", 14)} ${encounter ? encounter.visits === 1 ? "מפגש משותף ראשון" : `${encounter.visits} מפגשים משותפים` : "היכרות ראשונה"}</span></div></div>
    <button class="voice-toggle" data-command="voice">${voiceEnabled ? "השתקת דיבור" : "הפעלת דיבור בעברית"} · קול מקומי אם מותקן</button>
    ${talked ? `<div class="conversation-memory"><small>בחרת לומר:</small><p>״${c.choices[encounter.choice].title}״</p><span>הבחירה נשמרה. בשבוע הבא אפשר לבלות יחד שוב.</span></div><button class="primary start-button" data-close>נתראה בשכונה!</button>` :
      `<h3 class="choice-heading">מה עונים?</h3><div class="dialogue-choices">${choices.map(a => {
        const reason = unavailable(state, a);
        return `<button class="dialogue-choice" data-reply="${a.id}" ${reason ? "disabled" : ""}><strong>${a.title}</strong><span class="choice-benefits">${choiceBenefits(a)}</span>${reason ? `<small class="locked-reason">${reason}</small>` : ""}</button>`;
      }).join("")}</div><p class="dialog-footnote">בחירה אחת לכל דמות בכל שבוע. התוצאות והזמן מוצגים מראש.</p>`}`, "conversation-dialog");
  if (voiceEnabled) speak(line);
  dialog.querySelector(".voice-toggle").textContent = `${voiceEnabled ? "השתקת דיבור" : "הפעלת דיבור בעברית"} · קול מקומי אם מותקן`;
}

function speak(line) {
  if (!("speechSynthesis" in window)) { voiceEnabled = false; notify("הדפדפן לא תומך בדיבור. כתוביות השיחה זמינות.", true); return; }
  const voice = speechSynthesis.getVoices().find(voice => voice.lang.startsWith("he") && voice.localService);
  if (!voice) { voiceEnabled = false; notify("לא מותקן קול עברי מקומי. השיחה ממשיכה בכתוביות; לא נשלח טקסט לשירות חיצוני.", true); return; }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(line);
  utterance.voice = voice; utterance.lang = "he-IL"; utterance.rate = 1.03;
  utterance.onerror = event => {
    if (!["interrupted", "canceled"].includes(event.error)) notify(`הדיבור נעצר: ${event.error}. אפשר לקרוא את הכתוביות.`, true);
  };
  speechSynthesis.speak(utterance);
}

function coffeeView() {
  const order = state.cafeOrder;
  const recipe = COFFEE_RECIPES[order.recipe];
  return `<section class="coffee-game" aria-labelledby="coffee-title"><div class="coffee-heading"><div><span class="eyebrow">לא עוד כפתור ״לעבוד״. הפעם, הסינר עליך.</span><h3 id="coffee-title">הזמנה מספר ${state.cafeServed + 1}: ${recipe.name}</h3></div><span class="coffee-pay">90 ₪ בסיס <b>+75 ₪ טיפ לדיוק</b></span></div>
    <p class="customer-order">״${recipe.request}״</p>
    <div class="coffee-station"><div class="recipe-card"><strong>המתכון של ניסו</strong><ol>${recipe.order.map(id => `<li>${INGREDIENTS[id].symbol} ${INGREDIENTS[id].name}</li>`).join("")}</ol><small>מוסיפים לפי הסדר, מלמעלה למטה.<br>בלי שעון עצר. נשימה עמוקה.</small></div>
      <div class="cup-area"><div class="coffee-cup" role="img" aria-label="בכוס: ${order.ingredients.length ? order.ingredients.map(id => INGREDIENTS[id].name).join(", ") : "עדיין ריקה"}"><div class="cup-layers">${order.ingredients.map(id => `<div class="cup-layer" style="background:${INGREDIENTS[id].color}"><span>${INGREDIENTS[id].name}</span></div>`).join("")}</div><span class="cup-logo">ניסו<br>אספרסו</span></div><div class="cup-saucer"></div><span class="cup-count">${order.ingredients.length}/4 מרכיבים</span></div></div>
    <div class="ingredients" aria-label="בחירת מרכיבים">${Object.entries(INGREDIENTS).map(([id, ingredient]) => `<button data-ingredient="${id}" ${order.ingredients.length >= 4 ? "disabled" : ""}><span aria-hidden="true">${ingredient.symbol}</span>${ingredient.name}</button>`).join("")}</div>
    <div class="coffee-controls"><button class="primary" data-command="serve-coffee">להגיש ללקוח ${icon("check", 17)}</button><button class="secondary" data-ingredient="clear" ${order.ingredients.length ? "" : "disabled"}>לרוקן ולהתחיל מחדש</button></div>
    <p class="coffee-note">3 שעות ו־12 אנרגיה כבר הושקעו. גם אם טועים מקבלים שכר בסיס ו־3 שעות ניסיון. אפשר להגיש גם כוס ריקה כדי לסיים.</p></section>`;
}

function coffeeFeedback(result) {
  const outcome = result.coffeeResult;
  showDialog(outcome.correct ? "בול בכוס!" : "קפה ניסיוני, אה?", `<div class="coffee-result"><div class="result-portrait">${characterArt("cafe", outcome.correct ? "happy" : "surprised")}</div><p>${outcome.reaction}</p><strong class="reward-pop">+${money(outcome.earned)}</strong><span>+3 שעות ניסיון · ${outcome.correct ? "+5" : "−2"} אושר</span></div><button class="primary start-button" data-close>בחזרה לבית הקפה</button>`, "conversation-dialog");
}

function showDialog(title, content, className = "") {
  dialog.className = className;
  dialog.innerHTML = `<button class="dialog-close" data-close aria-label="סגירה">${icon("close", 20)}</button><div class="dialog-body"><h2 id="dialog-title">${title}</h2>${content}</div>`;
  if (!dialog.open) dialog.showModal();
  else dialog.querySelector(".dialog-close").focus();
}

function welcome(restart = false) {
  showDialog("העיר פתוחה. המרוץ שלך.", `
    <div class="intro-kicker">CITY LEAGUE / מחוז הגפן</div>
    <p class="intro-text">יוצאים לרחוב, נכנסים לעסקים ובונים קריירה.<br>60 שעות בשבוע. יריב אחד. מי מגיע ראשון?</p>
    <div class="intro-controls"><span><b>WASD / חיצים</b> ללכת בעיר</span><span><b>E</b> להיכנס ולדבר</span><span><b>מפה</b> ניווט אוטומטי</span></div>
    ${restart ? '<p class="warning">התחלת סיפור חדש תחליף את השמירה הקיימת.</p>' : ""}
    ${startupError ? `<p class="warning" role="alert">${escape(startupError)}</p>` : ""}
    <form id="start-form"><fieldset><legend>לבחור מסלול</legend><label class="difficulty"><input type="radio" name="difficulty" value="relaxed" checked><span><strong>מרוץ קצר</strong><small>6,000 ₪ · 75 אושר · 3 תעודות · קריירה בדרגה 3</small></span><span class="tag">להתחלה</span></label><label class="difficulty"><input type="radio" name="difficulty" value="classic"><span><strong>ליגה ארוכה</strong><small>12,000 ₪ · 85 אושר · 6 תעודות · קריירה בדרגה 4</small></span></label></fieldset><label class="checkbox"><input type="checkbox" name="rival" checked> מרוץ מול דני · יריב ממוחשב שמשחק באותם חוקים</label><button class="primary start-button" type="submit">להיכנס לעיר ${icon("arrow", 18)}</button></form><p class="dialog-footnote">תחרות מקומית לשחקן אחד, לא אונליין · נשמר בדפדפן הזה</p>`, "welcome-dialog");
}

function help() {
  if (online.active) { networkMenu(); return; }
  showDialog("שליטה בעיר", `<div class="help-steps"><section><b>תנועה וכניסה</b><p>WASD או חיצים לתנועה, Shift לריצה. גרירה על העולם מסובבת את המצלמה, גלילה משנה זום. במגע משתמשים בחיצי המסך. במפה בוחרים יעד כדי ללכת אליו אוטומטית; תנועה ידנית מבטלת את הניווט. ליד כניסה מוארת לוחצים E או על כפתור הכניסה.</p></section><section><b>בתוך מבנה</b><p>אפשר לנוע בחדר, לגשת לדמות וללחוץ E לשיחה. פעולות המקום מופיעות למטה. יציאה דרך הדלת או כפתור יציאה. הליכה חופשית אינה צורכת שעות; כניסה ליעד אחר גובה את זמן הנסיעה הרגיל, 1–5 שעות. אופניים מקצרים נסיעות.</p></section><section><b>60 שעות כדי להתקדם</b><p>בקפה מתקבלים בלי ניסיון. ארבעה שיעורים מעניקים תעודה. עבודה ולימודים דורשים שובע ואנרגיה. מנוחה בבית חינם; כשאין שובע יש ארוחה קהילתית בפארק. שכירות נגבית בסוף השבוע: מזומן, חיסכון ואז חוב.</p></section><section><b>המרוץ מול דני</b><p>צריך להשלים יחד הון, אושר, השכלה וקריירה. בסיום השבוע שלך דני משחק שבוע שלם באותם חוקי עבודה, נסיעה, לימודים ושכירות. התור מוצג כשחזור בעיר: אפשר להשהות, להתקדם פעולה או להאיץ. הפס הכתום בכל יעד מסמן את דני. הראשון שמסיים מנצח; אין הגבלה מדומה של 95%. זה יריב ממוחשב מקומי, לא שחקן מחובר.</p></section><section><b>שמירה ודיבור</b><p>התקדמות נשמרת אחרי פעולות, לא בכל צעד ברחוב. חזרה למשחק מתחילה ליד המקום האחרון. בשיחות יש כתוביות ובחירות; דיבור קולי זמין רק אם מותקן בדפדפן קול עברי מקומי. אין הקלטות קול מובנות ואין פנייה לשירות חיצוני.</p></section></div><button class="primary start-button" data-close>חזרה לעיר</button>`, "help-dialog");
}

function phone() {
  showDialog("הטלפון שלי", `<div class="phone-date">שבוע ${state.week} · ${state.hours} שעות פנויות</div><div class="phone-balance">${money(state.cash)}<small>זמין עכשיו · חיסכון ${money(state.savings)} · חוב ${money(state.debt)}</small></div><div class="phone-apps"><button data-phone-go="home">${icon("home", 28)}<strong>מהבית</strong><span>אוכל, קורסים ופרילנס</span></button><button data-phone-go="park">${icon("bag", 28)}<strong>משלוחים</strong><span>עבודה גמישה עם אופניים</span></button><button data-phone-go="bank">${icon("wallet", 28)}<strong>הכסף שלי</strong><span>חיסכון והלוואות</span></button><button data-phone-go="shop">${icon("phone", 28)}<strong>שדרוגים</strong><span>מחשב ואופניים</span></button></div><p class="dialog-footnote">בחירת יישום מעבירה למקום המתאים וצורכת זמן נסיעה רגיל.</p>`, "phone-dialog");
}

function creatureCast() {
  showDialog("היצורים של השכונה", `<p>עשרה יצורים בהשראת התמונה וארבעה תושבים חדשים. פוגשים אותם ברחוב, בתוך העסקים ובפעילויות.</p><div class="creature-grid">${Object.entries(CREATURES).map(([id, c]) => {
    const resident = Object.entries(CHARACTERS).find(([, character]) => character.creature === id);
    const home = resident ? `${resident[1].name} · ${PLACES.find(place => place.id === resident[0]).name}` : c.source === "original" ? "יצור מקורי נוסף" : "";
    return `<article>${creaturePortrait(id)}<h3>${c.name}</h3><small>${home}</small><p>${c.description}</p></article>`;
  }).join("")}</div><button class="primary start-button" data-close>לפגוש אותם בעיר</button>`, "creature-dialog");
}

function confirmEnd() {
  showDialog("לסגור את השבוע?", `<p>נותרו לך <strong>${state.hours} שעות</strong>. הזמן שלא נוצל לא עובר לשבוע הבא.</p><div class="bill-row"><span>שכירות לתשלום</span><b>${money(state.rent)}</b></div><div class="bill-row"><span>מזומן וחיסכון</span><b>${money(state.cash + state.savings)}</b></div>${state.cash + state.savings < state.rent ? '<p class="warning">אין כרגע כיסוי מלא לשכירות. ההפרש יתווסף לחוב והאושר יירד.</p>' : ""}<p>האנרגיה תעלה ב־45. ${state.inventory.groceries ? "מנה אחת מהתיק תשמש לארוחות סוף השבוע." : "אין מצרכים לסוף השבוע — השובע והאושר יירדו."}</p><div class="dialog-buttons"><button class="primary" data-command="confirm-end">כן, לשבוע הבא ${icon("arrow", 17)}</button><button class="secondary" data-close>עוד לא, יש לי תוכניות</button></div>`);
}

function weeklyReport(report) {
  showDialog(`מבזק חדשות · שבוע ${state.week}`, `${newsCard(state.news[0])}
    <details class="news-bill"><summary>החשבון של השבוע</summary><div class="bill-row"><span>שכירות</span><b>${money(report.rent)}</b></div><div class="bill-row"><span>ריבית בחיסכון</span><b>+${money(report.interest)}</b></div><div class="bill-row"><span>ריבית על חוב</span><b>${money(report.debtInterest)}</b></div>${report.unpaid ? `<p class="warning">${money(report.unpaid)} נוספו לחוב.</p>` : ""}<p>${report.foodText}</p></details>
    <button class="primary start-button" data-close>בחזרה לעיר · שבוע ${state.week}</button>`, "news-dialog");
}

function newsCard(entry) {
  const news = newsFor(entry);
  return `<section class="news-broadcast"><div class="news-station"><b>שכונה 24</b><span>● מבזק · ${news.category}</span></div><div class="news-studio">${creaturePortrait("cloud")}<div><small>מהדורת העיר · שבוע ${entry.week}</small><h3>${news.headline}</h3><p>${news.title}</p></div></div><div class="news-effects"><span>כסף: <bdi>${news.cash > 0 ? "+" : ""}${money(news.cash)}</bdi></span><span>אושר: <bdi>${news.happiness > 0 ? "+" : ""}${news.happiness}</bdi></span><span>מחירי השבוע: ${Math.round(entry.economy * 100)}%</span></div><small class="news-applied">ההשפעות כבר חושבו בשמירה. צפייה חוזרת אינה מעניקה פרס נוסף.</small></section>`;
}
function newsArchive() {
  showDialog("חדשות השכונה", state.news.length ? state.news.map(newsCard).join("") : "<p>המהדורה הראשונה תופיע בסיום השבוע. כאן יישמרו 12 המבזקים האחרונים.</p>", "news-dialog");
}
function victory() {
  if (state.online?.tie) {
    showDialog("המרוץ הסתיים בתיקו!", "<p>שניכם השלמתם את ארבע המטרות בסיכום אותו שבוע.</p><button class=\"primary start-button\" data-command=\"network\">פרטי החדר</button>");
    return;
  }
  showDialog("אלה החיים שבנית. כל הכבוד!", `<div class="week-report-icon">${icon("leaf", 55)}</div><p>בשבוע ${state.week} השלמת את כל ארבע המטרות במסלול ״${GOALS[state.difficulty].name}״.</p>${progress(state).map(g => `<div class="bill-row"><span>${g.name}</span><b>${g.format(g.value)} ${icon("check", 16)}</b></div>`).join("")}<p>ההישג נשמר ${online.active ? "בשרת החדר" : "בדפדפן"}. אפשר לחזור ולהסתכל בעיר או להתחיל סיפור חדש.</p><button class="primary start-button" data-command="new">לסיפור הבא</button>`);
}

function defeat() {
  showDialog(`${rivalName()} הגיע ראשון.`, `<p>הוא השלים את ארבע המטרות בשבוע ${state.opponent.week}. אפשר לצפות בפעולותיו ולהתכונן למרוץ חוזר.</p>${progress(state.opponent).map(goal => `<div class="bill-row"><span>${goal.name}</span><b>${goal.format(goal.value)}</b></div>`).join("")}<div class="dialog-buttons"><button class="primary" data-command="rival">לצפות בתור שלו</button><button class="secondary" data-command="new">מרוץ חוזר</button></div>`);
}

function accept(result, focusAction, afterVisual) {
  if (result.error) { notify(result.error, true); return false; }
  state = result.state;
  const saved = persist();
  render();
  if (saved) notify(result.message);
  const finish = () => {
    if (focusAction) {
      const previous = app.querySelector(`[data-action="${focusAction}"]:not(:disabled)`);
      (previous || app.querySelector(".venue-action:not(:disabled), .action-card:not(:disabled)") || app.querySelector('[data-command="map"]'))?.focus({ preventScroll: true });
    }
    if (state.won) victory();
    else if (state.opponent?.won) defeat();
    else afterVisual?.();
  };
  if (focusAction && cityUI) {
    dialog.close();
    if (cityUI.play(focusAction, result.message, finish)) return true;
  }
  finish();
  return true;
}

async function enter(placeId) {
  if (online.busy) { notify("ממתינים לאישור השרת."); return; }
  if (raceOver(state)) { state.won ? victory() : defeat(); return; }
  const result = online.active ? await serverResult("travel", placeId) : travel(state, placeId);
  if (result.error) { notify(result.error, true); return; }
  inside = true;
  dialog.close();
  accept(result);
  app.querySelector(".interior-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  app.querySelector(".interior-panel [data-command='map']")?.focus({ preventScroll: true });
}

async function handleCommand(command) {
  if (online.busy) { notify("ממתינים לאישור השרת."); return; }
  if (cityUI?.busy) { notify("הפעולה מתבצעת. אפשר להמתין או לדלג על האנימציה."); return; }
  if (command === "classic") { classicMode = true; render(); return; }
  if (command === "network") { networkMenu(); return; }
  if (command === "resume-room") { await connectRoom("resume"); return; }
  if (command === "offline") {
    let local;
    try { const saved = localStorage.getItem(SAVE_KEY); local = saved ? parseSave(saved) : createGame(); }
    catch (error) { notify(error.message, true); return; }
    online.stop(); cityUI?.dispose(); cityUI = null; state = local;
    inside = Boolean(state.cafeOrder || state.courier); dialog.close(); render(); return;
  }
  if (command === "news") { newsArchive(); return; }
  if (["city", "retry-city"].includes(command)) {
    classicMode = false; cityUI?.dispose(); cityUI = null; render(); return;
  }
  if (command === "rival") {
    if (classicMode) {
      showDialog(`הפעולות של ${rivalName()}`, state.rivalReplay.length ?
        `<ol class="full-journal">${state.rivalReplay.map(frame => `<li>${escape(frame.message)} · ${frame.hours} ש׳ · ${money(frame.cash)}</li>`).join("")}</ol><button class="primary" data-close>חזרה למשחק</button>` :
        `<p>${state.online ? "ממתינים לפעולות היריב." : "התור הראשון של דני יתחיל אחרי סיום השבוע שלך."}</p><button class="primary" data-close>חזרה למשחק</button>`);
      return;
    }
    dialog.close(); classicMode = false; render(); cityUI.replay(); return;
  }
  if (command === "voice") {
    voiceEnabled = !voiceEnabled;
    if (!voiceEnabled && "speechSynthesis" in window) speechSynthesis.cancel();
    talk(); return;
  }
  if (cityUI?.spectating && ["map", "talk", "phone", "end", "confirm-end"].includes(command)) {
    notify("קודם חוזרים מהצפייה בפעולות היריב."); return;
  }
  if (command === "map") {
    if (state.cafeOrder) { notify("עוד הזמנה אחת! קודם מגישים את הקפה.", true); return; }
    inside = false; render();
  }
  if (command === "talk") talk();
  if (command === "serve-coffee") {
    const result = online.active ? await serverResult("serve") : serveCoffee(state);
    accept(result, "serve-coffee", () => coffeeFeedback(result));
  }
  if (command === "help") help();
  if (command === "phone") phone();
  if (command === "creatures") creatureCast();
  if (command === "save") { const saved = persist(); render(); if (saved) notify(online.active ? "כל פעולה מאושרת נשמרת בשרת. החיבור נשמר בלשונית הזאת." : "המשחק נשמר בדפדפן. אפשר לחזור בדיוק לכאן."); }
  if (command === "new") { if (online.active) networkMenu(); else welcome(true); }
  if (command === "journal") showDialog("היומן שלי", `<ol class="full-journal">${state.log.map(entry => `<li>${escape(entry)}</li>`).join("")}</ol><button class="primary" data-close>בחזרה לשכונה</button>`);
  if (command === "end") {
    if (state.cafeOrder) { notify("צריך להגיש את ההזמנה לפני שמסיימים את השבוע.", true); return; }
    confirmEnd();
  }
  if (command === "confirm-end") {
    dialog.close();
    const result = online.active ? await serverResult("end") : endWeek(state);
    if (result.error) { notify(result.error, true); return; }
    inside = false;
    if (accept(result) && !state.won && !state.online) {
      if (state.opponent && !classicMode) {
        cityUI.replay();
        if (!state.opponent.won) weeklyReport(result.report);
      }
      else if (!state.opponent?.won) weeklyReport(result.report);
    }
    if (state.online && result.report && !raceOver(state)) weeklyReport(result.report);
  }
}

document.addEventListener("click", async event => {
  const rideButton = event.target.closest("[data-ride]");
  if (rideButton && state.courier) { moveCourier(rideButton.dataset.ride); return; }
  const target = event.target.closest("[data-command], [data-go], [data-action], [data-close], [data-phone-go], [data-reply], [data-ingredient]");
  if (!target) return;
  event.preventDefault();
  if (target.hasAttribute("data-close")) { dialog.close(); return; }
  if (online.busy) { notify("ממתינים לאישור השרת."); return; }
  if (cityUI?.busy) { notify("הפעולה מתבצעת. אפשר להמתין או לדלג על האנימציה."); return; }
  if (cityUI?.spectating && (target.dataset.action || target.dataset.reply || target.dataset.ingredient || target.dataset.go || target.dataset.phoneGo)) {
    notify("קודם חוזרים מהצפייה בפעולות היריב."); return;
  }
  if (target.dataset.reply) {
    accept(online.active ? await serverResult("action", target.dataset.reply) : perform(state, target.dataset.reply), target.dataset.reply, talk);
    return;
  }
  if (target.dataset.ingredient) {
    const id = target.dataset.ingredient;
    accept(online.active ? await serverResult("mix", id) : mixCoffee(state, id), `mix-${id}`, () => {
      (app.querySelector(`[data-ingredient="${id}"]:not(:disabled)`) || app.querySelector('[data-command="serve-coffee"]'))?.focus({ preventScroll: true });
    });
    return;
  }
  if (target.dataset.go || target.dataset.phoneGo) { enter(target.dataset.go || target.dataset.phoneGo); return; }
  if (target.dataset.action) {
    accept(online.active ? await serverResult("action", target.dataset.action) : perform(state, target.dataset.action), target.dataset.action, () => {
      if (state.cafeOrder) {
        app.querySelector(".coffee-game")?.scrollIntoView({ behavior: "smooth", block: "center" });
        app.querySelector("[data-ingredient]")?.focus({ preventScroll: true });
      }
    });
    return;
  }
  if (target.dataset.command) handleCommand(target.dataset.command);
});
document.addEventListener("keydown", event => {
  if (event.target.matches(".map-building") && ["Enter", " "].includes(event.key)) {
    event.preventDefault();
    enter(event.target.dataset.go);
  }
});
dialog.addEventListener("submit", async event => {
  if (["room-create", "room-join"].includes(event.target.id)) {
    event.preventDefault();
    const code = new FormData(event.target).get("code");
    await connectRoom(event.target.id === "room-create" ? "create" : "join",
      event.target.id === "room-create" ? { difficulty: "relaxed" } : { code: String(code).trim().toUpperCase() });
    return;
  }
  if (event.target.id !== "start-form") return;
  event.preventDefault();
  const data = new FormData(event.target);
  state = createGame(data.get("difficulty"), data.has("rival"));
  cityUI?.dispose(); cityUI = null;
  inside = false;
  startupError = "";
  dialog.close();
  const saved = persist();
  render();
  if (saved) notify("המרוץ התחיל. לבחור בקפה פינה במפה, ללכת לכניסה וללחוץ E.");
});
dialog.addEventListener("close", () => { if ("speechSynthesis" in window) speechSynthesis.cancel(); });
render();
if (online.restore && !demo) connectRoom("resume");
else if (!restored && !demo) welcome();
else if (state.won) victory();
else if (state.opponent?.won) defeat();
