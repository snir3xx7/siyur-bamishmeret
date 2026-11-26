/**
 * בדיקת כיסוי הקלטות מלאה: כל שורה בכל תרחיש, בכל גרסה, בשני מצבי הקשר (בדוי / תחנה),
 * ולשחקן – גם שוטר וגם שוטרת. כמו ההשמעה במשחק: קטע מלא, או פתיחה לפי תחנה + גוף ההודעה.
 * הרצה: npx vite-node scripts/voice-audit.ts  (יוצא בקוד 1 אם חסר משהו)
 */
import { readFileSync } from 'node:fs';
import { DEFAULT_RADIO, radioProfile } from '../src/config/stations';
import { radioVars, withProcedure } from '../src/engine/procedure';
import { fill } from '../src/engine/text';
import { voiceKey } from '../src/audio/voiceKey';
import type { Line, Scenario } from '../src/engine/types';

const idx = JSON.parse(readFileSync('public/scenarios/index.json', 'utf8')).scenarios as { id: string; file: string }[];
const radioIdx = JSON.parse(readFileSync('public/audio/radio/index.json', 'utf8')) as Record<string, string>;
const silent = (t: string) => !/[א-ת]/.test(t.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').replace(/^[^:]{0,20}:\s*/, ''));

type Row = { scenario: string; who: string; lines: number; missing: string[] };
const rows: Row[] = [];
const station = radioProfile({ ...DEFAULT_RADIO, mode: 'station', district: 'center', station: 'kfar-saba', unit: '402' }, 'סייר 23');

for (const e of idx) {
  const sc = withProcedure(JSON.parse(readFileSync(`public/scenarios/${e.file}`, 'utf8')) as Scenario);
  const vl = sc.media.voiceLines ?? {};
  const has = (sp: string, t: string) => !!vl[voiceKey(sp, t)];
  // כל השורות, עם סימון אם הן שידור בקשר של השחקן
  const all: { l: Line; radio: boolean }[] = [];
  const push = (ls: Line[] | undefined, radio: boolean) => ls?.forEach((l) => all.push({ l, radio: radio || l.text.startsWith('{{to') }));
  push(sc.dispatch.lines, false);
  push(sc.arrivalLines, false);
  for (const f of sc.dispatch.followUps) { push(f.lines, true); f.branches?.forEach((b) => push(b.lines, true)); }
  for (const h of sc.hotspots) for (const c of h.choices) { const r = c.id.startsWith('rp-'); push(c.lines, r); c.branches?.forEach((b) => push(b.lines, r)); }
  for (const ev of sc.events ?? []) { push(ev.lines, false); ev.branches?.forEach((b) => push(b.lines, false)); }
  for (const p of sc.pressure ?? []) push(p.expire.lines, false);
  for (const r of sc.update.responses) push(r.lines, false);
  for (const el of sc.update.elements) if (el.id !== 'rp-open') all.push({ l: { speaker: 'player', text: el.text }, radio: true });

  const by = new Map<string, Row>();
  const row = (who: string) => by.get(who) ?? (by.set(who, { scenario: e.id, who, lines: 0, missing: [] }), by.get(who)!);
  for (const mode of ['fictional', 'station'] as const) {
    for (const v of sc.variants) {
      const vars = { ...radioVars(sc, mode === 'station' ? { unit: station.unit, head: station.head, centerCall: station.centerCall } : undefined), ...v.vars };
      for (const { l, radio } of all) {
        const text = fill(l.text, vars);
        if (silent(text)) continue;
        const speakers = l.speaker === 'player' ? (radio ? ['player', 'playerF'] : ['officer', 'officerF']) : [l.speaker];
        for (const sp of speakers) {
          const r = row(sp === 'officer' || sp === 'player' ? 'שוטר' : sp === 'officerF' || sp === 'playerF' ? 'שוטרת' : ['dispatch', 'head', 'duty', 'center'].includes(sp) ? 'קשר (משל״ט/401/11)' : sp === 'narrator' ? 'קריין' : 'אזרחים');
          r.lines++;
          // כמו במשחק: קטע מלא; או אות קריאה של תגבור + המשך; או פתיחה בנוהל + גוף
          const raw = l.text;
          let ok = has(sp, raw) || has(sp, text);
          const t0 = text.replace(/^מוקד:\s*/, '');
          if (!ok && vars.backup && t0.startsWith(`${vars.backup} `)) ok = has(sp, t0.slice(vars.backup.length + 1)) && !!radioIdx[voiceKey(sp, vars.backup)];
          const i = text.indexOf(', ');
          if (!ok && i > 0) ok = has(sp, text.slice(i + 2)) && (!!radioIdx[voiceKey(sp, text.slice(0, i))] || !!radioIdx[voiceKey(sp === 'playerF' ? 'player' : sp, text.slice(0, i))]);
          if (!ok && sp === 'playerF') ok = has('player', raw) || has('player', text); // נפילה לקול השוטר
          if (!ok) r.missing.push(`[${mode}/${v.id}] ${sp}: ${text.slice(0, 80)}`);
        }
      }
    }
  }
  rows.push(...by.values());
}

let bad = 0;
const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - s.length));
for (const r of rows) {
  const miss = [...new Set(r.missing)];
  bad += miss.length;
  console.log(`${pad(r.scenario, 18)} ${pad(r.who, 20)} ${String(r.lines).padStart(4)} שורות  ${miss.length ? `✗ חסרות ${miss.length}` : '✓'}`);
  for (const m of miss.slice(0, 6)) console.log(`      ${m}`);
}
console.log(bad ? `\nחסרות ${bad} הקלטות` : '\n✓ לכל שורה יש הקלטה – בכל תרחיש, גרסה, מצב קשר ומין השוטר');
process.exit(bad ? 1 : 0);
