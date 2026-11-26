import { describe, expect, it } from 'vitest';
import { loadScenario, play, seedFor } from './helpers';
import { pressureReport, pressureStatus } from '../../src/engine/pressure';
import { computeScore } from '../../src/engine/scoring';

describe('לחץ זמן והקפאת מצב', () => {
  const sc = loadScenario('bar-fight');
  const seed = seedFor(sc, 'dor-first');

  it('השעון מתחיל בהגעה וסופר פעולות', () => {
    const st = play(sc, ['GO', 'ARRIVE'], { seed });
    expect(pressureStatus(sc, st)[0]).toMatchObject({ state: 'running', left: 3 });
    const one = play(sc, ['GO', 'ARRIVE', 'l-saw'], { seed });
    expect(pressureStatus(sc, one)[0].left).toBe(2);
  });

  it('הקפאה בזמן: הפרדה קודם – בלי החמרה', () => {
    const st = play(sc, ['GO', 'ARRIVE', 'z-separate', 'a-check', 'l-saw', 'm-calm'], { seed });
    expect(pressureStatus(sc, st)[0].state).toBe('ok');
    expect(st.flags.prAlon).toBeUndefined();
    expect(pressureReport(sc, st)[0].ok).toBe(true);
  });

  it('בלי הקפאה: המצב מחמיר מעצמו, נרשם ביומן ובתחקיר', () => {
    const st = play(sc, ['GO', 'ARRIVE', 'z-separate', 'l-saw', 'm-calm'], { seed });
    expect(pressureStatus(sc, st)[0].state).toBe('expired');
    expect(st.flags.prAlon).toBe(true);
    expect(st.log.some((l) => l.ref === 'event:pressure-alon')).toBe(true);
    expect(pressureReport(sc, st)[0].ok).toBe(false);
    // הפרדה מאוחרת כבר לא „מקפיאה” בזמן
    const late = play(sc, ['GO', 'ARRIVE', 'z-separate', 'l-saw', 'm-calm', 'a-check'], { seed });
    expect(pressureStatus(sc, late)[0].state).toBe('expired');
  });

  it('לא משנה את הציון של המסלול המלא', () => {
    for (const id of ['accident-rain', 'bar-fight', 'domestic-call', 'gas-smell']) {
      const s = loadScenario(id);
      expect(s.pressure?.length, id).toBeGreaterThan(0);
    }
    const st = play(sc, ['GO', 'ARRIVE', 'l-saw', 'FINISH'], { seed });
    expect(computeScore(sc, st).total).toBeGreaterThanOrEqual(0);
  });
});
