import { evalCond } from './conditions';
import { factText, startTimeOf } from './game';
import { shiftLabel } from './feedback';
import { clockLabel, fill } from './text';
import type { GameState, Scenario } from './types';

export interface ReportSection {
  id: string;
  title: string;
  text: string;
}

export const NOT_DOCUMENTED = 'לא תועד';

/**
 * טיוטת דוח פעולה לתרגול. נבנית רק ממה שהשחקן גילה ומהפעולות שביצע בפועל –
 * עובדה שלא נחשפה לא תופיע, וסעיף ריק יסומן „לא תועד”.
 */
export function buildReport(sc: Scenario, st: GameState): ReportSection[] {
  const time = (t: number) => clockLabel(startTimeOf(sc, st.config.shift), t);
  const nameOf = (id?: string) => sc.characters.find((c) => c.id === id)?.name ?? 'גורם בזירה';
  const or = (arr: string[]) => (arr.length ? arr.join('\n') : NOT_DOCUMENTED);

  const details = [
    `תרחיש תרגול: ${sc.title} (גרסה ${sc.version})`,
    `מספר אירוע (בדוי): ${sc.dispatch.incident}`,
    `צוות: ${sc.dispatch.unit} | משמרת: ${shiftLabel(st.config.shift)}`,
    `מיקום: ${sc.location.name}, ${sc.location.area}`,
    `שעת קבלת המשימה: ${startTimeOf(sc, st.config.shift)}`,
  ];

  const dispatchFacts = Object.keys(st.known).filter((id) => sc.facts.find((f) => f.id === id)?.kind === 'dispatch');
  const reason = [fill(sc.report.reason, st.vars), ...dispatchFacts.map((id) => `– ${factText(sc, st, id)}${st.known[id].verified ? ' (אומת בזירה)' : ' (מסר המשל״ט, לא אומת)'}`)];

  const timeline = st.log
    .filter((l) => ['dispatch', 'arrive', 'skip', 'update', 'finish', 'event'].includes(l.kind) || (l.kind === 'choice' && l.ref !== 'go' && reportOf(sc, l.ref)))
    .map((l) => {
      if (l.kind === 'dispatch') return `${time(l.t)} – התקבלה משימה מהמשל״ט`;
      if (l.kind === 'arrive' || l.kind === 'skip') return `${time(l.t)} – הגעה לזירה`;
      if (l.kind === 'finish') return `${time(l.t)} – סיום הטיפול בזירה`;
      if (l.kind === 'update') return `${time(l.t)} – ${l.label}`;
      if (l.kind === 'event') return `${time(l.t)} – ${l.label}`;
      return `${time(l.t)} – ${fill(reportOf(sc, l.ref)!, st.vars)}`;
    });

  const observations = Object.entries(st.known)
    .filter(([id, k]) => k.verified || sc.facts.find((f) => f.id === id)?.kind === 'observation')
    .filter(([id]) => sc.facts.find((f) => f.id === id)?.kind !== 'claim')
    .map(([id]) => `– ${factText(sc, st, id)}`);

  const claimsBySource = new Map<string, string[]>();
  for (const id of Object.keys(st.known)) {
    const f = sc.facts.find((x) => x.id === id);
    if (f?.kind !== 'claim') continue;
    const key = nameOf(f.source);
    claimsBySource.set(key, [...(claimsBySource.get(key) ?? []), factText(sc, st, id)]);
  }
  const statements = [...claimsBySource.entries()].map(([who, list]) => `לדברי ${who}: ${list.join('; ')}`);

  const actions = st.log
    .filter((l) => l.kind === 'choice' && reportOf(sc, l.ref))
    .map((l) => `– ${fill(reportOf(sc, l.ref)!, st.vars)}`);

  const updates = st.updates.map((u) => {
    const texts = u.elements.map((id) => fill(sc.update.elements.find((e) => e.id === id)?.text ?? id, st.vars));
    return `– ${time(u.t)}: ${texts.join('; ')}${u.note ? ` | הערה: ${u.note}` : ''}`;
  });

  const assistIds = sc.update.elements.filter((e) => e.category === 'assistance').map((e) => e.id);
  const assist = st.updates.flatMap((u) => u.elements.filter((id) => assistIds.includes(id)));
  const finish = st.log.find((l) => l.kind === 'finish');
  const outcome = finish
    ? [
        `הטיפול בזירה הסתיים בשעה ${time(finish.t)}.`,
        assist.length
          ? `סיוע שתואם: ${[...new Set(assist)].map((id) => fill(sc.update.elements.find((e) => e.id === id)!.text, st.vars)).join('; ')}.`
          : 'לא תואם סיוע נוסף.',
      ]
    : [];

  const missing = sc.report.checklist.filter((c) => !evalCond({ sc, st }, c.when)).map((c) => `${c.label}: ${NOT_DOCUMENTED}`);

  return [
    { id: 'details', title: 'פרטי האירוע', text: details.join('\n') },
    { id: 'reason', title: 'סיבת הגעה', text: reason.join('\n') },
    { id: 'timeline', title: 'סדר זמנים', text: or(timeline) },
    { id: 'observations', title: 'תצפיות (מה נצפה ואומת בזירה)', text: or(observations) },
    { id: 'statements', title: 'דברים שנמסרו (טענות וגרסאות, לא אומתו)', text: or(statements) },
    { id: 'actions', title: 'פעולות שבוצעו', text: or(actions) },
    { id: 'updates', title: 'עדכונים למשל״ט', text: or(updates) },
    { id: 'outcome', title: 'תוצאת האירוע', text: or(outcome) },
    { id: 'missing', title: 'פרטים חסרים', text: missing.length ? missing.join('\n') : 'לא זוהו פרטים חסרים ברשימת הבדיקה.' },
  ];
}

function reportOf(sc: Scenario, choiceId: string): string | undefined {
  for (const h of sc.hotspots) {
    const c = h.choices.find((x) => x.id === choiceId);
    if (c) return c.report;
  }
  return sc.dispatch.followUps.find((c) => c.id === choiceId)?.report;
}

export function reportText(sc: Scenario, sections: ReportSection[]): string {
  const out = [`טיוטת דוח פעולה – תרגול בלבד (${sc.title})`, 'מסמך תרגול שהופק בסימולציה. אינו מסמך רשמי.', ''];
  for (const s of sections) out.push(`== ${s.title} ==`, s.text, '');
  return out.map((l) => (l ? '‏' + l : l)).join('\n');
}
