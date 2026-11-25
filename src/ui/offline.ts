import type { Scenario } from '../engine/types';
import { assetUrl } from './data';
import { loadRadioIndex } from '../audio/voiceKey';

/** רישום service worker – רק בבנייה לפרודקשן */
export function registerSW() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(assetUrl('sw.js'), { scope: assetUrl('') }).catch(() => undefined);
  });
}

const cacheName = (sc: Scenario) => `siyur-scn-${sc.id}-v${sc.version}`;

export function scenarioAssets(sc: Scenario): string[] {
  const urls = new Set<string>([`scenarios/${sc.id}.json`, 'scenarios/index.json']);
  sc.media.images.forEach((i) => urls.add(i));
  sc.media.audio.forEach((a) => urls.add(a));
  Object.values(sc.media.voice).forEach((v) => urls.add(v));
  Object.values(sc.media.voiceLines ?? {}).forEach((v) => urls.add(v));
  ['audio/radio-chirp.mp3', 'audio/radio-end.mp3', 'audio/ui-click.mp3', 'audio/sample.mp3'].forEach((a) => urls.add(a));
  return [...urls].map(assetUrl);
}

export type OfflineState = 'unsupported' | 'none' | 'partial' | 'ready';

/** מוכן לשימוש לא מקוון = מעטפת האפליקציה וכל נכסי התרחיש נמצאים במטמון */
export async function offlineStatus(sc: Scenario): Promise<OfflineState> {
  if (!('caches' in window) || !('serviceWorker' in navigator)) return 'unsupported';
  try {
    const shell = await caches.match(assetUrl('index.html')) || await caches.match(assetUrl(''));
    const c = await caches.open(cacheName(sc));
    const urls = scenarioAssets(sc);
    const hits = await Promise.all(urls.map((u) => c.match(u)));
    const n = hits.filter(Boolean).length;
    if (n === urls.length && shell) return 'ready';
    return n > 0 ? 'partial' : 'none';
  } catch {
    return 'unsupported';
  }
}

/** פתיחות השידור של התחנה שנבחרה („מרכז מסבא 402”…) – כדי שגם בלי אינטרנט הקשר יישמע מלא */
export async function stationRadioAssets(stationId?: string): Promise<string[]> {
  const idx = await loadRadioIndex();
  const dirs = ['common', 'fictional', ...(stationId ? [stationId] : [])].map((d) => `audio/radio/${d}/`);
  return ['audio/radio/index.json', ...Object.values(idx).filter((f) => dirs.some((d) => f.startsWith(d)))].map(assetUrl);
}

export async function downloadScenario(sc: Scenario, onProgress?: (done: number, total: number) => void, stationId?: string): Promise<OfflineState> {
  if (!('caches' in window) || !('serviceWorker' in navigator)) return 'unsupported';
  if (!import.meta.env.PROD) return 'unsupported';
  await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 8000))]);
  // מוודאים שמעטפת האפליקציה נשמרה (ה-service worker שומר אותה בהתקנה)
  const reg = await navigator.serviceWorker.getRegistration();
  reg?.active?.postMessage({ type: 'precache-shell' });
  const c = await caches.open(cacheName(sc));
  const urls = [...scenarioAssets(sc), ...(await stationRadioAssets(stationId).catch(() => []))];
  // הורדה במקביל (6 בכל פעם) – מהיר בהרבה בטלפון מהורדה אחד־אחד
  let done = 0;
  const queue = [...urls];
  const worker = async () => {
    for (let u = queue.shift(); u; u = queue.shift()) {
      try {
        const r = await fetch(u, { cache: 'reload' });
        if (r.ok) await c.put(u, r);
      } catch {
        /* נבדוק בסוף */
      }
      onProgress?.(++done, urls.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  for (let i = 0; i < 20; i++) {
    const s = await offlineStatus(sc);
    if (s === 'ready') return s;
    await new Promise((r) => setTimeout(r, 300));
  }
  return offlineStatus(sc);
}

export async function removeScenario(sc: Scenario) {
  try {
    await caches.delete(cacheName(sc));
  } catch {
    /* ignore */
  }
}
