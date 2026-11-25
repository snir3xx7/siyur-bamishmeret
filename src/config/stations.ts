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
  municipal: string[];
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

const std = (id: string, name: string, prefix: string, approx = true): StationDef => ({
  id, name, prefix, dutyOfficer: '11', shiftHead: '401', patrols: ['402', '403', '404', '405'], municipal: ['301', '302'], ...(approx ? { approx } : {}),
});

/**
 * כפר סבא ונתניה – לפי מה שנמסר. שאר התחנות: אותו מבנה (11 קצין תורן, 401 ראש משמרת, 402–405 ניידות,
 * 301–302 שיטור עירוני) וקידומת לפי שם העיר – הערכה הגיונית, מסומנת „משוער”, לתיקון המדריך.
 */
export const DISTRICTS: DistrictDef[] = [
  { id: 'center', name: 'מחוז מרכז', center: 'משל״ט מרכז', centerCall: 'מרכז', stations: [
    std('kfar-saba', 'תחנת כפר סבא', 'סבא', false), std('netanya', 'תחנת נתניה', 'נתניה', false),
    std('raanana', 'תחנת רעננה', 'רעננה'), std('herzliya', 'תחנת הרצליה', 'הרצליה'), std('petah-tikva', 'תחנת פתח תקווה', 'פתח תקווה'),
    std('rishon', 'תחנת ראשון לציון', 'ראשון'), std('rehovot', 'תחנת רחובות', 'רחובות'), std('ramla', 'תחנת רמלה', 'רמלה'), std('lod', 'תחנת לוד', 'לוד'),
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
  { id: 'jerusalem', name: 'מחוז ירושלים', center: 'משל״ט ירושלים', centerCall: 'ירושלים', stations: [
    std('moriah', 'מרחב מוריה', 'מוריה'), std('shalem', 'מרחב שלם', 'שלם'), std('david', 'מרחב דוד', 'דוד'), std('beit-shemesh', 'תחנת בית שמש', 'בית שמש'),
  ] },
];

export interface RadioSettings {
  /** 'fictional' = שמות בדויים מהתרחיש; 'station' = תחנה מוגדרת; 'custom' = תחנה שהוזנה ידנית */
  mode: 'fictional' | 'station' | 'custom';
  district: string;
  station: string;
  customName: string;
  customPrefix: string;
  /** אות הקריאה של הניידת שלך (מספר בלבד) */
  unit: string;
}

export const DEFAULT_RADIO: RadioSettings = { mode: 'fictional', district: 'center', station: 'kfar-saba', customName: '', customPrefix: '', unit: '402' };

export interface RadioProfile {
  real: boolean;
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
  return {
    real: true,
    unit: call(r.unit || station.patrols[0]),
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
  ];
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

/** תעבורת קשר של ניידות אחרות בתחנה – רקע בלבד, לא משפיע על התרחיש */
export function chatterLines(p: RadioProfile): string[] {
  const prefix = p.real ? p.unit.split(' ').slice(0, -1).join(' ') : '';
  const own = p.unit.split(' ').at(-1);
  const others = p.real ? ['403', '404', '405', '302'].filter((n) => n !== own).map((n) => `${prefix} ${n}`) : ['סייר 12', 'סייר 31', 'סייר 40'];
  const [a, b, c] = others;
  const ctr = p.real ? p.centerCall : 'מוקד אלון';
  const head = p.head;
  const duty = p.real ? p.dutyOfficer : 'הקצין התורן';
  return [
    `${ctr} מ${a}: סיימתי באירוע ברחוב הרימון, פנוי.`,
    `${b} מ${ctr}: גש לרחוב הנרקיס 12, אזעקה ברכב חונה.`,
    `${ctr} מ${b}: קיבלתי, בדרך.`,
    `${ctr} לכל הניידות: רכב לבן מסוג מסחרי עזב בפראות את צומת הזית לכיוון צפון. מי שמזהה – מדווח, לא מתקרב לבד.`,
    `${ctr} מ${c}: אני בעצירת רכב בשדרות הזית, הכול תקין, ממשיך.`,
    `${head} מ${duty}: עדכן אותי כשנסגרים האירועים הפתוחים.`,
    `${head} מ${a}: מבקש הפסקת התרעננות בתחנה, עשר דקות.`,
    `${a} מ${head}: חיובי.`,
  ];
}
