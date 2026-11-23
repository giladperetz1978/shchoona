export const WEEKLY_NEWS = [
  { id: "concert", headline: "הרחוב הופך לבמה", category: "תרבות", title: "הופעה חינמית בשכונה! יצאת לרקוד עם החברים.", happiness: 8, cash: 0 },
  { id: "refund", headline: "חיובים כפולים מוחזרים לתושבים", category: "כלכלה", title: "החזר קטן על חיוב כפול. לפעמים שווה לבדוק את החשבון.", happiness: 2, cash: 90 },
  { id: "quiet", headline: "סוף שבוע של הפוגה בעיר", category: "איכות חיים", title: "סוף שבוע שקט עם ספר טוב. גם זה הישג.", happiness: 5, cash: 0 },
  { id: "neighbors", headline: "הגינה השכונתית מתמלאת", category: "קהילה", title: "מפגש שכנים בגינה. מסתבר שיש פה אנשים ממש נחמדים.", happiness: 7, cash: 0 },
  { id: "repair", headline: "תקלה במכשירים: הוצאה לא מתוכננת", category: "צרכנות", title: "תקלה בטלפון עלתה 80 ₪. התיקון שלא תכננת.", happiness: -4, cash: -80 }
];

export function newsFor(entry) {
  const news = WEEKLY_NEWS.find(item => item.id === entry.id);
  if (!news) throw new Error("מבזק החדשות אינו מוכר.");
  return news;
}
