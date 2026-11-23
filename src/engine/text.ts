/** החלפת {{משתנה}} בערכי הווריאציה */
export function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? `{{${k}}}`);
}

/** עוטף מספרים/מזהים לטיני בתוך עברית בבידוד כיווניות (LRI…PDI) לתצוגה תקינה בקבצי טקסט */
export function isolateLtr(text: string): string {
  return text.replace(/([0-9][0-9:\-/.]*[0-9]|[0-9])/g, '⁦$1⁩');
}

export function clockLabel(start: string, minutes: number): string {
  const [h, m] = start.split(':').map(Number);
  const total = Math.floor(h * 60 + m + minutes);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function durationLabel(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m} דק׳ ${r} שנ׳` : `${r} שנ׳`;
}
