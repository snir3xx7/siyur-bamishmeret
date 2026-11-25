import { describe, expect, it } from 'vitest';
import { loadScenario, play, seedFor } from './helpers';
import { withProcedure } from '../../src/engine/procedure';
import { availableFollowUps } from '../../src/engine/game';

describe('נעדר: איכון בחירום', () => {
  const raw = loadScenario('missing-elder');
  const sc = withProcedure(raw);
  it('סכנת חיים + טלפון אצלו, דלוק ולא עונה → האיכון מאושר ומוצג פוליגון', () => {
    const st = play(sc, ['f-medical', 'f-phone', 'f-locate'], { seed: seedFor(raw, 'bench') });
    expect(st.flags.located).toBe(true);
    expect(st.lastLines.some((l) => l.text.includes('פוליגון'))).toBe(true);
  });
  it('הטלפון בבית → אין טעם באיכון', () => {
    const st = play(sc, ['f-medical', 'f-phone', 'f-locate'], { seed: seedFor(raw, 'kiosk') });
    expect(st.flags.located).toBeFalsy();
    expect(st.flags.locateUseless).toBe(true);
  });
  it('בלי לברר מצב רפואי וטלפון – אין אפשרות לאיכון בחירום, ובקשה „ליתר ביטחון” נדחית', () => {
    const st0 = play(sc, [], { seed: seedFor(raw, 'bench') });
    expect(availableFollowUps(sc, st0).some((c) => c.id === 'f-locate')).toBe(false);
    const st = play(sc, ['f-locate-weak'], { seed: seedFor(raw, 'bench') });
    expect(st.flags.located).toBeFalsy();
    expect(st.lastLines.some((l) => l.text.includes('סכנת חיים'))).toBe(true);
  });
});
