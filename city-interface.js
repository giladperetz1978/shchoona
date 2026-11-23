import { PLACES, JOBS, actionsFor, unavailable, progress, money, raceOver, travelCost } from "./engine.js";
import { CHARACTERS } from "./characters.js";
import { activityFor } from "./city-activities.js";

const escape = text => String(text).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const score = state => Math.floor(progress(state).reduce((sum, goal) => sum + goal.percent, 0) / 4);

export function createCityInterface(root, { enter, command, notify, coffeeView, benefits, paused }) {
  root.innerHTML = `<main class="city-game" aria-label="העיר התלת־ממדית">
    <canvas class="city-canvas" tabindex="0" aria-label="העיר: תנועה בחיצים או WASD, כניסה ושיחה במקש E"></canvas>
    <div class="city-loading" role="status"><strong>פותחים את הרחוב שלך</strong><span>טוענים עיר תלת־ממדית מהמחשב שלך…</span></div>
    <header class="city-top">
      <button class="city-brand" data-command="creatures" aria-label="הכירו את היצורים"><i></i><div>השכונה<span>הכירו את היצורים ↗</span></div></button>
      <div class="city-stats" aria-live="polite"></div>
      <div class="city-menu"><button data-command="phone" aria-label="טלפון">טלפון</button><button data-command="help" aria-label="עזרה">?</button><button data-command="news">חדשות</button><button data-command="network">רשת</button><button data-command="new">משחק חדש</button></div>
    </header>
    <aside class="city-race" aria-label="לוח התחרות"></aside>
    <nav class="city-map" aria-label="ניווט בעיר">
      <div><strong>מחוז הגפן</strong><span>לבחור יעד וללכת אליו</span></div>
      <div class="city-map-grid" dir="ltr">${PLACES.map((place, index) => `<button data-walk="${place.id}" style="--site:${place.color}" aria-label="ניווט אל ${place.name}">${index + 1}<span>${["בית", "קפה", "קמפוס", "עבודה", "הייטק", "בנק", "מכולת", "עדכני", "פארק", "כושר"][index]}</span></button>`).join("")}<i class="city-map-pin" aria-label="המיקום שלך"></i></div>
      <small class="city-map-caption">הליכה חופשית · שעות נסיעה נגבות בכניסה ליעד</small>
    </nav>
    <section class="city-objective"></section>
    <section class="city-venue" aria-label="פעולות במקום" hidden></section>
    <section class="city-replay" aria-label="צפייה בתור של המתחרה" hidden></section>
    <section class="city-activity" aria-label="ביצוע פעולה" hidden>
      <div><span class="activity-label"></span><h2 role="status"></h2><p></p></div>
      <div class="activity-progress" role="progressbar" aria-label="התקדמות האנימציה" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>
      <div class="activity-foot"><small>דילוג או רענון לא משנים את תוצאת הפעולה</small><button data-skip-activity>דלג על האנימציה</button></div>
    </section>
    <div class="city-context"><span></span><button type="button" disabled><kbd>E</kbd> <b>להתקרב לכניסה</b></button></div>
    <footer class="city-bottom"><div class="city-goals"></div><div class="city-controls-help"><b>WASD / חיצים</b> תנועה · <b>Shift</b> ריצה · גרירה לסיבוב · גלילה לזום</div><button data-command="end" class="city-end">סיום השבוע <span>←</span></button></footer>
    <div class="city-touch" dir="ltr" aria-label="בקר תנועה">
      <button data-walk-key="up" aria-label="הליכה קדימה">▲</button>
      <button data-walk-key="left" aria-label="הליכה שמאלה">◀</button>
      <button data-walk-key="down" aria-label="הליכה אחורה">▼</button>
      <button data-walk-key="right" aria-label="הליכה ימינה">▶</button>
    </div>
    <button class="city-lite" data-command="classic">תצוגה קלה</button>
  </main>`;
  const shell = root.querySelector(".city-game"), canvas = root.querySelector("canvas");
  const stats = root.querySelector(".city-stats"), race = root.querySelector(".city-race");
  const venue = root.querySelector(".city-venue"), objective = root.querySelector(".city-objective");
  const goals = root.querySelector(".city-goals"), context = root.querySelector(".city-context");
  const replayPanel = root.querySelector(".city-replay"), loading = root.querySelector(".city-loading");
  const pin = root.querySelector(".city-map-pin");
  const activityPanel = root.querySelector(".city-activity"), activityProgress = activityPanel.querySelector(".activity-progress");
  let world, current, indoors = false, disposed = false, replayIndex = -1, playing = false, speed = 1, nextAt = 0;
  let activeActivity = null;
  const controller = new AbortController();
  const signal = controller.signal;
  const stopReplay = () => {
    replayIndex = -1; playing = false; world?.watch(null); replayPanel.hidden = true;
    shell.classList.remove("spectating"); update(current, indoors);
  };
  function showReplay(index = 0) {
    if (!current.rivalReplay.length) { notify("התור הראשון של דני מתחיל אחרי סיום השבוע שלך."); return; }
    replayIndex = Math.max(0, Math.min(index, current.rivalReplay.length - 1));
    const frame = current.rivalReplay[replayIndex];
    try { world?.watch(frame, playing, speed); }
    catch (error) {
      console.error("Unable to display opponent activity:", error);
      stopReplay(); notify(`לא ניתן להציג את פעולת היריב: ${error.message}`, true); return;
    }
    shell.classList.add("spectating");
    race.querySelector(".race-title i").textContent = "צופים בשחזור";
    root.querySelector(".city-end").disabled = true;
    replayPanel.hidden = false; venue.hidden = true;
    replayPanel.innerHTML = `<div class="replay-heading"><span class="live-indicator"></span><b>${current.online ? "פעולות היריב ברשת" : "התור של דני"} · שבוע ${frame.week}</b><span>${replayIndex + 1}/${current.rivalReplay.length}</span></div>
      <h2>${escape(frame.message)}</h2><p>${PLACES.find(place => place.id === frame.location).name} · ${frame.hours} שעות נותרו · ${money(frame.cash)} · ${frame.education} תעודות</p>
      <div class="replay-progress"><i style="width:${(replayIndex + 1) / current.rivalReplay.length * 100}%"></i></div>
      <div class="replay-buttons"><button data-replay="toggle">${playing ? "השהיה" : "ניגון"}</button><button data-replay="next" ${replayIndex === current.rivalReplay.length - 1 ? "disabled" : ""}>פעולה הבאה</button><button data-replay="speed">מהירות ×${speed}</button><button data-replay="close">חזרה למשחק</button></div>
      <small>${current.online ? "שחזור פעולות שאושרו בשרת · הצפייה אינה משנה תוצאות" : "שחזור תור מחושב · ללא תשלומים נוספים בצפייה · השבוע שלך כבר סוכם ביומן"}</small>`;
    nextAt = performance.now() + 1600 / speed;
  }
  const timer = setInterval(() => {
    if (replayIndex < 0 || !playing || paused() || performance.now() < nextAt || !world?.arrived()) return;
    if (replayIndex < current.rivalReplay.length - 1) showReplay(replayIndex + 1);
    else { playing = false; showReplay(replayIndex); }
  }, 150);
  root.addEventListener("click", event => {
    if (event.target.closest("[data-skip-activity]")) { world?.skip(); return; }
    if (activeActivity) return;
    const target = event.target.closest("[data-walk], [data-replay], [data-watch], [data-interact], [data-city-retry]");
    if (!target) return;
    if (target.dataset.walk) {
      if (replayIndex >= 0) return;
      if (indoors) { notify("קודם יוצאים מהמבנה לרחוב."); return; }
      if (world?.navigate(target.dataset.walk)) notify(`בדרך אל ${PLACES.find(place => place.id === target.dataset.walk).name}. ליד הכניסה לוחצים E.`);
      else notify("העיר עדיין נטענת. יש להמתין או לבחור בתצוגה הקלה.", true);
    }
    if (target.hasAttribute("data-watch")) { playing = true; showReplay(); }
    if (target.hasAttribute("data-interact")) world?.interact();
    if (target.hasAttribute("data-city-retry")) command("retry-city");
    if (target.dataset.replay === "close") stopReplay();
    if (target.dataset.replay === "toggle") { playing = !playing; showReplay(replayIndex); }
    if (target.dataset.replay === "next") { playing = false; showReplay(replayIndex + 1); }
    if (target.dataset.replay === "speed") { speed = speed === 4 ? 1 : speed * 2; showReplay(replayIndex); }
  }, { signal });
  window.addEventListener("keydown", event => {
    if (activeActivity && event.code === "Escape") { event.preventDefault(); world?.skip(); }
  }, { signal });
  context.querySelector("button").setAttribute("data-interact", "");
  for (const button of root.querySelectorAll("[data-walk-key]")) {
    button.addEventListener("pointerdown", event => {
      event.preventDefault(); button.setPointerCapture(event.pointerId); world?.hold(event.pointerId, button.dataset.walkKey);
    }, { signal });
    button.addEventListener("lostpointercapture", event => world?.release(event.pointerId), { signal });
  }
  function failure(message) {
    world?.skip();
    loading.hidden = false;
    loading.innerHTML = `<strong>לא ניתן להציג את העיר</strong><span>${escape(message)}</span><div><button data-city-retry>לנסות שוב</button><button data-command="classic">לשחק בתצוגה הקלה</button></div>`;
    notify(message, true);
  }
  import("./city-world.js").then(({ buildCity }) => {
    if (disposed) return;
    world = buildCity(canvas, {
      onEnter: enter, onExit: () => command("map"), onTalk: () => command("talk"),
      isPaused: paused, onError: failure,
      onActivity: ({ progress, label }) => {
        if (activityPanel.querySelector("h2").textContent !== label) activityPanel.querySelector("h2").textContent = label;
        activityProgress.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
        activityProgress.querySelector("i").style.width = `${progress * 100}%`;
      },
      onPrompt: value => {
        context.querySelector("span").textContent = indoors ? PLACES.find(place => place.id === current.location).name : "רחובות מחוז הגפן";
        context.querySelector("b").textContent = value.text;
        context.querySelector("button").disabled = !value.action || raceOver(current);
      },
      onPosition: (x, z) => {
        pin.style.left = `${(x + 42) / 84 * 100}%`; pin.style.top = `${(z + 30) / 60 * 100}%`;
      }
    });
    world.sync(current.location, indoors);
    world.presence(current.online ? current.opponent : null);
    if (replayIndex >= 0) world.watch(current.rivalReplay[replayIndex]);
    canvas.dataset.renderer = "three";
    loading.hidden = true;
  }).catch(error => { if (!disposed) { console.error("City renderer failed:", error); failure(error.message); } });

  function update(state, inside) {
    current = state; indoors = inside;
    shell.dataset.online = String(Boolean(state.online));
    shell.dataset.location = state.location; shell.dataset.inside = String(inside);
    stats.innerHTML = `<div><small>שבוע</small><b>${state.week.toString().padStart(2, "0")}</b></div><div><small>זמן</small><b>${state.hours}<em>ש׳</em></b></div><div><small>יתרה</small><b>${money(state.cash)}</b></div><div class="${state.energy < 25 ? "critical" : ""}"><small>אנרגיה</small><b>${state.energy}<em>%</em></b></div><div class="${state.food < 20 ? "critical" : ""}"><small>שובע</small><b>${state.food}<em>%</em></b></div>`;
    race.innerHTML = `<div class="race-title"><span>${state.opponent ? "המרוץ על העיר" : "מסלול חופשי"}</span><i>${raceOver(state) ? "הסתיים" : "בתור שלך"}</i></div>
      <div class="race-player"><span class="player-dot"></span><b>את/ה</b><small>${state.job ? JOBS[state.job].name : "בתחילת הדרך"}</small><strong>${score(state)}%</strong></div>
      ${state.opponent ? `<div class="race-player"><span class="player-dot rival-dot"></span><b>דני</b><small>${state.opponent.job ? JOBS[state.opponent.job].name : "בתחילת הדרך"}</small><strong>${score(state.opponent)}%</strong></div><button data-watch>${state.rivalReplay.length ? "▶ לצפות בשבוע של דני" : "התור של דני בסוף השבוע"}</button><small>יריב ממוחשב · אותם חוקים · הראשון שמשלים הכול מנצח</small>` : '<button data-command="new">להתחיל מרוץ מול דני</button>'}`;
    if (state.online) {
      const net = state.online, latest = state.rivalReplay.at(-1);
      race.innerHTML = `<div class="race-title"><span>חדר <b dir="ltr">${net.room}</b></span><i>${net.finished ? net.tie ? "תיקו" : "הסתיים" : net.waiting ? "ממתינים לחבר" : "משחק רשת"}</i></div>
        <div class="race-player"><span class="player-dot"></span><b>את/ה · ${net.seat + 1}</b><small>${net.ready ? "סיימת את השבוע" : `שבוע ${state.week}`}</small><strong>${score(state)}%</strong></div>
        ${state.opponent ? `<div class="race-player"><span class="player-dot rival-dot"></span><b>שחקן ${2 - net.seat}</b><small>${net.peerConnected ? net.peerReady ? "ממתין לך" : "מחובר" : "מנותק כרגע"}</small><strong>${score(state.opponent)}%</strong></div>
        <p class="online-action">${PLACES.find(p => p.id === state.opponent.location).name} · ${escape(latest?.message || "הצטרף לחדר")}</p><button data-watch>▶ לצפות בפעולות היריב</button>` : "<p class=\"online-action\">שלחו לחבר את קוד החדר. מתחילים עם אותם משאבים.</p>"}
        <small>מצב ופעולות מתעדכנים בכל שנייה · שבוע חדש רק כששניכם מסיימים</small>`;
    }
    const hint = state.food < 20 ? "צריך אוכל. במכולת יש כריך; בפארק יש ארוחה קהילתית כשאין שובע." :
      state.energy < 30 ? "זמן להיטען. מנוחה בבית לא עולה כסף." :
      !state.job ? "המשמרת הראשונה שלך מחכה בקפה פינה. להגיע, להיכנס, להתקבל." :
      !state.education ? "לפתוח דלת חדשה: ארבעה שיעורים בקמפוס מעניקים תעודה." :
      "לימודים פותחים משרות. לבדוק דרישות בקמפוס ובפיקסל טק.";
    objective.innerHTML = `<span>${raceOver(state) ? "קו הסיום" : "הצעד הבא"}</span><p>${state.won ? "ניצחת. כל ארבע המטרות הושלמו!" : state.opponent?.won ? "דני השלים את המטרות ראשון. הזדמנות למרוץ חוזר." : hint}</p>`;
    goals.innerHTML = progress(state).map((goal, i) => `<div title="${goal.name}: ${goal.format(goal.value)} מתוך ${goal.format(goal.target)}"><span>${["הון", "אושר", "לימודים", "קריירה"][i]} <b>${Math.floor(goal.percent)}%</b></span><div><i style="width:${goal.percent}%"></i>${state.opponent ? `<em style="left:${Math.min(98, progress(state.opponent)[i].percent)}%" title="דני"></em>` : ""}</div></div>`).join("");
    root.querySelector(".city-end").disabled = raceOver(state) || replayIndex >= 0 || state.online?.ready || state.online?.waiting;
    for (const button of root.querySelectorAll("[data-walk]")) {
      button.classList.toggle("current", button.dataset.walk === state.location);
      button.title = `${PLACES.find(place => place.id === button.dataset.walk).name} · ${travelCost(state, button.dataset.walk)} שעות נסיעה בכניסה`;
    }
    venue.hidden = !inside || replayIndex >= 0;
    if (inside) {
      const place = PLACES.find(place => place.id === state.location), character = CHARACTERS[state.location];
      const actions = actionsFor(state).filter(action => !action.id.startsWith("talk-"));
      venue.innerHTML = `<div class="venue-heading"><div><small>${character.name} · ${character.role}</small><h2>${place.name}</h2></div><button data-command="talk">שיחה</button><button data-command="map">יציאה ↗</button></div>
        ${state.cafeOrder ? coffeeView() : `<div class="venue-actions">${actions.map(action => {
          const reason = unavailable(state, action);
          return `<button class="venue-action" data-action="${action.id}" ${reason ? "disabled" : ""} title="${escape(reason || action.description)}"><b>${action.title}</b><small class="venue-benefits">${benefits(action)}</small><small>${escape(reason || action.description)}</small></button>`;
        }).join("")}</div>`}`;
    }
    world?.sync(state.location, inside);
    world?.presence(state.online ? state.opponent : null);
  }
  function play(id, message, done) {
    const profile = activityFor(id, current.location);
    if (profile.interactive) return false;
    if (!world) { notify("הפעולה בוצעה, אך תצוגת התלת־ממד אינה זמינה כרגע.", true); return false; }
    activeActivity = profile;
    shell.classList.add("performing"); shell.dataset.activity = id; activityPanel.hidden = false;
    const controls = shell.querySelectorAll(".city-top, .city-race, .city-map, .city-venue, .city-bottom, .city-touch, .city-lite");
    controls.forEach(element => { element.inert = true; });
    activityPanel.querySelector(".activity-label").textContent = profile.label;
    activityPanel.querySelector("h2").textContent = "ניגשים לעמדה";
    activityPanel.querySelector("p").textContent = message;
    activityProgress.setAttribute("aria-valuenow", "0"); activityProgress.querySelector("i").style.width = "0%";
    activityPanel.querySelector("button").focus({ preventScroll: true });
    world.play(profile, () => {
      activeActivity = null; activityPanel.hidden = true; shell.classList.remove("performing");
      delete shell.dataset.activity; controls.forEach(element => { element.inert = false; });
      done();
    });
    return true;
  }
  return {
    update,
    play,
    get busy() { return Boolean(activeActivity); },
    replay() { playing = true; showReplay(); },
    get spectating() { return replayIndex >= 0; },
    dispose() { disposed = true; clearInterval(timer); controller.abort(); world?.dispose(); }
  };
}
