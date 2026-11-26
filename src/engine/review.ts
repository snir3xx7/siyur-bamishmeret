/**
 * מצב „מצא את הטעויות”: צפייה בטיפול של שוטר אחר באירוע, צעד אחרי צעד.
 * המסלול נבנה אוטומטית מהתרחיש (דטרמיניסטי לפי זרע): רוב הצעדים סבירים, וחלקם טעויות –
 * בחירות שיש להן השלכה מתועדת (note) בתרחיש. בסוף – מה הוא לא עשה, לפי כללי הציון שלא התקיימו.
 */
import { computeScore } from './scoring';
import { evalCond } from './conditions';
import { availableChoices, availableFollowUps, createGame, reduce, visibleHotspots } from './game';
import { mulberry32 } from './rng';
import { fill } from './text';
import type { Choice, GameConfig, GameState, Line, Scenario } from './types';

export interface ReviewStep {
  choiceId: string;
  label: string;
  lines: Line[];
  /** האם זו טעות */
  mistake: boolean;
  /** ההסבר – ההשלכה שמתועדת בתרחיש, או למה הצעד תקין */
  why: string;
}

export interface Review {
  steps: ReviewStep[];
  /** מה לא נעשה (כללי ציון חובה שלא התקיימו) */
  omissions: string[];
  final: GameState;
}

const SKIP = /^(rp-|rt-|fm-|cs-|rec-)/;
const POSITIVE = /^(תיקנת|שאלת שוב|בשיחה שקטה)/;

/** ההשלכה המתועדת של בחירה במצב הנוכחי (כולל ענפים) */
function noteOf(sc: Scenario, st: GameState, c: Choice): string | undefined {
  const b = c.branches?.find((x) => evalCond({ sc, st }, x.when));
  const n = (b ? b.effects : c.effects)?.note;
  // השלכה חיובית (תיקון פנייה, שיחה חוזרת) אינה טעות
  if (!n || POSITIVE.test(n)) return undefined;
  return fill(n, st.vars);
}

export function buildReview(sc: Scenario, seed: number, maxSteps = 12): Review {
  const rnd = mulberry32(seed * 7919 + 17);
  const config: GameConfig = { scenarioId: sc.id, version: sc.version, seed, shift: sc.defaultShift, difficulty: 'standard', mode: 'practice', timeLimit: false };
  let st = createGame(sc, config);
  const steps: ReviewStep[] = [];
  const act = (s: GameState, a: Parameters<typeof reduce>[2]) => reduce(sc, s, a);

  // שאלת המשך אחת בקשר, ויציאה
  const fu = availableFollowUps(sc, st)[0];
  if (fu) st = act(st, { type: 'CHOOSE', choiceId: fu.id, turn: st.turn });
  st = act(st, { type: 'GO', turn: st.turn });
  st = act(st, { type: 'ARRIVE', turn: st.turn, skipped: true });

  let mistakes = 0;
  for (let i = 0; i < maxSteps; i++) {
    const opts = visibleHotspots(sc, st).flatMap((h) => availableChoices(sc, st, h.id)).filter((c) => !SKIP.test(c.id));
    if (!opts.length) break;
    const bad = opts.filter((c) => noteOf(sc, st, c));
    const good = opts.filter((c) => !noteOf(sc, st, c));
    const wantBad = bad.length > 0 && (rnd() < (mistakes < 2 ? 0.55 : 0.3) || !good.length);
    const pool = wantBad ? bad : good.slice(0, 2);
    const c = pool[Math.floor(rnd() * pool.length)];
    const why = noteOf(sc, st, c);
    const next = act(st, { type: 'CHOOSE', choiceId: c.id, turn: st.turn });
    if (next === st) break;
    steps.push({
      choiceId: c.id,
      label: fill(c.label, st.vars),
      lines: next.lastLines,
      mistake: !!why,
      why: why ?? (c.report ? `תקין: ${c.report}.` : 'צעד סביר.'),
    });
    if (why) mistakes++;
    st = next;
  }
  st = act(st, { type: 'FINISH', turn: st.turn });
  const omissions = computeScore(sc, st)
    .rules.filter((r) => r.applicable && r.rule.required && r.points < r.max && r.improve)
    .map((r) => r.improve!);
  return { steps, omissions: [...new Set(omissions)], final: st };
}
