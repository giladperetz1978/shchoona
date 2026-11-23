export const PLACES = [
  { id: "home", name: "הבית שלי", label: "רגע לנשום", color: "#e6a37d", type: "home", greeting: "אין כמו בבית. לנוח, לעבוד מרחוק, או פשוט להוריד הילוך." },
  { id: "cafe", name: "קפה פינה", label: "קפה, אוכל ועבודה", color: "#de947d", type: "cafe", greeting: "ברוכים הבאים לפינה! משמרת, משהו לאכול, או קפה עם חברים?" },
  { id: "college", name: "קמפוס העיר", label: "העתיד מתחיל כאן", color: "#afbacb", type: "college", greeting: "כל ארבעה שיעורים מעניקים תעודה. התעודות יפתחו לך דלתות בקריירה." },
  { id: "office", name: "מרחב עבודה", label: "מקום לצמוח", color: "#96b8be", type: "office", greeting: "מכאן מתקדמים. צריך ניסיון והשכלה כדי להתקבל לתפקידים הבאים." },
  { id: "tech", name: "פיקסל טק", label: "הקריירה הבאה שלך", color: "#9dadd5", type: "tech", greeting: "אנחנו מחפשים אנשים סקרנים. תעודות וניסיון שווים כאן הרבה." },
  { id: "bank", name: "הבנק השכונתי", label: "לתכנן קדימה", color: "#c6bd9e", type: "bank", greeting: "חיסכון צובר אחוז בשבוע. הלוואה צוברת שני אחוזים — כדאי לתכנן." },
  { id: "market", name: "המכולת", label: "כל מה שצריך", color: "#a3b799", type: "market", greeting: "משהו קטן לדרך או קניות לשבוע? התיק שלך יכול להכיל עד חמש מנות." },
  { id: "shop", name: "עדכני", label: "שדרוגים לחיים", color: "#ccb0bb", type: "shop", greeting: "אופניים למשלוחים, מחשב לעבודה מהבית. לא רק קניות — גם השקעה." },
  { id: "park", name: "פארק השקמה", label: "קצת זמן לעצמי", color: "#92b59a", type: "park", greeting: "העיר יכולה לחכות. קצת אוויר, תנועה וחברים עושים פלאים." },
  { id: "gym", name: "סטודיו תנועה", label: "גוף חזק, ראש שקט", color: "#d4b17d", type: "gym", greeting: "לא חייבים לשבור שיאים. גם אימון קטן הוא צעד בכיוון הנכון." }
];

export const JOBS = {
  cafe: { name: "בריסטה", place: "cafe", wage: 45, education: 0, experience: 0, tier: 1 },
  office: { name: "רכז/ת תפעול", place: "office", wage: 80, education: 1, experience: 12, tier: 2 },
  tech: { name: "מפתח/ת תוכנה", place: "tech", wage: 130, education: 3, experience: 36, tier: 3 },
  lead: { name: "ראש צוות", place: "tech", wage: 180, education: 5, experience: 90, tier: 4 }
};

export const GOALS = {
  relaxed: { name: "בקצב שלי", wealth: 6000, happiness: 75, education: 3, career: 3 },
  classic: { name: "החיים בגדול", wealth: 12000, happiness: 85, education: 6, career: 4 }
};

export function createGame(difficulty = "relaxed", rival = false) {
  if (!Object.hasOwn(GOALS, difficulty)) throw new Error("מסלול המשחק אינו תקין.");
  return {
    version: 1, difficulty, rival, week: 1, hours: 60, cash: 1400, savings: 0, debt: 0,
    energy: 85, food: 75, happiness: 40, education: 0, lessons: 0, experience: 0,
    job: null, location: "home", inventory: { laptop: false, bike: false, groceries: 2 },
    housing: "basic", rent: 450, economy: 1, rivalProgress: 0, won: false,
    encounters: {}, cafeOrder: null, cafeServed: 0, courier: null, news: [],
    opponent: rival ? createGame(difficulty, false) : null, rivalReplay: [],
    log: ["ברוכים הבאים לשכונה! כדאי להתחיל בקפה פינה: להגיש מועמדות ולעבוד במשמרת הראשונה."]
  };
}

const clamp = (n, min = 0, max = 100) => Math.min(max, Math.max(min, n));
export const money = n => `${Math.round(n).toLocaleString("he-IL")} ₪`;
const duration = n => n === 1 ? "שעה" : n === 2 ? "שעתיים" : `${n} שעות`;
export const netWorth = s => s.cash + s.savings - s.debt;
export const career = s => s.job ? JOBS[s.job].tier : 0;
export const raceOver = s => s.won || Boolean(s.opponent?.won);
export function progress(s) {
  const goal = GOALS[s.difficulty];
  return [
    { name: "עצמאות כלכלית", value: netWorth(s), target: goal.wealth, format: money, color: "#598477" },
    { name: "איכות חיים", value: s.happiness, target: goal.happiness, format: n => `${Math.round(n)}`, color: "#c18751" },
    { name: "השכלה", value: s.education, target: goal.education, format: n => `${n} תעודות`, color: "#8b8aaf" },
    { name: "קריירה", value: career(s), target: goal.career, format: n => `דרגה ${n}`, color: "#648ea4" }
  ].map(g => ({ ...g, percent: clamp(g.value / g.target * 100) }));
}

export function travelCost(s, destination) {
  const from = PLACES.findIndex(p => p.id === s.location);
  const to = PLACES.findIndex(p => p.id === destination);
  if (to < 0) throw new Error("המקום אינו קיים.");
  const distance = Math.min(Math.abs(to - from), PLACES.length - Math.abs(to - from));
  return distance === 0 ? 0 : Math.max(1, Math.ceil(distance / (s.inventory.bike ? 2 : 1)));
}

export function actionsFor(s, place = s.location) {
  const price = n => Math.round(n * s.economy);
  const actions = [];
  const add = (id, title, description, hours, cost, effects = {}, requirement = "") =>
    actions.push({ id, title, description, hours, cost, effects, requirement });
  if (place === "home") {
    add("rest", "לנוח בבית", "למלא מצברים בלי להוציא כסף", 4, 0, { energy: 38, happiness: 3 });
    add("cook", "להכין ארוחה", "מנה מהקניות, אוכל ביתי ואנרגיה", 1, 0, { food: 55, energy: 8 }, s.inventory.groceries < 1 ? "צריך לקנות מצרכים במכולת" : "");
    add("online", "קורס אונליין", "שיעור אחד בדרך לתעודה, מהספה", 3, 90, { energy: -10 }, !s.inventory.laptop ? "צריך מחשב נייד מחנות עדכני" : "");
    add("freelance", "פרויקט מהבית", "עבודה עצמאית: 560 ₪ וניסיון מקצועי", 4, -560, { energy: -22, happiness: -2 }, !s.inventory.laptop ? "צריך מחשב נייד" : s.education < 2 ? "נדרשות שתי תעודות" : "");
    if (s.job && JOBS[s.job].tier >= 3) add("remote", "משמרת מרחוק", "אותה משכורת, בלי הנסיעה למשרד", 6, -JOBS[s.job].wage * 6, { energy: -28, happiness: -3 }, !s.inventory.laptop ? "צריך מחשב נייד" : "");
    add("delivery", "להזמין ארוחה", "אוכל עד הבית — נוח, אבל יקר יותר", 1, price(95), { food: 65, happiness: 4 });
    if (s.housing === "basic") add("upgrade", "לעבור לדירה משודרגת", "מעבר: 1,200 ₪. שכירות: 700 ₪ לשבוע; תוספת אושר שבועית", 3, 1200, { happiness: 15 });
  }
  if (["cafe", "office", "tech"].includes(place)) {
    for (const [id, job] of Object.entries(JOBS).filter(([, job]) => job.place === place)) {
      if (s.job === id) continue;
      const requirement = career(s) >= job.tier ? "כבר יש לך תפקיד בדרגה הזאת או גבוהה ממנה" :
        s.education < job.education ? `נדרשות ${job.education} תעודות` :
        s.experience < job.experience ? `נדרשות ${job.experience} שעות ניסיון (יש לך ${s.experience})` : "";
      add(`apply-${id}`, `להתקבל: ${job.name}`, `${money(job.wage)} לשעה · דרגה ${job.tier}`, 1, 0, { happiness: 5 }, requirement);
    }
    if (s.job && JOBS[s.job].place === place)
      add("work", "לעבוד במשמרת", `6 שעות עבודה · ${money(JOBS[s.job].wage * 6)} הכנסה`, 6, -JOBS[s.job].wage * 6, { energy: -28, happiness: -3 });
  }
  if (place === "cafe") {
    add("coffee-start", "מאחורי מכונת הקפה", "מכינים הזמנה בעצמכם · 90 ₪ ועוד 75 ₪ להזמנה מדויקת", 3, 0, { energy: -12 }, s.job !== "cafe" ? "צריך להתקבל לעבודה כבריסטה" : "");
    add("meal", "ארוחת היום", "צלחת טובה והפסקה קטנה מהמרוץ", 1, price(55), { food: 48, energy: 8 });
    add("friends", "קפה עם חברים", "כי הצלחה היא גם עם מי חולקים אותה", 2, price(35), { happiness: 15, energy: 5, food: 8 });
  }
  if (place === "college") add("study", "להיכנס לשיעור", `שיעור ${s.lessons + 1} מתוך 4 לתעודה הבאה`, 4, price(120), { energy: -14, happiness: 2 });
  if (place === "market") {
    add("groceries", "סל מצרכים", "שלוש מנות לבישול בבית · עד חמש בתיק", 1, price(100), {}, s.inventory.groceries > 2 ? "אין מקום לשלוש מנות נוספות בתיק" : "");
    add("snack", "כריך לדרך", "משהו זמין שמחזיר אותך לעניינים", 1, price(25), { food: 30, energy: 5 });
  }
  if (place === "shop") {
    add("laptop", "לקנות מחשב נייד", "פותח קורסים אונליין ועבודה מהבית", 1, price(2400), { happiness: 10 }, s.inventory.laptop ? "כבר יש לך מחשב נייד" : "");
    add("bike", "לקנות אופניים", "מקצר נסיעות ופותח עבודת משלוחים", 1, price(650), { happiness: 7 }, s.inventory.bike ? "כבר יש לך אופניים" : "");
  }
  if (place === "park") {
    add("community", "ארוחה קהילתית", "השכונה דואגת לך כשאין מספיק אוכל", 3, 0, { food: 35, happiness: 3 }, s.food >= 15 ? "זמינה כשמדד השובע נמוך מ־15" : "");
    add("walk", "טיול בפארק", "רגע ירוק, בלי לשלם", 2, 0, { happiness: 10, energy: 8 });
    add("picnic", "פיקניק עם חברים", "מנה מהתיק, זמן טוב בחוץ", 3, 0, { happiness: 20, food: 30 }, !s.inventory.groceries ? "צריך מנה של מצרכים" : "");
    add("gig", "לקבל משלוח", `איסוף בקפה פינה ומסירה ב${courierDestination(s).name} תוך 60 שניות · 220 ₪ במסירה בזמן`, 3, 0, { energy: -22 }, !s.inventory.bike ? "צריך אופניים מחנות עדכני" : "");
  }
  if (place === "gym") {
    add("exercise", "אימון בסטודיו", "משחרר את הראש ומחזיר אנרגיה", 2, price(45), { energy: 25, happiness: 10 });
  }
  if (place === "bank") {
    add("deposit", "להפקיד 500 ₪", "הכסף עובר לחיסכון וצובר ריבית שבועית", 1, 500);
    add("withdraw", "למשוך 500 ₪", "מחיסכון לעובר ושב", 1, -500, {}, s.savings < 500 ? "צריך לפחות 500 ₪ בחיסכון" : "");
    add("loan", "הלוואה של 1,000 ₪", "ריבית שבועית של 2% · חוב מרבי לפני ריבית: 3,000 ₪", 1, -1000, {}, s.debt > 2000 ? "הגעת למסגרת ההלוואה" : "");
    add("repay", `להחזיר ${money(Math.min(500, s.debt))}`, "להקטין את החוב ואת הריבית", 1, Math.min(500, s.debt), {}, !s.debt ? "אין לך חוב להחזיר" : "");
  }
  CHARACTERS[place].choices.forEach((choice, index) => {
    add(`talk-${index}`, choice.title, choice.reply, choice.hours, choice.cost, choice.effects,
      s.encounters[place]?.week === s.week ? "כבר ביליתם יחד השבוע. בשבוע הבא אפשר לבחור שוב." : "");
  });
  return actions;
}

export function unavailable(s, action) {
  if (s.online?.waiting) return "ממתינים לשחקן השני";
  if (s.online?.ready) return "השבוע הסתיים מבחינתך — מחכים ליריב";
  if (s.online && action.id === "gig") return "משלוחי רכיבה זמינים כרגע במשחק המקומי בלבד";
  if (s.courier) return "צריך לסיים קודם את המשלוח.";
  if (raceOver(s)) return "המרוץ הסתיים! אפשר להתחיל משחק חדש.";
  if (s.cafeOrder) return "קודם צריך להגיש את ההזמנה שמחכה במכונת הקפה.";
  if (action.requirement) return action.requirement;
  if (s.hours < action.hours) return "אין מספיק זמן השבוע";
  if (s.cash < action.cost) return "אין מספיק כסף זמין";
  if ((action.effects.energy || 0) < 0 && s.energy + action.effects.energy < 5) return "צריך לנוח לפני הפעולה הזאת";
  if (["work", "remote", "freelance", "gig", "study", "online", "coffee-start"].includes(action.id) && s.food < 15) return "צריך לאכול לפני הפעולה הזאת";
  return "";
}

function record(s, message) {
  s.log = [message, ...s.log].slice(0, 30);
  s.won = progress(s).every(g => g.percent >= 100);
  return { state: s, message };
}

export function perform(state, id, now = Date.now()) {
  const action = actionsFor(state).find(a => a.id === id);
  if (!action) return { state, error: "הפעולה אינה זמינה במקום הזה." };
  const error = unavailable(state, action);
  if (error) return { state, error };
  const s = structuredClone(state);
  s.hours -= action.hours;
  s.cash -= action.cost;
  s.food = clamp(s.food - action.hours);
  for (const [key, value] of Object.entries(action.effects)) s[key] = clamp(s[key] + value);
  let message = `${action.title} · ${duration(action.hours)}${action.cost ? ` · ${action.cost > 0 ? "שולם" : "התקבל"} ${money(Math.abs(action.cost))}` : ""}`;
  if (id.startsWith("apply-")) s.job = id.slice(6);
  if (["work", "remote", "freelance"].includes(id)) s.experience += action.hours;
  if (id === "gig") s.courier = { x: 2, y: 4, angle: 0, speed: 0, picked: false, deadline: now + 60000, stop: courierStops.indexOf(courierDestination(state)) };
  if (["study", "online"].includes(id)) {
    s.lessons++;
    if (s.lessons === 4) {
      s.lessons = 0;
      s.education++;
      s.happiness = clamp(s.happiness + 8);
      message += " · כל הכבוד! קיבלת תעודה חדשה.";
    }
  }
  if (["cook", "picnic"].includes(id)) s.inventory.groceries--;
  if (id === "groceries") s.inventory.groceries += 3;
  if (["laptop", "bike"].includes(id)) s.inventory[id] = true;
  if (id === "deposit") s.savings += 500;
  if (id === "withdraw") s.savings -= 500;
  if (id === "loan") s.debt += 1000;
  if (id === "repay") s.debt -= action.cost;
  if (id === "upgrade") { s.housing = "upgraded"; s.rent = 700; }
  if (id.startsWith("talk-")) {
    s.encounters[s.location] = { week: s.week, choice: Number(id.slice(5)), visits: (s.encounters[s.location]?.visits || 0) + 1 };
    message = `${CHARACTERS[s.location].name}: ${action.description} · ${duration(action.hours)}`;
  }
  if (id === "coffee-start") {
    s.cafeOrder = { recipe: s.cafeServed % COFFEE_RECIPES.length, ingredients: [] };
    message = "ניסו: הסינר עליך. עכשיו ננסה להשאיר את הקפה בתוך הכוס!";
  }
  return record(s, message);
}

const courierStops = [{ name: "שער הקמפוס", x: 5.7, y: 3.76 }, { name: "סטודיו תנועה", x: 4.24, y: 2.55 }, { name: "מרחב העבודה", x: 5.4, y: 2.24 }];
const courierDestination = s => courierStops[(s.week + Math.floor(s.hours / 3)) % courierStops.length];
export const courierTarget = order => order.picked ? courierStops[order.stop] : { name: "קפה פינה", x: 2.17, y: .03 };
export function handoffStatus(order) {
  const target = courierTarget(order);
  if (Math.hypot(order.x-target.x,order.y-target.y) > .27) return "far";
  return Math.abs(order.speed) > .07 ? "brake" : "ready";
}
const curb = .30;
const crossStreet = n => Math.abs(n - 2 * Math.round(n / 2)) <= curb;
const onStreet = (x, y) => x >= -curb && x <= 6 + curb && y >= -curb && y <= 4 + curb && (crossStreet(x) || crossStreet(y));

export function ride(state, command, now = Date.now()) {
  const order = state.courier;
  if (!order) return { state, error: "אין משלוח פעיל." };
  if (now >= order.deadline || command === "cancel") {
    return record({ ...state, courier: null }, now >= order.deadline ? "הזמן נגמר. המשלוח נסגר ללא שכר." : "המשלוח בוטל ללא שכר.");
  }
  const { dt, steer, throttle } = command;
  if (!(dt >= 0 && dt <= .1) || ![-1,0,1].includes(steer) || ![-1,0,1].includes(throttle)) return { state, error: "פקודת רכיבה אינה תקינה." };
  const angle = (order.angle + steer * dt * 2.25) % (2 * Math.PI);
  let speed = clamp(order.speed + (throttle > 0 ? .65 : throttle < 0 ? -2.1 : -Math.sign(order.speed) * .45) * dt, 0, .77);
  if (!throttle && Math.sign(speed) !== Math.sign(order.speed)) speed = 0;
  let x = order.x + Math.sin(angle) * speed * dt, y = order.y - Math.cos(angle) * speed * dt;
  if (!onStreet(x, y)) { x = order.x; y = order.y; speed = 0; }
  const next = { ...order, x, y, angle, speed };
  const arrived = command.interact === true && handoffStatus(next) === "ready";
  if (arrived && order.picked) return record({ ...state, courier: null, cash: state.cash + 220, experience: state.experience + 3 }, "נמסר בזמן! הרווחת 220 ₪ ו־3 שעות ניסיון.");
  return { state: { ...state, courier: { ...order, x, y, angle, speed, picked: order.picked || arrived } }, message: arrived ? "ההזמנה בתיק! עכשיו רוכבים ללקוח." : "" };
}

export function mixCoffee(state, ingredient) {
  if (raceOver(state) || state.location !== "cafe" || !state.cafeOrder) return { state, error: "אין הזמנה פעילה בבית הקפה." };
  if (ingredient !== "clear" && !Object.hasOwn(INGREDIENTS, ingredient)) return { state, error: "המרכיב אינו מוכר." };
  if (ingredient !== "clear" && state.cafeOrder.ingredients.length >= 4) return { state, error: "הכוס מלאה. אפשר לרוקן אותה או להגיש." };
  const s = structuredClone(state);
  if (ingredient === "clear") s.cafeOrder.ingredients = [];
  else s.cafeOrder.ingredients.push(ingredient);
  return { state: s, message: ingredient === "clear" ? "כוס נקייה, התחלה חדשה!" : `נוסף לכוס: ${INGREDIENTS[ingredient].name}` };
}

export function serveCoffee(state) {
  if (raceOver(state) || state.location !== "cafe" || !state.cafeOrder) return { state, error: "אין הזמנה פעילה להגשה." };
  const recipe = COFFEE_RECIPES[state.cafeOrder.recipe];
  const correct = recipe.order.length === state.cafeOrder.ingredients.length && recipe.order.every((id, i) => id === state.cafeOrder.ingredients[i]);
  const s = structuredClone(state);
  const earned = correct ? 165 : 90;
  s.cash += earned;
  s.experience += 3;
  s.happiness = clamp(s.happiness + (correct ? 5 : -2));
  s.cafeOrder = null;
  s.cafeServed++;
  const reaction = correct ? "מושלם! אפילו הקצף ביקש את המתכון. הטיפ כולו שלך!" : "זה... משקה עם אישיות. ננסה שוב! שכר הבסיס שלך נשמר.";
  return { ...record(s, `ניסו: ${reaction} · התקבלו ${money(earned)}`), coffeeResult: { correct, earned, reaction } };
}

export function travel(state, destination) {
  if (state.courier) return { state, error: "צריך לסיים קודם את המשלוח." };
  if (raceOver(state)) return { state, error: "המרוץ הסתיים!" };
  if (state.cafeOrder) return { state, error: "הלקוח מחכה לקפה. צריך להגיש את ההזמנה לפני שיוצאים." };
  let hours;
  try { hours = travelCost(state, destination); }
  catch (error) { return { state, error: error.message }; }
  if (state.hours < hours) return { state, error: "אין מספיק זמן להגיע לשם. אפשר לסיים את השבוע." };
  const s = structuredClone(state);
  s.location = destination;
  s.hours -= hours;
  s.food = clamp(s.food - hours);
  s.energy = clamp(s.energy - hours);
  return record(s, `הגעת אל ${PLACES.find(p => p.id === destination).name}${hours ? ` · ${duration(hours)} בדרך` : ""}`);
}

export function endWeek(state, random = Math.random) {
  if (state.courier) return { state, error: "צריך לסיים קודם את המשלוח." };
  if (raceOver(state)) return { state, error: "המרוץ הסתיים!" };
  if (state.cafeOrder) return { state, error: "צריך להגיש את ההזמנה לפני שמסיימים את השבוע." };
  const s = structuredClone(state);
  const interest = Math.floor(s.savings * .01);
  const debtInterest = Math.ceil(s.debt * .02);
  s.savings += interest;
  s.debt += debtInterest;
  const fromCash = Math.min(s.cash, s.rent);
  s.cash -= fromCash;
  const fromSavings = Math.min(s.savings, s.rent - fromCash);
  s.savings -= fromSavings;
  const unpaid = s.rent - fromCash - fromSavings;
  s.debt += unpaid;
  s.happiness = clamp(s.happiness - 3 - (unpaid ? 10 : 0) + (s.housing === "upgraded" ? 6 : 0));
  let foodText;
  if (s.inventory.groceries) {
    s.inventory.groceries--;
    s.food = clamp(s.food + 35);
    foodText = "מנה אחת מהתיק שימשה לארוחות סוף השבוע.";
  } else {
    s.food = clamp(s.food - 15);
    s.happiness = clamp(s.happiness - 5);
    foodText = "בלי מצרכים, סוף השבוע היה רעב יותר: 15− שובע ו־5− אושר.";
  }
  s.energy = clamp(s.energy + 45);
  const events = WEEKLY_NEWS;
  const event = events[Math.min(events.length - 1, Math.max(0, Math.floor(random() * events.length)))];
  if (s.cash + event.cash < 0) { s.debt -= s.cash + event.cash; s.cash = 0; }
  else s.cash += event.cash;
  s.happiness = clamp(s.happiness + event.happiness);
  s.economy = Math.round((.9 + random() * .2) * 100) / 100;
  s.rivalProgress = 0;
  s.hours = 60;
  s.week++;
  s.news = [{ id: event.id, week: s.week, economy: s.economy }, ...(s.news || [])].slice(0, 12);
  const message = `שבוע ${s.week} מתחיל · שכירות ${money(s.rent)}${unpaid ? ` · ${money(unpaid)} שלא כוסו נוספו לחוב` : ""}`;
  const result = record(s, message);
  if (s.opponent && !s.won) {
    const turn = playOpponentWeek(s.opponent);
    s.opponent = turn.state;
    s.rivalReplay = turn.replay;
  }
  return { ...result, report: { title: `סוף שבוע ${s.week - 1}`, rent: s.rent, interest, debtInterest, unpaid, foodText, event: event.title, economy: s.economy } };
}

export function playOpponentWeek(initial) {
  if (initial.rival || initial.opponent) throw new Error("יריב לא יכול לנהל יריב נוסף.");
  let state = initial;
  const replay = [];
  const capture = (kind, id, message) => replay.push({
    kind, id, message, location: state.location, week: state.week,
    hours: state.hours, cash: state.cash, energy: state.energy, food: state.food,
    happiness: state.happiness, education: state.education, career: career(state)
  });
  capture("start", "", "דני יוצא לשבוע שלו");
  for (let step = 0; step < 70 && !state.won; step++) {
    const goal = GOALS[state.difficulty];
    const candidates = [];
    const want = (place, id) => candidates.push([place, id]);
    if (state.food < 28) {
      if (state.inventory.groceries) want("home", "cook");
      want("cafe", "meal");
      want("market", "snack");
      want("park", "community");
    }
    if (state.energy < 34) want("home", "rest");
    for (const [id, job] of Object.entries(JOBS).reverse()) {
      if (job.tier > career(state) && state.education >= job.education && state.experience >= job.experience)
        want(job.place, `apply-${id}`);
    }
    if (state.cash < state.rent + 600 && state.job) want(JOBS[state.job].place, "work");
    if (state.education < goal.education && state.cash >= state.rent + 300) want("college", "study");
    if (netWorth(state) >= goal.wealth && state.education >= goal.education && career(state) >= goal.career)
      want("park", "walk");
    if (state.inventory.groceries <= 1 && state.cash > state.rent + 100) want("market", "groceries");
    if (state.job) want(JOBS[state.job].place, "work");
    want("home", "rest");
    want("park", "walk");
    let moved = false;
    for (const [place, id] of candidates) {
      const trip = travel(state, place);
      if (trip.error) continue;
      const action = actionsFor(trip.state).find(a => a.id === id);
      if (!action || unavailable(trip.state, action)) continue;
      if (place !== state.location) {
        state = trip.state;
        capture("travel", place, trip.message);
      }
      const result = perform(state, id);
      if (result.error) throw new Error(`פעולת יריב נכשלה: ${result.error}`);
      state = result.state;
      capture("action", id, result.message);
      moved = true;
      break;
    }
    if (!moved) break;
  }
  if (!state.won) {
    const result = endWeek(state, () => .5);
    if (result.error) throw new Error(`סיום שבוע היריב נכשל: ${result.error}`);
    state = result.state;
    capture("settle", "", result.message);
  }
  return { state, replay };
}

export function parseSave(raw) {
  let s;
  try { s = JSON.parse(raw); } catch { throw new Error("השמירה אינה קובץ משחק תקין."); }
  const fail = () => { throw new Error("השמירה פגומה או מגרסה לא נתמכת. אפשר להתחיל משחק חדש."); };
  if (!s || s.version !== 1 || !Object.hasOwn(GOALS, s.difficulty) || !PLACES.some(p => p.id === s.location)) fail();
  for (const key of ["week", "hours", "cash", "savings", "debt", "energy", "food", "happiness", "education", "lessons", "experience", "rent", "economy", "rivalProgress"])
    if (typeof s[key] !== "number" || !Number.isFinite(s[key]) || s[key] < 0) fail();
  if (s.week < 1 || !Number.isInteger(s.week) || s.hours > 60 || s.energy > 100 || s.food > 100 || s.happiness > 100 ||
      s.lessons > 3 || !Number.isInteger(s.lessons) || !Number.isInteger(s.education) || s.economy < .9 || s.economy > 1.1 ||
      s.rivalProgress > 95 || typeof s.rival !== "boolean" || typeof s.won !== "boolean" ||
      (s.job !== null && !Object.hasOwn(JOBS, s.job)) || !["basic", "upgraded"].includes(s.housing) ||
      s.rent !== (s.housing === "basic" ? 450 : 700)) fail();
  if (!s.inventory || typeof s.inventory.laptop !== "boolean" || typeof s.inventory.bike !== "boolean" ||
      !Number.isInteger(s.inventory.groceries) || s.inventory.groceries < 0 || s.inventory.groceries > 5 ||
      !Array.isArray(s.log) || s.log.length > 30 || !s.log.every(x => typeof x === "string" && x.length <= 600)) fail();
  // Original version-1 saves predate characters and the cafe challenge.
  if (s.encounters === undefined) s.encounters = {};
  if (s.cafeOrder === undefined) s.cafeOrder = null;
  if (s.courier === undefined) s.courier = null;
  if (s.courier !== null) {
    const o = s.courier;
    if (o && typeof o === "object") { o.angle ??= 0; o.speed ??= 0; }
    if (!o || s.location !== "park" || !s.inventory.bike || !Number.isFinite(o.angle) || !Number.isFinite(o.speed) || o.speed < -.22 || o.speed > .77 ||
        !Number.isFinite(o.x) || !Number.isFinite(o.y) ||
        !onStreet(o.x, o.y) || typeof o.picked !== "boolean" || !Number.isSafeInteger(o.deadline) ||
        !Number.isInteger(o.stop) || !courierStops[o.stop]) fail();
  }
  if (s.cafeServed === undefined) s.cafeServed = 0;
  if (s.news === undefined) s.news = [];
  if (!Array.isArray(s.news) || s.news.length > 12 || s.news.some(entry =>
    !entry || !WEEKLY_NEWS.some(item => item.id === entry.id) || !Number.isInteger(entry.week) ||
    entry.week < 2 || entry.week > s.week || !Number.isFinite(entry.economy) || entry.economy < .9 || entry.economy > 1.1)) fail();
  if (!s.encounters || Array.isArray(s.encounters) || typeof s.encounters !== "object") fail();
  for (const [place, encounter] of Object.entries(s.encounters)) {
    if (!Object.hasOwn(CHARACTERS, place) || !encounter || !Number.isInteger(encounter.week) ||
        encounter.week < 1 || encounter.week > s.week || !Number.isInteger(encounter.choice) ||
        !CHARACTERS[place].choices[encounter.choice] || !Number.isInteger(encounter.visits) ||
        encounter.visits < 1 || encounter.visits > s.week) fail();
  }
  if (!Number.isSafeInteger(s.cafeServed) || s.cafeServed < 0) fail();
  if (s.cafeOrder !== null && (!s.cafeOrder || s.location !== "cafe" || s.job !== "cafe" ||
      !Number.isInteger(s.cafeOrder.recipe) || !COFFEE_RECIPES[s.cafeOrder.recipe] ||
      !Array.isArray(s.cafeOrder.ingredients) || s.cafeOrder.ingredients.length > 4 ||
      !s.cafeOrder.ingredients.every(id => typeof id === "string" && Object.hasOwn(INGREDIENTS, id)))) fail();
  if (s.opponent === undefined) s.opponent = s.rival ? createGame(s.difficulty, false) : null;
  if (s.rivalReplay === undefined) s.rivalReplay = [];
  if (s.opponent !== null) {
    if (!s.rival || typeof s.opponent !== "object" || s.opponent.rival !== false ||
        s.opponent.opponent !== null || s.opponent.difficulty !== s.difficulty ||
        s.opponent.cafeOrder || s.opponent.courier ||
        !Array.isArray(s.opponent.rivalReplay) || s.opponent.rivalReplay.length) fail();
    s.opponent = parseSave(JSON.stringify(s.opponent));
  } else if (s.rival) fail();
  if (!Array.isArray(s.rivalReplay) || s.rivalReplay.length > 142 || (!s.rival && s.rivalReplay.length)) fail();
  for (const frame of s.rivalReplay) {
    if (!frame || !["start", "travel", "action", "settle"].includes(frame.kind) ||
        typeof frame.id !== "string" || frame.id.length > 40 ||
        typeof frame.message !== "string" || frame.message.length > 600 ||
        !PLACES.some(p => p.id === frame.location)) fail();
    for (const key of ["week", "hours", "cash", "energy", "food", "happiness", "education", "career"])
      if (!Number.isFinite(frame[key]) || frame[key] < 0) fail();
    if (!Number.isInteger(frame.week) || frame.week < 1 || frame.hours > 60 || frame.energy > 100 ||
        frame.food > 100 || frame.happiness > 100 || !Number.isInteger(frame.education) ||
        !Number.isInteger(frame.career) || frame.career > 4) fail();
  }
  s.won = progress(s).every(g => g.percent >= 100);
  return s;
}
import { CHARACTERS, COFFEE_RECIPES, INGREDIENTS } from "./characters.js";
import { WEEKLY_NEWS } from "./city-news.js";
