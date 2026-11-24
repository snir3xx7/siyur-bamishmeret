import { evalCond } from './conditions';
import { fill } from './text';
import type { Domain, GameState, Scenario, ScoreRule } from './types';

export const DOMAINS: Domain[] = ['info', 'assessment', 'communication', 'authority', 'dispatch', 'documentation'];

export const DEFAULT_WEIGHTS: Record<Domain, number> = {
  info: 25,
  assessment: 25,
  communication: 20,
  /** תחום שנכלל רק בתרחישים שמגדירים לו משקל */
  authority: 0,
  dispatch: 20,
  documentation: 10,
};

export const DOMAIN_LABELS: Record<Domain, string> = {
  info: 'איסוף ואימות מידע',
  assessment: 'הערכת מצב ותעדוף פעולות',
  communication: 'תקשורת עם המעורבים',
  authority: 'הפעלת סמכות ונהלים',
  dispatch: 'עדכון מוקד ותיאום סיוע',
  documentation: 'תיעוד וסיכום האירוע',
};

export interface RuleResult {
  rule: ScoreRule;
  applicable: boolean;
  points: number;
  max: number;
  explain: string;
  keep?: string;
  improve?: string;
  tier: number; // -1 = fallback
}

export interface DomainResult {
  domain: Domain;
  label: string;
  /** משקל מנורמל (מעוגל) – מתוך 100 */
  weight: number;
  score: number;
  raw: number;
  rawMax: number;
  rules: RuleResult[];
}

export interface ScoreResult {
  total: number;
  domains: DomainResult[];
  rules: RuleResult[];
  normalized: boolean;
  excludedDomains: Domain[];
}

/** עיגול „השארית הגדולה” – סכום הערכים המעוגלים שווה לעיגול הסכום */
export function roundPreservingSum(values: number[]): number[] {
  const target = Math.round(values.reduce((a, b) => a + b, 0));
  const floors = values.map(Math.floor);
  let rest = target - floors.reduce((a, b) => a + b, 0);
  const order = values.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (rest <= 0) break;
    floors[i]++;
    rest--;
  }
  return floors;
}

export function allRules(sc: Scenario, st: GameState): ScoreRule[] {
  const rules = [...sc.scoring.rules];
  const tt = sc.scoring.timeTarget;
  if (tt && st.config.timeLimit) {
    rules.push({
      id: 'time-target',
      domain: tt.domain,
      label: `עמידה ביעד הזמן שהוצג מראש (${tt.minutes} דק׳)`,
      max: tt.points,
      required: false,
      tiers: [],
      fallback: { explain: '' },
    });
  }
  return rules;
}

export function evaluateRule(sc: Scenario, st: GameState, rule: ScoreRule): RuleResult {
  const ctx = { sc, st };
  if (rule.id === 'time-target' && sc.scoring.timeTarget) {
    const ok = st.activeMs / 60000 <= sc.scoring.timeTarget.minutes;
    return {
      rule, applicable: true, points: ok ? rule.max : 0, max: rule.max, tier: ok ? 0 : -1,
      explain: ok ? 'התרגול הושלם בתוך יעד הזמן שהוצג מראש.' : 'התרגול חרג מיעד הזמן שהוצג מראש.',
      improve: ok ? undefined : 'בסבב הבא נסה לשמור על סדר פעולות ממוקד כדי לעמוד ביעד הזמן.',
    };
  }
  if (!evalCond(ctx, rule.appliesWhen)) {
    return { rule, applicable: false, points: 0, max: rule.max, explain: 'לא רלוונטי במהלך שהתרחש – לא נכלל בחישוב.', tier: -1 };
  }
  const idx = rule.tiers.findIndex((t) => evalCond(ctx, t.when));
  if (idx >= 0) {
    const t = rule.tiers[idx];
    return {
      rule, applicable: true, tier: idx, max: rule.max,
      points: Math.max(0, Math.min(rule.max, t.points)),
      explain: fill(t.explain, st.vars),
      keep: t.keep && fill(t.keep, st.vars),
      improve: t.improve && fill(t.improve, st.vars),
    };
  }
  return {
    rule, applicable: true, tier: -1, max: rule.max, points: 0,
    explain: fill(rule.fallback.explain, st.vars),
    improve: rule.fallback.improve && fill(rule.fallback.improve, st.vars),
  };
}

export function computeScore(sc: Scenario, st: GameState): ScoreResult {
  const weights = { ...DEFAULT_WEIGHTS, ...(sc.scoring.weights ?? {}) };
  const rules = allRules(sc, st).map((r) => evaluateRule(sc, st, r));
  const relevant = DOMAINS.filter((d) => weights[d] > 0 && rules.some((r) => r.rule.domain === d && r.applicable));
  const excludedDomains = DOMAINS.filter((d) => weights[d] > 0 && !relevant.includes(d));
  const W = relevant.reduce((s, d) => s + weights[d], 0) || 1;
  const exactWeights = relevant.map((d) => (weights[d] * 100) / W);
  const raws = relevant.map((d) => {
    const rs = rules.filter((r) => r.rule.domain === d && r.applicable);
    return { raw: rs.reduce((s, r) => s + r.points, 0), rawMax: rs.reduce((s, r) => s + r.max, 0), rs };
  });
  const exactScores = relevant.map((_, i) => (raws[i].rawMax ? (raws[i].raw / raws[i].rawMax) * exactWeights[i] : 0));
  const rounded = roundPreservingSum(exactScores);
  const roundedWeights = roundPreservingSum(exactWeights);
  const domains: DomainResult[] = relevant.map((d, i) => ({
    domain: d,
    label: DOMAIN_LABELS[d],
    weight: roundedWeights[i],
    score: rounded[i],
    raw: raws[i].raw,
    rawMax: raws[i].rawMax,
    rules: raws[i].rs,
  }));
  const normalized = domains.some((d) => d.rawMax !== d.weight) || excludedDomains.length > 0;
  return { total: rounded.reduce((a, b) => a + b, 0), domains, rules, normalized, excludedDomains };
}
