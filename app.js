import { PLACES, JOBS, GOALS, createGame, money, progress, actionsFor, unavailable, perform, travel, endWeek, parseSave, mixCoffee, serveCoffee, ride, courierTarget, handoffStatus } from "./engine.js";
import { streetScene } from "./courier-scene.js";
import { icon, cityArt, interiorArt, characterArt } from "./art.js";
import { CHARACTERS, COFFEE_RECIPES, INGREDIENTS } from "./characters.js";

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
const demo = new URLSearchParams(location.search).has("ride-demo");
try {
  const saved = !demo && localStorage.getItem(SAVE_KEY);
  if (saved) { state = parseSave(saved); restored = true; }
} catch (error) { startupError = error.message; }
if (state.cafeOrder || state.courier) inside = true;
const escape = text => String(text).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

function notify(message, error = false) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `visible${error ? " error" : ""}`;
  toastTimer = setTimeout(() => { toast.className = ""; }, error ? 8000 : 4500);
}

function persist() {
  if (demo) return true;
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
  if (state.courier) { courierScreen(); return; }
  if (demo) {
    app.innerHTML = `<main class="courier card"><div class="eyebrow">נסיעת ניסיון · ללא שינוי בשמירה שלך</div><h1>משלוח בשכונה</h1><p>${restored ? escape(state.log[0]) : "האופניים מוכנים. רוכבים ישר לקפה, אוספים ומנווטים לפי המפה אל הלקוח."}</p><p>חץ למעלה להאצה · ימינה ושמאלה להיגוי · למטה לבלימה</p><button class="primary" data-try>לקבל הזמנה ולרכוב</button></main>`;
    app.querySelector("[data-try]").onclick = () => {
      state = createGame(); state.location = "park"; state.inventory.bike = true; restored = true;
      accept(perform(state,"gig"));
    };
    return;
  }
  const place = PLACES.find(p => p.id === state.location);
  const goals = progress(state);
  const total = Math.floor(goals.reduce((sum, g) => sum + g.percent, 0) / 4);
  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#" data-command="map" aria-label="החיים בשכונה — מפת העיר"><span class="brand-mark">${icon("home", 28)}</span><span>החיים בשכונה<small>הסיפור שלך, הקצב שלך.</small></span></a>
      <nav aria-label="ניווט ראשי"><button aria-label="השכונה" class="${!inside ? "active" : ""}" data-command="map">${icon("map", 18)}<span>השכונה</span></button><button aria-label="הטלפון שלי" data-command="phone">${icon("phone", 18)}<span>הטלפון שלי</span></button><button aria-label="איך משחקים" data-command="help">${icon("help", 18)}<span>איך משחקים</span></button></nav>
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
        ${state.rival ? `<section class="card rival"><strong>השכן דני · השוואה ידידותית</strong><p>התקדמות משוערת: ${Math.floor(state.rivalProgress)}%</p><small>מדד קצב בלבד, לא יריב שיכול לסיים את המשחק.</small></section>` : ""}
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
  return '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="20" fill="#e5d7bd"/><path d="M8 64q0-23 24-23t24 23" fill="#6a8b78"/><rect x="26" y="34" width="12" height="13" rx="4" fill="#c99471"/><ellipse cx="32" cy="27" rx="14" ry="17" fill="#dca984"/><path d="M18 27q-7-25 15-23 20 1 13 27l-5-15q-13 7-20 0Z" fill="#45473f"/><path d="M26 34q6 5 12 0" stroke="#9e644f" fill="none" stroke-width="2"/><circle cx="26" cy="27" r="1.3" fill="#45473f"/><circle cx="38" cy="27" r="1.3" fill="#45473f"/></svg>';
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
  showDialog(c.name, `<div class="conversation-head"><div class="conversation-portrait">${characterArt(state.location, talked ? "happy" : "idle")}</div><div><span class="character-role">${c.role}</span><p class="conversation-line">${line}</p><span class="friendship">${icon("heart", 14)} ${encounter ? encounter.visits === 1 ? "מפגש משותף ראשון" : `${encounter.visits} מפגשים משותפים` : "כל חברות מתחילה ב״היי״"}</span></div></div>
    ${talked ? `<div class="conversation-memory"><small>בחרת לומר:</small><p>״${c.choices[encounter.choice].title}״</p><span>הבחירה נשמרה. בשבוע הבא אפשר לבלות יחד שוב.</span></div><button class="primary start-button" data-close>נתראה בשכונה!</button>` :
      `<h3 class="choice-heading">מה עונים?</h3><div class="dialogue-choices">${choices.map(a => {
        const reason = unavailable(state, a);
        return `<button class="dialogue-choice" data-reply="${a.id}" ${reason ? "disabled" : ""}><strong>${a.title}</strong><span class="choice-benefits">${choiceBenefits(a)}</span>${reason ? `<small class="locked-reason">${reason}</small>` : ""}</button>`;
      }).join("")}</div><p class="dialog-footnote">בחירה אחת לכל דמות בכל שבוע. התוצאות והזמן מוצגים מראש.</p>`}`, "conversation-dialog");
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
  showDialog("יש לך חיים שלמים לבנות.", `
    <div class="intro-art">${avatar()}<span>${icon("leaf", 44)}</span></div>
    <span class="eyebrow">ברוכים הבאים לחיים בשכונה</span>
    <p class="intro-text">דירה קטנה, קצת כסף, וכל האפשרויות פתוחות.<br>לעבוד, ללמוד, לפגוש חברים — ולמצוא את האיזון שלך.</p>
    ${restart ? '<p class="warning">התחלת סיפור חדש תחליף את השמירה הקיימת.</p>' : ""}
    ${startupError ? `<p class="warning" role="alert">${escape(startupError)}</p>` : ""}
    <form id="start-form"><fieldset><legend>באיזה קצב משחקים?</legend><label class="difficulty"><input type="radio" name="difficulty" value="relaxed" checked><span><strong>בקצב שלי</strong><small>6,000 ₪ · 75 אושר · 3 תעודות · קריירה בדרגה 3</small></span><span class="tag">להתחלה</span></label><label class="difficulty"><input type="radio" name="difficulty" value="classic"><span><strong>החיים בגדול</strong><small>12,000 ₪ · 85 אושר · 6 תעודות · קריירה בדרגה 4</small></span></label></fieldset><label class="checkbox"><input type="checkbox" name="rival"> להוסיף את דני השכן כמדד קצב ידידותי, לא כתחרות</label><button class="primary start-button" type="submit">יאללה, יוצאים לחיים ${icon("arrow", 18)}</button></form><p class="dialog-footnote">משחק יחיד · נשמר בדפדפן הזה · בלי הרשמה ובלי שרת חיצוני</p>`, "welcome-dialog");
}

function help() {
  showDialog("איך בונים חיים בשכונה?", `<p>המטרה: למלא יחד את ארבעת המדדים — כסף, אושר, השכלה וקריירה. אין מגבלת שבועות.</p><div class="help-steps"><section><b>01 · יוצאים לשכונה</b><p>לוחצים על בניין ונכנסים פנימה. המעבר צורך 1–5 שעות לפי מרחק על המסלול. אופניים מקצרים את הדרך. לחיצה על המקום הנוכחי היא בחינם.</p></section><section><b>02 · מנהלים 60 שעות בשבוע</b><p>כל פעולה עולה זמן. בקפה פינה מתקבלים בלי ניסיון. משמרת היא 6 שעות, מכניסה 270 ₪ ומורידה 28 אנרגיה. צריך לפחות 15 שובע ואנרגיה מספקת.</p></section><section><b>03 · לומדים ומתקדמים</b><p>כל ארבעה שיעורים מעניקים תעודה. רכז/ת תפעול: תעודה אחת ו־12 שעות ניסיון. תוכנה: 3 תעודות ו־36 שעות. ראש צוות: 5 תעודות ו־90 שעות. צריך להגיע למקום ולהגיש מועמדות.</p></section><section><b>04 · לא שוכחים לחיות</b><p>אוכל, מנוחה וחברים חשובים. מצרכים משמשים לבישול בבית ולסוף השבוע. מנוחה בבית וטיול בפארק הם בחינם. האושר יכול לרדת, ולכן כדאי לאזן.</p></section><section><b>05 · השבוע הבא</b><p>שכירות נגבית אוטומטית: קודם מהמזומן, אחר כך מהחיסכון. חוסר הופך לחוב ומפחית אושר. חיסכון צובר 1%, חוב צובר 2%. האנרגיה עולה ב־45, המחירים משתנים עד 10%, והשכר והשכירות נשארים קבועים.</p></section><section><b>06 · החיים של היום</b><p>מחשב פותח לימודים אונליין ופרילנס אחרי שתי תעודות, ותפקיד בהייטק מאפשר עבודה מרחוק. אופניים פותחים משלוחים בפארק. הזמנת אוכל זמינה בבית. שווי הון הוא מזומן וחיסכון פחות חובות — לא הלוואות ולא חפצים.</p></section></div><p class="dialog-footnote">בהשראת Jones in the Fast Lane. יצירה עצמאית, ללא קוד, איורים או דמויות מהמשחק המקורי.</p><button class="primary" data-close>הבנתי, חוזרים לחיים</button>`, "help-dialog");
}

function phone() {
  showDialog("הטלפון שלי", `<div class="phone-date">שבוע ${state.week} · ${state.hours} שעות פנויות</div><div class="phone-balance">${money(state.cash)}<small>זמין עכשיו · חיסכון ${money(state.savings)} · חוב ${money(state.debt)}</small></div><div class="phone-apps"><button data-phone-go="home">${icon("home", 28)}<strong>מהבית</strong><span>אוכל, קורסים ופרילנס</span></button><button data-phone-go="park">${icon("bag", 28)}<strong>משלוחים</strong><span>עבודה גמישה עם אופניים</span></button><button data-phone-go="bank">${icon("wallet", 28)}<strong>הכסף שלי</strong><span>חיסכון והלוואות</span></button><button data-phone-go="shop">${icon("phone", 28)}<strong>שדרוגים</strong><span>מחשב ואופניים</span></button></div><p class="dialog-footnote">בחירת יישום מעבירה למקום המתאים וצורכת זמן נסיעה רגיל.</p>`, "phone-dialog");
}

function confirmEnd() {
  showDialog("לסגור את השבוע?", `<p>נותרו לך <strong>${state.hours} שעות</strong>. הזמן שלא נוצל לא עובר לשבוע הבא.</p><div class="bill-row"><span>שכירות לתשלום</span><b>${money(state.rent)}</b></div><div class="bill-row"><span>מזומן וחיסכון</span><b>${money(state.cash + state.savings)}</b></div>${state.cash + state.savings < state.rent ? '<p class="warning">אין כרגע כיסוי מלא לשכירות. ההפרש יתווסף לחוב והאושר יירד.</p>' : ""}<p>האנרגיה תעלה ב־45. ${state.inventory.groceries ? "מנה אחת מהתיק תשמש לארוחות סוף השבוע." : "אין מצרכים לסוף השבוע — השובע והאושר יירדו."}</p><div class="dialog-buttons"><button class="primary" data-command="confirm-end">כן, לשבוע הבא ${icon("arrow", 17)}</button><button class="secondary" data-close>עוד לא, יש לי תוכניות</button></div>`);
}

function weeklyReport(report) {
  showDialog(report.title, `<div class="week-report-icon">${icon("sun", 46)}</div><p class="report-event">${report.event}</p><div class="bill-row"><span>שכירות ששולמה / חויבה</span><b>${money(report.rent)}</b></div><div class="bill-row"><span>ריבית שהתקבלה בחיסכון</span><b>+${money(report.interest)}</b></div><div class="bill-row"><span>ריבית שנוספה לחוב</span><b>${money(report.debtInterest)}</b></div>${report.unpaid ? `<p class="warning">יתרת שכירות של ${money(report.unpaid)} נוספה לחוב.</p>` : ""}<p>${report.foodText}</p><p class="market-news">מדד מחירים חדש: ${Math.round(report.economy * 100)}% ממחיר הבסיס. המשכורת והשכירות לא השתנו.</p><button class="primary start-button" data-close>שבוע ${state.week}, הנה אני בא/ה ${icon("arrow", 18)}</button>`);
}

function victory() {
  showDialog("אלה החיים שבנית. כל הכבוד!", `<div class="week-report-icon">${icon("leaf", 55)}</div><p>בשבוע ${state.week} השלמת את כל ארבע המטרות במסלול ״${GOALS[state.difficulty].name}״.</p>${progress(state).map(g => `<div class="bill-row"><span>${g.name}</span><b>${g.format(g.value)} ${icon("check", 16)}</b></div>`).join("")}<p>ההישג נשמר בדפדפן. אפשר לחזור ולהסתכל בעיר או להתחיל סיפור חדש.</p><button class="primary start-button" data-command="new">לסיפור הבא</button>`);
}

function accept(result, focusAction) {
  if (result.error) { notify(result.error, true); return false; }
  state = result.state;
  const saved = persist();
  render();
  if (focusAction) {
    const previous = app.querySelector(`[data-action="${focusAction}"]:not(:disabled)`);
    (previous || app.querySelector(".action-card:not(:disabled)") || app.querySelector('[data-command="map"]'))?.focus({ preventScroll: true });
  }
  if (state.won) victory();
  else if (saved) notify(result.message);
  return true;
}

function enter(placeId) {
  if (state.won) { victory(); return; }
  const result = travel(state, placeId);
  if (result.error) { notify(result.error, true); return; }
  inside = true;
  dialog.close();
  accept(result);
  app.querySelector(".interior-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  app.querySelector(".interior-panel [data-command='map']")?.focus({ preventScroll: true });
}

function handleCommand(command) {
  if (command === "map") {
    if (state.cafeOrder) { notify("עוד הזמנה אחת! קודם מגישים את הקפה.", true); return; }
    inside = false; render();
  }
  if (command === "talk") talk();
  if (command === "serve-coffee") {
    const result = serveCoffee(state);
    if (accept(result) && !state.won) coffeeFeedback(result);
  }
  if (command === "help") help();
  if (command === "phone") phone();
  if (command === "save") { const saved = persist(); render(); if (saved) notify("המשחק נשמר בדפדפן. אפשר לחזור בדיוק לכאן."); }
  if (command === "new") welcome(true);
  if (command === "journal") showDialog("היומן שלי", `<ol class="full-journal">${state.log.map(entry => `<li>${escape(entry)}</li>`).join("")}</ol><button class="primary" data-close>בחזרה לשכונה</button>`);
  if (command === "end") {
    if (state.cafeOrder) { notify("צריך להגיש את ההזמנה לפני שמסיימים את השבוע.", true); return; }
    confirmEnd();
  }
  if (command === "confirm-end") {
    dialog.close();
    const result = endWeek(state);
    if (result.error) { notify(result.error, true); return; }
    inside = false;
    if (accept(result) && !state.won) weeklyReport(result.report);
  }
}

document.addEventListener("click", event => {
  const rideButton = event.target.closest("[data-ride]");
  if (rideButton && state.courier) { moveCourier(rideButton.dataset.ride); return; }
  const target = event.target.closest("[data-command], [data-go], [data-action], [data-close], [data-phone-go], [data-reply], [data-ingredient]");
  if (!target) return;
  event.preventDefault();
  if (target.hasAttribute("data-close")) { dialog.close(); return; }
  if (target.dataset.reply) {
    if (accept(perform(state, target.dataset.reply)) && !state.won) talk();
    return;
  }
  if (target.dataset.ingredient) {
    const id = target.dataset.ingredient;
    if (accept(mixCoffee(state, id))) {
      (app.querySelector(`[data-ingredient="${id}"]:not(:disabled)`) || app.querySelector('[data-command="serve-coffee"]'))?.focus({ preventScroll: true });
    }
    return;
  }
  if (target.dataset.go || target.dataset.phoneGo) { enter(target.dataset.go || target.dataset.phoneGo); return; }
  if (target.dataset.action) {
    if (accept(perform(state, target.dataset.action), target.dataset.action) && state.cafeOrder) {
      app.querySelector(".coffee-game")?.scrollIntoView({ behavior: "smooth", block: "center" });
      app.querySelector("[data-ingredient]")?.focus({ preventScroll: true });
    }
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
dialog.addEventListener("submit", event => {
  if (event.target.id !== "start-form") return;
  event.preventDefault();
  const data = new FormData(event.target);
  state = createGame(data.get("difficulty"), data.has("rival"));
  inside = false;
  startupError = "";
  dialog.close();
  const saved = persist();
  render();
  if (saved) notify("הסיפור שלך מתחיל עכשיו. קפה פינה הוא מקום טוב להתחיל בו.");
});
render();
if (!restored && !demo) welcome();
else if (state.won) victory();
