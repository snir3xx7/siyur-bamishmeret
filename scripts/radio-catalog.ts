/**
 * ריכוז כל אותות הקריאה והשידורים במשחק (כולל תשובות) → docs/radio/catalog.md
 * הרצה: npx vite-node scripts/radio-catalog.ts
 * הדוגמאות מוצגות לפי כפר סבא, ניידת 402 (משל״ט מרכז). בכל תחנה אחרת – אותו נוסח עם אותות הקריאה שלה.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { CHATTER_BODIES, chatterLines, DISTRICTS, headRouteText, radioize, radioProfile, callTo, DEFAULT_RADIO } from '../src/config/stations';
import { radioVars, withProcedure } from '../src/engine/procedure';
import { fill } from '../src/engine/text';
import type { Line, Scenario } from '../src/engine/types';

const idx = JSON.parse(readFileSync('public/scenarios/index.json', 'utf8')).scenarios as { id: string; file: string }[];
const radioIdx = JSON.parse(readFileSync('public/audio/radio/index.json', 'utf8')) as Record<string, string>;
const scenarios = idx.map((e) => withProcedure(JSON.parse(readFileSync(`public/scenarios/${e.file}`, 'utf8')) as Scenario));

const p = radioProfile({ ...DEFAULT_RADIO, mode: 'station', district: 'center', station: 'kfar-saba', unit: '402' }, 'סייר 23');
const RADIO_SPEAKERS = new Set(['player', 'dispatch', 'center', 'head', 'duty']);
const WHO: Record<string, string> = { player: 'אתה (סבא 402)', dispatch: 'משל״ט מרכז', center: 'משל״ט מרכז', head: 'סבא 401', duty: 'סבא 11' };
const out: string[] = [];
const w = (s = '') => out.push(s);
const esc = (s: string) => s.replace(/\|/g, '\\|');

w('# אותות קריאה ושידורי קשר – „סיור במשמרת”');
w();
w('ריכוז כל אותות הקריאה והשידורים שיש במשחק, כולל התשובות. נוצר אוטומטית מהקוד (`npx vite-node scripts/radio-catalog.ts`).');
w('הדוגמאות לפי **כפר סבא, ניידת 402, משל״ט מרכז**. בכל תחנה – אותו נוסח עם אותות הקריאה שלה. עקרונות תרגול בלבד, לא מסמך נוהל רשמי.');
w();
w('## מבנה שידור');
w();
w('- **למי – ממי – מה:** „מרכז מסבא 402, …”. השולח תמיד באות קריאה מלא.');
w('- **באירוע עובדים מול המשל״ט:** פרטים, שאלות השלמה, קבלה, הגעה, תמונת מצב, פנוי/עסוק, סיום, מד״א, כב״ה, גורם מוסמך.');
w('- **401 (ראש המשמרת):** בפתיחת האירוע מבקש מהמשל״ט להעביר את האירוע לניידת; פונים אליו לתגבור ולהחלפת ניידת.');
w('- **11 (קצין תורן):** מעדכנים באירוע משמעותי – נפגע, עיכוב, פינוי, חפץ חשוד, התנגדות.');
w('- **מי שקיבל – מאשר:** „סבא 402, קיבלתי.”');
w();

// —— אותות קריאה לפי מחוז ותחנה
w('## אותות קריאה לפי מחוז ותחנה');
w();
w('בכל תחנה: **11** קצין תורן · **401** ראש משמרת · **402–405** ניידות סיור · **301–302** שיטור עירוני. „משוער” = לפי אותו היגיון, לבדיקת המדריך.');
w();
for (const d of DISTRICTS) {
  w(`### ${d.name} – ${d.center} (בקשר: „${d.centerCall}”)`);
  w();
  w('| תחנה | קידומת | קצין תורן | ראש משמרת | ניידות סיור | שיטור עירוני | |');
  w('|---|---|---|---|---|---|---|');
  for (const s of d.stations) {
    const u = (ns: string[]) => ns.map((n) => `${s.prefix} ${n}`).join(', ');
    w(`| ${s.name} | ${s.prefix} | ${s.prefix} ${s.dutyOfficer} | ${s.prefix} ${s.shiftHead} | ${u(s.patrols)} | ${u(s.municipal)} | ${s.approx ? 'משוער' : ''} |`);
  }
  w();
}
w('**מצב בדוי (ברירת מחדל):** הניידת „סייר NN” (לפי התרחיש), המוקד „מוקד אלון”, „קצין תורן”.');
w();

// —— פתיחת אירוע
const r = headRouteText(p);
w('## פתיחת אירוע (בכל תרחיש)');
w();
w('| # | מי | שידור |');
w('|---|---|---|');
w(`| 1 | סבא 401 → המשל״ט | „${r.open}, ${r.body}” |`);
w(`| 2 | המשל״ט → אתה | „${p.unit} מ${p.centerCall}. …פרטי האירוע… אשר קבלה.” |`);
w(`| 3 | אתה → המשל״ט | „${callTo(p, 'center')}, קיבלתי את האירוע, יוצא.” |`);
w(`| 4 | המשל״ט → אתה | „${p.unit}, קיבלתי.” |`);
w();

// —— שידורים לנמענים
w('## פתיחת שידור לפי נמען (חלון „שידור בקשר”)');
w();
w('| נמען | פתיחה | תשובה |');
w('|---|---|---|');
w(`| המשל״ט (ברירת מחדל) | „${callTo(p, 'center')}, …” | בקול המשל״ט |`);
w(`| ראש המשמרת | „${callTo(p, 'head')}, …” | בקול 401 |`);
w(`| קצין תורן | „${callTo(p, 'duty')}, …” | בקול 11 |`);
w();

// —— לפי תרחיש
const vars = (sc: Scenario) => ({ ...radioVars(sc, { unit: p.unit, head: p.head, centerCall: p.centerCall }), ...(sc.variants[0]?.vars ?? {}) });
const show = (sc: Scenario, l: Line) => radioize(fill(l.text, vars(sc)), p);
const lineRow = (sc: Scenario, l: Line) => {
  const who = WHO[l.speaker] ?? l.speaker;
  const t = show(sc, l);
  return `${who}: „${esc(t.startsWith(`${who}:`) ? t.slice(who.length + 1).trim() : t)}”`;
};
w('## שידורים בכל תרחיש (כולל תשובות)');
w();
w('גרסה ראשונה של כל תרחיש. שורות שמשתנות בין גרסאות מוצגות לפי הגרסה הראשונה.');
w();
for (const sc of scenarios) {
  w(`### ${sc.title}`);
  w();
  w('| מצב | שידור ותשובה |');
  w('|---|---|');
  const disp = sc.dispatch.lines.filter((l) => RADIO_SPEAKERS.has(l.speaker));
  if (disp.length) w(`| קבלת האירוע | ${disp.map((l) => lineRow(sc, l)).join('<br>')} |`);
  for (const f of sc.dispatch.followUps) {
    const ls = [...(f.lines ?? []), ...(f.branches?.[0]?.lines ?? [])].filter((l) => RADIO_SPEAKERS.has(l.speaker));
    if (ls.length) w(`| ${esc(fill(f.label, vars(sc)))} | ${ls.map((l) => lineRow(sc, l)).join('<br>')} |`);
  }
  // בזירה: רק שידורים בקשר (לא שיחה פנים אל פנים) – שורת שחקן בנוהל קשר, או תשובה של גורם בקשר
  const onAir = (l: Line) => l.speaker !== 'player' || l.text.startsWith('{{to');
  for (const h of sc.hotspots) {
    for (const c of h.choices) {
      const all = [...(c.lines ?? []), ...(c.branches?.[0]?.lines ?? [])];
      if (!all.some((l) => RADIO_SPEAKERS.has(l.speaker) && (l.speaker !== 'player' ? true : onAir(l)))) continue;
      if (!c.id.startsWith('rp-') && !all.some((l) => l.speaker !== 'player' && RADIO_SPEAKERS.has(l.speaker))) continue;
      const ls = all.filter((l) => RADIO_SPEAKERS.has(l.speaker) && onAir(l));
      if (ls.length) w(`| ${esc(fill(c.label, vars(sc)))} | ${ls.map((l) => lineRow(sc, l)).join('<br>')} |`);
    }
  }
  for (const e of sc.events ?? []) {
    const ls = [...e.lines, ...(e.branches?.[0]?.lines ?? [])].filter((l) => RADIO_SPEAKERS.has(l.speaker));
    if (ls.length) w(`| אירוע: ${esc(fill(e.title, vars(sc)))} | ${ls.map((l) => lineRow(sc, l)).join('<br>')} |`);
  }
  for (const rsp of sc.update.responses) {
    const ls = rsp.lines.filter((l) => RADIO_SPEAKERS.has(l.speaker));
    if (ls.length) w(`| תשובה לעדכון | ${ls.map((l) => lineRow(sc, l)).join('<br>')} |`);
  }
  w();
}

// —— תעבורת רקע
w('## תעבורת קשר ברקע (ניידות אחרות)');
w();
w('מושמעת בזירה כל כ־38 שניות, בעוצמה נמוכה, רק כשאין שידור אחר באוויר. לא משפיעה על התרגיל.');
w();
const WHO_BG: Record<string, string> = { unitB: 'ניידת אחרת', unitC: 'ניידת אחרת', dispatch: 'המשל״ט', head: '401', duty: '11' };
w('| קול | שידור |');
w('|---|---|');
for (const l of chatterLines(p)) w(`| ${WHO_BG[l.who]} | „${esc(l.text)}” |`);
w();

// —— כיסוי קול
const total = Object.keys(radioIdx).length;
w('## קול');
w();
w(`- **פתיחות שידור מוקלטות (כל התחנות):** ${total} קטעים.`);
w(`- **גופי הודעות ברקע:** ${CHATTER_BODIES.length}.`);
w('- **קולות:** המשל״ט – אישה · 401 – גבר · 11 – גבר מבוגר · אתה – גבר · ניידות אחרות – שני קולות גבריים. כולם באפקט מכשיר קשר דיגיטלי.');
w();

mkdirSync('docs/radio', { recursive: true });
writeFileSync('docs/radio/catalog.md', out.join('\n') + '\n');
console.log('docs/radio/catalog.md', out.length, 'lines');
