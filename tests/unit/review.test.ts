import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadScenario } from './helpers';
import { withProcedure } from '../../src/engine/procedure';
import { buildReview } from '../../src/engine/review';

const ids = (JSON.parse(readFileSync('public/scenarios/index.json', 'utf8')).scenarios as { id: string }[]).map((e) => e.id);

describe('מצא את הטעויות', () => {
  it('בכל תרחיש: מסלול עם צעדים, לפחות טעות אחת, והסבר לכל צעד', () => {
    for (const id of ids) {
      const sc = withProcedure(loadScenario(id));
      for (const seed of [1, 2, 3]) {
        const r = buildReview(sc, seed);
        expect(r.steps.length, id).toBeGreaterThanOrEqual(6);
        expect(r.steps.some((s) => s.mistake), `${id}/${seed}`).toBe(true);
        for (const s of r.steps) {
          expect(s.why.length).toBeGreaterThan(3);
          expect(s.label.includes('{{'), s.label).toBe(false);
        }
        expect(r.final.stage).toBe('ended');
      }
    }
  });

  it('דטרמיניסטי לפי זרע', () => {
    const sc = withProcedure(loadScenario('id-check'));
    expect(buildReview(sc, 5).steps.map((s) => s.choiceId)).toEqual(buildReview(sc, 5).steps.map((s) => s.choiceId));
  });

  it('תיקון פנייה אינו נחשב טעות', () => {
    const sc = withProcedure(loadScenario('accident-rain'));
    for (const seed of [1, 2, 3, 4, 5, 6]) for (const s of buildReview(sc, seed).steps) if (['o-repair', 'd-retry'].includes(s.choiceId)) expect(s.mistake).toBe(false);
  });
});
