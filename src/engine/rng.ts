/** מחולל פסאודו-אקראי דטרמיניסטי (mulberry32) – אותו זרע ⇒ אותה גרסת תרחיש. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickWeighted<T extends { weight?: number }>(items: T[], rnd: () => number): T {
  const total = items.reduce((s, i) => s + (i.weight ?? 1), 0);
  let r = rnd() * total;
  for (const item of items) {
    r -= item.weight ?? 1;
    if (r < 0) return item;
  }
  return items[items.length - 1];
}

export function randomSeed(): number {
  return 1 + Math.floor(Math.random() * 999_998);
}

/** זרע תקין: מספר שלם 1..999999 */
export function parseSeed(v: string | null | undefined): number | null {
  if (!v || !/^\d{1,6}$/.test(v)) return null;
  const n = Number(v);
  return n >= 1 && n <= 999_999 ? n : null;
}
