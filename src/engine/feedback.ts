import { factText, startTimeOf } from './game';
import { computeScore, DOMAIN_LABELS, type RuleResult, type ScoreResult } from './scoring';
import { clockLabel, durationLabel, fill } from './text';
import type { GameState, LogEntry, Scenario } from './types';

export interface FeedbackPoint {
  text: string;
  where?: string;
  ruleId: string;
  domain: string;
}

export interface TimelineItem {
  entry: LogEntry;
  time: string;
  stageLabel: string;
  knownDispatch: string[];
  knownVerified: string[];
  knownClaims: string[];
  rules: RuleResult[];
  significant: boolean;
}

export interface Debrief {
  title: string;
  endingTitle: string;
  endingKind: 'good' | 'partial' | 'retry';
  endingText: string;
  score: ScoreResult;
  summary: string;
  keep: FeedbackPoint[];
  improve: FeedbackPoint[];
  challenge?: string;
  timeline: TimelineItem[];
  duration: string;
}

const STAGE_LABELS: Record<string, string> = {
  dispatch: 'קבלת משימה',
  transition: 'מעבר לזירה',
  scene: 'בזירה',
  ended: 'סיום',
};

export function anchorEntry(st: GameState, r: RuleResult): LogEntry | undefined {
  for (const a of r.rule.anchor ?? []) {
    let ref = a === 'update:last' && st.updates.length ? `update:${st.updates.length}` : a;
    if (a.startsWith('sent:')) {
      const u = st.updates.find((x) => x.elements.includes(a.slice(5)));
      if (!u) continue;
      ref = `update:${u.n}`;
    }
    const e = st.log.find((l) => l.ref === ref);
    if (e) return e;
  }
  return undefined;
}

function whereOf(sc: Scenario, st: GameState, e: LogEntry | undefined) {
  if (!e) return undefined;
  return `${STAGE_LABELS[e.stage] ?? e.stage} · ${clockLabel(startTimeOf(sc, st.config.shift), e.t)} · ${e.label}`;
}

/** השפעה על התוצאה: נקודות שאבדו, כשפעולה נדרשת למטרת התרגול שוקלת כפליים */
function impact(r: RuleResult) {
  return (r.max - r.points) * (r.rule.required ? 2 : 1);
}

export function buildDebrief(sc: Scenario, st: GameState): Debrief {
  const score = computeScore(sc, st);
  const ending = sc.endings.find((e) => e.id === st.endingId) ?? sc.endings[sc.endings.length - 1];
  const applicable = score.rules.filter((r) => r.applicable);

  const keep = applicable
    .filter((r) => r.points === r.max && r.keep)
    .sort((a, b) => Number(b.rule.required) - Number(a.rule.required) || b.max - a.max)
    .slice(0, 3)
    .map((r) => ({ text: r.keep!, where: whereOf(sc, st, anchorEntry(st, r)), ruleId: r.rule.id, domain: DOMAIN_LABELS[r.rule.domain] }));

  const improve = applicable
    .filter((r) => r.points < r.max && r.improve)
    .sort((a, b) => impact(b) - impact(a) || Number(b.rule.required) - Number(a.rule.required))
    .slice(0, 3)
    .map((r) => ({ text: r.improve!, where: whereOf(sc, st, anchorEntry(st, r)), ruleId: r.rule.id, domain: DOMAIN_LABELS[r.rule.domain] }));

  const challenge = improve.length === 0 && sc.challenges.length ? sc.challenges[st.config.seed % sc.challenges.length] : undefined;

  // משפט סיכום – מבוסס על התוצאה ועל התחומים החזקים/החלשים בפועל
  const ds = [...score.domains].map((d) => ({ d, pct: d.weight ? d.score / d.weight : 0 }));
  const best = [...ds].sort((a, b) => b.pct - a.pct)[0];
  const worst = [...ds].sort((a, b) => a.pct - b.pct)[0];
  const lead =
    score.total >= 85 ? 'טיפול מסודר ומבוסס.' : score.total >= 65 ? 'טיפול סביר עם פערים שכדאי לסגור.' : 'הטיפול הושלם חלקית, ויש כמה פעולות מפתח לחזק.';
  let summary = lead;
  if (best && best.pct >= 0.8) summary += ` הבולט ביותר: ${best.d.label}.`;
  if (worst && worst.pct < 0.8 && worst !== best) summary += ` לחיזוק בסבב הבא: ${worst.d.label}.`;

  const timeline: TimelineItem[] = st.log.map((entry) => {
    const rules = score.rules.filter((r) => {
      const a = anchorEntry(st, r);
      return a && a.turn === entry.turn && a.ref === entry.ref;
    });
    const verified = new Set(entry.verifiedBefore);
    const knownDispatch: string[] = [];
    const knownVerified: string[] = [];
    const knownClaims: string[] = [];
    for (const id of entry.knownBefore) {
      const f = sc.facts.find((x) => x.id === id);
      const txt = factText(sc, st, id);
      if (verified.has(id) || f?.kind === 'observation') knownVerified.push(txt);
      else if (f?.kind === 'claim') knownClaims.push(txt);
      else knownDispatch.push(txt);
    }
    return {
      entry,
      time: clockLabel(startTimeOf(sc, st.config.shift), entry.t),
      stageLabel: STAGE_LABELS[entry.stage] ?? entry.stage,
      knownDispatch,
      knownVerified,
      knownClaims,
      rules,
      significant: rules.length > 0 || entry.consequences.length > 0 || entry.kind === 'update' || entry.kind === 'finish' || entry.kind === 'event',
    };
  });

  return {
    title: sc.title,
    endingTitle: fill(ending.title, st.vars),
    endingKind: ending.kind,
    endingText: fill(ending.text, st.vars),
    score,
    summary,
    keep,
    improve,
    challenge,
    timeline,
    duration: durationLabel(st.activeMs),
  };
}

export function debriefText(sc: Scenario, st: GameState, d: Debrief): string {
  const L: string[] = [];
  L.push(`תחקיר תרגול – ${d.title}`);
  L.push(`תוצאה: ${d.endingTitle}`);
  L.push(`ציון: ${d.score.total} מתוך 100`);
  L.push(d.summary);
  L.push(`משך תרגול: ${d.duration} | משמרת: ${shiftLabel(st.config.shift)} | זרע: ${st.config.seed} | גרסה: ${sc.version}`);
  L.push('');
  L.push('פירוט הציון:');
  for (const dom of d.score.domains) {
    L.push(`• ${dom.label}: ${dom.score} מתוך ${dom.weight}`);
    for (const r of dom.rules) L.push(`   – ${r.rule.label} | ${r.points} מתוך ${r.max} | ${r.explain}`);
  }
  if (d.score.excludedDomains.length) L.push(`תחומים שלא נכללו (לא רלוונטיים במהלך זה): ${d.score.excludedDomains.map((x) => DOMAIN_LABELS[x]).join(', ')}`);
  L.push('');
  L.push('נקודות לשימור:');
  if (!d.keep.length) L.push('• אין נקודה מבוססת לשימור בסבב זה.');
  d.keep.forEach((k) => L.push(`• ${k.text}${k.where ? ` (${k.where})` : ''}`));
  L.push('');
  L.push('נקודות לשיפור:');
  d.improve.forEach((k) => L.push(`• ${k.text}${k.where ? ` (${k.where})` : ''}`));
  if (d.challenge) L.push(`אתגר להמשך: ${d.challenge}`);
  L.push('');
  L.push('ציר החלטות:');
  for (const t of d.timeline) {
    L.push(`${t.time} | ${t.stageLabel} | ${t.entry.label}`);
    for (const c of t.entry.consequences) L.push(`   השלכה: ${c}`);
    for (const r of t.rules) L.push(`   ניקוד: ${r.rule.label} | ${r.points} מתוך ${r.max} | ${r.explain}`);
  }
  return L.map((l) => '‏' + l).join('\n');
}

export function shiftLabel(s: string) {
  return s === 'morning' ? 'בוקר' : s === 'evening' ? 'ערב' : 'לילה';
}
