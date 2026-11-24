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
}

export interface DistrictDef {
  id: string;
  name: string;
  /** שם המשל״ט בקשר, למשל „משל״ט מרכז” */
  center: string;
  stations: StationDef[];
}

const std = (id: string, name: string, prefix: string, municipal = true): StationDef => ({
  id, name, prefix, dutyOfficer: '11', shiftHead: '401', patrols: ['402', '403', '404', '405'], municipal: municipal ? ['301', '302'] : [],
});

export const DISTRICTS: DistrictDef[] = [
  { id: 'center', name: 'מחוז מרכז', center: 'משל״ט מרכז', stations: [std('kfar-saba', 'תחנת כפר סבא', 'סבא'), std('netanya', 'תחנת נתניה', 'נתניה')] },
  { id: 'tel-aviv', name: 'מחוז תל אביב', center: 'משל״ט אביב', stations: [] },
  { id: 'south', name: 'מחוז דרום', center: 'משל״ט דרום', stations: [] },
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
}

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
    return { real: false, unit: fictionalUnit, head: 'מוקד אלון', center: 'מוקד אלון', dutyOfficer: 'קצין תורן', stationName: 'קריית אלון (בדוי)', districtName: '' };
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
  };
}

/**
 * התאמת טקסט מהתרחיש לפרופיל: „סייר 23” → אות הקריאה שלך, „מוקד אלון” → ראש המשמרת,
 * ו„מוקד:” בתחילת שורה → שם הדובר בקשר.
 */
export function radioize(text: string, p: RadioProfile): string {
  if (!p.real) return text;
  return text
    .replace(/סייר \d+/g, p.unit)
    .replace(/כאן מוקד אלון/g, `כאן ${p.head}`)
    .replace(/מוקד אלון/g, p.head)
    .replace(/^מוקד:/, `${p.head}:`);
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
