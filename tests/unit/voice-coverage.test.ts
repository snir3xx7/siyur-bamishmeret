import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chatterLines, DEFAULT_RADIO, headRouteText, radioProfile, callTo, DISTRICTS } from '../../src/config/stations';
import { radioPlayerText, radioVars, withProcedure } from '../../src/engine/procedure';
import { fill } from '../../src/engine/text';
import type { Line, Scenario } from '../../src/engine/types';
import { voiceKey } from '../../src/audio/voiceKey';

const idx = JSON.parse(readFileSync('public/scenarios/index.json', 'utf8')).scenarios as { id: string; file: string }[];
const radioIdx = JSON.parse(readFileSync('public/audio/radio/index.json', 'utf8')) as Record<string, string>;
const RADIO = new Set(['player', 'dispatch', 'head', 'duty']);

/** כמו בהשמעה במשחק: קטע מלא, או פתיחה לפי תחנה + גוף ההודעה */
function voiced(vl: Record<string, string>, sp: string, raw: string, text: string): boolean {
  if (vl[voiceKey(sp, raw)] || vl[voiceKey(sp, text)]) return true;
  const i = text.indexOf(', ');
  return i > 0 && !!vl[voiceKey(sp, text.slice(i + 2))] && !!radioIdx[voiceKey(sp, text.slice(0, i))];
}

function radioLines(sc: Scenario): Line[] {
  const L: Line[] = [];
  const add = (ls?: Line[], all = false) => ls?.forEach((l) => RADIO.has(l.speaker) && (all || l.speaker !== 'player' || l.text.startsWith('{{to')) && L.push(l));
  for (const f of sc.dispatch.followUps) {
    add(f.lines, true);
    f.branches?.forEach((b) => add(b.lines, true));
  }
  for (const h of sc.hotspots) for (const c of h.choices) {
    add(c.lines, c.id.startsWith('rp-'));
    c.branches?.forEach((b) => add(b.lines, c.id.startsWith('rp-')));
  }
  for (const e of sc.events ?? []) {
    add(e.lines);
    e.branches?.forEach((b) => add(b.lines));
  }
  return L;
}

describe('קול לכל שידור בקשר (כפר סבא, ניידת 402)', () => {
  const p = radioProfile({ ...DEFAULT_RADIO, mode: 'station', district: 'center', station: 'kfar-saba', unit: '402' }, 'סייר 23');
  for (const e of idx) {
    it(`${e.id}: כל השידורים מוקלטים`, () => {
      const sc = withProcedure(JSON.parse(readFileSync(`public/scenarios/${e.file}`, 'utf8')));
      const vl = sc.media.voiceLines ?? {};
      const missing: string[] = [];
      for (const v of sc.variants) {
        const vars = { ...radioVars(sc, { unit: p.unit, head: p.head, centerCall: p.centerCall }), ...v.vars };
        for (const l of radioLines(sc)) {
          const text = fill(l.text, vars);
          if (!voiced(vl, l.speaker, l.text, text)) missing.push(`${l.speaker}: ${text}`);
        }
      }
      expect([...new Set(missing)]).toEqual([]);
    });
  }

  it('פתיחת אירוע ופתיחות לכל נמען – בכל התחנות', () => {
    const missing: string[] = [];
    for (const d of DISTRICTS) for (const s of d.stations) for (const n of [...s.patrols, ...s.municipal]) {
      const q = radioProfile({ ...DEFAULT_RADIO, mode: 'station', district: d.id, station: s.id, unit: n }, 'סייר 23');
      const r = headRouteText(q);
      const need: [string, string][] = [['head', r.open], ['head', r.body], ['dispatch', `${q.unit} מ${q.centerCall}`],
        ['player', callTo(q, 'center')], ['player', callTo(q, 'head')], ['player', callTo(q, 'duty')]];
      for (const l of chatterLines(q)) need.push([l.who, l.open], [l.who, l.body]);
      for (const [sp, t] of need) if (!radioIdx[voiceKey(sp, t)]) missing.push(`${s.id}/${n} ${sp}: ${t}`);
    }
    expect(missing.slice(0, 10)).toEqual([]);
  });

  it('שידור של הניידת בנוהל: „מוקד, כאן סייר 23.” → „{{toCenter}}, …”', () => {
    expect(radioPlayerText('מוקד, כאן סייר 23. נמסר משהו על נפגעים?', true)).toBe('{{toCenter}}, נמסר משהו על נפגעים?');
    expect(radioPlayerText('מוקד, מה מצב הפצוע?', false)).toBe('{{toCenter}}, מה מצב הפצוע?');
    expect(radioPlayerText('איפה ראו אותו לאחרונה?', true)).toBe('{{toCenter}}, איפה ראו אותו לאחרונה?');
    expect(radioPlayerText('ערב טוב, אני מצוות הסיור.', false)).toBe('ערב טוב, אני מצוות הסיור.');
    expect(radioPlayerText('קיבלתי.', true)).toBe('קיבלתי.');
  });
});
