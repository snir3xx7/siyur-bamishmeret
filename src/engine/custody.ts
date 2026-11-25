/**
 * סטטוס מעורב: חופשי ← מעוכב ← עצור ← הועבר לתחנה / שוחרר.
 * שכבה כללית שנוספת לתרחישים שיש בהם חשוד (`custody` בקובץ התרחיש):
 * הודעה על זכויות, חיפוש מוגבל לפני הכנסה לניידת, החלטת מעצר, אזיקה, הוצאה מהזירה ושחרור.
 * מבוסס על עקרונות מחוק סדר הדין הפלילי (סמכויות אכיפה – מעצרים) ומנוהל הקראת זכויות (בלמ"ס).
 * לא משנה את ציון התרחיש – נבדק בתחקיר בכרטיס נפרד, כמו נוהל הקשר.
 */
import type { Choice, Cond, GameState, Hotspot, Line, Scenario } from './types';

export interface CustodyDef {
  /** מזהה הדמות */
  char: string;
  /** הנקודה בזירה של הדמות */
  hotspot: string;
  /** במה חשוד, בלשון „חשוד ב…” */
  offence: string;
  /** עילה למעצר (מעבר לעיכוב) – אם חסרה, מעצר הוא טעות סמכות */
  arrestOk?: Cond;
  /** מסוכנות או חשש להימלטות – מצדיקים אזיקה */
  risk?: Cond;
  /** קטין – נוסח זכויות מותאם (התייעצות עם הורה) */
  minor?: boolean;
}

const F = (c: string, k: string) => `cs_${k}_${c}`;

/** מוסיף את בחירות המעצר לנקודה של החשוד, ומסתיר אותה אחרי שהוצא מהזירה */
export function addCustody(sc: Scenario, hotspots: Hotspot[]): Hotspot[] {
  const defs = sc.custody ?? [];
  if (!defs.length) return hotspots;
  return hotspots.map((h) => {
    const d = defs.find((x) => x.hotspot === h.id);
    if (!d) return h;
    const name = sc.characters.find((c) => c.id === d.char)?.name.split(' ')[0] ?? 'החשוד';
    const held: Cond = { flag: 'detained' };
    const gone: Cond = { any: [{ flag: F(d.char, 'removed') }, { flag: F(d.char, 'released') }] };
    const live = (...c: Cond[]): Cond => ({ all: [held, { not: gone }, ...c] });
    const say = (text: string): Line => ({ speaker: 'player', text });
    const reply = (text: string): Line => ({ speaker: d.char, text });
    const choices: Choice[] = [
      {
        id: `cs-rights-${d.char}`,
        label: `להודיע ל${name} על זכויותיו: במה הוא חשוד, זכות השתיקה וזכות להיוועץ בעורך דין${d.minor ? ', ושמותר לו להתייעץ עם הורה' : ''}`,
        when: live({ not: { flag: F(d.char, 'rights') } }),
        lines: [
          say(`${name}, אתה חשוד ב${d.offence}. כל מה שתאמר יכול לשמש נגדך. יש לך זכות לא לומר דבר, אבל שתיקה עלולה לחזק את הראיות נגדך. יש לך זכות להיוועץ בעורך דין, ותוכל ליצור איתו קשר כשתגיע לתחנה.`),
          ...(d.minor ? [say('יש לך גם זכות להתייעץ לפני החקירה עם אחד ההורים או עם קרוב משפחה בגיר, ושהוא יהיה איתך בחקירה.')] : []),
          reply('הבנתי. אני לא אומר כלום בלי עורך דין.'),
        ],
        effects: { set: { [F(d.char, 'rights')]: true }, minutes: 1 },
      },
      {
        id: `cs-search-${d.char}`,
        label: `חיפוש מוגבל על ${name} לפני הכנסה לניידת: לשאול קודם אם יש עליו משהו אסור, כיסים וחפצים, ואז מישוש על הבגדים`,
        when: live({ not: { flag: F(d.char, 'searched') } }),
        lines: [
          say(`${name}, לפני שאתה נכנס לניידת אני עורך עליך חיפוש. יש עליך משהו חד או אסור? תגיד לי עכשיו.`),
          reply('רק מפתחות, טלפון וארנק.'),
          { speaker: 'narrator', text: 'בכיסים: מפתחות, טלפון וארנק. במישוש על הבגדים לא נמצא דבר נוסף. החיפוש נעשה בידי שוטר מאותו מין, בצד ולא מול הקהל.' },
        ],
        effects: { set: { [F(d.char, 'searched')]: true }, minutes: 2 },
      },
      {
        id: `cs-strip-${d.char}`,
        label: `חיפוש יסודי על ${name} כאן במקום, כולל הורדת החולצה והמכנסיים`,
        when: live({ not: { flag: F(d.char, 'searched') } }),
        lines: [
          say('תוריד את החולצה והמכנסיים. אני בודק אותך כאן.'),
          reply('מה?! מול כל האנשים? זה השפלה!'),
        ],
        effects: { set: { [F(d.char, 'searched')]: true, [F(d.char, 'strip')]: true }, minutes: 2 },
      },
      {
        id: `cs-arrest-${d.char}`,
        label: `להודיע ל${name} שהוא עצור, על מה, ושהוא מועבר לתחנה`,
        when: live({ not: { flag: F(d.char, 'arrested') } }),
        lines: [
          say(`${name}, אתה עצור בחשד ל${d.offence}. אתה מועבר עכשיו לתחנה.`),
          reply('עצור? על מה בדיוק? אני לא מאמין.'),
        ],
        effects: { set: { [F(d.char, 'arrested')]: true }, minutes: 1 },
      },
      {
        id: `cs-cuff-${d.char}`,
        label: `לאזוק את ${name} – ידיים מאחורי הגב, ולוודא שהאזיקים לא לוחצים`,
        when: live({ flag: F(d.char, 'arrested') }, { not: { flag: F(d.char, 'cuffs') } }),
        lines: [say(`${name}, ידיים מאחורי הגב. אני אוזק אותך – תגיד לי אם זה לוחץ.`), reply('בסדר, בסדר. לא צריך להדק.')],
        effects: { set: { [F(d.char, 'cuffs')]: 'yes' }, minutes: 1 },
      },
      {
        id: `cs-nocuff-${d.char}`,
        label: `לא לאזוק את ${name} – הוא רגוע ומשתף פעולה; ללוות אותו צמוד לניידת`,
        when: live({ flag: F(d.char, 'arrested') }, { not: { flag: F(d.char, 'cuffs') } }),
        lines: [say('אני לא אוזק אותך כל עוד אתה משתף פעולה. תלך לידי עד הניידת.'), reply('אוקיי. אני לא עושה בעיות.')],
        effects: { set: { [F(d.char, 'cuffs')]: 'no' }, minutes: 1 },
      },
      {
        id: `cs-remove-${d.char}`,
        label: `להעביר את ${name} לניידת התגבור ולשלוח אותו לתחנה`,
        when: live({ flag: F(d.char, 'searched') }),
        lines: [{ speaker: 'narrator', text: `${name} נכנס לניידת התגבור, והניידת יוצאת לתחנה. בזירה נשארים רק אתה והמעורבים האחרים.` }],
        effects: { set: { [F(d.char, 'removed')]: true }, minutes: 2 },
      },
      {
        id: `cs-release-${d.char}`,
        label: `לשחרר את ${name} – הבירור הסתיים ואין עילה להמשיך לעכב`,
        when: live({ not: { flag: F(d.char, 'arrested') } }),
        lines: [say(`${name}, הבירור הסתיים. אתה משוחרר.`), reply('סוף סוף.')],
        effects: { set: { [F(d.char, 'released')]: true }, minutes: 1 },
      },
    ];
    // אחרי שהחשוד הוצא מהזירה – הנקודה שלו נעלמת
    const removed: Cond = { flag: F(d.char, 'removed') };
    return { ...h, when: h.when ? { all: [h.when, { not: removed }] } : { not: removed }, choices: [...h.choices, ...choices] };
  });
}

/** תג הסטטוס של מעורב, לתצוגה ליד שמו */
export function custodyStatus(sc: Scenario, st: GameState, char: string): string | undefined {
  if (!sc.custody?.some((d) => d.char === char)) return undefined;
  const f = (k: string) => st.flags[F(char, k)];
  if (f('removed')) return f('arrested') ? 'עצור · הועבר לתחנה' : 'מעוכב · הועבר לתחנה';
  if (f('released')) return 'שוחרר';
  if (f('arrested')) return f('cuffs') === 'yes' ? 'עצור · אזוק' : 'עצור';
  if (st.flags.detained) return 'מעוכב';
  return undefined;
}

/** בדיקת הטיפול בחשוד – כרטיס בתחקיר, לא חלק מהציון */
export function custodyReport(st: GameState, sc: Scenario, evalCond: (c: Cond) => boolean): { label: string; ok: boolean; detail: string }[] {
  const out: { label: string; ok: boolean; detail: string }[] = [];
  for (const d of sc.custody ?? []) {
    const f = (k: string) => st.flags[F(d.char, k)];
    const name = sc.characters.find((c) => c.id === d.char)?.name.split(' ')[0] ?? 'החשוד';
    if (!st.flags.detained) continue;
    const handled = f('removed') || f('released');
    out.push({
      label: `החלטה לגבי ${name}`,
      ok: !!handled,
      detail: handled ? (f('removed') ? `${name} הועבר לתחנה בניידת התגבור.` : `${name} שוחרר כשהעילה חלפה.`) : `${name} נשאר מעוכב בזירה בלי החלטה. עיכוב מוגבל בזמן ובתכלית: מעבירים לתחנה, עוצרים או משחררים.`,
    });
    if (f('arrested') || f('removed')) {
      out.push({
        label: 'הודעה על הזכויות',
        ok: !!f('rights'),
        detail: f('rights') ? 'הודעת לחשוד במה הוא חשוד, על זכות השתיקה ועל הזכות לעורך דין.' : 'בעיכוב או מעצר – אחרי ההודעה על הסיבה, מודיעים לחשוד על זכויותיו (אלא אם זה עלול לגרום להעלמת ראיות).',
      });
    }
    if (f('removed')) {
      out.push({
        label: 'חיפוש לפני הכנסה לניידת',
        ok: !!f('searched') && !f('strip'),
        detail: !f('searched') ? 'החשוד הוכנס לניידת בלי חיפוש. חיפוש על גוף עצור נועד לשמור עליו, על השוטרים ועל המשמורת.' : f('strip') ? 'החיפוש כלל הורדת בגדים מול הציבור. בשטח, ככלל, החיפוש לא מגיע לבגדים התחתונים ולא נעשה בפרהסיה.' : 'חיפוש מדורג: שאלה, כיסים וחפצים, מישוש – בצד ובידי שוטר מאותו מין.',
      });
    } else if (f('strip')) {
      out.push({ label: 'חיפוש מידתי', ok: false, detail: 'החיפוש כלל הורדת בגדים מול הציבור. בשטח, ככלל, החיפוש לא מגיע לבגדים התחתונים ולא נעשה בפרהסיה.' });
    }
    if (f('arrested')) {
      const okArrest = d.arrestOk ? evalCond(d.arrestOk) : true;
      out.push({
        label: 'עילה למעצר',
        ok: okArrest,
        detail: okArrest ? 'למעצר הייתה עילה – חשד שנתמך במה שאספת בזירה.' : 'מעצר דורש עילה ממשית. כאן עדיין לא נאסף מספיק כדי להצדיק מעצר – אפשר היה להמשיך בעיכוב לבירור.',
      });
      const risk = d.risk ? evalCond(d.risk) : false;
      const cuffs = f('cuffs');
      out.push({
        label: 'החלטה על אזיקה',
        ok: !!cuffs && (cuffs === 'yes') === risk,
        detail: !cuffs
          ? 'לא קיבלת החלטה על אזיקה. זו החלטה שנשקלת בכל מעצר: מסוכנות, חשש להימלטות והתנהגות העצור.'
          : risk
            ? cuffs === 'yes' ? 'אזקת עצור שהתנהג באלימות או בחוסר שקט – מוצדק, ובדקת שהאזיקים לא לוחצים.' : 'העצור התנהג בתוקפנות; ללא אזיקה הסיכון לך ולסביבה גבוה.'
            : cuffs === 'no' ? 'העצור היה רגוע ומשתף פעולה – ויתור על אזיקה שומר על כבודו בלי סיכון.' : 'העצור היה רגוע ומשתף פעולה. אזיקה במקום ציבורי פוגעת בכבודו – נשקלת לפי מסוכנות וחשש להימלטות.',
      });
    }
  }
  return out;
}
