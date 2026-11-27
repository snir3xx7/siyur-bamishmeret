/**
 * מעקב חניכים (אופציונלי): כניסה, התחלת תרחיש, סיום עם ציון ומשוב, ותרגול „מצא את הטעויות” –
 * נשלחים לגיליון Google פרטי של המדריך דרך Apps Script (docs/admin/Code.gs).
 * פעיל רק כשמוגדרת כתובת (TRACK_URL) ורק אחרי שהחניך הזין שם וצוות.
 * אין שרת אחר; הסיסמה של המדריך נבדקת בסקריפט ולא נשמרת באתר. בלי רשת – האירועים נשמרים בתור ונשלחים אחר כך.
 */
import { TRACK_URL } from '../config/tracking';

export interface TrackEvent {
  event: 'enter' | 'start' | 'finish' | 'review';
  scenarioId?: string;
  title?: string;
  version?: number;
  total?: number;
  ending?: string;
  endingKind?: string;
  domains?: Record<string, number>;
  improve?: string[];
  extra?: Record<string, number>;
}

const Q = 'siyur.track.queue';
const NAME = 'siyur.trainee';
const TEAM = 'siyur.team';
const DEV = 'siyur.device';

const ls = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* אחסון חסום */
    }
  },
};

/** הכתובת: ברירת מחדל מהקוד; אפשר לעקוף לבדיקות (localStorage) */
export function trackUrl(): string {
  const o = ls.get('siyur.trackUrl');
  if (o) return o === 'off' ? '' : o;
  // בדיקות אוטומטיות לא שולחות לגיליון האמיתי של המדריך
  if (typeof navigator !== 'undefined' && navigator.webdriver) return '';
  return TRACK_URL;
}
export const trackingOn = () => !!trackUrl();

export function identity(): { name: string; team: string } {
  return { name: (ls.get(NAME) ?? '').trim(), team: (ls.get(TEAM) ?? '').trim() };
}
export function setIdentity(name: string, team: string) {
  ls.set(NAME, name.slice(0, 40));
  ls.set(TEAM, team.slice(0, 40));
}

function device(): string {
  let d = ls.get(DEV);
  if (!d) {
    d = Math.random().toString(36).slice(2, 10);
    ls.set(DEV, d);
  }
  return d;
}

function queue(): unknown[] {
  try {
    return JSON.parse(ls.get(Q) ?? '[]');
  } catch {
    return [];
  }
}

let flushing = false;

export async function flush(): Promise<void> {
  const url = trackUrl();
  const q = queue();
  if (!url || !q.length || flushing || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  flushing = true;
  try {
    // text/plain – בקשה פשוטה, בלי preflight; התשובה אטומה (no-cors) ולכן מנקים את התור אחרי שליחה מוצלחת ברשת
    await fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'log', events: q }) });
    const rest = queue().slice(q.length);
    ls.set(Q, JSON.stringify(rest));
  } catch {
    /* אין רשת – יישלח בפעם הבאה */
  } finally {
    flushing = false;
  }
}

export function track(ev: TrackEvent) {
  if (!trackingOn()) return;
  const id = identity();
  if (!id.name) return;
  const q = queue();
  q.push({ ...ev, trainee: id.name, team: id.team, device: device(), at: new Date().toISOString() });
  ls.set(Q, JSON.stringify(q.slice(-200)));
  void flush();
}

/** קורסים/צוותים: רשימה סגורה שהמדריך הגדיר (fixed), או הצעות ממה שחניכים כבר כתבו */
export async function fetchTeams(): Promise<{ teams: string[]; fixed: boolean }> {
  const url = trackUrl();
  if (!url) return { teams: [], fixed: false };
  try {
    const r = await fetch(url);
    const j = (await r.json()) as { teams?: string[]; fixed?: boolean };
    return { teams: j.teams ?? [], fixed: !!j.fixed };
  } catch {
    return { teams: [], fixed: false };
  }
}

export interface AdminRow {
  at: string;
  trainee: string;
  team: string;
  device: string;
  event: TrackEvent['event'];
  scenarioId: string;
  title: string;
  total: number | null;
  ending: string;
  endingKind: string;
  domains: Record<string, number>;
  improve: string[];
  extra: Record<string, number>;
}

export async function adminFetch(password: string): Promise<{ ok: true; rows: AdminRow[] } | { ok: false; error: string }> {
  const url = trackUrl();
  if (!url) return { ok: false, error: 'off' };
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'admin', password }) });
    return (await r.json()) as { ok: true; rows: AdminRow[] };
  } catch {
    return { ok: false, error: 'network' };
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flush());
}
