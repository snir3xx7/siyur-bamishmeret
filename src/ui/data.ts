import type { CatalogEntry, Scenario } from '../engine/types';

const cache = new Map<string, Promise<Scenario>>();

export function assetUrl(p: string) {
  return `${import.meta.env.BASE_URL}${p}`;
}

export async function loadCatalog(): Promise<CatalogEntry[]> {
  const r = await fetch(assetUrl('scenarios/index.json'), { cache: 'no-cache' });
  if (!r.ok) throw new Error('catalog');
  const j = await r.json();
  return j.scenarios as CatalogEntry[];
}

export function loadScenario(id: string): Promise<Scenario> {
  if (!/^[a-z0-9-]+$/.test(id)) return Promise.reject(new Error('bad id'));
  let p = cache.get(id);
  if (!p) {
    p = fetch(assetUrl(`scenarios/${id}.json`), { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<Scenario>;
    });
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}
