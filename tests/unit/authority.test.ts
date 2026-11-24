import { describe, expect, it } from 'vitest';
import { computeScore } from '../../src/engine/scoring';
import { buildDebrief } from '../../src/engine/feedback';
import { loadScenario, play, seedFor } from './helpers';

const rule = (id: string, scId: string, st: ReturnType<typeof play>) => computeScore(loadScenario(scId), st).rules.find((r) => r.rule.id === id)!;

describe('תחום „הפעלת סמכות ונהלים”', () => {
  it('נכלל רק בתרחישים שמגדירים לו משקל – לא מופיע כ„לא נכלל” בתרחישים הוותיקים', () => {
    const sc = loadScenario('noise-building');
    const s = computeScore(sc, play(sc, ['GO', 'ARRIVE', 'FINISH']));
    expect(s.domains.map((d) => d.domain)).not.toContain('authority');
    expect(s.excludedDomains).not.toContain('authority');
    const bf = loadScenario('bar-fight');
    expect(computeScore(bf, play(bf, ['GO', 'ARRIVE', 'z-separate', 'FINISH'])).domains.map((d) => d.label)).toContain('הפעלת סמכות ונהלים');
  });

  it('קטטה: דרישת הזדהות בלי הסבר מעוררת סירוב, והסבר מתקן חלקית', () => {
    const polite = play(loadScenario('bar-fight'), ['GO', 'ARRIVE', 'z-separate', 'd-identify']);
    expect(polite.flags.identified).toBe(true);
    const rude = play(loadScenario('bar-fight'), ['GO', 'ARRIVE', 'z-separate', 'd-demand']);
    expect(rude.flags.identified).toBeUndefined();
    expect(rude.flags.dorAngry).toBe(true);
    const fixed = play(loadScenario('bar-fight'), ['GO', 'ARRIVE', 'z-separate', 'd-demand', 'd-explain', 'FINISH']);
    expect(rule('bf-auth-id', 'bar-fight', fixed).points).toBe(6);
    expect(rule('bf-auth-id', 'bar-fight', play(loadScenario('bar-fight'), ['GO', 'ARRIVE', 'z-separate', 'd-identify', 'FINISH'])).points).toBe(10);
  });

  it('קטטה: עיכוב לפני שנשמעה עדות נחשב עיכוב ללא בסיס', () => {
    const early = play(loadScenario('bar-fight'), ['GO', 'ARRIVE', 'z-separate', 'd-identify', 'd-detain', 'FINISH']);
    expect(early.flags.detainedNoBasis).toBe(true);
    expect(rule('bf-auth-detain', 'bar-fight', early).points).toBe(3);
    const based = play(loadScenario('bar-fight'), ['GO', 'ARRIVE', 'z-separate', 'l-saw', 'd-identify', 'd-detain', 'FINISH']);
    expect(based.flags.detainedProper).toBe(true);
    expect(rule('bf-auth-detain', 'bar-fight', based).points).toBe(10);
  });

  it('קטטה: בלי הפרדה החבר מתקדם לעבר החשוד; הפרדה מוקדמת מונעת זאת', () => {
    const noSep = play(loadScenario('bar-fight'), ['GO', 'ARRIVE', 'a-check', 'l-saw']);
    expect(noSep.flags['ev:charge']).toBe(true);
    const sep = play(loadScenario('bar-fight'), ['GO', 'ARRIVE', 'z-separate', 'a-check', 'l-saw', 'm-calm']);
    expect(sep.flags['ev:charge']).toBeUndefined();
  });

  it('גז: צלצול באינטרקום נרשם כמקור ניצוץ; הכרזה מוקדמת מונעת את המצית', () => {
    const sc = loadScenario('gas-smell');
    const bell = play(sc, ['GO', 'ARRIVE', 'z-bell', 'FINISH']);
    expect(bell.flags.sparked).toBe(true);
    expect(rule('gs-assess-sparks', 'gas-smell', bell).points).toBe(0);
    expect(buildDebrief(sc, bell).timeline.some((t) => t.entry.consequences.some((c) => c.includes('ניצוץ')))).toBe(true);
    expect(play(sc, ['GO', 'ARRIVE', 'z-smell', 'g-hear', 'z-knock']).flags['ev:lighter']).toBe(true);
    expect(play(sc, ['GO', 'ARRIVE', 'z-noflame', 'g-hear', 'z-knock']).flags['ev:lighter']).toBeUndefined();
  });

  it('גז: דייר שנצעק עליו מסרב; הוראת פינוי מוסברת מוציאה אותו', () => {
    const st = play(loadScenario('gas-smell'), ['GO', 'ARRIVE', 'mo-order']);
    expect(st.flags.mosheAngry).toBe(true);
    expect(st.flags.mosheOut).toBeUndefined();
    expect(play(loadScenario('gas-smell'), ['GO', 'ARRIVE', 'mo-order', 'mo-firm']).flags.mosheOut).toBe(true);
  });

  it('חפץ חשוד: פתיחת התיק פוגעת בניקוד ומדווחת; החזרה בלי אימות נחשבת סיכון', () => {
    const sc = loadScenario('suspicious-object');
    const touched = play(sc, ['GO', 'ARRIVE', 's-touch', 'FINISH']);
    expect(rule('so-assess-touch', 'suspicious-object', touched).points).toBe(0);
    const seed = seedFor(sc, 'owner');
    const fast = play(sc, ['GO', 'ARRIVE', 's-shops', 'rt-letgo', 'FINISH'], { seed });
    expect(fast.flags.handedEarly).toBe(true);
    expect(sc.endings.find((e) => e.id === fast.endingId)!.kind).toBe('partial');
    expect(rule('so-auth-owner', 'suspicious-object', fast).points).toBe(0);
  });

  it('ילד אבוד: מסירה בלי וידוא זהות אינה סיום מלא', () => {
    const sc = loadScenario('lost-child');
    const st = play(sc, ['f-desc', 'GO', 'ARRIVE', 'a-search', 'o-kneel', 's-handfast', 'FINISH'], { seed: seedFor(sc, 'balloons') });
    expect(st.flags.handedFast).toBe(true);
    expect(st.endingId).not.toBe('e-good');
    expect(rule('lc-auth-verify', 'lost-child', st).points).toBe(0);
  });

  it('חניון: פגיעה ברכוש שלא נעצרה – כלל האזהרה חל ונותן 0', () => {
    const st = play(loadScenario('blocked-parking'), ['GO', 'ARRIVE', 'r-listen', 'c-plate', 'n-ask', 'FINISH']);
    expect(st.flags['ev:tire']).toBe(true);
    const r = rule('bp-auth-warn', 'blocked-parking', st);
    expect(r.applicable).toBe(true);
    expect(r.points).toBe(0);
  });

  it('נעדר: האירוע „הזמן לוחץ” חושף את הרקע הרפואי רק אם לא נמצא קודם', () => {
    const sc = loadScenario('missing-elder');
    const late = play(sc, ['GO', 'ARRIVE', 'o-calm', 'y-ask', 'a-gentle'], { seed: seedFor(sc, 'kiosk') });
    // בווריאציית הקיוסק עם תיאור – יוסי מוצא אותו מיד, ולכן האירוע לא קורה
    expect(late.flags.found).toBe(true);
    expect(late.flags['ev:insulin']).toBeUndefined();
    const bench = play(sc, ['GO', 'ARRIVE', 'o-calm', 'y-ask', 'r-home'], { seed: seedFor(sc, 'bench') });
    expect(bench.flags['ev:insulin']).toBe(true);
    expect(bench.known['c-orit-insulin']).toBeDefined();
  });
});
