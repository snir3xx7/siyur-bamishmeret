import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/engine/game';
import { mulberry32, parseSeed, pickWeighted } from '../../src/engine/rng';
import { cfg, loadScenario } from './helpers';

describe('זרעי הגרלה', () => {
  it('אותו זרע ⇒ אותה סדרה', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });

  it('אותו זרע ⇒ אותה וריאציה של התרחיש לכולם', () => {
    for (const id of ['accident-rain', 'noise-building', 'yard-dispute']) {
      const sc = loadScenario(id);
      for (const seed of [1, 7, 1234, 999999]) {
        expect(createGame(sc, cfg(sc, { seed })).variant).toBe(createGame(sc, cfg(sc, { seed })).variant);
      }
    }
  });

  it('זרעים שונים מכסים את כל הווריאציות', () => {
    for (const id of ['accident-rain', 'noise-building', 'yard-dispute']) {
      const sc = loadScenario(id);
      const seen = new Set<string>();
      for (let s = 1; s <= 200; s++) seen.add(createGame(sc, cfg(sc, { seed: s })).variant);
      expect([...seen].sort()).toEqual(sc.variants.map((v) => v.id).sort());
    }
  });

  it('בחירה משוקללת מכבדת משקל', () => {
    const r = mulberry32(3);
    let heavy = 0;
    for (let i = 0; i < 1000; i++) if (pickWeighted([{ id: 'a', weight: 9 }, { id: 'b', weight: 1 }], r).id === 'a') heavy++;
    expect(heavy).toBeGreaterThan(800);
  });

  it('פענוח זרע מקישור', () => {
    expect(parseSeed('123')).toBe(123);
    expect(parseSeed('0')).toBeNull();
    expect(parseSeed('abc')).toBeNull();
    expect(parseSeed('1000000')).toBeNull();
    expect(parseSeed(null)).toBeNull();
  });
});
