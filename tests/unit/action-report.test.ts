import { describe, expect, it } from 'vitest';
import { loadScenario, play, seedFor } from './helpers';
import { withProcedure } from '../../src/engine/procedure';
import { factQuiz, gradeActionReport, powerQuiz, type ActionReportAnswers } from '../../src/engine/actionReport';

describe('הדוח שלך – סיווג פרטים וסמכויות', () => {
  const sc = withProcedure(loadScenario('id-check'));
  const st = play(sc, ['GO', 'ARRIVE', 'm-ask', 'o-intro', 'o-details', 'o-check', 'o-car', 'o-close', 'FINISH'], { seed: seedFor(sc, 'own') });

  it('פרט שנחשף מסווג לפי מקורו, ופרט שלא נחשף – „לא ידוע לי”', () => {
    const q = factQuiz(sc, st);
    const by = (id: string) => q.find((f) => f.id === id)?.answer;
    expect(by('c-miriam-saw')).toBe('said');
    expect(by('o-car-own')).toBe('seen');
    expect(by('d-report')).toBe('dispatch');
    expect(q.filter((f) => f.answer === 'none').length).toBeGreaterThan(0);
    expect(q.filter((f) => f.answer === 'none').length).toBeLessThanOrEqual(3);
    expect(q.some((f) => f.text.includes('{{'))).toBe(false);
  });

  it('סמכויות: רק מה שרלוונטי לתרחיש, ומה שהופעל בפועל', () => {
    const p = powerQuiz(sc, st);
    expect(p.find((x) => x.id === 'identify')!.used).toBe(true);
    expect(p.find((x) => x.id === 'arrest')!.used).toBe(false);
  });

  it('ציון: תשובות נכונות – אין טעויות חמורות; טענה כעובדה – טעות חמורה', () => {
    const q = factQuiz(sc, st);
    const p = powerQuiz(sc, st);
    const right: ActionReportAnswers = { facts: Object.fromEntries(q.map((f) => [f.id, f.answer])), powers: Object.fromEntries(p.map((x) => [x.id, x.used])) };
    const g = gradeActionReport(sc, st, right);
    expect(g.ok).toBe(g.total);
    expect(g.serious).toBe(0);
    const wrong = { ...right, facts: { ...right.facts, 'c-miriam-saw': 'seen' as const } };
    expect(gradeActionReport(sc, st, wrong).serious).toBe(1);
  });

  it('עובד בכל התרחישים בלי שגיאות', async () => {
    const { readFileSync } = await import('node:fs');
    const idx = JSON.parse(readFileSync('public/scenarios/index.json', 'utf8')).scenarios as { id: string }[];
    for (const e of idx) {
      const s = withProcedure(loadScenario(e.id));
      const t = play(s, ['GO', 'ARRIVE', 'FINISH']);
      expect(factQuiz(s, t).length, e.id).toBeGreaterThan(0);
      powerQuiz(s, t);
    }
  });
});
