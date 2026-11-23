import { createContext, useContext } from 'react';
import type { GameAction, GameConfig, GameState, Scenario } from '../engine/types';
import type { Settings } from '../storage/settings';

export interface Game {
  sc: Scenario;
  st: GameState;
  historyId?: number;
}

export interface AppCtx {
  settings: Settings;
  setSettings: (s: Settings) => void;
  game: Game | null;
  startGame: (sc: Scenario, config: GameConfig, actions?: GameAction[], activeMs?: number) => void;
  dispatch: (a: GameAction) => void;
  setGame: (g: Game | null) => void;
  settingsOpen: boolean;
  openSettings: (open: boolean) => void;
  toast: (msg: string) => void;
  storageOk: boolean;
  reducedMotion: boolean;
}

export const Ctx = createContext<AppCtx>(null as unknown as AppCtx);
export const useApp = () => useContext(Ctx);
