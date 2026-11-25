/**
 * נוהל קשר – שכבה שנוספת לכל תרחיש בזמן הטעינה:
 * - אישור קבלת האירוע בנוהל („401, כאן 402, קיבלתי, יוצא. עבור.”)
 * - דיווח הגעה למקום
 * - פתיחה וסיום בנוהל בעדכונים למוקד
 * - ראש המשמרת קורא לך באמצע הטיפול („אתה פנוי?”) – צריך לענות נכון
 *
 * לא משנה את ציון התרחיש (100): מוצג בתחקיר כמדד נפרד „נוהל קשר”.
 */
import type { Choice, GameState, Hotspot, Line, Scenario, ScenarioEvent, UpdateElement } from './types';

const augmented = new WeakMap<Scenario, Scenario>();

export const PROC_IDS = ['rp-ack', 'rp-ack-short', 'rp-arrive', 'rp-busy-no', 'rp-busy-yes', 'rt-main', 'rt-side', 'fm-distance', 'fm-stop'];

/**
 * שידור של הניידת בנוהל: „מוקד, כאן סייר 23. …” / „מוקד, …” → „{{toCenter}}, …” („מרכז מסבא 402, …”).
 * בשלב קבלת הפרטים כל שאלה של השחקן היא שידור למשל״ט; בזירה – רק שורות שפונות ל„מוקד”.
 */
const MOKED = /^מוקד,\s*(?:כאן סייר \d+\.\s*)?/;
export function radioPlayerText(t: string, always: boolean): string {
  const m = t.match(MOKED);
  if (m) return `{{toCenter}}, ${t.slice(m[0].length)}`;
  if (always && !t.startsWith('{{') && t !== 'קיבלתי.') return `{{toCenter}}, ${t}`;
  return t;
}
function radioChoice(c: Choice, always: boolean): Choice {
  const fix = (ls?: Line[]) => ls?.map((l) => (l.speaker === 'player' ? { ...l, text: radioPlayerText(l.text, always) } : l));
  return { ...c, ...(c.lines ? { lines: fix(c.lines) } : {}), ...(c.branches ? { branches: c.branches.map((b) => ({ ...b, lines: fix(b.lines)! })) } : {}) };
}

export function withProcedure(sc: Scenario): Scenario {
  const hit = augmented.get(sc);
  if (hit) return hit;
  if (sc.hotspots.some((h) => h.choices.some((c) => c.id === 'rp-arrive'))) return sc;

  const followUps: Choice[] = [
    {
      id: 'rp-ack',
      label: 'לאשר קבלה בנוהל: „{{toCenter}}, קיבלתי את האירוע, יוצא.”',
      when: { not: { flag: 'rpAck' } },
      lines: [
        { speaker: 'player', text: '{{toCenter}}, קיבלתי את האירוע, יוצא.' },
        { speaker: 'dispatch', text: '{{unitShort}}, קיבלתי.' },
      ],
      effects: { set: { rpAck: 'good' }, minutes: 0 },
      report: 'אישור קבלת האירוע בקשר',
    },
    {
      id: 'rp-ack-short',
      label: 'לענות בקשר רק „קיבלתי”',
      when: { not: { flag: 'rpAck' } },
      lines: [
        { speaker: 'player', text: 'קיבלתי.' },
        { speaker: 'dispatch', text: '{{unitShort}}, לא ברור מי ענה. אשר בנוהל שאתה לוקח את האירוע.' },
      ],
      effects: { set: { rpAck: 'short' }, minutes: 0 },
    },
    {
      id: 'rt-main',
      label: 'מסלול: הציר הראשי (שדרות הזית) – קצר, אבל עלול להיות עמוס',
      when: { not: { flag: 'route' } },
      branches: [
        { when: { shift: ['morning'] }, lines: [{ speaker: 'narrator', text: 'בשדרות הזית פקק של שעת בוקר. הניידת מתקדמת לאט בין הרכבים.' }], effects: { set: { route: 'main', routeOk: false }, minutes: 6 } },
        { when: { shift: ['evening'] }, lines: [{ speaker: 'narrator', text: 'השדרה עמוסה מעט בשעת הערב, אבל זורמת.' }], effects: { set: { route: 'main', routeOk: true }, minutes: 2 } },
      ],
      lines: [{ speaker: 'narrator', text: 'השדרה ריקה בשעת הלילה. הדרך הקצרה היא גם המהירה.' }],
      effects: { set: { route: 'main', routeOk: true }, minutes: 0 },
      report: 'בחירת מסלול: הציר הראשי',
    },
    {
      id: 'rt-side',
      label: 'מסלול: דרך השכונה – ארוך יותר, בדרך כלל פנוי',
      when: { not: { flag: 'route' } },
      branches: [
        { when: { shift: ['morning'] }, lines: [{ speaker: 'narrator', text: 'עוקפים את הפקק בשדרה דרך רחובות השכונה. ארוך יותר – אבל זורם.' }], effects: { set: { route: 'side', routeOk: true }, minutes: 2 } },
      ],
      lines: [{ speaker: 'narrator', text: 'רחובות השכונה צרים ומפותלים. בשעה הזו השדרה הייתה פנויה – הדרך ארכה יותר.' }],
      effects: { set: { route: 'side', routeOk: false }, minutes: 3 },
      report: 'בחירת מסלול: דרך השכונה',
    },
  ];

  const sceneChoiceIds = sc.hotspots.flatMap((h) => h.choices.map((c) => c.id));
  const radioChoices: Choice[] = [
    {
      id: 'rp-arrive',
      label: 'לדווח הגעה: „{{toCenter}}, הגעתי למקום.”',
      lines: [
        { speaker: 'player', text: '{{toCenter}}, הגעתי למקום.' },
        { speaker: 'dispatch', text: '{{unitShort}}, קיבלתי. עדכן כשיש תמונת מצב.' },
      ],
      effects: { set: { rpArrive: true }, minutes: 0 },
      report: 'דיווח הגעה למקום בקשר',
    },
    {
      id: 'rp-busy-no',
      label: 'לענות: „{{toCenter}}, שלילי, עדיין בטיפול. אעדכן כשאתפנה.”',
      when: { all: [{ flag: 'ev:rp-busy' }, { not: { flag: 'rpBusy' } }] },
      lines: [
        { speaker: 'player', text: '{{toCenter}}, שלילי, עדיין בטיפול באירוע. אעדכן כשאתפנה.' },
        { speaker: 'dispatch', text: 'קיבלתי, מעבירה לניידת אחרת.' },
      ],
      effects: { set: { rpBusy: 'good' }, minutes: 0 },
      report: 'מענה לראש המשמרת: עדיין בטיפול',
    },
    {
      id: 'rp-busy-yes',
      label: 'לענות „חיובי, פנוי” ולהתכונן לעזוב',
      when: { all: [{ flag: 'ev:rp-busy' }, { not: { flag: 'rpBusy' } }] },
      lines: [
        { speaker: 'player', text: '{{toCenter}}, חיובי, פנוי.' },
        { speaker: 'dispatch', text: 'רגע – סיימת שם? המעורבים עדיין במקום לפי הדיווח שלך. תשלים קודם ותעדכן.' },
      ],
      effects: { set: { rpBusy: 'bad' }, minutes: 0, note: 'דיווח „פנוי” בזמן שהטיפול בזירה עוד לא הסתיים' },
    },
  ];

  let hotspots: Hotspot[];
  const radio = sc.hotspots.find((h) => h.kind === 'radio');
  if (radio) {
    hotspots = sc.hotspots.map((h) => (h === radio ? { ...h, choices: [...radioChoices, ...h.choices] } : h));
  } else {
    hotspots = [
      ...sc.hotspots,
      { id: 'h-radio', label: 'מכשיר הקשר', kind: 'radio', x: 8, y: 14, description: 'מכשיר הקשר האישי. לשליחת עדכון השתמש בכפתור „עדכון למוקד”.', choices: radioChoices },
    ];
  }

  // צופים שמצלמים בטלפון: מותר לצלם במרחב ציבורי; מבקשים לשמור מרחק ולא להפריע – לא דורשים להפסיק לצלם
  const filmers = sc.characters.filter((c) => c.id.startsWith('film'));
  if (filmers.length) {
    const f0 = filmers[0];
    const anyFilmer = filmers.length === 1 ? f0.when : { any: filmers.map((c) => c.when ?? { always: true as const }) };
    hotspots.push({
      id: 'h-filmers', label: 'צופים שמצלמים', kind: 'area', x: f0.x, y: Math.max(8, f0.y - 40),
      description: 'עוברים ושבים עומדים ומצלמים את האירוע בטלפון.',
      ...(anyFilmer ? { when: anyFilmer } : {}),
      choices: [
        {
          id: 'fm-distance', label: 'לפנות בנימוס: „מותר לצלם – אבל מאחורי הקו, ובלי להפריע לטיפול.”',
          lines: [
            { speaker: 'player', text: 'אתם יכולים לצלם, זה בסדר – רק תעמדו מאחורי הקו ואל תתקרבו למעורבים. אנחנו באמצע טיפול.' },
            { speaker: 'narrator', text: 'הצופים זזים כמה צעדים אחורה וממשיכים לצלם מרחוק. אף אחד לא מתווכח.' },
          ],
          effects: { set: { filmers: 'good' }, minutes: 0 },
          report: 'בקשה מהצופים לשמור מרחק ולא להפריע',
        },
        {
          id: 'fm-stop', label: 'לדרוש מהצופים להפסיק לצלם ולמחוק את הסרטון',
          lines: [
            { speaker: 'player', text: 'תפסיקו לצלם! ותמחקו את זה עכשיו!' },
            { speaker: 'narrator', text: 'אחד הצופים מרים את הטלפון גבוה יותר: „מותר לי לצלם ברחוב!” הוויכוח מושך עוד אנשים לזירה.' },
          ],
          effects: { set: { filmers: 'bad' }, minutes: 1, note: 'נדרש מצופים להפסיק לצלם ולמחוק – דרישה בלי סמכות שהגבירה את המתח' },
        },
      ],
    });
  }

  const busy: ScenarioEvent = {
    id: 'rp-busy',
    title: 'קריאה בקשר מהמשל״ט',
    when: { countChosen: { ids: sceneChoiceIds, gte: 5 } },
    lines: [{ speaker: 'dispatch', text: '{{centerToMe}}, אתה פנוי? יש אירוע נוסף באזור.' }],
    sfx: 'radio-chirp',
  };

  const elements: UpdateElement[] = [
    { id: 'rp-open', category: 'procedure', text: 'פתיחה בנוהל: למי ומ־מי' },
  ];

  const out: Scenario = {
    ...sc,
    dispatch: { ...sc.dispatch, followUps: [...followUps, ...sc.dispatch.followUps.map((c) => radioChoice(c, true))] },
    hotspots: hotspots.map((h) => ({ ...h, choices: h.choices.map((c) => radioChoice(c, false)) })),
    events: [...(sc.events ?? []), busy],
    update: { ...sc.update, categories: { procedure: 'נוהל קשר', ...sc.update.categories }, elements: [...elements, ...sc.update.elements] },
  };
  augmented.set(sc, out);
  return out;
}

export interface ProcItem {
  label: string;
  ok: boolean | null;
  detail: string;
}

/** מדד „נוהל קשר” לתחקיר (לא נכלל בציון) */
export function procedureReport(st: GameState, sc?: Scenario): { items: ProcItem[]; score: number; max: number } {
  const items: ProcItem[] = [];
  const ack = st.flags.rpAck;
  items.push({
    label: 'אישור קבלת האירוע',
    ok: ack === 'good',
    detail: ack === 'good' ? 'אישרת בנוהל: למי, מי מדבר, מה עושים, „עבור”.' : ack === 'short' ? 'ענית רק „קיבלתי” – בלי לזהות את עצמך. ראש המשמרת לא יודע מי לקח את האירוע.' : 'לא אישרת קבלה בקשר לפני היציאה.',
  });
  items.push({
    label: 'דיווח הגעה למקום',
    ok: !!st.flags.rpArrive,
    detail: st.flags.rpArrive ? 'דיווחת הגעה – ראש המשמרת יודע שאתה בזירה.' : 'לא דיווחת הגעה. דיווח קצר („הגעתי למקום”) מעדכן את כולם שהניידת בזירה.',
  });
  if (st.flags.route) {
    items.push({
      label: 'בחירת מסלול',
      ok: st.flags.routeOk === true,
      detail: st.flags.routeOk ? 'בחרת מסלול שמתאים לשעה – הגעת מהר.' : st.flags.route === 'main' ? 'בשעות הבוקר השדרה הראשית פקוקה; דרך השכונה הייתה מהירה יותר.' : 'בשעה הזו הציר הראשי היה פנוי ומהיר יותר.',
    });
  }
  if (st.flags.filmers) {
    items.push({
      label: 'התנהלות מול צופים מצלמים',
      ok: st.flags.filmers === 'good',
      detail: st.flags.filmers === 'good' ? 'ביקשת לשמור מרחק בלי לאסור צילום – הצופים התרחקו והטיפול נמשך.' : 'דרשת להפסיק לצלם ולמחוק. צילום במרחב ציבורי מותר; מה שאפשר לבקש הוא שמירת מרחק ואי־הפרעה.',
    });
  }
  // פנייה לגורם הנכון: בקשות לשירותים חיצוניים – למשל״ט
  const extIds = new Set((sc?.update.elements ?? []).filter((e) => e.category === 'assistance' && EXTERNAL.test(e.text)).map((e) => e.id));
  const extUps = st.updates.filter((u) => u.elements.some((id) => extIds.has(id)));
  if (extUps.length) {
    const ok = extUps.every((u) => !u.to || u.to === 'center');
    items.push({
      label: 'פנייה לגורם הנכון',
      ok,
      detail: ok ? 'בקשות לכוחות חיצוניים (מד״א, כב״ה, גורם מוסמך) נשלחו למשל״ט – הוא שמזמין אותם.' : 'ביקשת כוחות חיצוניים מראש המשמרת. את מד״א, כב״ה וגורמים מוסמכים מזמין המשל״ט – פנה אליו („מרכז מסבא 402, תזמני מד״א…”).',
    });
  }
  // אירוע משמעותי (עיכוב, פינוי, חפץ חשוד, נפגע) – עדכון לקצין התורן
  if (st.flags.detained || st.flags.evacuated || st.flags.expertCalled || st.flags.ems) {
    const ok = st.updates.some((u) => u.to === 'duty');
    items.push({
      label: 'עדכון הקצין התורן',
      ok,
      detail: ok ? 'עדכנת את הקצין התורן באירוע משמעותי.' : 'באירוע עם נפגע, עיכוב, פינוי או חפץ חשוד – מעדכנים גם את הקצין התורן (11).',
    });
  }
  const ups = st.updates.length;
  const opened = st.updates.filter((u) => u.elements.includes('rp-open')).length;
  items.push({
    label: 'פתיחה בנוהל בעדכונים',
    ok: ups ? opened === ups : null,
    detail: ups ? `${opened} מתוך ${ups} עדכונים נפתחו ב„למי, מי מדבר”.` : 'לא נשלחו עדכונים.',
  });
  if (st.flags['ev:rp-busy']) {
    const b = st.flags.rpBusy;
    items.push({
      label: 'מענה ל„אתה פנוי?”',
      ok: b === 'good',
      detail: b === 'good' ? 'ענית שאתה עדיין בטיפול – ראש המשמרת העביר את האירוע לניידת אחרת.' : b === 'bad' ? 'דיווחת „פנוי” באמצע הטיפול. ראש המשמרת עלול לשלוח אותך ולהשאיר את הזירה בלי מענה.' : 'לא ענית לראש המשמרת. קריאה בקשר דורשת מענה, גם כשאתה עסוק.',
    });
  }
  const scored = items.filter((i) => i.ok !== null);
  return { items, score: scored.filter((i) => i.ok).length, max: scored.length };
}

/** משתני הקשר לטקסטים ({{unitCall}}, {{headCall}}) */
export function radioVars(sc: Scenario, radio?: { unit: string; head: string; centerCall?: string }): Record<string, string> {
  // הניידת עובדת מול המשל״ט: „מרכז מסבא 402, …” / „סבא 402 ממרכז, …”; תשובה: „סבא 402, קיבלתי.”
  if (!radio) {
    const u = sc.dispatch.unit;
    return { unitCall: u, headCall: 'מוקד אלון', toCenter: `מוקד אלון מ${u}`, centerToMe: `${u} ממוקד אלון`, toHead: `מוקד אלון מ${u}`, headToMe: `${u} ממוקד אלון`, unitShort: u };
  }
  const h = radio.head.split(' ').at(-1) ?? radio.head;
  const c = radio.centerCall ?? 'מרכז';
  return { unitCall: radio.unit, headCall: radio.head, toCenter: `${c} מ${radio.unit}`, centerToMe: `${radio.unit} מ${c}`,
    toHead: `${h} מ${radio.unit}`, headToMe: `${radio.unit} מ${h}`, unitShort: radio.unit };
}

/** בקשות שעוברות דרך המשל״ט (שירותים חיצוניים וגורמים מוסמכים) */
const EXTERNAL = /מד״א|כב״ה|כיבוי|גורם מוסמך|גרר|פקח|חברת הגז|קווי האוטובוס|הנהלת השוק|לאתר|להפיץ|ניידות/;

export const isProcChoice = (id: string) => PROC_IDS.includes(id);

/** בדיקת הפנקס: אילו פרטים מזהים שהחניך פגש נרשמו בפנקס */
export function notebookCheck(sc: Scenario, st: GameState): { item: string; ok: boolean }[] {
  const text = (st.notebook ?? '').replace(/[״"׳']/g, '');
  if (!text.trim()) return [];
  const met = new Set(st.log.flatMap((l) => l.lines.map((x) => x.speaker)));
  const out: { item: string; ok: boolean }[] = [];
  for (const c of sc.characters.filter((x) => met.has(x.id))) {
    const first = c.name.split(' ')[0];
    out.push({ item: `שם: ${c.name} (${c.role})`, ok: text.includes(first) });
  }
  const knownText = Object.keys(st.known).map((id) => sc.facts.find((f) => f.id === id)?.text ?? '').join(' ');
  for (const plate of new Set(knownText.match(/\d{2}-\d{3}-\d{2}/g) ?? [])) out.push({ item: `מספר רכב ${plate}`, ok: text.replace(/[\s-]/g, '').includes(plate.replace(/-/g, '')) });
  out.push({ item: `מספר אירוע ${sc.dispatch.incident}`, ok: text.includes(sc.dispatch.incident) });
  out.push({ item: 'שעה (למשל שעת הגעה)', ok: /\b\d{1,2}:\d{2}\b/.test(text) });
  return out;
}
