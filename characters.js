import { RESIDENT_CREATURES } from "./creatures.js";

export const CHARACTERS = {
  home: {
    name: "גילה", role: "השכנה מקומה שלוש", creature: RESIDENT_CREATURES.home,
    greeting: "ראיתי שחזרת מאוחר. הכול בסדר? אני בדיוק מכינה תה.",
    returnGreeting: "טוב לראות אותך שוב.",
    choices: [
      { title: "שבוע עמוס. אפשר לשבת רגע?", reply: "בטח. לא חייבים להספיק הכול היום. איך הולך בעבודה?", hours: 1, cost: 0, effects: { happiness: 7 } },
      { title: "תה ומשהו קטן לאכול נשמע טוב", reply: "יש לחם טרי וגבינה. תשאיר/י את הטלפון רגע, הוא יחכה.", hours: 2, cost: 15, effects: { energy: 12, food: 12, happiness: 5 } },
      { title: "אני אעזור עם העציצים בלובי", reply: "תודה. אני לא מגיעה לזה השבוע. המפתח למחסן ליד הדלת.", hours: 1, cost: 0, effects: { happiness: 5, energy: -2 } }
    ]
  },
  cafe: {
    name: "ניסו", role: "בעל קפה פינה", creature: RESIDENT_CREATURES.cafe,
    greeting: "הבוקר פה לא עוצר. יש משמרת פנויה, ואם באת לקפה — שב/י, אני כבר איתך.",
    returnGreeting: "היי, מה נשמע?",
    choices: [
      { title: "איך פתחת את המקום הזה?", reply: "שנתיים חסכתי. בהתחלה היינו שלושה שולחנות ומכונה יד שנייה. עכשיו חסרות לי ידיים.", hours: 1, cost: 0, effects: { happiness: 8 } },
      { title: "תעשה לי אספרסו קצר", reply: "קח/י. התערובת הזאת הגיעה הבוקר, תגיד/י מה דעתך.", hours: 1, cost: 10, effects: { energy: 18, happiness: 3 } },
      { title: "נצא להפסקה בחוץ?", reply: "כן. חמש דקות בלי הזמנות יעשו לי טוב.", hours: 1, cost: 0, effects: { energy: 6, happiness: 4 } }
    ]
  },
  college: {
    name: "ד״ר פלפל", role: "מרצה בקמפוס", creature: RESIDENT_CREATURES.college,
    greeting: "השיעור מתחיל עוד מעט. אם משלבים עבודה ולימודים, כדאי לבחור מראש יום קבוע.",
    returnGreeting: "טוב שחזרת לקמפוס.",
    choices: [
      { title: "אני מתלבט/ת אם הכיוון הזה מתאים לי", reply: "בוא/י נעבור על האפשרויות. לא צריך לבחור מקצוע לכל החיים, רק את הצעד הבא.", hours: 2, cost: 0, effects: { happiness: 6 } },
      { title: "יש זמן לקפה לפני השיעור?", reply: "יש. ניפגש בקפטריה ונעבור על מה שפספסת.", hours: 1, cost: 15, effects: { energy: 15, happiness: 4 } },
      { title: "הצלחתי לפנות זמן ללימודים השבוע", reply: "זה החלק הקשה. עכשיו פשוט להגיע, גם כשלא מרגישים מוכנים.", hours: 1, cost: 0, effects: { happiness: 8 } }
    ]
  },
  office: {
    name: "תיקי", role: "מנהלת התפעול", creature: RESIDENT_CREATURES.office,
    greeting: "אנחנו מרחיבים את הצוות. צריך מישהו שמכיר עבודה עם אנשים ויודע להחזיק משימה.",
    returnGreeting: "היי, יש לך כמה דקות?",
    choices: [
      { title: "איך נראה יום רגיל כאן?", reply: "תיאום, לקוחות, ולפעמים לפתור משהו שאף אחד לא צפה. לא משתעממים.", hours: 1, cost: 0, effects: { happiness: 8, energy: 4 } },
      { title: "הבאתי משהו להפסקת הצוות", reply: "בדיוק בזמן. כולם במטבח, בוא/י להכיר.", hours: 1, cost: 20, effects: { food: 20, happiness: 8 } },
      { title: "אפשר לעבור איתך על קורות החיים?", reply: "כן. נתחיל במה שכבר עשית, גם ניסיון בבית קפה נחשב.", hours: 2, cost: 0, effects: { happiness: 6 } }
    ]
  },
  tech: {
    name: "באגי", role: "מפתח בצוות פיקסל", creature: RESIDENT_CREATURES.tech,
    greeting: "בדיוק העלינו גרסה. אני צריך קצת אוויר לפני שאני פותח שוב את המחשב.",
    returnGreeting: "היי! איך מתקדם?",
    choices: [
      { title: "איך נכנסת לתחום?", reply: "למדתי בערבים ועבדתי ביום. הפרויקט הראשון שלי היה קטן, אבל סיימתי אותו. זה מה שעזר בראיון.", hours: 1, cost: 0, effects: { happiness: 8 } },
      { title: "בוא נצא להליכה בלי מסכים", reply: "סגור. עד הפארק וחזרה. אני משאיר את הלפטופ כאן.", hours: 2, cost: 0, effects: { energy: 15, happiness: 5 } },
      { title: "מה אתם מחפשים במועמדים?", reply: "בסיס טוב וניסיון אמיתי. תסתכל/י על הדרישות בעמדת הקבלה, יש מסלול גם לתפקיד ראשון.", hours: 1, cost: 0, effects: { happiness: 7 } }
    ]
  },
  bank: {
    name: "שקלר", role: "יועץ בבנק השכונתי", creature: RESIDENT_CREATURES.bank,
    greeting: "לפני הכול: להשאיר מספיק לשכירות. אחר כך נדבר על חיסכון.",
    returnGreeting: "בוא/י נשב רגע.",
    choices: [
      { title: "אני בלחץ מההוצאות", reply: "נעשה רשימה קצרה. כשמפרידים בין הוצאה קבועה לקנייה שאפשר לדחות, הדברים נראים אחרת.", hours: 1, cost: 0, effects: { happiness: 7, energy: 4 } },
      { title: "עדיין צריך עזרה בסידור הארכיון?", reply: "כן, לשעתיים. התשלום קטן, אבל אפשר להתחיל עכשיו.", hours: 2, cost: -30, effects: { energy: -5, happiness: 3 } },
      { title: "הלוואה תעזור לי להתקדם?", reply: "היא נותנת מזומן, לא הון. צריך להחזיר אותה עם ריבית. תבדוק/י קודם איך תחזיר/י.", hours: 1, cost: 0, effects: { happiness: 8 } }
    ]
  },
  market: {
    name: "סימה", role: "בעלת המכולת", creature: RESIDENT_CREATURES.market,
    greeting: "כריכים יש ליד הקופה. אם חסר אוכל בבית, סל מצרכים יוצא יותר משתלם.",
    returnGreeting: "היי, המשלוח הגיע עכשיו.",
    choices: [
      { title: "מה חדש ברחוב?", reply: "בקפה מחפשים עובדים ובקמפוס נפתח מחזור חדש. אנשים פה לא עומדים במקום.", hours: 1, cost: 0, effects: { happiness: 8 } },
      { title: "אעזור לסדר את מדף הפירות", reply: "תודה. קח/י משהו לאכול לפני שיוצאים, לא עובדים על בטן ריקה.", hours: 2, cost: 0, effects: { food: 28, energy: -4, happiness: 4 } },
      { title: "באתי להגיד שלום", reply: "איזה כיף. רוב האנשים כבר מזמינים הכול בטלפון, טוב שעוד עוצרים לדבר.", hours: 1, cost: 0, effects: { happiness: 6 } }
    ]
  },
  shop: {
    name: "זיק", role: "מוכר ומתקן בעדכני", creature: RESIDENT_CREATURES.shop,
    greeting: "מחפש/ת ציוד לעבודה או משהו לדרך? יש מחשבים ואופניים, בלי חבילות מיותרות.",
    returnGreeting: "אהלן, מה צריך היום?",
    choices: [
      { title: "מה עדיף לקנות קודם?", reply: "אופניים אם צריך הכנסה מהירה ממשלוחים. מחשב אם הכיוון הוא לימודים ועבודה מהבית.", hours: 1, cost: 0, effects: { happiness: 8, energy: 3 } },
      { title: "תראה לי על מה אתה עובד", reply: "משפץ מחשב ישן. לפעמים החלק הכי טוב בעבודה זה להחזיר משהו לחיים.", hours: 1, cost: 0, effects: { happiness: 9 } },
      { title: "צריך עזרה בבדיקת הציוד?", reply: "כן. יש כמה רמקולים לבדוק לפני הסגירה. אשלם לך על הזמן.", hours: 2, cost: -25, effects: { energy: -4, happiness: 3 } }
    ]
  },
  park: {
    name: "מוטי", role: "מדריך בפארק", creature: RESIDENT_CREATURES.park,
    greeting: "לא חייבים לרוץ. יש מקום על הדשא, והקבוצה מתחילה עוד מעט.",
    returnGreeting: "טוב שיצאת קצת החוצה.",
    choices: [
      { title: "אפשר להצטרף לתרגול?", reply: "בטח. נתחיל לאט, עשרים דקות בלי לחשוב על מה שנשאר לעשות.", hours: 2, cost: 0, effects: { energy: 18, happiness: 7 } },
      { title: "אני מרגיש/ה שכולם מתקדמים יותר מהר", reply: "את/ה רואה רק את מה שהם מראים. בוא/י נעשה סיבוב, יש לך גם הישגים משלך.", hours: 1, cost: 0, effects: { happiness: 9 } },
      { title: "נשתה משהו אחרי האימון?", reply: "יש דוכן ליד השער. אני בא איתך.", hours: 1, cost: 20, effects: { food: 20, energy: 8, happiness: 3 } }
    ]
  },
  gym: {
    name: "רוני", role: "מאמן בסטודיו", creature: RESIDENT_CREATURES.gym,
    greeting: "איך הגוף היום? נתאים את האימון למה שיש, לא למה שכתוב בתוכנית.",
    returnGreeting: "כיף לראות התמדה.",
    choices: [
      { title: "הגעתי, למרות שלא היה לי כוח", reply: "זה מספיק להתחלה. נעשה חימום ונראה איך מרגיש.", hours: 1, cost: 0, effects: { happiness: 8 } },
      { title: "נעשה אימון קל ביחד?", reply: "בשמחה. בלי שיאים היום, רק לזוז קצת ולצאת יותר טוב ממה שנכנסנו.", hours: 2, cost: 0, effects: { energy: 12, happiness: 10 } },
      { title: "אני צריך/ה יום התאוששות", reply: "בחירה טובה. מתיחות, מים ושינה. האימון הבא לא בורח.", hours: 1, cost: 0, effects: { energy: 8, happiness: 5 } }
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
