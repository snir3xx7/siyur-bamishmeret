import { describe, expect, it } from 'vitest';
import { loadScenario, play, seedFor } from './helpers';
import { procedureReport, withProcedure } from '../../src/engine/procedure';
import { reduce } from '../../src/engine/game';

const R = { unit: 'סבא 402', head: 'סבא 401', center: 'משל״ט מרכז', centerCall: 'מרכז' };

describe('401: תגבור וקריאה „אתה פנוי?”', () => {
  it('ניידת נוספת בשלב קבלת הפרטים – מ־401, והוא עונה', () => {
    const raw = loadScenario('domestic-call');
    const sc = withProcedure(raw);
    const st = play(sc, ['f-backup'], { seed: seedFor(raw, 'mark'), radio: R });
    expect(st.lastLines[0].text).toBe('401 מסבא 402, מבקש ניידת נוספת לכתובת – אירוע במשפחה, צריך להפריד.');
    expect(st.lastLines[1].speaker).toBe('head');
    expect(st.lastLines[1].text).toContain('סבא 402 מ401, קיבלתי');
  });

  it('בקשת ניידת נוספת שנשלחה למשל״ט – הערה בתחקיר; ל־401 – תקין', () => {
    const raw = loadScenario('yard-dispute');
    const sc = withProcedure(raw);
    const base = play(sc, ['GO', 'ARRIVE'], { seed: seedFor(raw, raw.variants[0].id) });
    const toCenter = reduce(sc, base, { type: 'SEND_UPDATE', elements: ['u-backup'], note: '', turn: base.turn });
    expect(procedureReport(toCenter, sc).items.find((i) => i.label === 'בקשת ניידת נוספת')!.ok).toBe(false);
    const toHead = reduce(sc, base, { type: 'SEND_UPDATE', elements: ['u-backup'], note: '', turn: base.turn, to: 'head' });
    expect(procedureReport(toHead, sc).items.find((i) => i.label === 'בקשת ניידת נוספת')!.ok).toBe(true);
  });

  it('401 שואל „אתה פנוי?” – עדכון מצב וממשיך לתחקר הוא המענה המלא', () => {
    const raw = loadScenario('noise-building');
    const sc = withProcedure(raw);
    let st = play(sc, ['GO', 'ARRIVE'], { seed: seedFor(raw, raw.variants[0].id), radio: R });
    // מקדמים בבחירות זירה עד שהקריאה של 401 מגיעה
    for (let i = 0; i < 12 && !st.flags['ev:rp-busy']; i++) {
      const next = sc.hotspots.flatMap((h) => h.choices).find((c) => !c.id.startsWith('rp-') && !c.id.startsWith('fm-') && reduce(sc, st, { type: 'CHOOSE', choiceId: c.id, turn: st.turn }) !== st);
      if (!next) break;
      st = reduce(sc, st, { type: 'CHOOSE', choiceId: next.id, turn: st.turn });
    }
    expect(st.flags['ev:rp-busy']).toBe(true);
    const busyLine = st.log.flatMap((l) => l.lines).find((l) => l.text.includes('אתה פנוי'));
    expect(busyLine?.speaker).toBe('head');
    const after = reduce(sc, st, { type: 'CHOOSE', choiceId: 'rp-busy-update', turn: st.turn });
    expect(after.lastLines[0].text).toContain('ממשיך לתחקר ולברר');
    expect(procedureReport(after, sc).items.find((i) => i.label === 'מענה ל„אתה פנוי?”')!.detail).toContain('עדכנת בקצרה');
  });
});
