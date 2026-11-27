import data from './feminize.json';

const WORDS = (data as { words: Record<string, string> }).words;
const RE = new RegExp(`(^|[.,!?–]\\s+|ו?אני\\s+(?:לא\\s+|גם\\s+|רק\\s+)?)(${Object.keys(WORDS).join('|')})(?=[\\s.,!?–]|$)`, 'g');

/** שורת השוטר בלשון נקבה (לשוטרת): רק פעלים בגוף ראשון – בתחילת משפט או אחרי „אני” */
export function feminize(text: string): string {
  return text.replace(RE, (_, pre: string, w: string) => `${pre}${WORDS[w] ?? w}`);
}

import addr from './address-f.json';
const PAIRS = (addr as { pairs: [string, string][] }).pairs;

/** פנייה אל השוטרת: שורות של המשל״ט, 401, 11 והדמויות בלשון נקבה (ביטויים שלמים בלבד) */
export function addressF(text: string): string {
  let t = text;
  for (const [a, b] of PAIRS) t = t.split(a).join(b);
  return t;
}
