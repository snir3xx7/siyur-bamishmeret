import { describe, expect, it } from 'vitest';
import { evalCond } from '../../src/engine/conditions';
import { buildDebrief } from '../../src/engine/feedback';
import { availableElements, reduce } from '../../src/engine/game';
import { buildReport } from '../../src/engine/report';
import { loadScenario, play, seedFor, type Step } from './helpers';

const sc = loadScenario('accident-rain');
const seed = seedFor(sc, 'oren-hurt');
const OPEN: Step[] = ['GO', 'ARRIVE', 's-secure', 's-look', 'w-talk'];

describe('אירוע מתפתח – החמרה במצב המעורב', () => {
  it('לא קורה לפני הפעולה הרביעית בזירה, וקורה בדיוק פעם אחת אחריה', () => {
    const before = play(sc, OPEN, { seed });
    expect(before.flags['ev:worse']).toBeUndefined();
    expect(before.log.some((l) => l.kind === 'event')).toBe(false);

    const after = play(sc, [...OPEN, 'o-feel'], { seed });
    expect(after.flags['ev:worse']).toBe(true);
    expect(after.lastEvent).toBe('worse');
    expect(after.log.filter((l) => l.kind === 'event')).toHaveLength(1);
    // ההחמרה מופיעה באותו תור, אחרי הדיאלוג של הבחירה
    expect(after.lastLines.at(-1)?.text).toContain('מסתובב לי הראש');

    const later = play(sc, [...OPEN, 'o-feel', 'd-feel', 'w-contact'], { seed });
    expect(later.log.filter((l) => l.kind === 'event')).toHaveLength(1);
    expect(later.lastEvent).toBeUndefined();
  });

  it('חושף את הכאב גם למי שלא שאל, ופותח בדיקה חוזרת ועדכון חדש', () => {
    const st = play(sc, [...OPEN, 'w-contact'], { seed });
    expect(st.flags.painKnown).toBe(true);
    expect(st.known['o-dizzy']?.verified).toBe(true);
    expect(availableElements(sc, st).map((e) => e.id)).toContain('u-worse');
    const next = reduce(sc, st, { type: 'CHOOSE', choiceId: 'o-worse', turn: st.turn });
    expect(next.flags.rechecked).toBe(true);
  });

  it('לחיצה כפולה על הפעולה שמפעילה את האירוע לא משכפלת אותו', () => {
    const st = play(sc, OPEN, { seed });
    const a = reduce(sc, st, { type: 'CHOOSE', choiceId: 'o-feel', turn: st.turn });
    const b = reduce(sc, a, { type: 'CHOOSE', choiceId: 'o-feel', turn: st.turn });
    expect(b).toBe(a);
    expect(b.log.filter((l) => l.kind === 'event')).toHaveLength(1);
  });

  it('הענף משתנה לפי מה שכבר נעשה: מי שהושב במקום מוגן מחוויר שם', () => {
    const st = play(sc, ['GO', 'ARRIVE', 's-secure', 'o-feel', 'o-care', 'w-talk'], { seed });
    expect(st.log.find((l) => l.kind === 'event')!.lines[0].text).toContain('מתחת לסוכך');
  });

  it('התעלמות מההחמרה: נקודה לשיפור, אין סיום מלא, והדוח מתעד את ההחמרה', () => {
    const steps: Step[] = [
      'f-injuries', 'GO', 'ARRIVE', 's-secure', 'o-feel', 'd-feel',
      ['UPDATE', 'u-loc', 'u-two-cars', 'u-status-pain', 'u-ems'], 'o-care',
      'o-version', 'd-version', 'w-talk', 's-look', 's-move', 'FINISH',
    ];
    const st = play(sc, steps, { seed });
    expect(st.endingId).not.toBe('e-good');
    const d = buildDebrief(sc, st);
    const worse = d.score.rules.find((r) => r.rule.id === 'r-assess-worse')!;
    expect(worse.applicable).toBe(true);
    expect(worse.points).toBe(0);
    expect(d.improve.some((p) => p.ruleId === 'r-assess-worse')).toBe(true);
    expect(d.timeline.some((t) => t.entry.kind === 'event' && t.significant)).toBe(true);
    expect(buildReport(sc, st).find((s) => s.id === 'timeline')!.text).toContain('החמרה');
  });

  it('סיום מהיר לפני האירוע: הכלל לא נכלל בחישוב', () => {
    const st = play(sc, ['GO', 'ARRIVE', 's-secure', 'FINISH'], { seed });
    const d = buildDebrief(sc, st);
    expect(d.score.rules.find((r) => r.rule.id === 'r-assess-worse')!.applicable).toBe(false);
  });

  it('תנאי זמן minutesGte נשען על דקות הפעולות בלבד (דטרמיניסטי)', () => {
    const st = play(sc, ['GO', 'ARRIVE'], { seed });
    expect(evalCond({ sc, st }, { minutesGte: sc.transition.travelMinutes })).toBe(true);
    expect(evalCond({ sc, st: { ...st, activeMs: 3_600_000 } }, { minutesGte: 30 })).toBe(false);
  });
});
