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
    expect(real.lastLines[0].text).toBe('מרכז מסבא 402, קיבלתי את האירוע, יוצא.');
    expect(real.lastLines[1].text).toBe('סבא 402, קיבלתי.');
    const fict = play(sc, ['rp-ack']);
    expect(fict.lastLines[0].text).toContain('מוקד אלון מסייר 23');
  });

  it('אישור קצר, „פנוי” באמצע טיפול – נרשמים בנוהל הקשר, והציון לא משתנה', () => {
    const raw = loadScenario('noise-building');
    const sc = withProcedure(raw);
    const steps = ['rp-ack-short', 'GO', 'ARRIVE', 's-listen', 's-doc', 'k8', 'h-polite', 'h-explain'];
    const seed = seedFor(raw, 'apt8');
    const st = play(sc, steps, { seed });
    expect(st.flags['ev:rp-busy']).toBe(true);
    const busy = reduce(sc, st, { type: 'CHOOSE', choiceId: 'rp-busy-yes', turn: st.turn });
    const rep = procedureReport(busy, sc);
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

describe('למי משדרים: משל״ט, ראש משמרת, קצין תורן', () => {
  it('בקשת מד״א מהמשל״ט (ברירת המחדל) – המשל״ט עונה, ונוהל הקשר תקין; מראש המשמרת – הערה', () => {
    const sc = withProcedure(loadScenario('missing-elder'));
    const seed = seedFor(loadScenario('missing-elder'), 'bench');
    const base = play(sc, ['f-desc', 'GO', 'ARRIVE', 'o-calm', 'p-search'], { seed });
    const toCenter = reduce(sc, base, { type: 'SEND_UPDATE', elements: ['u-loc', 'u-ems'], note: '', turn: base.turn });
    expect(toCenter.lastLines[0].speaker).toBe('dispatch');
    expect(toCenter.updates[0].to).toBeUndefined();
    expect(reduce(sc, base, { type: 'SEND_UPDATE', elements: ['u-loc', 'u-ems'], note: '', turn: base.turn, to: 'center' }).lastLines[0].speaker).toBe('dispatch');
    expect(procedureReport(toCenter, sc).items.find((i) => i.label === 'פנייה לגורם הנכון')!.ok).toBe(true);
    const toHead = reduce(sc, base, { type: 'SEND_UPDATE', elements: ['u-loc', 'u-ems'], note: '', turn: base.turn, to: 'head' });
    expect(toHead.lastLines[0].speaker).toBe('head');
    // 401 לא מזמין מד״א – מעביר למשל״ט ומפנה אליו
    expect(toHead.lastLines[0].text).toContain('מעביר למשל״ט');
    expect(procedureReport(toHead, sc).items.find((i) => i.label === 'פנייה לגורם הנכון')!.ok).toBe(false);
    // נפגע/מד״א → צריך לעדכן גם את הקצין התורן
    expect(procedureReport(toCenter, sc).items.find((i) => i.label === 'עדכון הקצין התורן')!.ok).toBe(false);
    const duty = reduce(sc, toCenter, { type: 'SEND_UPDATE', elements: ['u-loc', 'u-found'], note: '', turn: toCenter.turn, to: 'duty' });
    expect(duty.lastLines[0].speaker).toBe('duty');
    expect(duty.lastLines[0].text).toContain('תעדכן אותי');
    expect(duty.lastLines.some((l) => l.speaker === 'dispatch')).toBe(false);
    expect(procedureReport(duty, sc).items.find((i) => i.label === 'עדכון הקצין התורן')!.ok).toBe(true);
  });
});
