import type { Difficulty, Shift } from '../engine/types';

/** משמרת מלאה: כמה אירועים ברצף, שראש המשמרת מנתב אחד אחרי השני */
export interface ShiftItem {
  id: string;
  seed: number;
  result?: { score: number; proc: string; title: string; historyId?: number };
}
export interface ShiftPlan {
  shift: Shift;
  difficulty: Difficulty;
  items: ShiftItem[];
  idx: number;
  startedAt: string;
}

const KEY = 'siyur.shift.v1';

export function loadShift(): ShiftPlan | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ShiftPlan) : null;
  } catch {
    return null;
  }
}
export function saveShift(p: ShiftPlan | null) {
  try {
    if (p) localStorage.setItem(KEY, JSON.stringify(p));
    else localStorage.removeItem(KEY);
  } catch {
    /* אחסון חסום – המשמרת תתקיים רק בזיכרון של העמוד הנוכחי */
  }
}

/** הפריט הנוכחי במשמרת, אם המשחק שמתנהל שייך לו */
export function currentShiftItem(p: ShiftPlan | null, scenarioId: string, seed: number): ShiftItem | undefined {
  const it = p?.items[p.idx];
  return it && it.id === scenarioId && it.seed === seed ? it : undefined;
}

/** קישור משמרת לכיתה: ‎#/shift?shift=night&d=standard&s=bar-fight:123,gas-smell:55 */
export function shiftLink(shift: Shift, difficulty: Difficulty, items: { id: string; seed: number }[]): string {
  const base = location.href.split('#')[0];
  return `${base}#/shift?shift=${shift}&d=${difficulty}&s=${items.map((i) => `${encodeURIComponent(i.id)}:${i.seed}`).join(',')}`;
}

export function parseShiftQuery(q: URLSearchParams): Omit<ShiftPlan, 'startedAt' | 'idx'> | null {
  const s = q.get('s');
  const shift = q.get('shift') as Shift | null;
  if (!s || !shift || !['morning', 'evening', 'night'].includes(shift)) return null;
  const items = s.split(',').map((x) => {
    const [id, seed] = x.split(':');
    return { id: decodeURIComponent(id), seed: Number(seed) };
  }).filter((x) => /^[a-z0-9-]+$/.test(x.id) && Number.isFinite(x.seed) && x.seed > 0).slice(0, 6);
  const d = q.get('d') as Difficulty | null;
  return items.length ? { shift, difficulty: d && ['basic', 'standard', 'advanced'].includes(d) ? d : 'standard', items } : null;
}
