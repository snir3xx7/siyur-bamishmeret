import { describe, expect, it } from 'vitest';
import { availableFollowUps, createGame, reduce, replay } from '../../src/engine/game';
import { cfg, loadScenario, play } from './helpers';

const sc = loadScenario('accident-rain');

describe('מעברי שלבים', () => {
  it('קבלת משימה → מעבר → זירה → סיום', () => {
    let st = createGame(sc, cfg(sc));
    expect(st.stage).toBe('dispatch');
    expect(st.log[0].kind).toBe('dispatch');
    st = reduce(sc, st, { type: 'GO', turn: st.turn });
    expect(st.stage).toBe('transition');
    st = reduce(sc, st, { type: 'ARRIVE', turn: st.turn, skipped: true });
    expect(st.stage).toBe('scene');
    expect(st.known['o-arrival']?.verified).toBe(true);
    expect(st.log.at(-1)!.kind).toBe('skip');
    st = reduce(sc, st, { type: 'FINISH', turn: st.turn });
    expect(st.stage).toBe('ended');
    expect(st.endingId).toBeDefined();
  });

  it('דילוג על המעבר לא מאבד מידע ומוסיף את זמן הנסיעה', () => {
    const a = play(sc, ['f-injuries', 'GO']);
    const skipped = reduce(sc, a, { type: 'ARRIVE', turn: a.turn, skipped: true });
    const watched = reduce(sc, a, { type: 'ARRIVE', turn: a.turn, skipped: false });
    expect(Object.keys(skipped.known).sort()).toEqual(Object.keys(watched.known).sort());
    expect(skipped.simMinutes).toBe(watched.simMinutes);
    expect(skipped.known['d-drivers-out']).toBeDefined();
  });

  it('שעון התרחיש עצור במעבר ורץ בזירה', () => {
    let st = play(sc, ['GO']);
    const t = reduce(sc, st, { type: 'TICK', ms: 5000 });
    expect(t).toBe(st);
    st = reduce(sc, st, { type: 'ARRIVE', turn: st.turn, skipped: false });
    st = reduce(sc, st, { type: 'TICK', ms: 5000 });
    expect(st.activeMs).toBe(5000);
  });

  it('שאלות למוקד זמינות רק בשלב קבלת המשימה', () => {
    const st = play(sc, ['GO', 'ARRIVE']);
    const r = reduce(sc, st, { type: 'CHOOSE', choiceId: 'f-injuries', turn: st.turn });
    expect(r).toBe(st);
  });

  it('לחיצה כפולה לא משכפלת החלטה', () => {
    let st = play(sc, ['GO', 'ARRIVE']);
    const turn = st.turn;
    st = reduce(sc, st, { type: 'CHOOSE', choiceId: 's-secure', turn });
    const again = reduce(sc, st, { type: 'CHOOSE', choiceId: 's-secure', turn });
    expect(again).toBe(st);
    expect(st.log.filter((l) => l.ref === 's-secure')).toHaveLength(1);
    // גם עם תור עדכני – בחירה חד-פעמית לא חוזרת
    const third = reduce(sc, st, { type: 'CHOOSE', choiceId: 's-secure', turn: st.turn });
    expect(third).toBe(st);
  });

  it('עדכון למוקד נדחה אם אין רכיבים זמינים, ולחיצה כפולה לא שולחת פעמיים', () => {
    let st = play(sc, ['GO', 'ARRIVE']);
    expect(reduce(sc, st, { type: 'SEND_UPDATE', elements: ['u-ems'], note: '', turn: st.turn })).toBe(st);
    const turn = st.turn;
    st = reduce(sc, st, { type: 'SEND_UPDATE', elements: ['u-loc'], note: '', turn });
    expect(reduce(sc, st, { type: 'SEND_UPDATE', elements: ['u-loc'], note: '', turn })).toBe(st);
    expect(st.updates).toHaveLength(1);
  });

  it('כל בחירה מעדכנת את היומן פעם אחת ושומרת מה היה ידוע ברגע ההחלטה', () => {
    const st = play(sc, ['GO', 'ARRIVE', 'd-feel']);
    const e = st.log.find((l) => l.ref === 'd-feel')!;
    expect(st.log.filter((l) => l.ref === 'd-feel')).toHaveLength(1);
    expect(e.knownBefore).not.toContain('c-pain-dana');
    expect(e.knownBefore).toContain('d-location');
  });

  it('מידע מהמוקד נפרד ממידע שאומת בזירה', () => {
    let st = play(sc, ['f-hazard']);
    expect(st.known['d-lane'].verified).toBe(false);
    st = play(sc, ['f-hazard', 'GO', 'ARRIVE', 's-secure']);
    expect(st.known['d-lane'].verified).toBe(true);
  });

  it('חזרה על טענה של צד אחד בפני האחר מורידה שיתוף פעולה ונרשמת כהשלכה', () => {
    const st = play(sc, ['GO', 'ARRIVE', 'o-version', 'd-confront', 'd-version']);
    expect(st.attitudes.dana).toBe(-1);
    expect(st.known['c-dana-version']).toBeUndefined();
    expect(st.known['c-dana-short']).toBeDefined();
    const e = st.log.find((l) => l.ref === 'd-confront')!;
    expect(e.consequences.join(' ')).toMatch(/פחות משת(ף|פת) פעולה/);
  });

  it('אפשר לתקן החלטה ולשאול שוב', () => {
    const st = play(sc, ['GO', 'ARRIVE', 'o-version', 'd-confront', 'd-version', 'd-retry']);
    expect(st.known['c-dana-version']).toBeDefined();
    expect(st.flags.repaired).toBe(true);
  });

  it('רמת קושי מתקדמת: קטיעת קשר ובקשה לחזור', () => {
    let st = play(sc, ['f-hazard'], { difficulty: 'advanced' });
    expect(st.known['d-lane']).toBeUndefined();
    expect(availableFollowUps(sc, st).map((c) => c.id)).toContain('f-hazard-repeat');
    st = play(sc, ['f-hazard', 'f-hazard-repeat'], { difficulty: 'advanced' });
    expect(st.known['d-lane']).toBeDefined();
  });

  it('רמת קושי בסיסית מוסרת יותר מידע מראש', () => {
    expect(createGame(sc, cfg(sc, { difficulty: 'basic' })).known['d-caller']).toBeDefined();
    expect(createGame(sc, cfg(sc, { difficulty: 'standard' })).known['d-caller']).toBeUndefined();
  });

  it('שחזור מרשימת פעולות מחזיר מצב זהה (טעינת שמירה)', () => {
    const st = play(sc, ['f-injuries', 'GO', 'ARRIVE', 's-secure', 'd-feel', ['UPDATE', 'u-loc', 'u-two-cars']]);
    const r = replay(sc, st.config, st.actions);
    expect(r.turn).toBe(st.turn);
    expect(r.known).toEqual(st.known);
    expect(r.flags).toEqual(st.flags);
    expect(r.updates.map((u) => u.elements)).toEqual(st.updates.map((u) => u.elements));
  });

  it('שחזור עד נקודת החלטה (לדיון בכיתה)', () => {
    const st = play(sc, ['GO', 'ARRIVE', 's-secure', 'd-feel']);
    const idx = st.log.find((l) => l.ref === 'd-feel')!.actionIndex;
    const r = replay(sc, st.config, st.actions.slice(0, idx));
    expect(r.chosen['s-secure']).toBeDefined();
    expect(r.chosen['d-feel']).toBeUndefined();
    expect(r.stage).toBe('scene');
  });
});
