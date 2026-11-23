import { useEffect, useState } from 'react';

export interface Route {
  path: string[];
  query: URLSearchParams;
}

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#\/?/, '');
  const [p, q = ''] = h.split('?');
  return { path: p.split('/').filter(Boolean), query: new URLSearchParams(q) };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function go(hash: string) {
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = hash;
}

/** קישור קבוע לגרסת תרחיש: מזהה, גרסה וזרע בלבד */
export function scenarioLink(id: string, version: number, seed: number): string {
  const base = location.href.split('#')[0];
  return `${base}#/s/${encodeURIComponent(id)}?v=${version}&seed=${seed}`;
}
