/** מפתח קטע קריינות לשורה: FNV-1a של "דובר|טקסט" (UTF-8) – זהה ל־scripts/voice-blue.py */
export function voiceKey(speaker: string, text: string): string {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(`${speaker}|${text}`)) {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** הודעת המשל״ט לראש המשמרת (בלי אות קריאה) – זהה ל־center_text ב־scripts/voice-blue.py */
export function centerText(sc: { title: string; dispatch: { incident: string }; location: { name: string } }): string {
  return `נפתח אירוע ${sc.dispatch.incident} – ${sc.title}, ${sc.location.name}. מעביר אליך לטיפול.`;
}

/** פתיחות שידור לפי תחנה („401 מסבא 402”) – אינדקס משותף לכל התרחישים */
let radioIndex: Promise<Record<string, string>> | null = null;
export function loadRadioIndex(): Promise<Record<string, string>> {
  radioIndex ??= fetch(`${import.meta.env.BASE_URL}audio/radio/index.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  return radioIndex;
}
