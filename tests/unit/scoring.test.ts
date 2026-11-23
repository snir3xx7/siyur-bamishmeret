import { describe, expect, it } from 'vitest';
import { buildDebrief } from '../../src/engine/feedback';
import { computeScore, roundPreservingSum } from '../../src/engine/scoring';
import type { Scenario } from '../../src/engine/types';
import { loadScenario, play, seedFor, type Step } from './helpers';

const sc = loadScenario('accident-rain');
const seed = seedFor(sc, 'dana-hurt');

/** ביצוע מלא */
const FULL: Step[] = [
  'f-injuries', 'f-hazard', 'GO', 'ARRIVE', 's-secure', 'd-feel', 'o-feel',
  ['UPDATE', 'u-loc', 'u-two-cars', 'u-secured', 'u-status-pain', 'u-ems'], 'd-care',
  'o-version', 'd-version', 'w-talk', 'w-phone', 'w-contact', 's-look', 's-move',
  ['UPDATE', 'u-loc', 'u-lane-clear', 'u-versions', 'u-documented', 'u-witness', 'u-missing-circ'], 'FINISH',
];
/** ביצוע חלקי */
const PARTIAL: Step[] = ['GO', 'ARRIVE', 'o-version', 'd-version', 's-secure', ['UPDATE', 'u-loc', 'u-two-cars'], 'FINISH'];
/** תיקון תוך כדי: עדכון ראשון בלי מצב מעורבים, ציטוט צד שני ואז תיקון, ועדכון שני עם הכאב */
const CORRECTION: Step[] = [
  'f-injuries', 'GO', 'ARRIVE', 's-secure', ['UPDATE', 'u-loc', 'u-two-cars', 'u-lane'],
  'o-version', 'd-confront', 'd-version', 'd-retry', 'd-feel', ['UPDATE', 'u-status-pain', 'u-ems'], 'd-care', 'FINISH',
];

function sums(s: ReturnType<typeof computeScore>) {
  return s.domains.reduce((a, d) => a + d.score, 0);
}

describe('ציון ותחקיר – שלושה מסלולים באותו תרחיש', () => {
  const full = play(sc, FULL, { seed });
  const partial = play(sc, PARTIAL, { seed });
  const corr = play(sc, CORRECTION, { seed });
  const dF = buildDebrief(sc, full);
  const dP = buildDebrief(sc, partial);
  const dC = buildDebrief(sc, corr);

  it('הסיומים משקפים את מה שקרה', () => {
    expect(full.endingId).toBe('e-good');
    expect(partial.endingId).toBe('e-retry');
    expect(corr.endingId).toBe('e-good');
  });

  it('הציון מדורג: מלא > תיקון > חלקי', () => {
    expect(dF.score.total).toBe(100);
    expect(dC.score.total).toBeLessThan(dF.score.total);
    expect(dC.score.total).toBeGreaterThan(dP.score.total);
  });

  it('הפירוט מסתכם לציון המוצג', () => {
    for (const d of [dF, dP, dC]) {
      expect(sums(d.score)).toBe(d.score.total);
      expect(d.score.domains.reduce((a, x) => a + x.weight, 0)).toBe(100);
      for (const dom of d.score.domains) if (!d.score.normalized) expect(dom.raw).toBe(dom.score);
    }
  });

  it('ביצוע מלא: אין נקודות לשיפור ומוצג „אתגר להמשך”', () => {
    expect(dF.improve).toHaveLength(0);
    expect(dF.challenge).toBeTruthy();
    expect(dF.keep.length).toBeGreaterThan(0);
    expect(dF.keep.length).toBeLessThanOrEqual(3);
  });

  it('ביצוע חלקי: נקודות לשיפור מבוססות על מה שהוחסר, עד שלוש', () => {
    expect(dP.improve.length).toBeGreaterThan(0);
    expect(dP.improve.length).toBeLessThanOrEqual(3);
    const ids = dP.improve.map((i) => i.ruleId);
    expect(ids).toContain('r-info-wellbeing');
    expect(dP.challenge).toBeUndefined();
    // נקודות לשימור רק על פעולות שבוצעו
    for (const k of dP.keep) expect(['r-comm-separate', 'r-info-versions', 'r-assess-secure']).toContain(k.ruleId);
  });

  it('תיקון תוך כדי: המשוב מציין את התיקון', () => {
    const first = dC.score.rules.find((r) => r.rule.id === 'r-disp-first')!;
    expect(first.points).toBe(6);
    expect(first.explain).toContain('בעדכון הבא');
    const comm = dC.score.rules.find((r) => r.rule.id === 'r-comm-separate')!;
    expect(comm.points).toBe(7);
    const text = dC.improve.map((i) => i.text).join(' ');
    expect(text).toMatch(/תיקון נכון/);
  });

  it('המשוב שונה בין המסלולים', () => {
    expect(dF.summary).not.toBe(dP.summary);
    expect(dP.improve.map((i) => i.text)).not.toEqual(dC.improve.map((i) => i.text));
  });

  it('לא שופטים לפי מידע שנחשף מאוחר יותר: „מצב המעורבים בבירור” מזכה בניקוד מלא בעדכון הראשון', () => {
    const st = play(sc, ['GO', 'ARRIVE', 's-secure', ['UPDATE', 'u-loc', 'u-two-cars', 'u-status-checking'], 'd-feel', 'FINISH'], { seed });
    expect(computeScore(sc, st).rules.find((r) => r.rule.id === 'r-disp-first')!.points).toBe(10);
  });

  it('לא מנכים על פעולה שהתרחיש לא אפשר: תיאום סיוע רפואי לא נכלל כשהכאב לא התגלה', () => {
    const s = computeScore(sc, partial);
    const ems = s.rules.find((r) => r.rule.id === 'r-disp-ems')!;
    expect(ems.applicable).toBe(false);
    const disp = s.domains.find((d) => d.domain === 'dispatch')!;
    expect(disp.rawMax).toBe(10);
    expect(disp.weight).toBe(20);
    expect(s.normalized).toBe(true);
  });

  it('ציר ההחלטות מציג מה היה ידוע ומשייך ניקוד להחלטה', () => {
    const t = dC.timeline.find((x) => x.entry.ref === 'update:1')!;
    expect(t.rules.map((r) => r.rule.id)).toContain('r-disp-first');
    expect(t.knownClaims.join(' ')).not.toMatch(/צוואר/);
    expect(dC.timeline.every((x) => x.time.match(/^\d\d:\d\d$/))).toBe(true);
  });

  it('אותם כללים לאותה גרסה: אותו מסלול ⇒ אותו ציון', () => {
    expect(computeScore(sc, play(sc, CORRECTION, { seed })).total).toBe(dC.score.total);
  });
});

describe('משקלים', () => {
  it('משקלי ברירת מחדל 25/25/20/20/10', () => {
    const st = play(sc, FULL, { seed });
    const s = computeScore(sc, st);
    expect(Object.fromEntries(s.domains.map((d) => [d.domain, d.weight]))).toEqual({ info: 25, assessment: 25, communication: 20, dispatch: 20, documentation: 10 });
  });

  it('משקלים מותאמים ותחום מושבת מנורמלים ל-100', () => {
    const custom: Scenario = { ...sc, scoring: { ...sc.scoring, weights: { documentation: 0, info: 30 } } };
    const st = play(custom, FULL, { seed });
    const s = computeScore(custom, st);
    expect(s.domains.find((d) => d.domain === 'documentation')).toBeUndefined();
    expect(s.domains.reduce((a, d) => a + d.weight, 0)).toBe(100);
    expect(s.total).toBe(100);
  });

  it('יעד זמן משפיע רק כשהוצג ונבחר מראש', () => {
    const timed: Scenario = { ...sc, scoring: { ...sc.scoring, timeTarget: { minutes: 10, domain: 'assessment', points: 5 } } };
    const off = play(timed, FULL, { seed, timeLimit: false });
    expect(computeScore(timed, off).rules.find((r) => r.rule.id === 'time-target')).toBeUndefined();
    const on = { ...play(timed, FULL, { seed, timeLimit: true }), activeMs: 20 * 60000 };
    const r = computeScore(timed, on).rules.find((x) => x.rule.id === 'time-target')!;
    expect(r.points).toBe(0);
  });

  it('עיגול שומר סכום', () => {
    expect(roundPreservingSum([33.3, 33.3, 33.4]).reduce((a, b) => a + b, 0)).toBe(100);
    expect(roundPreservingSum([12.5, 12.5, 25, 20, 20, 10])).toHaveLength(6);
  });
});
