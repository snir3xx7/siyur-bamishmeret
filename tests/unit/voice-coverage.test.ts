import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chatterLines, DEFAULT_RADIO, headRouteText, radioProfile, callTo, DISTRICTS } from '../../src/config/stations';
import { RECIPIENT_BODIES, radioPlayerText, radioVars, withProcedure } from '../../src/engine/procedure';
import { fill } from '../../src/engine/text';
import type { Line, Scenario } from '../../src/engine/types';
import { voiceKey } from '../../src/audio/voiceKey';

const idx = JSON.parse(readFileSync('public/scenarios/index.json', 'utf8')).scenarios as { id: string; file: string }[];
const radioIdx = JSON.parse(readFileSync('public/audio/radio/index.json', 'utf8')) as Record<string, string>;
const RADIO = new Set(['player', 'dispatch', 'head', 'duty']);

/** כמו בהשמעה במשחק: קטע מלא, או פתיחה לפי תחנה + גוף ההודעה */
function voiced(vl: Record<string, string>, sp: string, raw: string, text: string, backup?: string): boolean {
  if (vl[voiceKey(sp, raw)] || vl[voiceKey(sp, text)]) return true;
  const t0 = text.replace(/^מוקד:\s*/, '');
  if (backup && t0.startsWith(`${backup} `)) return !!vl[voiceKey(sp, t0.slice(backup.length + 1))] && !!radioIdx[voiceKey(sp, backup)];
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
          if (!voiced(vl, l.speaker, l.text, text, vars.backup)) missing.push(`${l.speaker}: ${text}`);
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

  it('דיבור השוטר בזירה – בקול שוטר ושוטרת, בכל התרחישים', () => {
    const missing: string[] = [];
    for (const e of idx) {
      const sc = withProcedure(JSON.parse(readFileSync(`public/scenarios/${e.file}`, 'utf8')));
      const vl = sc.media.voiceLines ?? {};
      for (const v of sc.variants) for (const h of sc.hotspots) for (const c of h.choices) {
        if (c.id.startsWith('rp-')) continue;
        for (const l of [...(c.lines ?? []), ...(c.branches ?? []).flatMap((b) => b.lines)]) {
          if (l.speaker !== 'player' || l.text.startsWith('{{to')) continue;
          const t = fill(l.text, v.vars);
          for (const sp of ['officer', 'officerF']) if (!vl[voiceKey(sp, t)]) missing.push(`${e.id} ${sp}: ${t}`);
        }
      }
    }
    expect(missing.slice(0, 5)).toEqual([]);
  });

  it('שוטרת: פתיחות השידור שלה בכל התחנות', () => {
    const missing: string[] = [];
    for (const d of DISTRICTS) for (const s of d.stations) for (const n of [...s.patrols, ...s.municipal]) {
      const q = radioProfile({ ...DEFAULT_RADIO, mode: 'station', district: d.id, station: s.id, unit: n }, 'סייר 23');
      for (const t of [callTo(q, 'center'), callTo(q, 'head'), callTo(q, 'duty')]) if (!radioIdx[voiceKey('playerF', t)]) missing.push(t);
    }
    expect(missing.slice(0, 5)).toEqual([]);
  });

  it('תשובות 401 ו־11 לעדכון – מוקלטות', () => {
    for (const [who, b] of Object.entries(RECIPIENT_BODIES)) for (const body of Object.values(b)) expect(radioIdx[voiceKey(who, body)], `${who}: ${body}`).toBeTruthy();
    expect(radioIdx[voiceKey('duty', 'סבא 402 מ11')]).toBeTruthy();
  });

  it('שידור של הניידת בנוהל: „מוקד, כאן סייר 23.” → „{{toCenter}}, …”', () => {
    expect(radioPlayerText('מוקד, כאן סייר 23. נמסר משהו על נפגעים?', true)).toBe('{{toCenter}}, נמסר משהו על נפגעים?');
    expect(radioPlayerText('מוקד, מה מצב הפצוע?', false)).toBe('{{toCenter}}, מה מצב הפצוע?');
    expect(radioPlayerText('איפה ראו אותו לאחרונה?', true)).toBe('{{toCenter}}, איפה ראו אותו לאחרונה?');
    expect(radioPlayerText('ערב טוב, אני מצוות הסיור.', false)).toBe('ערב טוב, אני מצוות הסיור.');
    expect(radioPlayerText('קיבלתי.', true)).toBe('קיבלתי.');
  });
});

describe('קול לכל שורה – כל דובר, כל גרסה, כל תרחיש', () => {
  const p = radioProfile({ ...DEFAULT_RADIO, mode: 'station', district: 'center', station: 'kfar-saba', unit: '402' }, 'סייר 23');
  for (const e of idx) {
    it(`${e.id}: אין שורה בלי הקלטה`, () => {
      const sc = withProcedure(JSON.parse(readFileSync(`public/scenarios/${e.file}`, 'utf8')));
      const vl = sc.media.voiceLines ?? {};
      const all: Line[] = [...sc.dispatch.lines, ...sc.arrivalLines];
      const push = (ls?: Line[]) => ls && all.push(...ls);
      for (const f of sc.dispatch.followUps) { push(f.lines); f.branches?.forEach((b) => push(b.lines)); }
      for (const h of sc.hotspots) for (const c of h.choices) { push(c.lines); c.branches?.forEach((b) => push(b.lines)); }
      for (const ev of sc.events ?? []) { push(ev.lines); ev.branches?.forEach((b) => push(b.lines)); }
      for (const r of sc.update.responses) push(r.lines);
      const missing: string[] = [];
      for (const v of sc.variants) {
        const vars = { ...radioVars(sc, { unit: p.unit, head: p.head, centerCall: p.centerCall }), ...v.vars };
        for (const l of all) {
          const text = fill(l.text, vars);
          // הוראות במה בלבד – אין מה להשמיע (גם במשחק הן לא חוסמות את שאר השורות)
          if (!/[א-ת]/.test(text.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').replace(/^[^:]{0,20}:\s*/, ''))) continue;
          const sp = l.speaker === 'player' && !l.text.startsWith('{{to') && text !== 'קיבלתי.' ? 'officer' : l.speaker;
          if (!voiced(vl, sp, l.text, text, vars.backup)) missing.push(`${sp}: ${text.slice(0, 70)}`);
        }
      }
      expect([...new Set(missing)]).toEqual([]);
    });
  }
});
