import { DEFAULT_RADIO, type RadioSettings } from '../config/stations';

export interface Settings {
  master: number;
  speech: number;
  radio: number;
  ambience: number;
  sfx: number;
  muted: boolean;
  textOnly: boolean;
  tts: boolean;
  lightsAnim: boolean;
  reduceMotion: 'system' | 'on' | 'off';
  textSize: 'normal' | 'large';
  showHotspotLabels: boolean;
  /** תחנה ואות קריאה (ברירת מחדל: שמות בדויים) */
  station: RadioSettings;
  /** הקול של השוטר בזירה (השחקן): גבר או אישה */
  officerVoice?: 'm' | 'f';
  /** בחר כבר דמות (מסך הבחירה לא מוצג שוב אוטומטית) */
  officerChosen?: boolean;
  /** גרסת כיול השמע (להעברת הגדרות ישנות לברירות המחדל החדשות) */
  audioV?: number;
}

export const DEFAULT_SETTINGS: Settings = {
  master: 0.8,
  speech: 1,
  radio: 1,
  ambience: 0.3,
  sfx: 0.7,
  muted: false,
  textOnly: false,
  tts: false,
  lightsAnim: false,
  reduceMotion: 'system',
  textSize: 'normal',
  showHotspotLabels: true,
  station: DEFAULT_RADIO,
  officerVoice: 'm',
  audioV: 2,
};

const KEY = 'siyur.settings.v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      // כיול 2: רעשי הרקע היו חזקים מדי מול הקשר – מי שלא שינה את העוצמות מקבל את החדשות
      if (!s.audioV) {
        if (s.ambience === 0.5) s.ambience = DEFAULT_SETTINGS.ambience;
        if (s.radio === 0.8) s.radio = DEFAULT_SETTINGS.radio;
        s.audioV = 2;
      }
      return { ...DEFAULT_SETTINGS, ...s, station: { ...DEFAULT_RADIO, ...(s.station ?? {}) } };
    }
  } catch {
    /* אחסון חסום – ממשיכים עם ברירת מחדל */
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(s: Settings): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function prefersReducedMotion(s: Settings): boolean {
  if (s.reduceMotion === 'on') return true;
  if (s.reduceMotion === 'off') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
