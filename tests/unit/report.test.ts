import { describe, expect, it } from 'vitest';
import { buildReport, NOT_DOCUMENTED, reportText } from '../../src/engine/report';
import { debriefText, buildDebrief } from '../../src/engine/feedback';
import { loadScenario, play, seedFor } from './helpers';

const sc = loadScenario('accident-rain');
const seed = seedFor(sc, 'dana-hurt');

describe('טיוטת דוח פעולה', () => {
  it('לא כוללת עובדה שהשחקן לא גילה', () => {
    const st = play(sc, ['GO', 'ARRIVE', 'o-version', 'd-version', 'FINISH'], { seed });
    const txt = reportText(sc, buildReport(sc, st));
    expect(txt).not.toMatch(/צוואר/);
    expect(txt).not.toMatch(/סמיר/);
    expect(txt).toContain(`פרטי העד: ${NOT_DOCUMENTED}`);
  });

  it('מפרידה תצפיות מטענות ומפרטת פעולות שבוצעו בלבד', () => {
    const st = play(sc, ['GO', 'ARRIVE', 's-secure', 's-look', 'o-version', 'FINISH'], { seed });
    const r = buildReport(sc, st);
    const obs = r.find((s) => s.id === 'observations')!.text;
    const st2 = r.find((s) => s.id === 'statements')!.text;
    expect(obs).toMatch(/תמרור עצור/);
    expect(obs).not.toMatch(/זכות קדימה/);
    expect(st2).toMatch(/לדברי אורן שטרן/);
    const actions = r.find((s) => s.id === 'actions')!.text;
    expect(actions).toMatch(/מיקום הניידת/);
    expect(actions).not.toMatch(/פרטי העד/);
  });

  it('סעיף ריק מסומן „לא תועד”', () => {
    const st = play(sc, ['GO', 'ARRIVE', 'FINISH'], { seed });
    const r = buildReport(sc, st);
    expect(r.find((s) => s.id === 'statements')!.text).toBe(NOT_DOCUMENTED);
    expect(r.find((s) => s.id === 'updates')!.text).toBe(NOT_DOCUMENTED);
  });

  it('ייצוא התחקיר כולל ציון, חלוקה, שימור/שיפור וציר החלטות', () => {
    const st = play(sc, ['f-injuries', 'GO', 'ARRIVE', 's-secure', ['UPDATE', 'u-loc', 'u-two-cars'], 'd-feel', 'FINISH'], { seed });
    const t = debriefText(sc, st, buildDebrief(sc, st));
    for (const s of ['ציון:', 'פירוט הציון', 'נקודות לשימור', 'נקודות לשיפור', 'ציר החלטות', 'מתוך']) expect(t).toContain(s);
  });
});
