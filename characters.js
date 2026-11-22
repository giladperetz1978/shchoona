export const CHARACTERS = {
  home: {
    name: "גילה מהוועד", role: "שרת הפנים של חדר המדרגות", color: "#b281b9", skin: "#edbd91", hair: "#e0d5c4", style: "bun", prop: "clipboard",
    greeting: "פתחתי קבוצת ווטסאפ לשקט בבניין. יש כבר 438 הודעות.",
    returnGreeting: "איזה יופי שחזרת! יש לי עדכון דחוף על העדכון הקודם.",
    choices: [
      { title: "נשלח הודעה שמבקשת לא לשלוח הודעות", reply: "רעיון גאוני! אשלח גם תזכורת, סקר וקובץ הסבר.", hours: 1, cost: 0, effects: { happiness: 7 } },
      { title: "קודם תה, אחר כך ישיבת ועד", reply: "סוף סוף מישהו עם סדרי עדיפויות. יש גם עוגייה שלא מופיעה בתקציב.", hours: 2, cost: 15, effects: { energy: 12, food: 12, happiness: 5 } },
      { title: "אני מתנדב/ת להשקות את העציץ בלובי", reply: "הוא מפלסטיק, אבל אני מעריכה את המחויבות.", hours: 1, cost: 0, effects: { happiness: 5, energy: -2 } }
    ]
  },
  cafe: {
    name: "ניסו אספרסו", role: "בריסטה עם דוקטורט בקצף", color: "#d98660", skin: "#d9a078", hair: "#503b35", style: "moustache", prop: "cup",
    greeting: "לקוח ביקש קפה בלי קפאין, בלי חלב ובלי מים. הבאתי לו חשבונית.",
    returnGreeting: "הנה הפרצוף האהוב עליי! אחרי הפרצוף שמופיע בקצף, כמובן.",
    choices: [
      { title: "נצייר חתול בקצף?", reply: "יצא תפוח אדמה עם שפם. נקרא לזה חתול אבסטרקטי ונוסיף 4 שקלים.", hours: 1, cost: 0, effects: { happiness: 8 } },
      { title: "אפשר טעימה מהתערובת הסודית?", reply: "הסוד הוא ששמתי קפה בקפה. אל תספר/י למתחרים.", hours: 1, cost: 10, effects: { energy: 18, happiness: 3 } },
      { title: "בוא נעשה דקת שקט למכונת הקפה", reply: "ששש... היא טוחנת מחשבות.", hours: 1, cost: 0, effects: { energy: 6, happiness: 4 } }
    ]
  },
  college: {
    name: "ד״ר פלפל", role: "מרצה בכיר להסברים ארוכים", color: "#839bc4", skin: "#ecc29b", hair: "#e2e7e4", style: "wild", prop: "book",
    greeting: "היום נלמד ניהול זמן. השיעור היה אמור להתחיל אתמול.",
    returnGreeting: "אני זוכר אותך! או שזו הייתה שקופית? בכל מקרה, מצוין.",
    choices: [
      { title: "אפשר הסבר במשפט אחד?", reply: "בהחלט. ראשית, עלינו להגדיר מהו משפט. נפגש בעוד שעתיים.", hours: 2, cost: 0, effects: { happiness: 6 } },
      { title: "הבאתי קפה כדי לשרוד את המצגת", reply: "נהדר! גם המצגת ביקשה אחד. היא בשקופית 312.", hours: 1, cost: 15, effects: { energy: 15, happiness: 4 } },
      { title: "הכלב אכל לי את שיעורי הבית הדיגיטליים", reply: "זה מסביר למה הוא נובח ב־PDF. ניתן לו תעודת הצטיינות.", hours: 1, cost: 0, effects: { happiness: 8 } }
    ]
  },
  office: {
    name: "תיקי תקתק", role: "מנהלת ישיבות על ישיבות", color: "#64a3ad", skin: "#c78e68", hair: "#423537", style: "bob", prop: "clipboard",
    greeting: "ביטלתי את הישיבה. קבעתי ישיבה קצרה כדי להסביר למה.",
    returnGreeting: "טוב שבאת. בדיוק חיפשתי מישהו שיעשה ריפליי־אול.",
    choices: [
      { title: "אולי פשוט נשלח מייל?", reply: "מייל?! בלי הכנה? אני אוהבת את רוח ההרפתקנות שלך.", hours: 1, cost: 0, effects: { happiness: 8, energy: 4 } },
      { title: "אני אביא עוגיות לישיבה", reply: "מעולה, עכשיו יש לישיבה תוצר מדיד.", hours: 1, cost: 20, effects: { food: 20, happiness: 8 } },
      { title: "אכין מצגת על פחות מצגות", reply: "מרגש. תכין/י גם תקציר מנהלים וגרסה להדפסה.", hours: 2, cost: 0, effects: { happiness: 6 } }
    ]
  },
  tech: {
    name: "באגי", role: "מפתח בכיר בתירוצים יצירתיים", color: "#8e85c5", skin: "#e6b78d", hair: "#453945", style: "headphones", prop: "laptop",
    greeting: "אצלי זה עובד. אצלי גם הטוסטר מריץ גרסת בטא.",
    returnGreeting: "שוב כאן? מעולה, בדיוק תיקנתי באג שיצר שני חברים חדשים.",
    choices: [
      { title: "ניסית לכבות ולהדליק?", reply: "את המחשב או את הקריירה? כי לשניהם יש עדכון ממתין.", hours: 1, cost: 0, effects: { happiness: 8 } },
      { title: "ניקח הפסקה בלי מסכים", reply: "סגור. רגע, אני מוריד אפליקציה להפסקות בלי מסכים.", hours: 2, cost: 0, effects: { energy: 15, happiness: 5 } },
      { title: "נקרא לבאג פיצ׳ר?", reply: "כבר הכנתי לו דף נחיתה ושלוש חבילות מנוי.", hours: 1, cost: 0, effects: { happiness: 7 } }
    ]
  },
  bank: {
    name: "שקלר", role: "יועץ השקעות ואספן מהדקים", color: "#71998a", skin: "#e0ad83", hair: "#6d5c4b", style: "glasses", prop: "coin",
    greeting: "הכסף שלך עובד בשבילך. כרגע הוא בהפסקת צהריים.",
    returnGreeting: "ברוך שובך! הכנתי לך כיסא בריבית משתנה.",
    choices: [
      { title: "אפשר לפתוח חיסכון לשנ״צ?", reply: "בהחלט. הריבית נצברת בחלומות.", hours: 1, cost: 0, effects: { happiness: 7, energy: 4 } },
      { title: "אעזור לך למיין את המהדקים", reply: "מושלם! הרגע חסכת לי יועץ ארגוני. מגיע לך תשלום קטן.", hours: 2, cost: -30, effects: { energy: -5, happiness: 3 } },
      { title: "יש עמלה על השאלה הזאת?", reply: "לא, אבל על התשובה... סתם, סתם. אפילו לי יש חוש הומור.", hours: 1, cost: 0, effects: { happiness: 8 } }
    ]
  },
  market: {
    name: "סימה בשקית", role: "יודעת מה חסר לך לפני המקרר", color: "#d29559", skin: "#bc805c", hair: "#49382f", style: "bun", prop: "apple",
    greeting: "העגבניות היום במבצע: קונים שתיים, מקבלים עצה לחיים.",
    returnGreeting: "ידעתי שתחזור/י. הבננות שאלו עליך.",
    choices: [
      { title: "מה העצה של העגבניות?", reply: "לא לקחת הכול ללב. במיוחד אם מתכננים להיות רוטב.", hours: 1, cost: 0, effects: { happiness: 8 } },
      { title: "אעזור לסדר את מדף הפירות", reply: "תודה! קח/י פרי. הבננה הזאת התקבלה לעבודה בלי ראיון.", hours: 2, cost: 0, effects: { food: 28, energy: -4, happiness: 4 } },
      { title: "באתי רק בשביל דבר אחד", reply: "ברור. גם אני פתחתי את המכולת רק בשביל חלב.", hours: 1, cost: 0, effects: { happiness: 6 } }
    ]
  },
  shop: {
    name: "זיק פיקס", role: "משדרג גם דברים שעובדים", color: "#bc88a7", skin: "#edbc94", hair: "#6b4585", style: "quiff", prop: "phone",
    greeting: "המכשיר החדש עושה הכול! חוץ מלחסוך לך כסף על המכשיר החדש.",
    returnGreeting: "יש עדכון חדש. הוא מתקן את העדכון שתיקן את העדכון.",
    choices: [
      { title: "יש מטען למוטיבציה?", reply: "כן, אבל החיבור לא תואם לימי ראשון.", hours: 1, cost: 0, effects: { happiness: 8, energy: 3 } },
      { title: "נעשה סלפי עם הטוסטר החכם", reply: "תגידו צ׳יז! לא אתה, טוסטר. לא שוב.", hours: 1, cost: 0, effects: { happiness: 9 } },
      { title: "אעזור לך לבדוק את רמקול ההדגמה", reply: "בדיקה, בדיקה... השכנים אישרו שהוא עובד.", hours: 2, cost: -25, effects: { energy: -4, happiness: 3 } }
    ]
  },
  park: {
    name: "מוטי יוגה", role: "מורה לנשימה וסגן של היונים", color: "#76a985", skin: "#d49c73", hair: "#a69d8c", style: "beard", prop: "bird",
    greeting: "שאיפה, נשיפה... רגע, מי חנה לי על הצ׳אקרה?",
    returnGreeting: "היונים שמרו לך מקום. הן גם הצביעו בעד העלאת דמי הפירורים.",
    choices: [
      { title: "ננסה את תנוחת העובד בחופשה", reply: "מצוין. שוכבים, נושמים, ולא עונים למייל. למתקדמים בלבד.", hours: 2, cost: 0, effects: { energy: 18, happiness: 7 } },
      { title: "אבקש עצה מהיונה", reply: "היא אומרת: לפרוש כנפיים, ולא לשכוח איפה השארת את הסנדוויץ׳.", hours: 1, cost: 0, effects: { happiness: 9 } },
      { title: "נשתה שייק ירוק?", reply: "הוא בטעם דשא, אבל דשא עם חזון.", hours: 1, cost: 20, effects: { food: 20, energy: 8, happiness: 3 } }
    ]
  },
  gym: {
    name: "רוני שרירוני", role: "מרים משקולות ואת מצב הרוח", color: "#cf806c", skin: "#d8a078", hair: "#57403a", style: "headband", prop: "weight",
    greeting: "עוד חזרה אחת! אני אומר את זה כבר שבע חזרות, אבל הפעם באמת.",
    returnGreeting: "הנה האלוף/ה! אפילו המשקולות חייכו. או שזה היה החלודה.",
    choices: [
      { title: "הרמתי היום את עצמי מהמיטה", reply: "שיא אישי! נרשום את זה באפליקציה לפני שהיא תבקש מנוי.", hours: 1, cost: 0, effects: { happiness: 8 } },
      { title: "נעשה אימון לצחוק?", reply: "שלושה סטים של חה־חה. לא לשכוח לשתות בין הבדיחות.", hours: 2, cost: 0, effects: { energy: 12, happiness: 10 } },
      { title: "אפשר יום רגליים בישיבה?", reply: "אפשר. קוראים לזה יום כיסא. יש לנו מאמן מומחה.", hours: 1, cost: 0, effects: { energy: 8, happiness: 5 } }
    ]
  }
};

export const INGREDIENTS = {
  espresso: { name: "אספרסו", color: "#83513b", symbol: "☕" },
  milk: { name: "חלב", color: "#f1dfba", symbol: "🥛" },
  foam: { name: "קצף", color: "#fff8e8", symbol: "☁" },
  cocoa: { name: "שוקולד", color: "#aa7352", symbol: "🍫" },
  ice: { name: "קרח", color: "#a9d8e3", symbol: "🧊" },
  water: { name: "מים", color: "#84bacb", symbol: "💧" }
};

export const COFFEE_RECIPES = [
  { name: "קפוצ׳ינו בעננים", order: ["espresso", "milk", "foam"], request: "קפוצ׳ינו, עם מספיק קצף להסתיר את יום ראשון." },
  { name: "שוקו של מנכ״לים", order: ["cocoa", "milk", "foam"], request: "שוקו. אבל בכוס של קפה, שיחשבו שאני בפגישה." },
  { name: "קפה קר עם אופי", order: ["ice", "espresso", "milk"], request: "קפה קר. היום כבר התחמם מספיק בלעדיו." },
  { name: "אמריקנו בלי ישיבה", order: ["espresso", "water"], request: "אמריקנו, בלי חלב ובלי הזמנה לפגישת צוות." }
];
