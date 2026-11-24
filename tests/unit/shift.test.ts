import { describe, expect, it } from 'vitest';
import { currentShiftItem, parseShiftQuery, type ShiftPlan } from '../../src/ui/shift';

describe('משמרת מלאה', () => {
  it('קישור משמרת מהמדריך נקרא נכון ומסנן קלט לא תקין', () => {
    const q = parseShiftQuery(new URLSearchParams('shift=night&d=advanced&s=bar-fight:12,gas-smell:7,..%2Fx:3,bad:0'));
    expect(q).toEqual({ shift: 'night', difficulty: 'advanced', items: [{ id: 'bar-fight', seed: 12 }, { id: 'gas-smell', seed: 7 }] });
    expect(parseShiftQuery(new URLSearchParams('shift=noon&s=a:1'))).toBeNull();
  });
  it('התוצאה נרשמת רק לאירוע הנוכחי במשמרת', () => {
    const p: ShiftPlan = { shift: 'night', difficulty: 'standard', items: [{ id: 'a', seed: 1 }, { id: 'b', seed: 2 }], idx: 1, startedAt: '' };
    expect(currentShiftItem(p, 'b', 2)?.id).toBe('b');
    expect(currentShiftItem(p, 'a', 1)).toBeUndefined();
  });
});
