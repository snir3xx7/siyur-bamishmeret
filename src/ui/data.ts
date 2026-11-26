import { withProcedure } from '../engine/procedure';
import type { CatalogEntry, Scenario } from '../engine/types';
import { getCustom, isCustomId } from '../storage/custom';

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
  if (isCustomId(id)) {
    const c = getCustom(id);
    // לא נשמר במטמון – עריכה חוזרת נטענת מיד
    return c ? Promise.resolve(withProcedure(stripProcedure(c))) : Promise.reject(new Error('missing'));
  }
  let p = cache.get(id);
  if (!p) {
    p = fetch(assetUrl(`scenarios/${id}.json`), { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<Scenario>;
    }).then(withProcedure);
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}

/** התרחישים השמורים הם המקור (בלי שכבת הנוהל שמתווספת בטעינה) */
function stripProcedure(sc: Scenario): Scenario {
  return JSON.parse(JSON.stringify(sc)) as Scenario;
}
