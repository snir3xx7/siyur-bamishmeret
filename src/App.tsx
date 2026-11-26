import { Editor } from './screens/Editor';
import { Admin } from './screens/Admin';
import { identity, track, trackingOn } from './tracking/track';
import { buildResult } from './engine/results';
import { Review } from './screens/Review';
import { ShiftScreen } from './screens/Shift';
import { Help } from './screens/Help';
import { Officer } from './screens/Officer';
import { IntroVideo } from './ui/IntroVideo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audio } from './audio/audio';
import { createGame, reduce, replay } from './engine/game';
import type { GameAction, GameConfig, Scenario } from './engine/types';
import { About } from './screens/About';
import { Catalog } from './screens/Catalog';
import { DebriefScreen } from './screens/Debrief';
import { History } from './screens/History';
import { Home } from './screens/Home';
import { Instructor } from './screens/Instructor';
import { Play } from './screens/Play';
import { ScenarioCard } from './screens/ScenarioCard';
import { storageAvailable } from './storage/db';
import { loadSettings, prefersReducedMotion, saveSettings, type Settings } from './storage/settings';
import { Ctx, type Game } from './ui/context';
import { useRoute } from './ui/router';
import { SettingsDialog } from './ui/SettingsDialog';
import { Shell } from './ui/Shell';

export default function App() {
  const route = useRoute();
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const [game, setGame] = useState<Game | null>(null);
  const [settingsOpen, openSettings] = useState(false);
  const [toastMsg, setToast] = useState<string | null>(null);
  const [storageOk, setStorageOk] = useState(true);
  const toastTimer = useRef<number>();

  useEffect(() => {
    void storageAvailable().then(setStorageOk);
  }, []);

  const setSettings = useCallback((s: Settings) => {
    setSettingsState(s);
    saveSettings(s);
  }, []);

  useEffect(() => {
    audio.applySettings(settings);
    document.body.classList.toggle('text-large', settings.textSize === 'large');
  }, [settings]);

  // פעולת המשתמש הראשונה פותחת את ערוץ השמע (דרישת דפדפנים)
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    const vis = () => (document.hidden ? audio.suspend() : audio.resume());
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, []);

  const toast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  const startGame = useCallback((sc: Scenario, config: GameConfig, actions?: GameAction[], activeMs?: number) => {
    const st = actions ? replay(sc, config, actions) : createGame(sc, config);
    if (!actions) track({ event: 'start', scenarioId: sc.id, title: sc.title, version: sc.version });
    if (typeof activeMs === 'number' && activeMs > st.activeMs) st.activeMs = activeMs;
    setGame({ sc, st });
  }, []);

  const dispatch = useCallback((a: GameAction) => {
    setGame((g) => {
      if (!g) return g;
      const st = reduce(g.sc, g.st, a);
      return st === g.st ? g : { ...g, st };
    });
  }, []);

  // מעקב: כניסה (פעם אחת בכל פתיחה של האתר) וסיום תרחיש עם ציון ומשוב
  useEffect(() => {
    try {
      if (trackingOn() && identity().name && !sessionStorage.getItem('siyur.entered')) {
        sessionStorage.setItem('siyur.entered', '1');
        track({ event: 'enter' });
      }
    } catch {
      /* אחסון חסום */
    }
  }, []);
  const tracked = useRef('');
  useEffect(() => {
    if (!game || game.st.stage !== 'ended' || game.st.actions.length === 0) return;
    const key = `${game.sc.id}|${game.st.startedAt}`;
    if (tracked.current === key) return;
    tracked.current = key;
    if (!trackingOn()) return;
    const r = buildResult(game.sc, game.st, identity().name);
    track({ event: 'finish', scenarioId: r.scenarioId, title: r.title, version: r.version, total: r.total, ending: r.ending, endingKind: r.endingKind, domains: r.domains as Record<string, number>, improve: r.improve, extra: r.extra as Record<string, number> });
  }, [game]);

  const reducedMotion = prefersReducedMotion(settings);
  const ctx = useMemo(
    () => ({ settings, setSettings, game, startGame, dispatch, setGame, settingsOpen, openSettings, toast, storageOk, reducedMotion }),
    [settings, setSettings, game, startGame, dispatch, settingsOpen, toast, storageOk, reducedMotion],
  );

  const [p0, p1] = route.path;
  let screen: JSX.Element;
  if (p0 === 'catalog') screen = <Catalog />;
  else if (p0 === 's' && p1) screen = <ScenarioCard id={p1} query={route.query} />;
  else if (p0 === 'play') screen = <Play />;
  else if (p0 === 'debrief') screen = <DebriefScreen query={route.query} />;
  else if (p0 === 'history') screen = <History />;
  else if (p0 === 'instructor') screen = <Instructor />;
  else if (p0 === 'about') screen = <About />;
  else if (p0 === 'shift') screen = <ShiftScreen query={route.query} />;
  else if (p0 === 'help') screen = <Help />;
  else if (p0 === 'officer') screen = <Officer />;
  else if (p0 === 'review' && p1) screen = <Review id={p1} />;
  else if (p0 === 'editor') screen = <Editor id={p1} />;
  else if (p0 === 'admin') screen = <Admin />;
  else screen = <Home />;

  return (
    <Ctx.Provider value={ctx}>
      {p0 === 'play' ? screen : <Shell>{screen}</Shell>}
      <SettingsDialog />
      <IntroVideo />
      {toastMsg && (
        <div className="toast" role="status">
          {toastMsg}
        </div>
      )}
    </Ctx.Provider>
  );
}
