import { radioVars } from './procedure';
import { evalCond } from './conditions';
import { mulberry32, pickWeighted } from './rng';
import { fill } from './text';
import type {
  Choice, Effects, GameAction, GameConfig, GameState, Hotspot, LogEntry, LogKind, Line, Mood, Scenario, UpdateElement,
} from './types';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function simNow(st: GameState): number {
  return st.simMinutes + st.activeMs / 60000;
}

export function createGame(sc: Scenario, config: GameConfig): GameState {
  const rnd = mulberry32(config.seed);
  const variant = pickWeighted(sc.variants, rnd);
  const vars = { ...radioVars(sc, config.radio), ...variant.vars };
  const known: GameState['known'] = {};
  const initial = [...sc.dispatch.initialFacts, ...(config.difficulty === 'basic' ? sc.dispatch.basicExtraFacts ?? [] : [])];
  for (const id of initial) known[id] = { t: 0, verified: false };
  const attitudes: Record<string, number> = {};
  for (const c of sc.characters) attitudes[c.id] = c.attitude;
  const lines = sc.dispatch.lines.map((l) => ({ ...l, text: fill(l.text, vars) }));
  const st: GameState = {
    config,
    variant: variant.id,
    vars,
    stage: 'dispatch',
    turn: 0,
    known,
    flags: { ...(variant.set ?? {}) },
    attitudes,
    chosen: {},
    updates: [],
    log: [],
    simMinutes: 0,
    activeMs: 0,
    lastLines: lines,
    actions: [],
    startedAt: new Date().toISOString(),
  };
  st.log.push({
    turn: 0, kind: 'dispatch', ref: 'dispatch', label: 'התקבלה משימה מהמוקד', t: 0, stage: 'dispatch',
    knownBefore: [], verifiedBefore: [], lines, revealed: initial, consequences: [], actionIndex: -1,
  });
  return st;
}

/* ---------- זמינות ---------- */

/** נקודת עניין נראית לפי התנאי שלה בלבד (דמות יכולה להופיע בציור רק אחרי פעולה בנקודה) */
export function isHotspotVisible(sc: Scenario, st: GameState, h: Hotspot): boolean {
  return evalCond({ sc, st }, h.when);
}

export function isChoiceAvailable(sc: Scenario, st: GameState, c: Choice): boolean {
  if ((c.once ?? true) && st.chosen[c.id] !== undefined) return false;
  return evalCond({ sc, st }, c.when);
}

export function visibleHotspots(sc: Scenario, st: GameState): Hotspot[] {
  return sc.hotspots.filter((h) => isHotspotVisible(sc, st, h));
}

export function availableChoices(sc: Scenario, st: GameState, hotspotId: string): Choice[] {
  const h = sc.hotspots.find((x) => x.id === hotspotId);
  if (!h || !isHotspotVisible(sc, st, h)) return [];
  return h.choices.filter((c) => isChoiceAvailable(sc, st, c));
}

export function availableFollowUps(sc: Scenario, st: GameState): Choice[] {
  return sc.dispatch.followUps.filter((c) => isChoiceAvailable(sc, st, c));
}

export function availableElements(sc: Scenario, st: GameState): UpdateElement[] {
  return sc.update.elements.filter((e) => evalCond({ sc, st }, e.when));
}

export function findChoice(sc: Scenario, id: string): { choice: Choice; hotspot?: Hotspot } | undefined {
  const f = sc.dispatch.followUps.find((c) => c.id === id);
  if (f) return { choice: f };
  for (const h of sc.hotspots) {
    const c = h.choices.find((x) => x.id === id);
    if (c) return { choice: c, hotspot: h };
  }
  return undefined;
}

export function moodOf(sc: Scenario, st: GameState, charId: string): Mood {
  const ch = sc.characters.find((c) => c.id === charId);
  if (!ch) return 'calm';
  for (const r of ch.moodRules ?? []) if (evalCond({ sc, st }, r.when)) return r.mood;
  const a = st.attitudes[charId] ?? 0;
  return a >= 2 ? 'calm' : a >= 1 ? 'tense' : 'upset';
}

export function lightsOf(sc: Scenario, st: GameState) {
  for (const r of sc.scene.lightsRules ?? []) if (evalCond({ sc, st }, r.when)) return r.mode;
  return sc.scene.lights;
}

/* ---------- החלת השפעות ---------- */

function applyEffects(sc: Scenario, st: GameState, fx: Effects | undefined, revealed: string[], consequences: string[]) {
  if (!fx) return;
  const t = simNow(st);
  for (const id of fx.reveal ?? []) {
    if (st.known[id]) continue;
    const fact = sc.facts.find((f) => f.id === id);
    st.known[id] = { t, verified: fact?.kind === 'observation' };
    revealed.push(id);
  }
  for (const id of fx.verify ?? []) {
    const prev = st.known[id];
    if (!prev) revealed.push(id);
    if (!prev?.verified) st.known[id] = { t: prev?.t ?? t, verified: true };
  }
  if (fx.set) Object.assign(st.flags, fx.set);
  for (const [id, d] of Object.entries(fx.attitude ?? {})) {
    const before = st.attitudes[id] ?? 0;
    const after = clamp(before + d, -3, 3);
    st.attitudes[id] = after;
    const ch = sc.characters.find((c) => c.id === id);
    const name = ch?.name ?? id;
    const coop = ch?.gender === 'f' ? 'משתפת' : 'משתף';
    if (after < before) consequences.push(`${name} ${ch?.gender === 'f' ? 'פחות משתפת' : 'פחות משתף'} פעולה`);
    if (after > before) consequences.push(`${name} ${coop} פעולה יותר`);
  }
  if (fx.minutes) st.simMinutes += fx.minutes;
  if (fx.note) consequences.push(fill(fx.note, st.vars));
}

function pushLog(
  st: GameState, before: GameState, kind: LogKind, ref: string, label: string, lines: Line[], revealed: string[], consequences: string[],
) {
  const entry: LogEntry = {
    turn: st.turn,
    kind,
    ref,
    label,
    t: simNow(before),
    stage: before.stage,
    knownBefore: Object.keys(before.known),
    verifiedBefore: Object.entries(before.known).filter(([, k]) => k.verified).map(([id]) => id),
    lines,
    revealed,
    consequences,
    actionIndex: st.actions.length - 1,
  };
  st.log.push(entry);
}

function clone(st: GameState): GameState {
  return {
    ...st,
    known: { ...st.known },
    flags: { ...st.flags },
    attitudes: { ...st.attitudes },
    chosen: { ...st.chosen },
    updates: [...st.updates],
    log: [...st.log],
    actions: [...st.actions],
  };
}

/** מזהה הדגל שמסמן שאירוע מתפתח כבר קרה */
export const eventFlag = (id: string) => `ev:${id}`;

/**
 * אירועים מתפתחים: אחרי כל פעולה בזירה בודקים אילו אירועים התנאי שלהם התקיים.
 * כל אירוע קורה פעם אחת, נרשם ביומן ומתווסף לדיאלוג של אותו תור.
 */
function fireEvents(sc: Scenario, st: GameState) {
  for (const ev of sc.events ?? []) {
    if (st.flags[eventFlag(ev.id)] || !evalCond({ sc, st }, ev.when)) continue;
    const before = { ...st, known: { ...st.known } };
    const branch = ev.branches?.find((b) => evalCond({ sc, st }, b.when));
    const lines = (branch ? branch.lines : ev.lines).map((l) => ({ ...l, text: fill(l.text, st.vars) }));
    const revealed: string[] = [];
    const consequences: string[] = [];
    st.flags[eventFlag(ev.id)] = true;
    applyEffects(sc, st, branch ? branch.effects : ev.effects, revealed, consequences);
    st.lastLines = [...st.lastLines, ...lines];
    st.lastEvent = ev.id;
    pushLog(st, before, 'event', `event:${ev.id}`, fill(ev.title, st.vars), lines, revealed, consequences);
  }
}

/* ---------- reducer ---------- */

/**
 * מעבר מצב יחיד. כל פעולה (מלבד TICK) נושאת את מספר התור שבו הוצגה;
 * פעולה עם תור ישן (לחיצה כפולה) מוחזרת ללא שינוי – כך החלטה לא משוכפלת.
 */
export function reduce(sc: Scenario, prev: GameState, action: GameAction): GameState {
  if (action.type === 'TICK') {
    if (prev.stage !== 'dispatch' && prev.stage !== 'scene') return prev;
    return { ...prev, activeMs: prev.activeMs + Math.max(0, action.ms) };
  }
  if (action.type === 'NOTE') {
    // הפנקס לא צורך תור ולא משנה את מהלך התרחיש; נשמר ברשימת הפעולות לשחזור
    const text = action.text.slice(0, 4000);
    if (prev.stage === 'ended' || text === (prev.notebook ?? '')) return prev;
    const last = prev.actions[prev.actions.length - 1];
    const actions = last?.type === 'NOTE' ? [...prev.actions.slice(0, -1), { type: 'NOTE' as const, text }] : [...prev.actions, { type: 'NOTE' as const, text }];
    return { ...prev, notebook: text, actions };
  }
  if (action.turn !== prev.turn || prev.stage === 'ended') return prev;

  const st = clone(prev);
  st.lastEvent = undefined;
  action = { ...action, at: prev.activeMs };
  const revealed: string[] = [];
  const consequences: string[] = [];

  switch (action.type) {
    case 'CHOOSE': {
      const found = findChoice(sc, action.choiceId);
      if (!found) return prev;
      const { choice, hotspot } = found;
      const inDispatch = !hotspot;
      if (inDispatch && prev.stage !== 'dispatch') return prev;
      if (!inDispatch && prev.stage !== 'scene') return prev;
      if (inDispatch ? !availableFollowUps(sc, prev).some((c) => c.id === choice.id)
        : !availableChoices(sc, prev, hotspot!.id).some((c) => c.id === choice.id)) return prev;
      const branch = choice.branches?.find((b) => evalCond({ sc, st: prev }, b.when));
      const lines = (branch ? branch.lines : choice.lines ?? []).map((l) => ({ ...l, text: fill(l.text, st.vars) }));
      st.actions.push(action);
      st.turn++;
      st.chosen[choice.id] = st.turn;
      applyEffects(sc, st, { minutes: 1, ...(branch ? branch.effects : choice.effects) }, revealed, consequences);
      st.lastLines = lines;
      pushLog(st, prev, inDispatch ? 'followup' : 'choice', choice.id, fill(choice.label, st.vars), lines, revealed, consequences);
      if (!inDispatch) fireEvents(sc, st);
      return st;
    }
    case 'GO': {
      if (prev.stage !== 'dispatch') return prev;
      st.actions.push(action);
      st.turn++;
      st.stage = 'transition';
      pushLog(st, prev, 'choice', 'go', sc.dispatch.goLabel, [], [], []);
      return st;
    }
    case 'ARRIVE': {
      if (prev.stage !== 'transition') return prev;
      st.actions.push(action);
      st.turn++;
      st.stage = 'scene';
      st.simMinutes += sc.transition.travelMinutes;
      for (const id of sc.arrivalFacts) if (!st.known[id]) { st.known[id] = { t: st.simMinutes, verified: true }; revealed.push(id); }
      const lines = sc.arrivalLines.map((l) => ({ ...l, text: fill(l.text, st.vars) }));
      st.lastLines = lines;
      pushLog(st, { ...prev, simMinutes: st.simMinutes }, action.skipped ? 'skip' : 'arrive', 'arrive', action.skipped ? 'הגעה לזירה (המעבר דולג)' : 'הגעה לזירה', lines, revealed, []);
      st.log[st.log.length - 1].stage = 'scene';
      return st;
    }
    case 'SEND_UPDATE': {
      if (prev.stage !== 'scene') return prev;
      const allowed = new Set(availableElements(sc, prev).map((e) => e.id));
      const elements = sc.update.elements.map((e) => e.id).filter((id) => action.elements.includes(id) && allowed.has(id));
      if (elements.length === 0) return prev;
      st.actions.push({ ...action, elements });
      st.turn++;
      const n = st.updates.length + 1;
      const ctx = { sc, st: prev, pending: elements };
      const lines: Line[] = [];
      let any = false;
      for (const r of sc.update.responses) {
        if (!evalCond(ctx, r.when)) continue;
        any = true;
        lines.push(...r.lines.map((l) => ({ ...l, text: fill(l.text, st.vars) })));
        applyEffects(sc, st, r.effects, revealed, consequences);
      }
      if (!any) lines.push({ speaker: 'dispatch', text: 'מוקד: קיבלתי, רשמתי.' });
      // מי עונה בקשר: המשל״ט או הקצין התורן, לפי מי שאליו נשלח העדכון
      // ברירת מחדל: המשל״ט (הדובר 'dispatch'). לראש המשמרת או לקצין התורן – הם עונים בקולם
      const to = action.to ?? 'center';
      if (to !== 'center') {
        for (let i = 0; i < lines.length; i++) if (lines[i].speaker === 'dispatch') lines[i] = { ...lines[i], speaker: to };
      }
      st.updates.push({ n, turn: st.turn, t: simNow(prev), elements, note: action.note.slice(0, 280), ...(to !== 'center' ? { to } : {}) });
      st.simMinutes += 1;
      st.lastLines = lines;
      const texts = elements.map((id) => fill(sc.update.elements.find((e) => e.id === id)!.text, st.vars));
      pushLog(st, prev, 'update', `update:${n}`, `עדכון ${n} למוקד: ${texts.join('; ')}${action.note ? ` (${action.note.slice(0, 280)})` : ''}`, lines, revealed, consequences);
      fireEvents(sc, st);
      return st;
    }
    case 'FINISH': {
      if (prev.stage !== 'scene') return prev;
      st.actions.push(action);
      st.turn++;
      const ending = sc.endings.find((e) => evalCond({ sc, st: prev }, e.when)) ?? sc.endings[sc.endings.length - 1];
      st.endingId = ending.id;
      st.stage = 'ended';
      st.finishedAt = new Date().toISOString();
      const lines: Line[] = [{ speaker: 'narrator', text: fill(ending.text, st.vars) }];
      st.lastLines = lines;
      pushLog(st, prev, 'finish', 'finish', sc.finish.label, lines, [], []);
      return st;
    }
  }
  return prev;
}

/** שחזור מצב מתוך רשימת פעולות (לשחזור נקודת החלטה בכיתה ולטעינת שמירה) */
export function replay(sc: Scenario, config: GameConfig, actions: GameAction[], startedAt?: string): GameState {
  let st = createGame(sc, config);
  if (startedAt) st.startedAt = startedAt;
  for (const a of actions) {
    if (a.type === 'TICK') continue;
    if (typeof a.at === 'number') st = { ...st, activeMs: a.at };
    st = reduce(sc, st, { ...a, turn: st.turn } as GameAction);
  }
  return st;
}

export function currentHint(sc: Scenario, st: GameState): string | undefined {
  return sc.hints.find((h) => evalCond({ sc, st }, h.when))?.text;
}

export function factText(sc: Scenario, st: GameState, id: string): string {
  const f = sc.facts.find((x) => x.id === id);
  return f ? fill(f.text, st.vars) : id;
}

export function startTimeOf(sc: Scenario, shift: string): string {
  const t = sc.dispatch.time as Record<string, string>;
  return t[shift] ?? Object.values(t)[0] ?? '00:00';
}

export function ambienceOf(sc: Scenario, st: GameState): string[] {
  for (const r of sc.scene.ambienceRules ?? []) if (evalCond({ sc, st }, r.when)) return r.ambience;
  return sc.scene.ambience;
}
