import { useEffect, useState } from 'react';
import { shiftLabel } from '../engine/feedback';
import type { CatalogEntry } from '../engine/types';
import { loadCatalog } from '../ui/data';

export function Catalog() {
  const [items, setItems] = useState<CatalogEntry[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    loadCatalog().then(setItems, () => setErr(true));
  }, []);

  if (err) return <p role="alert">לא ניתן לטעון את קטלוג התרחישים. בדקו חיבור ונסו שוב.</p>;
  if (!items) return <p aria-busy="true">טוען קטלוג…</p>;

  const cats = [...new Set(items.map((i) => i.category))];
  return (
    <div>
      <h1>קטלוג תרחישים</h1>
      <p className="muted">תרחישים לתרגול לפי תחום. בכל תרחיש: זמן משוער, מיומנויות לתרגול ורמת קושי.</p>
      {cats.map((c) => (
        <section key={c} className="catalog-cat" aria-labelledby={`cat-${c}`}>
          <h2 id={`cat-${c}`}>{c}</h2>
          <div className="grid2">
            {items
              .filter((i) => i.category === c)
              .map((i) => (
                <a key={i.id} className="card scn-card" href={`#/s/${i.id}`} data-testid={`scn-${i.id}`}>
                  <h3>{i.title}</h3>
                  <p className="small">{i.summary}</p>
                  <div className="meta">
                    <span className="chip">⏱ כ־<bdi>{i.estimatedMinutes}</bdi> דקות</span>
                    <span className="chip">רמת קושי: {i.difficultyLabel}</span>
                    <span className="chip">משמרות: {i.shifts.map(shiftLabel).join(' · ')}</span>
                  </div>
                  <div className="skills" aria-label="מיומנויות לתרגול">
                    {i.skills.map((s) => (
                      <span key={s} className="chip ok">
                        {s}
                      </span>
                    ))}
                  </div>
                </a>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
