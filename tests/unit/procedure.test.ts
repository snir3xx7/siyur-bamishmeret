import { describe, expect, it } from 'vitest';
import { createGame, reduce } from '../../src/engine/game';
import { notebookCheck, procedureReport, withProcedure } from '../../src/engine/procedure';
import { computeScore } from '../../src/engine/scoring';
import { validateScenario } from '../../src/engine/validate';
import { cfg, loadScenario, play, seedFor } from './helpers';

const IDS = ['accident-rain', 'noise-building', 'yard-dispute', 'missing-elder', 'suspicious-object', 'blocked-parking', 'lost-child', 'bar-fight', 'gas-smell'];

describe('נוהל קשר – שכבה לכל התרחישים', () => {
  for (const id of IDS) {
    it(`${id}: התרחיש עם שכבת הקשר תקין וכל הבחירות נגישות`, () => {
      const r = validateScenario(withProcedure(loadScenario(id)), { walks: 300 });
      expect(r.errors).toEqual([]);
      expect(r.stats.unreachedChoices).toEqual([]);
    });
  }

  it('אותות הקריאה מהתחנה נכנסים לטקסט; ברירת מחדל בדויה', () => {
    const sc = withProcedure(loadScenario('noise-building'));
    const real = play(sc, ['rp-ack'], { radio: { unit: 'סבא 402', head: 'סבא 401', center: 'משל״ט מרכז' } });
    expect(real.lastLines[0].text).toBe('סבא 401, כאן סבא 402. קיבלתי את האירוע, יוצא. עבור.');
    const fict = play(sc, ['rp-ack']);
    expect(fict.lastLines[0].text).toContain('כאן סייר 23');
  });

  it('אישור קצר, „פנוי” באמצע טיפול – נרשמים בנוהל הקשר, והציון לא משתנה', () => {
    const raw = loadScenario('noise-building');
    const sc = withProcedure(raw);
    const steps = ['rp-ack-short', 'GO', 'ARRIVE', 's-listen', 's-doc', 'k8', 'h-polite', 'h-explain'];
    const seed = seedFor(raw, 'apt8');
    const st = play(sc, steps, { seed });
    expect(st.flags['ev:rp-busy']).toBe(true);
    const busy = reduce(sc, st, { type: 'CHOOSE', choiceId: 'rp-busy-yes', turn: st.turn });
    const rep = procedureReport(busy);
    expect(rep.items.find((i) => i.label === 'אישור קבלת האירוע')!.ok).toBe(false);
    expect(rep.items.find((i) => i.label === 'מענה ל„אתה פנוי?”')!.ok).toBe(false);
    // הציון זהה למהלך בלי שכבת הקשר
    const base = play(raw, ['GO', 'ARRIVE', 's-listen', 's-doc', 'k8', 'h-polite', 'h-explain'], { seed });
    expect(computeScore(sc, busy).total).toBe(computeScore(raw, base).total);
  });

  it('פנקס: לא צורך תור, נשמר בשחזור ונבדק מול הפרטים שנפגשו', () => {
    const sc = withProcedure(loadScenario('blocked-parking'));
    let st = play(sc, ['GO', 'ARRIVE', 'r-listen', 'c-plate']);
    const turn = st.turn;
    st = reduce(sc, st, { type: 'NOTE', text: 'רוני – אח, משמרת 7. רכב 45-218-63. 06:45' });
    st = reduce(sc, st, { type: 'NOTE', text: 'רוני – אח, משמרת 7. רכב 45-218-63. 06:45 הגעה' });
    expect(st.turn).toBe(turn);
    expect(st.actions.filter((a) => a.type === 'NOTE')).toHaveLength(1);
    const check = notebookCheck(sc, st);
    expect(check.find((c) => c.item.startsWith('שם: רוני'))!.ok).toBe(true);
    expect(check.find((c) => c.item.startsWith('מספר רכב'))!.ok).toBe(true);
    expect(check.find((c) => c.item.startsWith('מספר אירוע'))!.ok).toBe(false);
    const fresh = createGame(sc, cfg(sc));
    expect(fresh.notebook).toBeUndefined();
  });
});
