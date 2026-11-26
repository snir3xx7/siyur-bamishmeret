import { describe, expect, it } from 'vitest';
import { loadScenario, play, seedFor } from './helpers';
import { computeScore } from '../../src/engine/scoring';
import { withProcedure } from '../../src/engine/procedure';
import { custodyStatus } from '../../src/engine/custody';

const sc = loadScenario('id-check');
const ending = (st: ReturnType<typeof play>) => sc.endings.find((e) => e.id === st.endingId)!.kind;
const start = ['GO', 'ARRIVE', 'm-ask', 'm-equal', 'o-intro', 'o-give-name', 'o-details', 'o-check', 'o-car'];

describe('בקשת הזדהות – עילה סבירה', () => {
  it('גרסה עם צו מעצר: עיכוב מוסבר ועדכון המשל״ט – סיום טוב', () => {
    const st = play(sc, [...start, 'y-age', 'y-alcohol', 'y-parent', 'o-detain', ['UPDATE', 'u-loc', 'u-warrant', 'u-minor'], 'z-doc', 'FINISH'], { seed: seedFor(sc, 'tried') });
    expect(st.known['o-car-not']).toBeDefined();
    expect(st.flags.detainedProper).toBe(true);
    expect(ending(st)).toBe('good');
  });

  it('דרישה בגלל מראה – פגיעה בציון ואין סיום טוב', () => {
    const st = play(sc, ['GO', 'ARRIVE', 'o-looks', 'o-explain', 'o-details', 'o-check', 'o-car', 'o-close', 'FINISH'], { seed: seedFor(sc, 'own') });
    expect(st.flags.profiled).toBe(true);
    expect(ending(st)).not.toBe('good');
    const rule = computeScore(sc, st).rules.find((r) => r.rule.id === 'ic-assess-ground')!;
    expect(rule.points).toBeLessThan(rule.max);
  });

  it('אין תעודה: סירוב לפני הסבר, ואחרי הסבר – פרטים; עיכוב רק בגלל תעודה מסומן כטעות', () => {
    const seed = seedFor(sc, 'own');
    const refused = play(sc, ['GO', 'ARRIVE', 'o-demand', 'o-details'], { seed });
    expect(refused.flags.refused).toBe(true);
    expect(refused.flags.identified).toBeUndefined();
    const fixed = play(sc, ['GO', 'ARRIVE', 'o-demand', 'o-details', 'o-explain', 'o-details'], { seed });
    expect(fixed.flags.identified).toBe(true);
    const wrong = play(sc, ['GO', 'ARRIVE', 'o-intro', 'o-nocard-detain'], { seed });
    expect(wrong.flags.wrongDetain).toBe(true);
  });

  it('שכבת המעצר: עופר במעצר מועבר לתחנה אחרי צו', () => {
    const full = withProcedure(sc);
    const st = play(full, [...start, 'o-detain', 'cs-rights-ofer', 'cs-search-ofer', 'cs-arrest-ofer', 'cs-nocuff-ofer', 'cs-remove-ofer'], { seed: seedFor(sc, 'tried') });
    expect(custodyStatus(full, st, 'ofer')).toBe('עצור · הועבר לתחנה');
  });

  it('השוטר מתבקש להזדהות – ואפשר לסרב (נרשם כטעות)', () => {
    const st = play(sc, ['GO', 'ARRIVE', 'o-intro', 'o-refuse-name'], { seed: seedFor(sc, 'own') });
    expect(st.flags.nameRefused).toBe(true);
  });
});
