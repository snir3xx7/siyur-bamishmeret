import type { Cond, GameState, Scenario, UpdateCond } from './types';

export interface CondCtx {
  sc: Scenario;
  st: GameState;
  /** רכיבי עדכון שנבחרו כעת (בהערכת תגובת מוקד) */
  pending?: string[];
}

export function turnOf(st: GameState, key: string): number | undefined {
  if (key.startsWith('update:')) {
    const n = key.slice(7);
    const u = n === 'last' ? st.updates[st.updates.length - 1] : st.updates[Number(n) - 1];
    return u?.turn;
  }
  if (key === 'finish') return st.log.find((l) => l.kind === 'finish')?.turn;
  return st.chosen[key];
}

function matchUpdate(ctx: CondCtx, c: UpdateCond): boolean {
  const { st, sc } = ctx;
  const list =
    c.n === 'any' ? st.updates : c.n === 'last' ? st.updates.slice(-1) : st.updates.slice(c.n - 1, c.n);
  const catOf = (id: string) => sc.update.elements.find((e) => e.id === id)?.category;
  return list.some(
    (u) =>
      (c.has ?? []).every((id) => u.elements.includes(id)) &&
      (c.hasCat ?? []).every((cat) => u.elements.some((id) => catOf(id) === cat)) &&
      !(c.lacks ?? []).some((id) => u.elements.includes(id)),
  );
}

export function evalCond(ctx: CondCtx, c: Cond | undefined): boolean {
  if (!c) return true;
  const { st } = ctx;
  if ('always' in c) return true;
  if ('stage' in c) return c.stage.includes(st.stage);
  if ('all' in c) return c.all.every((x) => evalCond(ctx, x));
  if ('any' in c) return c.any.some((x) => evalCond(ctx, x));
  if ('not' in c) return !evalCond(ctx, c.not);
  if ('fact' in c) return !!st.known[c.fact];
  if ('verified' in c) return !!st.known[c.verified]?.verified;
  if ('flag' in c) {
    const v = st.flags[c.flag];
    return c.eq === undefined ? !!v : v === c.eq;
  }
  if ('chosen' in c) return st.chosen[c.chosen] !== undefined;
  if ('countChosen' in c) return c.countChosen.ids.filter((id) => st.chosen[id] !== undefined).length >= c.countChosen.gte;
  if ('before' in c) {
    const a = turnOf(st, c.before[0]);
    const b = turnOf(st, c.before[1]);
    return a !== undefined && (b === undefined || a < b);
  }
  if ('attitudeGte' in c) return (st.attitudes[c.attitudeGte[0]] ?? 0) >= c.attitudeGte[1];
  if ('attitudeLte' in c) return (st.attitudes[c.attitudeLte[0]] ?? 0) <= c.attitudeLte[1];
  if ('difficulty' in c) return c.difficulty.includes(st.config.difficulty);
  if ('shift' in c) return c.shift.includes(st.config.shift);
  if ('variant' in c) return c.variant.includes(st.variant);
  if ('sent' in c) return st.updates.some((u) => u.elements.includes(c.sent)) || !!ctx.pending?.includes(c.sent);
  if ('updatesGte' in c) return st.updates.length >= c.updatesGte;
  if ('update' in c) return matchUpdate(ctx, c.update);
  if ('inUpdate' in c) return !!ctx.pending?.includes(c.inUpdate);
  throw new Error('תנאי לא מוכר: ' + JSON.stringify(c));
}

/** כל המזהים שתנאי מפנה אליהם – לבדיקת תקינות */
export function condRefs(c: Cond | undefined, out: { facts: string[]; choices: string[]; chars: string[]; elements: string[]; variants: string[]; flags: string[] }) {
  if (!c) return out;
  if ('all' in c) c.all.forEach((x) => condRefs(x, out));
  else if ('any' in c) c.any.forEach((x) => condRefs(x, out));
  else if ('not' in c) condRefs(c.not, out);
  else if ('fact' in c) out.facts.push(c.fact);
  else if ('verified' in c) out.facts.push(c.verified);
  else if ('flag' in c) out.flags.push(c.flag);
  else if ('chosen' in c) out.choices.push(c.chosen);
  else if ('countChosen' in c) out.choices.push(...c.countChosen.ids);
  else if ('before' in c) out.choices.push(...c.before.filter((k) => !k.startsWith('update:') && k !== 'finish'));
  else if ('attitudeGte' in c) out.chars.push(c.attitudeGte[0]);
  else if ('attitudeLte' in c) out.chars.push(c.attitudeLte[0]);
  else if ('variant' in c) out.variants.push(...c.variant);
  else if ('sent' in c) out.elements.push(c.sent);
  else if ('inUpdate' in c) out.elements.push(c.inUpdate);
  else if ('update' in c) out.elements.push(...(c.update.has ?? []), ...(c.update.lacks ?? []));
  return out;
}
