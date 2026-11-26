import { describe, expect, it } from 'vitest';
import { loadScenario, play, seedFor } from './helpers';
import { withProcedure } from '../../src/engine/procedure';
import { buildResult, classSummary, decodeResults, encodeResult, mergeResults, resultsCsv } from '../../src/engine/results';

const sc = withProcedure(loadScenario('id-check'));
const good = play(sc, ['GO', 'ARRIVE', 'm-ask', 'm-equal', 'o-intro', 'o-give-name', 'o-details', 'o-check', 'o-car', 'o-close', 'FINISH'], { seed: seedFor(sc, 'own') });
const bad = play(sc, ['GO', 'ARRIVE', 'o-looks', 'FINISH'], { seed: seedFor(sc, 'own') });

describe('תוצאות למדריך', () => {
  it('קוד תוצאה: קידוד ופענוח, גם מתוך הודעה עם טקסט מסביב ושמות בעברית', () => {
    const r = buildResult(sc, good, 'שירן כ.');
    const msg = `היי, הנה התוצאה שלי:\n${encodeResult(r)}\nתודה!`;
    const [back] = decodeResults(msg);
    expect(back).toEqual(r);
    expect(back.trainee).toBe('שירן כ.');
    expect(decodeResults('SIYUR1:garbage!!')).toEqual([]);
  });

  it('קובץ JSON: תוצאה אחת או מערך', () => {
    const r = buildResult(sc, good, 'א');
    expect(decodeResults(JSON.stringify(r))).toHaveLength(1);
    expect(decodeResults(JSON.stringify([r, buildResult(sc, bad, 'ב')]))).toHaveLength(2);
  });

  it('איחוד בלי כפילויות, וסיכום כיתה', () => {
    const a = buildResult(sc, good, 'א');
    const b = { ...buildResult(sc, bad, 'ב'), at: '2026-11-26T10:00:00.000Z' };
    const all = mergeResults([a], [a, b]);
    expect(all).toHaveLength(2);
    const s = classSummary(all);
    expect(s.trainees).toHaveLength(2);
    expect(s.byScenario[0].n).toBe(2);
    expect(s.domains.length).toBeGreaterThan(0);
    expect(s.common.length).toBeGreaterThan(0);
    expect(resultsCsv(all).split('\n')).toHaveLength(3);
  });

  it('לא כולל את הפנקס או טקסט חופשי', () => {
    const r = buildResult(sc, { ...good, notebook: 'סוד' }, 'א');
    expect(JSON.stringify(r)).not.toContain('סוד');
  });
});
