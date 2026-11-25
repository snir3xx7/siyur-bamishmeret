import { describe, expect, it } from 'vitest';
import { loadScenario, play, seedFor } from './helpers';
import { withProcedure } from '../../src/engine/procedure';
import { feminize } from '../../src/config/feminize';

describe('בדיקת פרטים במערכת', () => {
  it('אלמ"ב, גרסת צו הגנה: הבדיקה מגלה את הצו', () => {
    const raw = loadScenario('domestic-call');
    const sc = withProcedure(raw);
    const st = play(sc, ['GO', 'ARRIVE', 'g-enter', 'rec-gil'], { seed: seedFor(raw, 'order') });
    expect(st.lastLines.some((l) => l.text.includes('צו הגנה בתוקף'))).toBe(true);
    expect(st.flags.checked_gil).toBe(true);
  });
  it('לפני זיהוי – אין אפשרות לבדוק', () => {
    const raw = loadScenario('bar-fight');
    const sc = withProcedure(raw);
    expect(() => play(sc, ['GO', 'ARRIVE', 'rec-dor'], { seed: seedFor(raw, 'dor-first') })).toThrow();
  });
});

describe('שוטרת: לשון נקבה', () => {
  it('פעלים בגוף ראשון בלבד', () => {
    expect(feminize('מרכז מסבא 402, קיבלתי את האירוע, יוצא.')).toBe('מרכז מסבא 402, קיבלתי את האירוע, יוצאת.');
    expect(feminize('אני לא אוזק אותך כל עוד אתה משתף פעולה.')).toBe('אני לא אוזקת אותך כל עוד אתה משתף פעולה.');
    expect(feminize('מבקש צוות מד״א')).toBe('מבקשת צוות מד״א');
    expect(feminize('הילד נמצא ליד הדוכן')).toBe('הילד נמצא ליד הדוכן');
    expect(feminize('אתה מעוכב.')).toBe('אתה מעוכב.');
  });
});
