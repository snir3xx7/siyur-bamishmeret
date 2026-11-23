import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createGame, reduce } from '../../src/engine/game';
import type { GameConfig, GameState, Scenario } from '../../src/engine/types';

export function loadScenario(id: string): Scenario {
  return JSON.parse(readFileSync(join(__dirname, '../../public/scenarios', `${id}.json`), 'utf8'));
}

export function cfg(sc: Scenario, over: Partial<GameConfig> = {}): GameConfig {
  return { scenarioId: sc.id, version: sc.version, seed: 1, shift: sc.defaultShift, difficulty: 'standard', mode: 'practice', timeLimit: false, ...over };
}

/** מריץ רצף צעדים. צעד = מזהה בחירה | 'GO' | 'ARRIVE' | 'FINISH' | ['UPDATE', ...elementIds] */
export type Step = string | ['UPDATE', ...string[]];
export function play(sc: Scenario, steps: Step[], over: Partial<GameConfig> = {}): GameState {
  let st = createGame(sc, cfg(sc, over));
  for (const s of steps) {
    const turn = st.turn;
    const next = Array.isArray(s)
      ? reduce(sc, st, { type: 'SEND_UPDATE', elements: s.slice(1), note: '', turn })
      : s === 'GO' ? reduce(sc, st, { type: 'GO', turn })
      : s === 'ARRIVE' ? reduce(sc, st, { type: 'ARRIVE', turn, skipped: false })
      : s === 'FINISH' ? reduce(sc, st, { type: 'FINISH', turn })
      : reduce(sc, st, { type: 'CHOOSE', choiceId: s, turn });
    if (next === st) throw new Error(`צעד לא בוצע: ${JSON.stringify(s)} (שלב ${st.stage})`);
    st = next;
  }
  return st;
}

/** מוצא זרע שמייצר וריאציה מסוימת */
export function seedFor(sc: Scenario, variant: string): number {
  for (let s = 1; s < 500; s++) if (createGame(sc, cfg(sc, { seed: s })).variant === variant) return s;
  throw new Error('no seed');
}
