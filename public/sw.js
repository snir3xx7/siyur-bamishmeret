/* service worker – סיור במשמרת
 * מעטפת האפליקציה נשמרת בהתקנה (לפי precache.json שנוצר ב-build).
 * נכסי תרחיש נשמרים רק כשהמשתמש לוחץ „הורדת תרחיש לשימוש לא מקוון” (מטמון siyur-scn-*).
 */
const SHELL = 'siyur-shell';

async function precacheShell() {
  const scope = self.registration.scope;
  const res = await fetch(new URL('precache.json', scope), { cache: 'no-store' });
  const { version, files } = await res.json();
  const name = `${SHELL}-${version}`;
  const cache = await caches.open(name);
  await cache.addAll(files.map((f) => new URL(f, scope).toString()));
  // index.html גם בשם מפורש
  const idx = await cache.match(new URL('./', scope).toString());
  if (idx) await cache.put(new URL('index.html', scope).toString(), idx.clone());
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => k.startsWith(SHELL) && k !== name).map((k) => caches.delete(k)));
}

self.addEventListener('install', (e) => {
  e.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'precache-shell') e.waitUntil(precacheShell().catch(() => undefined));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // ניווט: רשת תחילה, ובניתוק – index.html מהמטמון
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(async () => (await caches.match(new URL('index.html', self.registration.scope).toString())) || Response.error()),
    );
    return;
  }
  // JSON של תרחישים: רשת תחילה (כדי לקבל גרסה עדכנית), מטמון בניתוק
  if (url.pathname.endsWith('.json')) {
    e.respondWith(
      fetch(req).catch(async () => (await caches.match(req, { ignoreSearch: true })) || Response.error()),
    );
    return;
  }
  // שאר הנכסים: מטמון תחילה, אחר כך רשת
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
