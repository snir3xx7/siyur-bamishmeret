import { describe, expect, it } from 'vitest';
import { addHistory, clearAll, clearCurrent, listHistory, loadCurrent, saveCurrent } from '../../src/storage/db';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../../src/storage/settings';
import { replay } from '../../src/engine/game';
import { cfg, loadScenario, play } from './helpers';

const sc = loadScenario('accident-rain');

describe('שמירה מקומית', () => {
  it('שמירה וטעינה של ניסיון פעיל משחזרות את אותו מצב', async () => {
    const st = play(sc, ['f-injuries', 'GO', 'ARRIVE', 's-secure']);
    expect(await saveCurrent({ config: st.config, actions: st.actions, activeMs: 1234, startedAt: st.startedAt, savedAt: 'x', title: sc.title })).toBe(true);
    const g = await loadCurrent();
    expect(g).not.toBeNull();
    const r = replay(sc, g!.config, g!.actions);
    expect(r.turn).toBe(st.turn);
    expect(r.flags.secured).toBe(true);
    await clearCurrent();
    expect(await loadCurrent()).toBeNull();
  });

  it('שמירה פגומה מחזירה null', async () => {
    await saveCurrent({ config: undefined as never, actions: 'bad' as never, activeMs: 0, startedAt: '', savedAt: '', title: '' });
    expect(await loadCurrent()).toBeNull();
  });

  it('היסטוריה: הוספה, רשימה ומחיקה', async () => {
    const config = cfg(sc);
    await addHistory({ scenarioId: sc.id, title: sc.title, version: 1, seed: 1, shift: 'night', difficulty: 'standard', mode: 'practice', score: 80, endingTitle: 'x', finishedAt: '2026-01-01T00:00:00Z', durationMs: 1, config, actions: [], activeMs: 1, startedAt: '' });
    await addHistory({ scenarioId: sc.id, title: sc.title, version: 1, seed: 2, shift: 'night', difficulty: 'standard', mode: 'practice', score: 90, endingTitle: 'y', finishedAt: '2026-02-01T00:00:00Z', durationMs: 1, config, actions: [], activeMs: 1, startedAt: '' });
    const h = await listHistory();
    expect(h!.length).toBe(2);
    expect(h![0].score).toBe(90);
    expect(await clearAll()).toBe(true);
    expect(await listHistory()).toEqual([]);
  });

  it('הגדרות: ברירת מחדל ושמירה', () => {
    expect(loadSettings().lightsAnim).toBe(false);
    saveSettings({ ...DEFAULT_SETTINGS, textOnly: true });
    expect(loadSettings().textOnly).toBe(true);
    localStorage.setItem('siyur.settings.v1', '{broken');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
