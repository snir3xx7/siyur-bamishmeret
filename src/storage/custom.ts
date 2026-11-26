/**
 * תרחישים שהמדריך ערך („התרחישים שלי”): נשמרים בדפדפן בלבד, מזהה מתחיל ב־my-.
 * כל תרחיש הוא עותק של תרחיש קיים (תמונות, דמויות וקולות מהמקור) עם טקסטים ששונו.
 * שורה שהטקסט שלה שונה מאבדת את ההקלטה – ומוקראת בקול הדפדפן אם הופעל.
 */
import type { CatalogEntry, Scenario } from '../engine/types';

const KEY = 'siyur.custom.v1';
export const isCustomId = (id: string) => id.startsWith('my-');

export function listCustom(): Scenario[] {
  try {
    const m = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Scenario>;
    return Object.values(m);
  } catch {
    return [];
  }
}

export function getCustom(id: string): Scenario | undefined {
  return listCustom().find((s) => s.id === id);
}

export function saveCustom(sc: Scenario) {
  const m = Object.fromEntries(listCustom().map((s) => [s.id, s]));
  m[sc.id] = sc;
  localStorage.setItem(KEY, JSON.stringify(m));
}

export function deleteCustom(id: string) {
  const m = Object.fromEntries(listCustom().filter((s) => s.id !== id).map((s) => [s.id, s]));
  localStorage.setItem(KEY, JSON.stringify(m));
}

export function customCatalog(): CatalogEntry[] {
  return listCustom().map((s) => ({
    id: s.id,
    file: '',
    version: s.version,
    title: s.title,
    category: 'התרחישים שלי',
    summary: s.summary,
    estimatedMinutes: s.estimatedMinutes,
    difficultyLabel: s.difficultyLabel,
    skills: s.skills,
    shifts: s.shifts,
  }));
}

/** עותק חדש מתרחיש קיים */
export function forkScenario(base: Scenario): Scenario {
  const n = listCustom().filter((s) => s.id.startsWith(`my-${base.id}`)).length + 1;
  const sc = JSON.parse(JSON.stringify(base)) as Scenario;
  sc.id = `my-${base.id}-${n}`;
  sc.title = `${base.title} (עותק ${n})`;
  sc.version = 1;
  return sc;
}
