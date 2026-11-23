const clips = {
  brew: { label: "משמרת בבית הקפה", stages: ["טוחנים ומכינים אספרסו", "מקציפים חלב", "מגישים ללקוח"], seconds: 5, prop: "coffee", pose: "brew" },
  social: { label: "קפה עם חברים", stages: ["מתיישבים יחד", "קפה ושיחה", "עוד רגע לפני שחוזרים"], seconds: 5, prop: "table", pose: "social" },
  eat: { label: "הפסקת אוכל", stages: ["פותחים את הארוחה", "אוכלים בנחת", "מפנים את השולחן"], seconds: 4, prop: "meal", pose: "eat" },
  cook: { label: "מכינים ארוחה בבית", stages: ["מכינים את המצרכים", "מערבבים במחבת", "הארוחה מוכנה"], seconds: 5, prop: "stove", pose: "cook" },
  rest: { label: "מנוחה בבית", stages: ["מניחים את הטלפון", "ממלאים מצברים", "מתעוררים ליום חדש"], seconds: 4, prop: "bed", pose: "rest" },
  study: { label: "זמן ללמוד", stages: ["פותחים את החומר", "קוראים וכותבים", "מסיימים את התרגיל"], seconds: 5, prop: "desk", pose: "study" },
  computer: { label: "עובדים על המחשב", stages: ["פותחים את הפרויקט", "עובדים ומתקדמים", "שולחים את העבודה"], seconds: 5, prop: "computer", pose: "type" },
  interview: { label: "פגישת קבלה לעבודה", stages: ["נפגשים עם המנהל", "מדברים על התפקיד", "סוגרים את הפרטים"], seconds: 4, prop: "interview", pose: "talk" },
  shopping: { label: "קנייה בחנות", stages: ["בוחרים מהמדף", "משלמים בקופה", "אוספים את הקנייה"], seconds: 4, prop: "shelf", pose: "shop" },
  bike: { label: "אוספים את האופניים", stages: ["בודקים את האופניים", "מתאימים את הכיסא", "מוכנים לצאת לדרך"], seconds: 4, prop: "bike", pose: "shop" },
  bank: { label: "מטפלים בחשבון", stages: ["ניגשים לעמדה", "בודקים ומאשרים", "מקבלים אישור"], seconds: 4, prop: "bank", pose: "bank" },
  exercise: { label: "אימון בסטודיו", stages: ["מתחממים", "סט משקולות", "נושמים ומשחררים"], seconds: 5, prop: "weights", pose: "exercise" },
  walk: { label: "הליכה בפארק", stages: ["יוצאים לשביל", "נושמים אוויר", "חוזרים רעננים"], seconds: 5, prop: "park", pose: "walk" },
  picnic: { label: "פיקניק עם חברים", stages: ["פורשים שמיכה", "חולקים אוכל", "יושבים ומדברים"], seconds: 5, prop: "picnic", pose: "social" },
  delivery: { label: "מקבלים משלוח", stages: ["השליח מגיע", "מקבלים את השקית", "מניחים את האוכל"], seconds: 4, prop: "delivery", pose: "shop" },
  upgrade: { label: "עוברים לדירה המשודרגת", stages: ["אורזים את הדברים", "מעבירים את הארגזים", "מסדרים את הבית"], seconds: 5, prop: "boxes", pose: "carry" },
  talk: { label: "מבלים עם תושבי השכונה", stages: ["ניגשים לשיחה", "מקשיבים ומשתפים", "נפרדים עד הפעם הבאה"], seconds: 4, prop: "conversation", pose: "talk" },
  pour: { label: "מוסיפים לכוס", stages: ["לוקחים את המרכיב", "מוזגים בזהירות", "מניחים בחזרה"], seconds: 1.4, prop: "coffee", pose: "pour" },
  clear: { label: "מנקים את הכוס", stages: ["מרוקנים", "שוטפים את הכוס", "מוכנים להזמנה"], seconds: 1.4, prop: "coffee", pose: "cook" },
  serve: { label: "מגישים את ההזמנה", stages: ["מרימים את הכוס", "מגישים ללקוח", "מקבלים את התשלום"], seconds: 3, prop: "coffee", pose: "serve" },
  courier: { label: "יוצאים למשלוח", interactive: true }
};

const actions = {
  rest: "rest", cook: "cook", online: "computer", freelance: "computer", remote: "computer",
  delivery: "delivery", upgrade: "upgrade", "coffee-start": "brew", meal: "eat", friends: "social",
  study: "study", groceries: "shopping", snack: "eat", laptop: "shopping", bike: "bike",
  community: "eat", walk: "walk", picnic: "picnic", gig: "courier", exercise: "exercise",
  deposit: "bank", withdraw: "bank", loan: "bank", repay: "bank", "serve-coffee": "serve", "mix-clear": "clear",
  "mix-espresso": "pour", "mix-milk": "pour", "mix-foam": "pour", "mix-cocoa": "pour", "mix-ice": "pour", "mix-water": "pour"
};

export function activityFor(id, location) {
  const kind = id === "work" ? location === "cafe" ? "brew" : "computer" :
    /^apply-(cafe|office|tech|lead)$/.test(id) ? "interview" :
    /^talk-[0-2]$/.test(id) ? "talk" : Object.hasOwn(actions, id) ? actions[id] : null;
  if (!kind) throw new Error(`אין סצנת ביצוע לפעולה: ${id}`);
  return { ...clips[kind], id, kind, location };
}

export function activityStage(profile, elapsed) {
  if (!Number.isFinite(elapsed) || elapsed < 0 || !profile.seconds)
    throw new Error("זמן האנימציה אינו תקין.");
  const progress = Math.min(1, elapsed / profile.seconds);
  return { progress, label: profile.stages[Math.min(2, Math.floor(progress * 3))] };
}
