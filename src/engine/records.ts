/**
 * בדיקת פרטים במערכת דרך המשל״ט: אחרי זיהוי מעורב – שאילתה בקשר, והתוצאה (משתנה לפי גרסת התרחיש).
 * בדוי לגמרי; בלי שמות מערכות אמיתיות.
 */
import type { Choice, Cond, Hotspot, Scenario } from './types';

export interface RecordDef {
  char: string;
  hotspot: string;
  /** מתי אפשר לבדוק (למשל אחרי שהמעורב הזדהה) */
  after: Cond;
  /** תוצאת הבדיקה – אפשר עם משתני גרסה */
  text: string;
}

export function addRecords(sc: Scenario, hotspots: Hotspot[]): Hotspot[] {
  const defs = sc.records ?? [];
  if (!defs.length) return hotspots;
  return hotspots.map((h) => {
    const mine = defs.filter((d) => d.hotspot === h.id);
    if (!mine.length) return h;
    const extra: Choice[] = mine.map((d) => {
      const full = sc.characters.find((c) => c.id === d.char)?.name ?? d.char;
      const first = full.split(' ')[0];
      return {
        id: `rec-${d.char}`,
        label: `לבדוק את הפרטים של ${first} במערכת דרך המשל״ט – בלי שהמעורבים ישמעו`,
        when: d.after,
        lines: [
          { speaker: 'narrator', text: `התרחקת כמה צעדים, כך שאף אחד מהמעורבים לא ישמע את התשובה.` },
          { speaker: 'player', text: `{{toCenter}}, תבדקי לי פרטים של ${full}.` },
          { speaker: 'dispatch', text: d.text },
        ],
        effects: { set: { [`checked_${d.char}`]: true }, minutes: 2 },
      };
    });
    return { ...h, choices: [...h.choices, ...extra] };
  });
}
