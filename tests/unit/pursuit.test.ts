import { describe, expect, it } from 'vitest';
import { loadScenario, play, seedFor } from './helpers';
import { computeScore } from '../../src/engine/scoring';
import { withProcedure } from '../../src/engine/procedure';
import { custodyReport } from '../../src/engine/custody';
import { evalCond } from '../../src/engine/conditions';

const sc = loadScenario('pursuit');
const kind = (st: ReturnType<typeof play>) => sc.endings.find((e) => e.id === st.endingId)!.kind;

describe('מרדף – החלטות בלבד', () => {
  it('ליד בית הספר: המשך באדום – כמעט פגיעה, הרכב נעצר, אבל אין סיום טוב', () => {
    const st = play(sc, ['GO', 'ARRIVE', 'p-lights', 'p-report', 'p-head', 'p-continue', 'p-go', 'z-approach', 'z-id', 'z-detain', 'z-parent', 'z-doc', 'FINISH'], { seed: seedFor(sc, 'father') });
    expect(st.flags.nearMiss).toBe(true);
    expect(st.flags.found).toBe(true);
    expect(kind(st)).toBe('partial');
    const r = computeScore(sc, st).rules.find((x) => x.rule.id === 'pu-assess-stop')!;
    expect(r.points).toBe(0);
  });

  it('חסימה או האצה „בכל מחיר” – נרשמות כנהיגה מסוכנת', () => {
    const st = play(sc, ['GO', 'ARRIVE', 'p-lights', 'p-block'], { seed: seedFor(sc, 'father') });
    expect(st.flags.reckless).toBe(true);
  });

  it('אין אפשרות להפסיק לפני שהמרדף הגיע לבית הספר, ואין חיפוש בלי העברה למשל״ט', () => {
    const st = play(sc, ['GO', 'ARRIVE', 'p-lights'], { seed: seedFor(sc, 'father') });
    expect(() => play(sc, ['GO', 'ARRIVE', 'p-lights', 'p-go'])).toThrow();
    expect(st.flags.stopped).toBeUndefined();
  });

  it('רכב גנוב: מעצר מוצדק; רכב של האבא: מעצר אינו מוצדק (עיכוב מספיק)', () => {
    const full = withProcedure(sc);
    const path = ['GO', 'ARRIVE', 'p-lights', 'p-report', 'p-head', 'p-stop', 'p-handover', 'p-go', 'z-approach', 'z-id', 'z-detain', 'cs-arrest-ziv'];
    const ok = (v: string) => {
      const st = play(full, path, { seed: seedFor(sc, v) });
      return custodyReport(st, full, (c) => evalCond({ sc: full, st }, c)).find((i) => i.label.startsWith('עילה למעצר'))!.ok;
    };
    expect(ok('stolen')).toBe(true);
    expect(ok('father')).toBe(false);
  });
});
