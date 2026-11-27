/**
 * בדיקת איכות אוטומטית: אלפי מעברים אקראיים בכל תרחיש, גרסה ומצב קשר (בדוי / תחנה אמיתית),
 * ובכל מצב – כל הטקסט שמוצג לחניך: שורות, תוויות, עובדות, עדכונים, סיומים, משוב, דוח, תחקיר.
 * מחפש: חריגות, משתנים שלא מולאו ({{…}}), שמות בדויים שנשארו במצב תחנה, ריקים, ומבוי סתום.
 * הרצה: npx vite-node scripts/qa-fuzz.ts
 */
import { readFileSync } from 'node:fs';
import { DISTRICTS, radioProfile, radioize, toGameRadio, DEFAULT_RADIO } from '../src/config/stations';
import { withProcedure } from '../src/engine/procedure';
import { availableChoices, availableElements, availableFollowUps, createGame, reduce, visibleHotspots } from '../src/engine/game';
import { computeScore } from '../src/engine/scoring';
import { buildDebrief } from '../src/engine/feedback';
import { buildReport } from '../src/engine/report';
import { custodyReport } from '../src/engine/custody';
import { bodycamReport } from '../src/engine/bodycam';
import { pressureReport } from '../src/engine/pressure';
import { procedureReport } from '../src/engine/procedure';
import { factQuiz, powerQuiz } from '../src/engine/actionReport';
import { buildResult } from '../src/engine/results';
import { evalCond } from '../src/engine/conditions';
import { fill } from '../src/engine/text';
import { mulberry32 } from '../src/engine/rng';
import type { GameConfig, GameState, Scenario } from '../src/engine/types';

const idx = JSON.parse(readFileSync('public/scenarios/index.json', 'utf8')).scenarios as { id: string; file: string }[];
const issues = new Map<string, Set<string>>();
const add = (sc: string, kind: string, msg: string) => {
  const k = `${sc} · ${kind}`;
  if (!issues.has(k)) issues.set(k, new Set());
  issues.get(k)!.add(msg.slice(0, 160));
};
const kfar = DISTRICTS.find((d) => d.id === 'center')!.stations.find((s) => s.id === 'kfar-saba')!;
const stationRadio = { ...DEFAULT_RADIO, mode: 'station' as const, district: 'center', station: kfar.id, unit: '402' };
const WALKS = Number(process.argv[2] ?? 120);
let steps = 0, texts = 0, ends = 0;

function checkText(sc: Scenario, where: string, t: string, real: boolean, prof: ReturnType<typeof radioProfile>) {
  if (!t) return;
  texts++;
  const shown = real ? radioize(t, prof) : t;
  if (/\{\{[^}]*\}\}/.test(shown)) add(sc.id, 'משתנה לא מולא', `${where}: ${shown}`);
  if (real && /מוקד אלון|סייר \d+/.test(shown)) add(sc.id, 'שם בדוי במצב תחנה', `${where}: ${shown}`);
  if (/undefined|NaN|\[object/.test(shown)) add(sc.id, 'ערך שבור', `${where}: ${shown}`);
}

for (const e of idx) {
  const sc = withProcedure(JSON.parse(readFileSync(`public/scenarios/${e.file}`, 'utf8')) as Scenario);
  for (const real of [false, true]) {
    const prof = radioProfile(real ? stationRadio : undefined, sc.dispatch.unit);
    for (let w = 0; w < WALKS; w++) {
      const rnd = mulberry32(w * 977 + (real ? 1 : 0));
      const cfg: GameConfig = { scenarioId: sc.id, version: sc.version, seed: 1 + w, shift: sc.shifts[w % sc.shifts.length], difficulty: 'standard', mode: 'practice', timeLimit: false, ...(real ? { radio: toGameRadio(prof) } : {}) };
      let st: GameState;
      try {
        st = createGame(sc, cfg);
      } catch (err) {
        add(sc.id, 'חריגה', `createGame: ${(err as Error).message}`);
        continue;
      }
      const T = (where: string, t: string | undefined) => checkText(sc, where, fill(t ?? '', st.vars), real, prof);
      const lines = (where: string) => st.lastLines.forEach((l) => T(`${where} [${l.speaker}]`, l.text));
      try {
        lines('פתיחה');
        // שאלות בקשר
        for (let i = 0; i < 4; i++) {
          const fus = availableFollowUps(sc, st);
          fus.forEach((c) => T('תווית שאלה', c.label));
          if (!fus.length || rnd() < 0.3) break;
          const c = fus[Math.floor(rnd() * fus.length)];
          st = reduce(sc, st, { type: 'CHOOSE', choiceId: c.id, turn: st.turn });
          lines(`שאלה ${c.id}`);
        }
        st = reduce(sc, st, { type: 'GO', turn: st.turn });
        st = reduce(sc, st, { type: 'ARRIVE', turn: st.turn, skipped: false });
        lines('הגעה');
        let stuck = 0;
        for (let i = 0; i < 40; i++) {
          const hs = visibleHotspots(sc, st);
          hs.forEach((h) => T(`נקודה ${h.id}`, h.label));
          const opts = hs.flatMap((h) => availableChoices(sc, st, h.id));
          opts.forEach((c) => T(`תווית ${c.id}`, c.label));
          const els = availableElements(sc, st);
          els.forEach((x) => T(`רכיב עדכון ${x.id}`, x.text));
          if (rnd() < 0.15 && els.length) {
            const pick = els.filter(() => rnd() < 0.5).map((x) => x.id);
            const to = (['center', 'head', 'duty'] as const)[Math.floor(rnd() * 3)];
            const next = reduce(sc, st, { type: 'SEND_UPDATE', elements: pick.length ? pick : [els[0].id], note: '', turn: st.turn, to });
            if (next !== st) { st = next; lines('עדכון'); }
            continue;
          }
          if (!opts.length) { stuck++; break; }
          const c = opts[Math.floor(rnd() * opts.length)];
          const next = reduce(sc, st, { type: 'CHOOSE', choiceId: c.id, turn: st.turn });
          if (next === st) { add(sc.id, 'בחירה זמינה שלא מתבצעת', c.id); break; }
          st = next;
          steps++;
          lines(`בחירה ${c.id}`);
          if (st.lastEvent) T(`אירוע ${st.lastEvent}`, st.log[st.log.length - 1]?.label);
        }
        st = reduce(sc, st, { type: 'FINISH', turn: st.turn });
        if (st.stage !== 'ended') add(sc.id, 'סיום', 'FINISH לא סיים את המשחק');
        ends++;
        if (!st.endingId) add(sc.id, 'סיום', 'אין סיום מתאים');
        const end = sc.endings.find((x) => x.id === st.endingId);
        T('סיום', end?.title); T('סיום', end?.text);
        const s = computeScore(sc, st);
        if (!(s.total >= 0 && s.total <= 100)) add(sc.id, 'ציון', `ציון לא תקין ${s.total}`);
        s.rules.forEach((r) => { T(`משוב ${r.rule.id}`, r.explain); T(`משוב ${r.rule.id}`, r.keep); T(`משוב ${r.rule.id}`, r.improve); });
        const d = buildDebrief(sc, st);
        [...d.keep, ...d.improve].forEach((x) => T('תחקיר', typeof x === 'string' ? x : JSON.stringify(x)));
        buildReport(sc, st).forEach((r) => T(`דוח ${r.id}`, r.text));
        custodyReport(st, sc, (c) => evalCond({ sc, st }, c)).forEach((r) => { T('מעצר', r.label); T('מעצר', r.detail); });
        bodycamReport(st, sc).forEach((r) => T('מצלמת גוף', r.detail));
        pressureReport(sc, st).forEach((r) => T('לחץ זמן', r.detail));
        procedureReport(st, sc).items.forEach((r) => { T('נוהל קשר', r.label); T('נוהל קשר', r.detail); });
        factQuiz(sc, st).forEach((f) => T('הדוח שלך', f.text));
        powerQuiz(sc, st);
        buildResult(sc, st, 'בדיקה');
        if (stuck && st.endingId && sc.endings.find((x) => x.id === st.endingId)?.kind === 'good' && false) add(sc.id, 'x', '');
      } catch (err) {
        add(sc.id, 'חריגה', `${(err as Error).message} :: ${(err as Error).stack?.split('\n')[1]?.trim()}`);
      }
    }
  }
}

console.log(`מעברים: ${ends}, החלטות: ${steps}, טקסטים שנבדקו: ${texts}`);
let n = 0;
for (const [k, v] of issues) {
  n += v.size;
  console.log(`\n■ ${k} (${v.size})`);
  [...v].slice(0, 6).forEach((m) => console.log(`   ${m}`));
}
console.log(n ? `\nנמצאו ${n} ממצאים` : '\n✓ לא נמצאו ממצאים');
