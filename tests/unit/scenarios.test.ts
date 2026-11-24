import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { computeScore } from '../../src/engine/scoring';
import { validateScenario } from '../../src/engine/validate';
import { transitionImages } from '../../src/scene/Transition';
import { loadScenario, play, seedFor, type Step } from './helpers';

const root = join(__dirname, '../../public');
const index = JSON.parse(readFileSync(join(root, 'scenarios/index.json'), 'utf8')).scenarios as { id: string; file: string; version: number; title: string }[];

/** מסלול מלא לכל תרחיש – מוודא שהסיום הטוב והציון המלא נגישים */
const GOOD_PATHS: Record<string, { variant: string; steps: Step[] }> = {
  'accident-rain': {
    variant: 'oren-hurt',
    steps: ['f-injuries', 'f-caller', 'GO', 'ARRIVE', 's-secure', 'o-feel', 'd-feel', ['UPDATE', 'u-loc', 'u-two-cars', 'u-status-pain', 'u-ems'], 'o-care', 'o-worse', ['UPDATE', 'u-worse'], 'o-version', 'd-version', 'w-talk', 'o-phone', 'w-contact', 's-look', 's-move', ['UPDATE', 'u-loc', 'u-lane-clear', 'u-versions'], 'FINISH'],
  },
  'noise-building': {
    variant: 'apt8',
    steps: ['f-reporter', 'f-history', 'GO', 'ARRIVE', 'r-meet', 's-listen', 's-doc', ['UPDATE', 'u-loc', 'u-source', 'u-calm'], 'k8', 'h-polite', 'h-explain', 'h-guests', 'h-agree', 's-recheck', 'r-close', ['UPDATE', 'u-loc', 'u-lowered', 'u-agreement', 'u-weekly-claim'], 'FINISH'],
  },
  'yard-dispute': {
    variant: 'no-notice',
    steps: ['f-violence', 'f-caller', 'GO', 'ARRIVE', 'y-calm', 'c-disperse', 'm-feel', 'i-feel', 'm-private', 'i-private', 'm-key', 'y-board', 't-talk', 't-contact', 'r-history', 'y-shed', 'y-doc', ['UPDATE', 'u-loc', 'u-argue', 'u-calm', 'u-no-violence'], 'y-interim', 'y-refer', ['UPDATE', 'u-loc', 'u-opened', 'u-referred', 'u-versions', 'u-notice'], 'FINISH'],
  },
  'missing-elder': {
    variant: 'bench',
    steps: ['f-desc', 'f-medical', 'GO', 'ARRIVE', 'o-calm', 'o-stay', ['UPDATE', 'u-loc', 'u-desc', 'u-medical', 'u-searching', 'u-broadcast'], 'y-ask', 'p-search', 'a-gentle', 'a-check', 'p-note', ['UPDATE', 'u-loc', 'u-found', 'u-shaky', 'u-ems', 'u-cancel', 'u-medical'], 'o-reunite', 'FINISH'],
  },
  'suspicious-object': {
    variant: 'owner',
    steps: ['f-desc', 'f-caller', 'GO', 'ARRIVE', 'b-explain', 's-observe', 's-isolate', ['UPDATE', 'u-loc', 'u-bag', 'u-isolated', 'u-expert', 'u-divert'], 'n-witness', 's-doc', 's-shops', 'rt-explain', 'rt-verify', ['UPDATE', 'u-owner'], 'rt-return', ['UPDATE', 'u-loc', 'u-cleared'], 'FINISH'],
  },
  'blocked-parking': {
    variant: 'nonote',
    steps: ['f-mood', 'GO', 'ARRIVE', 'r-listen', 'c-plate', 'c-photo', 'r-warn', ['UPDATE', 'u-loc', 'u-blocked', 'u-tension'], 'r-alt', 'n-ask', 'n-knock', 's-hear', 's-move', 's-mediate', ['UPDATE', 'u-loc', 'u-moved'], 'FINISH'],
  },
  'lost-child': {
    variant: 'balloons',
    steps: ['f-desc', 'f-where', 'GO', 'ARRIVE', 's-calm', 's-photo', 's-stay', 's-hold', ['UPDATE', 'u-loc', 'u-desc', 'u-searching', 'u-units'], 'h-ask', 'h-announce', 'a-search', 'o-kneel', 'o-story', 'o-verify', 'a-doc', 's-reunite', ['UPDATE', 'u-loc', 'u-found', 'u-verified', 'u-reunited'], 'FINISH'],
  },
  'bar-fight': {
    variant: 'dor-first',
    steps: ['f-hurt', 'f-suspect', 'f-backup', 'GO', 'ARRIVE', 'z-separate', 'a-check', ['UPDATE', 'u-loc', 'u-injured', 'u-separated'], 'm-calm', 'l-saw', 'a-version', 'd-identify', 'd-version', 'd-detain', 'l-camera', 'z-preserve', 'z-doc', ['UPDATE', 'u-loc', 'u-suspect', 'u-detained', 'u-footage', 'u-versions'], 'FINISH'],
  },
  'gas-smell': {
    variant: 'meter',
    steps: ['f-people', 'f-fire', 'GO', 'ARRIVE', 'z-smell', ['UPDATE', 'u-loc', 'u-smell'], 'z-noflame', 'g-hear', 'mo-explain', 'z-knock', 'z-perimeter', 'g-help', 'g-update', 't-explain', 'z-doc', 'z-handover', ['UPDATE', 'u-loc', 'u-evacuated', 'u-handed'], 'FINISH'],
  },
};

describe('קבצי תרחישים', () => {
  it('הקטלוג מפנה לקבצים קיימים עם מזהה וגרסה תואמים', () => {
    expect(index.length).toBeGreaterThanOrEqual(3);
    for (const e of index) {
      expect(existsSync(join(root, 'scenarios', e.file))).toBe(true);
      const sc = loadScenario(e.id);
      expect(sc.id).toBe(e.id);
      expect(sc.version).toBe(e.version);
      expect(sc.title).toBe(e.title);
    }
  });

  for (const e of index) {
    describe(e.id, () => {
      const sc = loadScenario(e.id);

      it('בדיקת תקינות: הפניות, יעדים ומסלולים מסתיימים', () => {
        const r = validateScenario(sc, { walks: 300 });
        expect(r.errors).toEqual([]);
        expect(r.stats.unreachedChoices).toEqual([]);
      });

      it('לפחות ארבע נקודות החלטה ולפחות שתי תוצאות', () => {
        const decisions = sc.hotspots.flatMap((h) => h.choices).filter((c) => c.effects?.attitude || c.effects?.set || c.branches?.length);
        expect(decisions.length).toBeGreaterThanOrEqual(4);
        expect(new Set(sc.endings.map((x) => x.kind)).size).toBeGreaterThanOrEqual(2);
      });

      it('כל נכסי המדיה קיימים', () => {
        for (const p of [...sc.media.images, ...sc.media.audio]) expect(existsSync(join(root, p)), p).toBe(true);
        // קריינות מוקלטת: כל קובץ קיים, וכל מפתח הוא הודעת הפתיחה או בחירה בתרחיש
        const ids = new Set(['dispatch', ...sc.dispatch.followUps.map((c) => c.id), ...sc.hotspots.flatMap((h) => h.choices.map((c) => c.id))]);
        for (const v of Object.values(sc.media.voiceLines ?? {})) expect(existsSync(join(root, v)), v).toBe(true);
        for (const [k, v] of Object.entries(sc.media.voice)) {
          expect(existsSync(join(root, v)), v).toBe(true);
          expect(ids.has(k), k).toBe(true);
        }
        for (const a of [...sc.scene.ambience, ...sc.transition.ambience, ...(sc.scene.ambienceRules ?? []).flatMap((r) => r.ambience)]) {
          expect(existsSync(join(root, 'audio', `${a}.mp3`)), a).toBe(true);
          expect(sc.media.audio).toContain(`audio/${a}.mp3`);
        }
        for (const v of ['day', 'night']) expect(existsSync(join(root, `${sc.scene.background}-${v}.webp`))).toBe(true);
      });

      it('איורי דמויות ורכבים קיימים ונכללים בהורדה הלא מקוונת', () => {
        for (const c of sc.characters.filter((x) => x.sprite)) {
          expect(c.spriteMoods?.length, c.id).toBeGreaterThan(0);
          for (const m of c.spriteMoods!) {
            const f = `${c.sprite}-${m}.webp`;
            expect(existsSync(join(root, f)), f).toBe(true);
            expect(sc.media.images, f).toContain(f);
          }
        }
        if (sc.scene.painted)
          for (const k of new Set((sc.scene.props ?? []).map((p) => p.kind).filter((k) => ['car-red', 'car-silver', 'patrol'].includes(k)))) {
            expect(existsSync(join(root, `img/props/${k}.webp`)), k).toBe(true);
            expect(sc.media.images).toContain(`img/props/${k}.webp`);
          }
        for (const p of (sc.scene.props ?? []).filter((x) => x.kind === 'sign')) expect(p.text, p.id).toBeTruthy();
      });

      it('איורי קטע המעבר (ניידת מבפנים/מבחוץ) קיימים ונכללים בהורדה', () => {
        for (const f of transitionImages(sc.transition.kind)) {
          expect(existsSync(join(root, f)), f).toBe(true);
          expect(sc.media.images).toContain(f);
        }
      });

      it('לכל שכבת סביבה לכל היותר שתי שכבות', () => {
        expect(sc.scene.ambience.length).toBeLessThanOrEqual(2);
        for (const r of sc.scene.ambienceRules ?? []) expect(r.ambience.length).toBeLessThanOrEqual(2);
      });

      it('מסלול מלא מגיע לסיום טוב ולציון 100', () => {
        const p = GOOD_PATHS[sc.id];
        expect(p, 'הגדירו מסלול מלא לתרחיש החדש ב-GOOD_PATHS').toBeDefined();
        const st = play(sc, p.steps, { seed: seedFor(sc, p.variant) });
        expect(sc.endings.find((x) => x.id === st.endingId)!.kind).toBe('good');
        expect(computeScore(sc, st).total).toBe(100);
      });

      it('סיום מיידי אחרי ההגעה נותן סיום שאינו טוב', () => {
        const st = play(sc, ['GO', 'ARRIVE', 'FINISH']);
        expect(sc.endings.find((x) => x.id === st.endingId)!.kind).not.toBe('good');
        expect(computeScore(sc, st).total).toBeLessThan(40);
      });
    });
  }
});

describe('רעש בבניין – מיקום הרעש שונה ממה שנמסר', () => {
  const sc = loadScenario('noise-building');
  it('דפיקה בדלת שנמסרה בלי אימות מעירה דייר לא קשור', () => {
    const st = play(sc, ['GO', 'ARRIVE', 'k7'], { seed: seedFor(sc, 'apt8') });
    expect(st.flags.wrongDoor).toBe(true);
    expect(st.flags.shmuelOpen).toBe(true);
  });
  it('אופן הפנייה למארח משנה את תגובתו', () => {
    const seed = seedFor(sc, 'apt7');
    const polite = play(sc, ['GO', 'ARRIVE', 'k7', 'h-polite'], { seed });
    const harsh = play(sc, ['GO', 'ARRIVE', 'k7', 'h-order'], { seed });
    expect(polite.attitudes.ido).toBeGreaterThan(harsh.attitudes.ido);
    expect(polite.known['c-host-birthday']).toBeDefined();
    expect(harsh.known['c-host-birthday']).toBeUndefined();
  });
});

describe('ויכוח בחצר – הקהל מגביר מתח, שיחה נפרדת ורגועה פותחת מידע', () => {
  const sc = loadScenario('yard-dispute');
  it('מול קהל: גרסה מקוצרת; אחרי פיזור: גרסה מלאה', () => {
    const withCrowd = play(sc, ['GO', 'ARRIVE', 'm-private']);
    expect(withCrowd.known['c-mic-theft']).toBeUndefined();
    const calm = play(sc, ['GO', 'ARRIVE', 'c-disperse', 'm-private']);
    expect(calm.known['c-mic-theft']).toBeDefined();
  });
});
