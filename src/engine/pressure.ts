/**
 * לחץ זמן ו„הקפאת מצב”: שעון שרץ בזירה. מעורב שמתעצבן, תנועה שעוברת ליד הרכבים, ריח גז שמתחזק –
 * אם לא מטפלים בזמן (מספר פעולות מההגעה), המצב מחמיר מעצמו.
 * מלמד לתעדף: קודם מקפיאים את המצב, אחר כך מבררים. לא משנה את ציון התרחיש – מוצג בתחקיר בכרטיס נפרד.
 */
import { evalCond } from './conditions';
import type { Cond, Effects, GameState, Line, Scenario } from './types';

export interface PressureDef {
  id: string;
  /** מה מתקתק, בקצרה: „התנועה עוברת ליד הרכבים” */
  label: string;
  /** כמה פעולות בזירה (מההגעה) עד שהמצב מחמיר */
  turns: number;
  /** מה מקפיא את המצב */
  resolved: Cond;
  /** מה קורה אם לא טופל בזמן */
  expire: { title: string; lines: Line[]; effects?: Effects };
  /** לתחקיר: מה נעשה נכון / מה לשפר */
  keep: string;
  improve: string;
}

export type PressureState = 'running' | 'ok' | 'expired';

const K = (id: string) => `pr:${id}`;
const T0 = (id: string) => `pr:${id}:t0`;

/** בהגעה לזירה: השעונים מתחילים לרוץ */
export function startPressure(sc: Scenario, st: GameState) {
  for (const p of sc.pressure ?? []) st.flags[T0(p.id)] = st.turn;
}

/**
 * אחרי כל פעולה בזירה: מה הוקפא בזמן, ואיזה שעון נגמר.
 * מחזיר את ההגדרות שפגו בתור הזה (ה־reducer מוסיף את השורות ליומן).
 */
export function tickPressure(sc: Scenario, st: GameState): PressureDef[] {
  const out: PressureDef[] = [];
  for (const p of sc.pressure ?? []) {
    if (st.flags[K(p.id)] !== undefined || st.flags[T0(p.id)] === undefined) continue;
    if (evalCond({ sc, st }, p.resolved)) {
      st.flags[K(p.id)] = 'ok';
      continue;
    }
    if (pressureLeft(p, st) <= 0) {
      st.flags[K(p.id)] = 'expired';
      out.push(p);
    }
  }
  return out;
}

export function pressureLeft(p: PressureDef, st: GameState): number {
  const t0 = Number(st.flags[T0(p.id)] ?? st.turn);
  return p.turns - (st.turn - t0);
}

export function pressureStatus(sc: Scenario, st: GameState): { def: PressureDef; state: PressureState; left: number }[] {
  return (sc.pressure ?? [])
    .filter((p) => st.flags[T0(p.id)] !== undefined)
    .map((p) => ({ def: p, state: (st.flags[K(p.id)] as PressureState | undefined) ?? 'running', left: Math.max(0, pressureLeft(p, st)) }));
}

/** לתחקיר: לכל שעון – הוקפא בזמן או לא */
export function pressureReport(sc: Scenario, st: GameState) {
  return (sc.pressure ?? []).map((p) => {
    const ok = st.flags[K(p.id)] === 'ok';
    return { label: p.label, ok, detail: ok ? p.keep : p.improve };
  });
}
