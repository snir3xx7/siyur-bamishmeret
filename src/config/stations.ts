import prefixSpeech from './prefix-speech.json';

/**
 * מחוזות, תחנות ואותות קריאה.
 *
 * ברירת המחדל היא תחנה בדויה („קריית אלון”) – בלי שמות אמיתיים. אפשר לבחור תחנה מוגדרת
 * או להזין תחנה משלכם; אותות הקריאה והשמות כאן הם הגדרות תרגול שהמדריך יכול לעדכן,
 * ואינם מסמך רשמי.
 *
 * שרשרת הקשר: אזרח → משל״ט המחוז (פותח אירוע) → משגר → ראש המשמרת (401) → הניידת בשטח.
 */
export interface StationDef {
  id: string;
  name: string;
  /** קידומת אות הקריאה, למשל „סבא” → „סבא 402” */
  prefix: string;
  dutyOfficer: string;
  shiftHead: string;
  patrols: string[];
  /** שיטור עירוני בקידומת התחנה (למשל „סבא 301”) */
  municipal: string[];
  /** שיטור עירוני בעיר אחרת שבתחום התחנה, בקידומת משלה (למשל „רעננה 301” בתחנת כפר סבא) */
  cityUnits?: { prefix: string; city: string; nums: string[] }[];
  /** אות קריאה משוער (לא נמסר במפורש) – המדריך יכול לתקן */
  approx?: boolean;
}

export interface DistrictDef {
  id: string;
  name: string;
  /** שם המשל״ט, למשל „משל״ט מרכז” */
  center: string;
  /** איך פונים למשל״ט בקשר, למשל „מרכז” */
  centerCall: string;
  stations: StationDef[];
}

const MUNI = ['301', '302'];
const std = (id: string, name: string, prefix: string, approx = true, extra: Partial<StationDef> = {}): StationDef => ({
  id, name, prefix, dutyOfficer: '11', shiftHead: '401', patrols: ['402', '403', '404', '405'], municipal: [], ...(approx ? { approx } : {}), ...extra,
});
const city = (prefix: string, c: string) => ({ prefix, city: c, nums: MUNI });

/**
 * 7 מחוזות ושמות המשל״ט בקשר – לפי מה שנמסר. תחנות מחוז מרכז – לפי מה שנמסר (קידומות ושיטור עירוני).
 * שאר התחנות: לפי מחקר ברשת; הקידומת לפי שם העיר – הערכה, מסומנת „משוער”, לתיקון המדריך.
 * מבנה בכל תחנה: 11 קצין תורן, 401 ראש משמרת, 402–405 ניידות סיור; שיטור עירוני 301–302 לפי עיר.
 */
export const DISTRICTS: DistrictDef[] = [
  { id: 'center', name: 'מחוז מרכז', center: 'משל״ט מרכז', centerCall: 'מרכז', stations: [
    std('kfar-saba', 'תחנת כפר סבא', 'סבא', false, { municipal: MUNI, cityUnits: [city('רעננה', 'רעננה')] }),
    std('netanya', 'תחנת נתניה', 'נתניה', false),
    std('petah-tikva', 'תחנת פתח תקווה', 'פ״ת', false),
    std('rishon', 'תחנת ראשון לציון', 'ראשון', false),
    std('rehovot', 'תחנת רחובות', 'רחובות', false),
    std('yavne', 'תחנת יבנה', 'יבנה', false),
    std('ramla', 'תחנת רמלה', 'רמלה', false),
    std('lod', 'תחנת לוד', 'לוד', false),
    std('masubim', 'תחנת מסובים', 'מסובים', false),
    std('glilot', 'תחנת גלילות', 'גלילות', false),
    std('rosh-haayin', 'תחנת ראש העין', 'עין', false),
    std('kafr-qasim', 'תחנת כפר קאסם', 'קאסם', false),
    std('tira', 'תחנת טירה', 'טירה', false),
    std('tayibe', 'תחנת טייבה', 'טייבה', false, { cityUnits: [city('קל', 'קלנסווה')] }),
    std('sdot', 'תחנת שדות', 'שדות', false, { cityUnits: [city('קדימה', 'קדימה־צורן'), city('כפר', 'כפר יונה')] }),
  ] },
  { id: 'tel-aviv', name: 'מחוז תל אביב', center: 'משל״ט אביב', centerCall: 'אביב', stations: [
    std('yarkon', 'מרחב ירקון', 'ירקון'), std('ayalon', 'מרחב איילון', 'איילון'), std('yafo', 'מרחב יפו', 'יפו'), std('dan', 'מרחב דן', 'דן'),
  ] },
  { id: 'south', name: 'מחוז דרום', center: 'משל״ט דרום', centerCall: 'דרום', stations: [
    std('beer-sheva', 'תחנת באר שבע', 'באר שבע'), std('ashdod', 'תחנת אשדוד', 'אשדוד'), std('ashkelon', 'תחנת אשקלון', 'אשקלון'), std('eilat', 'תחנת אילת', 'אילת'), std('dimona', 'תחנת דימונה', 'דימונה'),
  ] },
  { id: 'coast', name: 'מחוז חוף', center: 'משל״ט חוף', centerCall: 'חוף', stations: [
    std('haifa', 'תחנת חיפה', 'חיפה'), std('hadera', 'תחנת חדרה', 'חדרה'), std('krayot', 'תחנת קריות', 'קריות'),
  ] },
  { id: 'north', name: 'מחוז צפון', center: 'משל״ט צפון', centerCall: 'צפון', stations: [
    std('nazareth', 'תחנת נצרת', 'נצרת'), std('tiberias', 'תחנת טבריה', 'טבריה'), std('karmiel', 'תחנת כרמיאל', 'כרמיאל'), std('akko', 'תחנת עכו', 'עכו'),
  ] },
  { id: 'jerusalem', name: 'מחוז ירושלים', center: 'משל״ט ים', centerCall: 'ים', stations: [
    std('moriah', 'מרחב מוריה', 'מוריה'), std('shalem', 'מרחב שלם', 'שלם'), std('david', 'מרחב דוד', 'דוד'), std('beit-shemesh', 'תחנת בית שמש', 'בית שמש'),
  ] },
  { id: 'judea-samaria', name: 'מחוז ש״י', center: 'משל״ט שי', centerCall: 'שי', stations: [
    std('ariel', 'תחנת אריאל', 'אריאל'), std('binyamin', 'תחנת בנימין', 'בנימין'), std('hebron', 'תחנת חברון', 'חברון'),
  ] },
];

/** קידומות מקוצרות בכתב – ואיך הן נשמעות בקשר (למשחק ולכלי הקריינות) */
export const PREFIX_SPEECH: Record<string, string> = prefixSpeech;

export interface RadioSettings {
  /** 'fictional' = שמות בדויים מהתרחיש; 'station' = תחנה מוגדרת; 'custom' = תחנה שהוזנה ידנית */
  mode: 'fictional' | 'station' | 'custom';
  district: string;
  station: string;
  customName: string;
  customPrefix: string;
  /** אות הקריאה של הניידת שלך (מספר בלבד) */
  unit: string;
  /** שיטור עירוני בעיר אחרת בתחום התחנה – הקידומת שלה (למשל „רעננה”) */
  unitPrefix?: string;
}

export const DEFAULT_RADIO: RadioSettings = { mode: 'fictional', district: 'center', station: 'kfar-saba', customName: '', customPrefix: '', unit: '402' };

export interface RadioProfile {
  real: boolean;
  /** השחקנית בחרה „שוטרת” – פנייה בלשון נקבה */
  fem?: boolean;
  /** אות הקריאה המלא של השחקן */
  unit: string;
  /** ראש המשמרת שמנתב את האירועים */
  head: string;
  /** המשל״ט או המוקד */
  center: string;
  dutyOfficer: string;
  stationName: string;
  districtName: string;
  /** איך פונים למשל״ט בקשר („מרכז”) */
  centerCall: string;
  /** מספרים בלבד – כך מדברים בקשר בתוך התחנה: „401 מ402” */
  unitNum: string;
  headNum: string;
  dutyNum: string;
}

/** מי מקבל את השידור בעדכון: ראש המשמרת, המשל״ט או הקצין התורן */
export type RadioTo = 'head' | 'center' | 'duty';

export function stationOf(r: RadioSettings): { district?: DistrictDef; station?: StationDef } {
  const district = DISTRICTS.find((d) => d.id === r.district);
  if (r.mode === 'custom') {
    const prefix = r.customPrefix.trim() || 'תחנה';
    return { district, station: { ...std('custom', r.customName.trim() || `תחנת ${prefix}`, prefix), id: 'custom' } };
  }
  return { district, station: district?.stations.find((s) => s.id === r.station) };
}

/** פרופיל הקשר למשחק. בלי בחירה – השמות הבדויים מהתרחיש */
export function radioProfile(r: RadioSettings | undefined, fictionalUnit: string): RadioProfile {
  const { district, station } = r && r.mode !== 'fictional' ? stationOf(r) : {};
  if (!r || !district || !station) {
    return { real: false, unit: fictionalUnit, head: 'מוקד אלון', center: 'מוקד אלון', dutyOfficer: 'קצין תורן', stationName: 'קריית אלון (בדוי)', districtName: '',
      centerCall: 'מוקד אלון', unitNum: fictionalUnit, headNum: 'מוקד אלון', dutyNum: 'קצין תורן' };
  }
  const call = (n: string) => `${station.prefix} ${n}`;
  const own = r.unitPrefix && station.cityUnits?.some((c) => c.prefix === r.unitPrefix) ? r.unitPrefix : station.prefix;
  return {
    real: true,
    unit: `${own} ${r.unit || station.patrols[0]}`,
    head: call(station.shiftHead),
    center: district.center,
    dutyOfficer: call(station.dutyOfficer),
    stationName: station.name,
    districtName: district.name,
    centerCall: district.centerCall,
    unitNum: r.unit || station.patrols[0],
    headNum: station.shiftHead,
    dutyNum: station.dutyOfficer,
  };
}

/** פתיחת שידור בנוהל: „למי מ־מי” (בתוך התחנה מספרים בלבד; למשל״ט – שם המשל״ט) */
export function callTo(p: RadioProfile, to: RadioTo): string {
  // מבנה: „למי מ־מי” – השולח תמיד באות קריאה מלא („מסבא 402”)
  if (!p.real) return `${to === 'duty' ? 'קצין תורן' : 'מוקד אלון'} מ${p.unit}`;
  const dest = to === 'center' ? p.centerCall : to === 'duty' ? p.dutyNum : p.headNum;
  return `${dest} מ${p.unit}`;
}
export const RADIO_TO_LABEL: Record<RadioTo, string> = { center: 'המשל״ט', head: 'ראש המשמרת (401)', duty: 'הקצין התורן (11)' };

/**
 * התאמת טקסט מהתרחיש לפרופיל: „סייר 23” → אות הקריאה שלך, „מוקד אלון” → המשל״ט של המחוז
 * (הניידת עובדת באירוע מול המשל״ט), ו„מוקד:” בתחילת שורה → שם המשל״ט.
 */
export function radioize(text: string, p: RadioProfile): string {
  if (!p.real) return text;
  return text
    .replace(/סייר \d+, כאן מוקד אלון\./g, `${p.unit} מ${p.centerCall}.`)
    .replace(/סייר \d+/g, p.unit)
    .replace(/כאן מוקד אלון/g, `כאן ${p.center}`)
    .replace(/מוקד אלון/g, p.center)
    .replace(/^מוקד:/, `${p.center}:`);
}

/** בקשת ראש המשמרת מהמשל״ט בפתיחת האירוע: „מרכז מסבא 401, תעבירי את האירוע ל־402.” */
export function headRouteText(p: RadioProfile): { open: string; body: string } {
  return { open: `${p.centerCall} מ${p.head}`, body: `תעבירי את האירוע ל${p.unitNum}.` };
}

/** אותות הקריאה שאפשר לבחור לניידת שלך בתחנה */
export function unitOptions(r: RadioSettings): { value: string; label: string }[] {
  const { station } = stationOf(r);
  if (!station) return [];
  return [
    ...station.patrols.map((n) => ({ value: n, label: `${station.prefix} ${n} – ניידת סיור` })),
    ...station.municipal.map((n) => ({ value: n, label: `${station.prefix} ${n} – שיטור עירוני` })),
    ...(station.cityUnits ?? []).flatMap((c) => c.nums.map((n) => ({ value: `${c.prefix}|${n}`, label: `${c.prefix} ${n} – שיטור עירוני ${c.city}` }))),
  ];
}

/** בחירת יחידה מהרשימה: „402” או „רעננה|301” → מספר וקידומת */
export function parseUnit(v: string): { unit: string; unitPrefix?: string } {
  const [a, b] = v.split('|');
  return b ? { unit: b, unitPrefix: a } : { unit: a, unitPrefix: undefined };
}

/** הפרופיל של משחק שכבר התחיל: לפי אותות הקריאה שנשמרו בהגדרות המשחק, אחרת לפי ההגדרות הנוכחיות */
export function gameProfile(config: { radio?: GameRadio }, r: RadioSettings | undefined, fictionalUnit: string): RadioProfile {
  const cur = radioProfile(r, fictionalUnit);
  if (!config.radio) return { ...radioProfile(undefined, fictionalUnit) };
  const c = config.radio;
  const num = (full: string) => full.split(' ').at(-1) ?? full;
  return {
    ...cur, real: true, unit: c.unit, head: c.head, center: c.center,
    centerCall: c.centerCall ?? cur.centerCall, unitNum: num(c.unit), headNum: num(c.head), dutyNum: c.dutyNum ?? cur.dutyNum,
    dutyOfficer: c.duty ?? cur.dutyOfficer,
  };
}

/** מה שנשמר בהגדרות המשחק (ובשמירה) כדי שהקשר יישאר עקבי גם אם ההגדרות משתנות */
export interface GameRadio { unit: string; head: string; center: string; centerCall?: string; duty?: string; dutyNum?: string }
export const toGameRadio = (p: RadioProfile): GameRadio => ({ unit: p.unit, head: p.head, center: p.center, centerCall: p.centerCall, duty: p.dutyOfficer, dutyNum: p.dutyNum });

/** שידור רקע: מה מוצג, ואיך הוא מושמע (פתיחה לפי התחנה + גוף ההודעה, בקול הדובר) */
export interface ChatterLine {
  text: string;
  /** פתיחת השידור („מרכז מסבא 403”) */
  open: string;
  /** גוף ההודעה – זהה בכל התחנות, מוקלט פעם אחת */
  body: string;
  /** הקול: unitB / unitC (ניידות אחרות), dispatch (המשל״ט), head (401), duty (11) */
  who: 'unitB' | 'unitC' | 'dispatch' | 'head' | 'duty';
}

/** גופי ההודעות של תעבורת הרקע (משותפים לכל התחנות, גם לכלי הקריינות) */
export const CHATTER_BODIES: { body: string; who: ChatterLine['who'] }[] = [
  { body: 'סיימתי באירוע ברחוב הרימון, פנוי.', who: 'unitB' },
  { body: 'גש לרחוב הנרקיס 12, אזעקה ברכב חונה.', who: 'dispatch' },
  { body: 'קיבלתי, בדרך.', who: 'unitC' },
  { body: 'רכב לבן מסוג מסחרי עזב בפראות את צומת הזית לכיוון צפון. מי שמזהה – מדווח, לא מתקרב לבד.', who: 'dispatch' },
  { body: 'אני בעצירת רכב בשדרות הזית, הכול תקין, ממשיך.', who: 'unitB' },
  { body: 'עדכן אותי כשנסגרים האירועים הפתוחים.', who: 'duty' },
  { body: 'מבקש הפסקת התרעננות בתחנה, עשר דקות.', who: 'unitB' },
  { body: 'חיובי.', who: 'head' },
];

/** הניידות האחרות בתחנה (לא אתה): שלוש הראשונות משתתפות בתעבורת הרקע */
export function otherUnits(p: RadioProfile): [string, string, string] {
  if (!p.real) return ['סייר 12', 'סייר 31', 'סייר 40'];
  const prefix = p.head.split(' ').slice(0, -1).join(' ');
  const own = p.unit.startsWith(`${prefix} `) ? p.unit.split(' ').at(-1) : undefined;
  const o = ['403', '404', '405', '302', '402'].filter((n) => n !== own).slice(0, 3).map((n) => `${prefix} ${n}`);
  return [o[0], o[1], o[2]];
}

/** תעבורת קשר של ניידות אחרות בתחנה – רקע בלבד, לא משפיע על התרחיש. בנוהל: „למי מ־מי, מה” */
export function chatterLines(p: RadioProfile): ChatterLine[] {
  const [a, b, c] = otherUnits(p);
  const ctr = p.real ? p.centerCall : 'מוקד אלון';
  const head = p.real ? p.headNum : 'מוקד אלון';
  const duty = p.real ? p.dutyOfficer : 'קצין תורן';
  const opens = [`${ctr} מ${a}`, `${b} מ${ctr}`, `${ctr} מ${b}`, `לכל הניידות מ${ctr}`, `${ctr} מ${c}`, `${head} מ${duty}`, `${head} מ${a}`, `${a} מ${head}`];
  return CHATTER_BODIES.map((x, i) => ({ ...x, open: opens[i], text: `${opens[i]}, ${x.body}` }));
}

