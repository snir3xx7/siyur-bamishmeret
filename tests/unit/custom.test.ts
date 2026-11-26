import { beforeEach, describe, expect, it } from 'vitest';
import { loadScenario, play } from './helpers';
import { customCatalog, deleteCustom, forkScenario, getCustom, isCustomId, listCustom, saveCustom } from '../../src/storage/custom';
import { validateScenario } from '../../src/engine/validate';

describe('התרחישים שלי (עורך)', () => {
  beforeEach(() => localStorage.clear());

  it('עותק: מזהה my-, שמירה, קטלוג ומחיקה', () => {
    const base = loadScenario('burglary');
    const sc = forkScenario(base);
    expect(isCustomId(sc.id)).toBe(true);
    expect(sc.title).toContain('עותק');
    sc.dispatch.lines[0].text = 'טקסט חדש לגמרי.';
    saveCustom(sc);
    expect(getCustom(sc.id)!.dispatch.lines[0].text).toBe('טקסט חדש לגמרי.');
    expect(customCatalog()[0].category).toBe('התרחישים שלי');
    expect(forkScenario(base).id).not.toBe(sc.id);
    deleteCustom(sc.id);
    expect(listCustom()).toHaveLength(0);
  });

  it('עותק ערוך נשאר תקין ומשחק עד הסוף', () => {
    const sc = forkScenario(loadScenario('id-check'));
    sc.characters[0].name = 'רחל לוי';
    expect(validateScenario(sc, { walks: 50 }).errors).toEqual([]);
    const st = play(sc, ['GO', 'ARRIVE', 'FINISH']);
    expect(st.stage).toBe('ended');
  });
});
