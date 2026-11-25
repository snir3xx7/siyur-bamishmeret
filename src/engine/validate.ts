import { condRefs } from './conditions';
import { availableChoices, availableElements, availableFollowUps, createGame, reduce, visibleHotspots } from './game';
import { mulberry32 } from './rng';
import { DEFAULT_WEIGHTS, DOMAINS } from './scoring';
import type { Cond, Difficulty, Effects, GameAction, GameState, Scenario } from './types';

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  stats: {
    walks: number;
    endingsReached: Record<string, number>;
    choicesReached: number;
    choicesTotal: number;
    unreachedChoices: string[];
    maxSteps: number;
  };
}

type Refs = ReturnType<typeof emptyRefs>;
const emptyRefs = () => ({ facts: [] as string[], choices: [] as string[], chars: [] as string[], elements: [] as string[], variants: [] as string[], flags: [] as string[] });

/** בדיקה סטטית של הפניות + הליכות אקראיות שמוודאות שכל מסלול מסתיים או מציע פעולה */
export function validateScenario(sc: Scenario, opts: { walks?: number } = {}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const factIds = new Set(sc.facts.map((f) => f.id));
  const charIds = new Set(sc.characters.map((c) => c.id));
  const elementIds = new Set(sc.update.elements.map((e) => e.id));
  const variantIds = new Set(sc.variants.map((v) => v.id));
  const allChoices = [...sc.dispatch.followUps, ...sc.hotspots.flatMap((h) => h.choices)];
  const choiceIds = new Set(allChoices.map((c) => c.id));

  const dup = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) errors.push(`${label} כפול: ${id}`);
      seen.add(id);
    }
  };
  dup('מזהה בחירה', allChoices.map((c) => c.id));
  dup('מזהה עובדה', sc.facts.map((f) => f.id));
  dup('מזהה נקודת עניין', sc.hotspots.map((h) => h.id));
  dup('מזהה רכיב עדכון', sc.update.elements.map((e) => e.id));

  // דגלים מוגדרים: מהשפעות ומהווריאציות
  const flagsSet = new Set<string>();
  sc.variants.forEach((v) => Object.keys(v.set ?? {}).forEach((f) => flagsSet.add(f)));
  const effectsList: [string, Effects | undefined][] = [];
  for (const c of allChoices) {
    effectsList.push([c.id, c.effects]);
    c.branches?.forEach((b, i) => effectsList.push([`${c.id}#${i}`, b.effects]));
  }
  sc.update.responses.forEach((r, i) => effectsList.push([`תגובת-מוקד#${i}`, r.effects]));
  for (const ev of sc.events ?? []) {
    flagsSet.add(`ev:${ev.id}`);
    effectsList.push([`אירוע ${ev.id}`, ev.effects]);
    ev.branches?.forEach((b, i) => effectsList.push([`אירוע ${ev.id}#${i}`, b.effects]));
  }
  for (const [, fx] of effectsList) Object.keys(fx?.set ?? {}).forEach((f) => flagsSet.add(f));

  const checkRefs = (where: string, c: Cond | undefined) => {
    const r: Refs = condRefs(c, emptyRefs());
    r.facts.forEach((id) => factIds.has(id) || errors.push(`${where}: תנאי מפנה לעובדה שלא קיימת "${id}"`));
    r.choices.forEach((id) => choiceIds.has(id) || errors.push(`${where}: תנאי מפנה לבחירה שלא קיימת "${id}"`));
    r.chars.forEach((id) => charIds.has(id) || errors.push(`${where}: תנאי מפנה לדמות שלא קיימת "${id}"`));
    r.elements.forEach((id) => elementIds.has(id) || errors.push(`${where}: תנאי מפנה לרכיב עדכון שלא קיים "${id}"`));
    r.variants.forEach((id) => variantIds.has(id) || errors.push(`${where}: תנאי מפנה לווריאציה שלא קיימת "${id}"`));
    r.flags.forEach((id) => flagsSet.has(id) || errors.push(`${where}: תנאי מפנה לדגל שאף פעולה לא מגדירה "${id}"`));
  };
  const checkFx = (where: string, fx: Effects | undefined) => {
    fx?.reveal?.forEach((id) => factIds.has(id) || errors.push(`${where}: חשיפת עובדה לא קיימת "${id}"`));
    fx?.verify?.forEach((id) => factIds.has(id) || errors.push(`${where}: אימות עובדה לא קיימת "${id}"`));
    Object.keys(fx?.attitude ?? {}).forEach((id) => charIds.has(id) || errors.push(`${where}: שינוי יחס לדמות לא קיימת "${id}"`));
    if (fx?.goto) errors.push(`${where}: goto אינו נתמך בבחירות – השתמש בכפתורי המעבר של השלב`);
  };

  sc.arrivalFacts.forEach((id) => factIds.has(id) || errors.push(`עובדת הגעה לא קיימת "${id}"`));
  [...sc.dispatch.initialFacts, ...(sc.dispatch.basicExtraFacts ?? [])].forEach((id) => factIds.has(id) || errors.push(`עובדת פתיחה לא קיימת "${id}"`));
  for (const c of allChoices) {
    checkRefs(`בחירה ${c.id}`, c.when);
    checkFx(`בחירה ${c.id}`, c.effects);
    c.branches?.forEach((b, i) => {
      checkRefs(`בחירה ${c.id} ענף ${i}`, b.when);
      checkFx(`בחירה ${c.id} ענף ${i}`, b.effects);
      b.lines.forEach((l) => checkSpeaker(`${c.id}`, l.speaker));
    });
    c.lines?.forEach((l) => checkSpeaker(`${c.id}`, l.speaker));
    if (!c.lines?.length && !c.branches?.length) warnings.push(`בחירה ${c.id} ללא דיאלוג או תגובה`);
  }
  function checkSpeaker(where: string, s: string) {
    if (!['player', 'dispatch', 'narrator', 'head', 'duty'].includes(s) && !charIds.has(s)) errors.push(`${where}: דובר לא מוכר "${s}"`);
  }
  for (const h of sc.hotspots) {
    checkRefs(`נקודת עניין ${h.id}`, h.when);
    if (h.character && !charIds.has(h.character)) errors.push(`נקודת עניין ${h.id}: דמות לא קיימת "${h.character}"`);
    if (!h.description) errors.push(`נקודת עניין ${h.id}: חסר תיאור נגיש`);
  }
  sc.characters.forEach((c) => {
    checkRefs(`דמות ${c.id}`, c.when);
    c.moodRules?.forEach((m, i) => checkRefs(`דמות ${c.id} מצב ${i}`, m.when));
  });
  sc.update.elements.forEach((e) => {
    checkRefs(`רכיב עדכון ${e.id}`, e.when);
    if (!sc.update.categories[e.category]) errors.push(`רכיב עדכון ${e.id}: קטגוריה לא מוגדרת "${e.category}"`);
  });
  sc.update.responses.forEach((r, i) => {
    checkRefs(`תגובת מוקד ${i}`, r.when);
    checkFx(`תגובת מוקד ${i}`, r.effects);
  });
  dup('מזהה אירוע', (sc.events ?? []).map((e) => e.id));
  for (const ev of sc.events ?? []) {
    checkRefs(`אירוע ${ev.id}`, ev.when);
    checkFx(`אירוע ${ev.id}`, ev.effects);
    ev.lines.forEach((l) => checkSpeaker(`אירוע ${ev.id}`, l.speaker));
    ev.branches?.forEach((b, i) => {
      checkRefs(`אירוע ${ev.id} ענף ${i}`, b.when);
      checkFx(`אירוע ${ev.id} ענף ${i}`, b.effects);
      b.lines.forEach((l) => checkSpeaker(`אירוע ${ev.id}`, l.speaker));
    });
  }
  sc.endings.forEach((e) => checkRefs(`סיום ${e.id}`, e.when));
  if (sc.endings.length < 2) errors.push('נדרשים לפחות שני סיומים אפשריים');
  const lastEnding = sc.endings[sc.endings.length - 1];
  if (!lastEnding || !('always' in lastEnding.when)) errors.push('הסיום האחרון חייב להיות ברירת מחדל ({"always": true})');
  sc.hints.forEach((h, i) => checkRefs(`רמז ${i}`, h.when));
  sc.report.checklist.forEach((c, i) => checkRefs(`רשימת דוח ${i}`, c.when));
  sc.scene.lightsRules?.forEach((r, i) => checkRefs(`כלל אורות ${i}`, r.when));
  sc.scene.ambienceRules?.forEach((r, i) => checkRefs(`כלל סביבה ${i}`, r.when));
  sc.scene.props?.forEach((p) => checkRefs(`פריט ${p.id}`, p.when));

  // ניקוד
  const weights = { ...DEFAULT_WEIGHTS, ...(sc.scoring.weights ?? {}) };
  for (const r of sc.scoring.rules) {
    if (!DOMAINS.includes(r.domain)) errors.push(`כלל ניקוד ${r.id}: תחום לא מוכר`);
    checkRefs(`כלל ניקוד ${r.id}`, r.appliesWhen);
    r.tiers.forEach((t, i) => {
      checkRefs(`כלל ניקוד ${r.id} שכבה ${i}`, t.when);
      if (t.points > r.max || t.points < 0) errors.push(`כלל ניקוד ${r.id}: ניקוד שכבה ${i} מחוץ לטווח`);
      if (t.points < r.max && !t.improve) warnings.push(`כלל ניקוד ${r.id} שכבה ${i}: ניקוד חלקי ללא הצעה לשיפור`);
    });
    for (const a of r.anchor ?? []) if (a.startsWith('sent:') ? !elementIds.has(a.slice(5)) : !a.startsWith('update:') && a !== 'finish' && !choiceIds.has(a)) errors.push(`כלל ניקוד ${r.id}: עוגן לא קיים "${a}"`);
  }
  for (const d of DOMAINS) {
    const sum = sc.scoring.rules.filter((r) => r.domain === d).reduce((s, r) => s + r.max, 0);
    if (sum && sum !== weights[d]) warnings.push(`תחום ${d}: סכום הניקוד המרבי (${sum}) שונה מהמשקל (${weights[d]}) – יבוצע נרמול`);
  }

  // הליכות אקראיות
  const walks = opts.walks ?? 300;
  const endingsReached: Record<string, number> = Object.fromEntries(sc.endings.map((e) => [e.id, 0]));
  const reached = new Set<string>();
  let maxSteps = 0;
  const diffs: Difficulty[] = ['basic', 'standard', 'advanced'];
  if (errors.length === 0) {
    for (let w = 0; w < walks; w++) {
      const rnd = mulberry32(w * 7919 + 13);
      let st = createGame(sc, {
        scenarioId: sc.id, version: sc.version, seed: 1 + w, shift: sc.shifts[w % sc.shifts.length],
        difficulty: diffs[w % 3], mode: 'practice', timeLimit: false,
      });
      let steps = 0;
      const finishAfter = 3 + Math.floor(rnd() * 30);
      while (st.stage !== 'ended') {
        const opts2 = actionsFor(sc, st, rnd, steps >= finishAfter);
        if (opts2.length === 0) {
          errors.push(`מבוי סתום: שלב ${st.stage} ללא פעולה זמינה (הליכה ${w})`);
          break;
        }
        const a = opts2[Math.floor(rnd() * opts2.length)];
        const next = reduce(sc, st, a);
        if (next === st) {
          errors.push(`פעולה זמינה לא שינתה מצב (${JSON.stringify(a)})`);
          break;
        }
        if (a.type === 'CHOOSE') reached.add(a.choiceId);
        st = next;
        if (++steps > 200) {
          errors.push('מסלול לא מסתיים אחרי 200 צעדים');
          break;
        }
      }
      maxSteps = Math.max(maxSteps, steps);
      if (st.endingId) endingsReached[st.endingId]++;
    }
  }
  const unreachedChoices = allChoices.map((c) => c.id).filter((id) => !reached.has(id));
  if (errors.length === 0 && unreachedChoices.length) warnings.push(`בחירות שלא הושגו בהליכות אקראיות: ${unreachedChoices.join(', ')}`);

  return {
    errors,
    warnings,
    stats: { walks, endingsReached, choicesReached: reached.size, choicesTotal: allChoices.length, unreachedChoices, maxSteps },
  };
}

function actionsFor(sc: Scenario, st: GameState, rnd: () => number, allowFinish: boolean): GameAction[] {
  const turn = st.turn;
  if (st.stage === 'dispatch') return [{ type: 'GO', turn }, ...availableFollowUps(sc, st).map((c) => ({ type: 'CHOOSE' as const, choiceId: c.id, turn }))];
  if (st.stage === 'transition') return [{ type: 'ARRIVE', turn, skipped: rnd() < 0.5 }];
  if (st.stage === 'scene') {
    const out: GameAction[] = [];
    for (const h of visibleHotspots(sc, st)) for (const c of availableChoices(sc, st, h.id)) out.push({ type: 'CHOOSE', choiceId: c.id, turn });
    const els = availableElements(sc, st).map((e) => e.id);
    if (els.length && st.updates.length < 4) out.push({ type: 'SEND_UPDATE', elements: els.filter(() => rnd() < 0.5).concat(els[0]), note: '', turn });
    if (allowFinish || out.length === 0) out.push({ type: 'FINISH', turn });
    return out;
  }
  return [];
}
