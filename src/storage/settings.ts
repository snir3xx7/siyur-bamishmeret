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
}

export const DEFAULT_SETTINGS: Settings = {
  master: 0.8,
  speech: 1,
  radio: 0.8,
  ambience: 0.5,
  sfx: 0.7,
  muted: false,
  textOnly: false,
  tts: false,
  lightsAnim: false,
  reduceMotion: 'system',
  textSize: 'normal',
  showHotspotLabels: true,
  station: DEFAULT_RADIO,
};

const KEY = 'siyur.settings.v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
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
