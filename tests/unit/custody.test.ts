import { describe, expect, it } from 'vitest';
import { loadScenario, play, seedFor } from './helpers';
import { withProcedure } from '../../src/engine/procedure';
import { custodyReport, custodyStatus } from '../../src/engine/custody';
import { evalCond } from '../../src/engine/conditions';
import { visibleHotspots } from '../../src/engine/game';

const base = ['f-history', 'f-backup', 'f-weapon', 'GO', 'ARRIVE', 'g-enter', 'g-separate', 'z-all', 'k-safe', 'r-private', 'r-risk', 'r-help', 'g-version', 'g-detain'];

function setup() {
  const raw = loadScenario('domestic-call');
  const sc = withProcedure(raw);
  return { sc, seed: seedFor(raw, 'mark') };
}
const report = (sc: ReturnType<typeof setup>['sc'], st: Parameters<typeof custodyReport>[0]) => custodyReport(st, sc, (c) => evalCond({ sc, st }, c));
const item = (r: ReturnType<typeof report>, label: string) => r.find((i) => i.label.startsWith(label));

describe('עיכוב, מעצר וחיפוש', () => {
  it('רצף תקין: זכויות, חיפוש מוגבל, מעצר, החלטה על אזיקה, הוצאה מהזירה', () => {
    const { sc, seed } = setup();
    const st = play(sc, [...base, 'cs-rights-gil', 'cs-search-gil', 'cs-arrest-gil', 'cs-cuff-gil', 'cs-remove-gil'], { seed });
    expect(custodyStatus(sc, st, 'gil')).toBe('עצור · הועבר לתחנה');
    // החשוד יצא מהזירה – הנקודה שלו כבר לא מוצגת
    expect(visibleHotspots(sc, st).some((h) => h.id === 'h-gil')).toBe(false);
    const r = report(sc, st);
    expect(item(r, 'החלטה לגבי')!.ok).toBe(true);
    expect(item(r, 'הודעה על הזכויות')!.ok).toBe(true);
    expect(item(r, 'חיפוש לפני')!.ok).toBe(true);
  });

  it('חיפוש עם הורדת בגדים ברחוב והכנסה לניידת בלי זכויות – הערות בתחקיר', () => {
    const { sc, seed } = setup();
    const st = play(sc, [...base, 'cs-strip-gil', 'cs-arrest-gil', 'cs-remove-gil'], { seed });
    const r = report(sc, st);
    expect(item(r, 'חיפוש לפני')!.ok).toBe(false);
    expect(item(r, 'הודעה על הזכויות')!.ok).toBe(false);
    expect(item(r, 'החלטה על אזיקה')!.ok).toBe(false);
  });

  it('מעוכב שנשאר בזירה בלי החלטה – הערה; שחרור – תקין', () => {
    const { sc, seed } = setup();
    const left = play(sc, base, { seed });
    expect(custodyStatus(sc, left, 'gil')).toBe('מעוכב');
    expect(item(report(sc, left), 'החלטה לגבי')!.ok).toBe(false);
    const freed = play(sc, [...base, 'cs-release-gil'], { seed });
    expect(custodyStatus(sc, freed, 'gil')).toBe('שוחרר');
    expect(item(report(sc, freed), 'החלטה לגבי')!.ok).toBe(true);
  });
});
