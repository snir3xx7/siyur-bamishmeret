/**
 * דוח פעולה שהחניך כותב בעצמו בסיום: לכל פרט – נצפה / נטען / נמסר מהמוקד / לא ידוע לי,
 * ואילו סמכויות הופעלו. המערכת משווה למה שקרה בפועל במשחק (מה נחשף ואיך, ואילו פעולות בוצעו).
 * לא נכלל בציון – תרגול כתיבה מדויקת: לא לכתוב מה שלא ידוע, ולא להציג טענה כעובדה.
 */
import { factText } from './game';
import type { GameState, Scenario } from './types';

export type FactClass = 'seen' | 'said' | 'dispatch' | 'none';
export const FACT_CLASS_LABEL: Record<FactClass, string> = {
  seen: 'נצפה / אומת',
  said: 'נטען',
  dispatch: 'נמסר מהמוקד',
  none: 'לא ידוע לי',
};

export interface FactItem {
  id: string;
  text: string;
  answer: FactClass;
  /** הסבר לתשובה הנכונה */
  why: string;
}

export interface PowerItem {
  id: string;
  label: string;
  used: boolean;
}

const POWERS: { id: string; label: string; match: (choiceId: string, report: string) => boolean }[] = [
  { id: 'identify', label: 'דרישת הזדהות', match: (_, r) => /הזדהות|זיהוי/.test(r) },
  { id: 'detain', label: 'עיכוב', match: (id, r) => /^(?!cs-)/.test(id) && /עיכוב|מעוכב/.test(r) },
  { id: 'search', label: 'חיפוש על הגוף', match: (id) => /^cs-(search|strip)-/.test(id) },
  { id: 'arrest', label: 'מעצר', match: (id) => /^cs-arrest-/.test(id) },
  { id: 'cuff', label: 'אזיקה', match: (id) => /^cs-cuff-/.test(id) },
  { id: 'order', label: 'הוראה מחייבת / הרחקה / פינוי', match: (_, r) => !/^(תיעוד|שיחה)/.test(r) && /הוראה|הרחקה|פינוי|הרחקת/.test(r) },
  { id: 'seize', label: 'לקיחת חפץ או אלכוהול', match: (_, r) => /לקיחת|אלכוהול (מקטין|אצל קטינים)|תפיסת/.test(r) },
  { id: 'enter', label: 'כניסה לבית', match: (_, r) => /^כניסה (לבית|לדירה|לבדיקת)/.test(r) },
];

const reportOf = (sc: Scenario, id: string) => {
  for (const h of sc.hotspots) {
    const c = h.choices.find((x) => x.id === id);
    if (c) return c.report ?? c.label;
  }
  return '';
};

/** הפריטים לסיווג: כל מה שנחשף, ועד שלושה פרטים שלא נחשפו (מלכודת: לא לכתוב מה שלא ידוע) */
export function factQuiz(sc: Scenario, st: GameState): FactItem[] {
  const items: FactItem[] = [];
  let hidden = 0;
  for (const f of sc.facts) {
    const text = factText(sc, st, f.id);
    if (!text.trim() || text.includes('{{')) continue;
    const k = st.known[f.id];
    if (!k) {
      if (hidden >= 3) continue;
      hidden++;
      items.push({ id: f.id, text, answer: 'none', why: 'לא נחשף אצלך במהלך האירוע – לא נכנס לדוח.' });
      continue;
    }
    const src = f.source ? sc.characters.find((c) => c.id === f.source)?.name : undefined;
    if (k.verified) items.push({ id: f.id, text, answer: 'seen', why: f.kind === 'observation' ? 'ראית או בדקת בעצמך.' : 'נמסר, ואחר כך אומת בזירה.' });
    else if (f.kind === 'dispatch') items.push({ id: f.id, text, answer: 'dispatch', why: 'מסר המוקד ולא אומת בזירה.' });
    else items.push({ id: f.id, text, answer: 'said', why: src ? `טענה של ${src} – נכתב „לדברי…”.` : 'טענה – נכתב „לדברי…”.' });
  }
  return items.slice(0, 12);
}

/** סמכויות רלוונטיות לתרחיש, ומה הופעל בפועל */
export function powerQuiz(sc: Scenario, st: GameState): PowerItem[] {
  const all = sc.hotspots.flatMap((h) => h.choices.map((c) => ({ id: c.id, report: c.report ?? '' })));
  const chosen = new Set(Object.keys(st.chosen));
  return POWERS.filter((p) => all.some((c) => p.match(c.id, c.report))).map((p) => ({
    id: p.id,
    label: p.label,
    used: [...chosen].some((id) => p.match(id, reportOf(sc, id))),
  }));
}

export interface ActionReportAnswers {
  facts: Record<string, FactClass | undefined>;
  powers: Record<string, boolean | undefined>;
}

export function gradeActionReport(sc: Scenario, st: GameState, a: ActionReportAnswers) {
  const facts = factQuiz(sc, st).map((f) => ({ ...f, given: a.facts[f.id], ok: a.facts[f.id] === f.answer }));
  const powers = powerQuiz(sc, st).map((p) => ({ ...p, given: !!a.powers[p.id], ok: !!a.powers[p.id] === p.used }));
  const total = facts.length + powers.length;
  const ok = facts.filter((f) => f.ok).length + powers.filter((p) => p.ok).length;
  /** טעויות חמורות: טענה שנכתבה כעובדה, או פרט שלא היה ידוע ונכתב */
  const serious = facts.filter((f) => (f.answer === 'said' || f.answer === 'dispatch') && f.given === 'seen').length + facts.filter((f) => f.answer === 'none' && f.given && f.given !== 'none').length;
  return { facts, powers, ok, total, serious };
}
