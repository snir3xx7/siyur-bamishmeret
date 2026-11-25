import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadScenario, play, seedFor } from './helpers';
import { withProcedure } from '../../src/engine/procedure';
import { reduce } from '../../src/engine/game';
import { bodycamReport, CAM_ANNOUNCE } from '../../src/engine/bodycam';
import { voiceKey } from '../../src/audio/voiceKey';

const raw = loadScenario('domestic-call');
const sc = withProcedure(raw);
const seed = seedFor(raw, 'mark');
const item = (r: ReturnType<typeof bodycamReport>, l: string) => r.find((i) => i.label === l)!;

describe('מצלמת גוף', () => {
  it('הפעלה לפני המגע הראשון, הודעה בבית, וסיום צילום – הכול תקין', () => {
    let st = play(sc, ['GO', 'ARRIVE'], { seed });
    st = reduce(sc, st, { type: 'CAM', on: true });
    st = play(sc, [], { seed }) && st;
    st = reduce(sc, st, { type: 'CHOOSE', choiceId: CAM_ANNOUNCE, turn: st.turn });
    st = reduce(sc, st, { type: 'CHOOSE', choiceId: 'g-enter', turn: st.turn });
    st = reduce(sc, st, { type: 'CAM', on: false });
    const r = bodycamReport(st, sc);
    expect(item(r, 'הפעלה בתחילת המפגש').ok).toBe(true);
    expect(item(r, 'הודעה על צילום בבית').ok).toBe(true);
    expect(item(r, 'סיום הצילום').ok).toBe(true);
  });

  it('הפעלה מאוחרת, בלי הודעה בבית ובלי סיום – הערות', () => {
    let st = play(sc, ['GO', 'ARRIVE', 'g-enter'], { seed });
    st = reduce(sc, st, { type: 'CAM', on: true });
    const r = bodycamReport(st, sc);
    expect(item(r, 'הפעלה בתחילת המפגש').ok).toBe(false);
    expect(item(r, 'הודעה על צילום בבית').ok).toBe(false);
    expect(item(r, 'סיום הצילום').ok).toBe(false);
  });

  it('לא צורכת תור ולא פועלת לפני ההגעה לזירה', () => {
    const before = play(sc, [], { seed });
    expect(reduce(sc, before, { type: 'CAM', on: true })).toBe(before);
    const st = play(sc, ['GO', 'ARRIVE'], { seed });
    expect(reduce(sc, st, { type: 'CAM', on: true }).turn).toBe(st.turn);
  });

  it('הכרזות המכשיר והודעת השוטר/ת מוקלטות', () => {
    const idx = JSON.parse(readFileSync('public/audio/radio/index.json', 'utf8')) as Record<string, string>;
    for (const [sp, t] of [['bodycam', 'מצלמה מקליטה'], ['bodycam', 'סיום הקלטה'], ['officer', 'אני מסיים את הצילום.'], ['officerF', 'אני מסיימת את הצילום.']])
      expect(idx[voiceKey(sp, t)], t).toBeTruthy();
  });
});
