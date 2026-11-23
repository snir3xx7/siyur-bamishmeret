import type { GameAction, GameConfig } from '../engine/types';

/** שמירת ניסיון פעיל והיסטוריה ב-IndexedDB. כל כשל מוחזר כ-false/null – המשחק ממשיך בלי שמירה. */

export interface SavedGame {
  config: GameConfig;
  actions: GameAction[];
  activeMs: number;
  startedAt: string;
  savedAt: string;
  title: string;
}

export interface HistoryItem {
  id?: number;
  scenarioId: string;
  title: string;
  version: number;
  seed: number;
  shift: string;
  difficulty: string;
  mode: string;
  score: number;
  endingTitle: string;
  finishedAt: string;
  durationMs: number;
  config: GameConfig;
  actions: GameAction[];
  activeMs: number;
  startedAt: string;
  reportEdits?: Record<string, string>;
}

const DB = 'siyur-bamishmeret';
let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('history')) db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('blocked'));
    } catch (e) {
      reject(e);
    }
  });
  dbp.catch(() => (dbp = null));
  return dbp;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function saveCurrent(g: SavedGame): Promise<boolean> {
  try {
    await tx('kv', 'readwrite', (s) => s.put(g, 'current'));
    return true;
  } catch {
    return false;
  }
}

export async function loadCurrent(): Promise<SavedGame | null> {
  try {
    const g = await tx<SavedGame | undefined>('kv', 'readonly', (s) => s.get('current'));
    if (!g || !g.config || !Array.isArray(g.actions)) return null;
    return g;
  } catch {
    return null;
  }
}

export async function clearCurrent(): Promise<void> {
  try {
    await tx('kv', 'readwrite', (s) => s.delete('current'));
  } catch {
    /* ignore */
  }
}

export async function addHistory(h: HistoryItem): Promise<number | null> {
  try {
    return (await tx<IDBValidKey>('history', 'readwrite', (s) => s.add(h))) as number;
  } catch {
    return null;
  }
}

export async function updateHistory(h: HistoryItem): Promise<boolean> {
  try {
    await tx('history', 'readwrite', (s) => s.put(h));
    return true;
  } catch {
    return false;
  }
}

export async function listHistory(): Promise<HistoryItem[] | null> {
  try {
    const all = await tx<HistoryItem[]>('history', 'readonly', (s) => s.getAll());
    return all.sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
  } catch {
    return null;
  }
}

export async function clearAll(): Promise<boolean> {
  try {
    await tx('history', 'readwrite', (s) => s.clear());
    await tx('kv', 'readwrite', (s) => s.clear());
    return true;
  } catch {
    return false;
  }
}

export async function storageAvailable(): Promise<boolean> {
  try {
    await open();
    return true;
  } catch {
    return false;
  }
}
