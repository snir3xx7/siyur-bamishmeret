/**
 * תוצאה לשליחה למדריך: תקציר קטן של סבב (בלי הפנקס ובלי טקסט חופשי), כקוד להעתקה או כקובץ.
 * אין שרת – החניך שולח את הקוד, והמדריך מדביק או טוען אותו בלוח התוצאות. נשמר רק במכשיר של המדריך.
 */
import { DOMAIN_LABELS, computeScore } from './scoring';
import { procedureReport } from './procedure';
import { custodyReport } from './custody';
import { bodycamReport } from './bodycam';
import { pressureReport } from './pressure';
import { evalCond } from './conditions';
import type { Domain, GameState, Scenario } from './types';

export interface ResultCard {
  v: 1;
  trainee: string;
  scenarioId: string;
  title: string;
  version: number;
  variant: string;
  seed: number;
  at: string;
  total: number;
  ending: string;
  endingKind: 'good' | 'partial' | 'retry';
  domains: Partial<Record<Domain, number>>;
  /** נקודות לשיפור (מכללי הציון) */
  improve: string[];
  /** כרטיסים שלא נכללים בציון: אחוז תקין */
  extra: { procedure: number; bodycam: number; custody?: number; pressure?: number };
}

const pct = (ok: number, n: number) => (n ? Math.round((100 * ok) / n) : 100);

export function buildResult(sc: Scenario, st: GameState, trainee: string): ResultCard {
  const s = computeScore(sc, st);
  const end = sc.endings.find((e) => e.id === st.endingId);
  const proc = procedureReport(st, sc);
  const cam = bodycamReport(st, sc);
  const cs = custodyReport(st, sc, (c) => evalCond({ sc, st }, c));
  const pr = pressureReport(sc, st);
  return {
    v: 1,
    trainee: trainee.trim().slice(0, 40) || 'ללא שם',
    scenarioId: sc.id,
    title: sc.title,
    version: sc.version,
    variant: st.variant,
    seed: st.config.seed,
    at: st.finishedAt ?? st.startedAt,
    total: s.total,
    ending: end?.title ?? '',
    endingKind: end?.kind ?? 'retry',
    domains: Object.fromEntries(s.domains.map((d) => [d.domain, d.rawMax ? Math.round((100 * d.raw) / d.rawMax) : 100])),
    improve: s.rules.filter((r) => r.applicable && r.points < r.max && r.improve).map((r) => r.improve!).slice(0, 8),
    extra: {
      procedure: pct(proc.score, proc.max),
      bodycam: pct(cam.filter((i) => i.ok).length, cam.length),
      ...(cs.length ? { custody: pct(cs.filter((i) => i.ok).length, cs.length) } : {}),
      ...(pr.length ? { pressure: pct(pr.filter((i) => i.ok).length, pr.length) } : {}),
    },
  };
}

const PREFIX = 'SIYUR1:';

export function encodeResult(r: ResultCard): string {
  const bytes = new TextEncoder().encode(JSON.stringify(r));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return PREFIX + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function valid(x: unknown): x is ResultCard {
  const r = x as ResultCard;
  return !!r && r.v === 1 && typeof r.scenarioId === 'string' && typeof r.total === 'number' && typeof r.trainee === 'string' && typeof r.at === 'string';
}

/** מפענח קודים מטקסט חופשי (כמה קודים, שורות, הודעות וואטסאפ) או מקובץ JSON (תוצאה אחת או מערך) */
export function decodeResults(text: string): ResultCard[] {
  const out: ResultCard[] = [];
  const t = text.trim();
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      const j = JSON.parse(t);
      for (const x of Array.isArray(j) ? j : [j]) if (valid(x)) out.push(x);
    } catch {
      /* לא JSON */
    }
  }
  for (const m of t.matchAll(/SIYUR1:([A-Za-z0-9_-]+)/g)) {
    try {
      const bin = atob(m[1].replace(/-/g, '+').replace(/_/g, '/'));
      const j = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
      if (valid(j)) out.push(j);
    } catch {
      /* קוד פגום – מדלגים */
    }
  }
  return out;
}

export const resultKey = (r: ResultCard) => `${r.trainee}|${r.scenarioId}|${r.at}`;

export function mergeResults(a: ResultCard[], b: ResultCard[]): ResultCard[] {
  const m = new Map(a.map((r) => [resultKey(r), r]));
  for (const r of b) m.set(resultKey(r), r);
  return [...m.values()].sort((x, y) => y.at.localeCompare(x.at));
}

/** סיכום כיתה: ממוצעים, תחומים חלשים ונקודות לשיפור שחוזרות */
export function classSummary(rs: ResultCard[]) {
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  const trainees = [...new Set(rs.map((r) => r.trainee))];
  const byScenario = [...new Set(rs.map((r) => r.scenarioId))].map((id) => {
    const xs = rs.filter((r) => r.scenarioId === id);
    return { id, title: xs[0].title, n: xs.length, avg: avg(xs.map((r) => r.total)), good: xs.filter((r) => r.endingKind === 'good').length };
  });
  const domains = (Object.keys(DOMAIN_LABELS) as Domain[])
    .map((d) => ({ d, label: DOMAIN_LABELS[d], avg: avg(rs.map((r) => r.domains[d]).filter((x): x is number => typeof x === 'number')), n: rs.filter((r) => typeof r.domains[d] === 'number').length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => a.avg - b.avg);
  const counts = new Map<string, number>();
  for (const r of rs) for (const t of new Set(r.improve)) counts.set(t, (counts.get(t) ?? 0) + 1);
  const common = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([text, n]) => ({ text, n }));
  const extra = (k: keyof ResultCard['extra']) => avg(rs.map((r) => r.extra[k]).filter((x): x is number => typeof x === 'number'));
  const byTrainee = trainees.map((t) => {
    const xs = rs.filter((r) => r.trainee === t);
    return { trainee: t, n: xs.length, avg: avg(xs.map((r) => r.total)), last: xs[0]?.at };
  });
  return { trainees, attempts: rs.length, avg: avg(rs.map((r) => r.total)), byScenario, byTrainee, domains, common, extra: { procedure: extra('procedure'), bodycam: extra('bodycam'), custody: extra('custody'), pressure: extra('pressure') } };
}

export function resultsCsv(rs: ResultCard[]): string {
  const head = ['חניך', 'תרחיש', 'גרסה', 'תאריך', 'ציון', 'סיום', ...Object.values(DOMAIN_LABELS), 'נוהל קשר %', 'מצלמת גוף %'];
  const esc = (s: string | number | undefined) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const rows = rs.map((r) => [r.trainee, r.title, r.version, r.at.slice(0, 16).replace('T', ' '), r.total, r.ending, ...(Object.keys(DOMAIN_LABELS) as Domain[]).map((d) => r.domains[d] ?? ''), r.extra.procedure, r.extra.bodycam].map(esc).join(','));
  return [head.map(esc).join(','), ...rows].join('\n');
}
