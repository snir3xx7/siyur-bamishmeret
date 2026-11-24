import { useEffect, useState } from 'react';
import { audio } from '../audio/audio';
import { radioProfile, toGameRadio } from '../config/stations';
import { shiftLabel } from '../engine/feedback';
import { randomSeed } from '../engine/rng';
import type { CatalogEntry, Difficulty, Shift } from '../engine/types';
import { useApp } from '../ui/context';
import { loadCatalog, loadScenario } from '../ui/data';
import { go } from '../ui/router';
import { loadShift, parseShiftQuery, saveShift, type ShiftPlan } from '../ui/shift';
import { StationPicker } from '../ui/StationPicker';

const COUNTS = [2, 3, 4];

/** משמרת מלאה: אירועים ברצף, בתחנה ובמשמרת אחת, עם סיכום משמרת */
export function ShiftScreen({ query }: { query: URLSearchParams }) {
  const { startGame, settings, toast } = useApp();
  const [cat, setCat] = useState<CatalogEntry[]>([]);
  const [plan, setPlan] = useState<ShiftPlan | null>(() => loadShift());
  const [shift, setShift] = useState<Shift>('night');
  const [count, setCount] = useState(3);
  const [difficulty, setDifficulty] = useState<Difficulty>('standard');

  useEffect(() => {
    void loadCatalog().then(setCat, () => toast('לא ניתן לטעון את הקטלוג'));
  }, [toast]);

  // קישור משמרת מהמדריך: מחליף משמרת קיימת
  useEffect(() => {
    const q = parseShiftQuery(query);
    if (!q) return;
    const p: ShiftPlan = { ...q, idx: 0, startedAt: new Date().toISOString() };
    saveShift(p);
    setPlan(p);
    go('#/shift');
  }, [query]);

  const titleOf = (id: string) => cat.find((c) => c.id === id)?.title ?? id;
  const fitting = cat.filter((c) => c.shifts.includes(shift));

  const create = () => {
    const pool = [...fitting].sort(() => Math.random() - 0.5).slice(0, count);
    if (!pool.length) return;
    const p: ShiftPlan = { shift, difficulty, items: pool.map((c) => ({ id: c.id, seed: randomSeed() })), idx: 0, startedAt: new Date().toISOString() };
    saveShift(p);
    setPlan(p);
  };

  const startCurrent = async () => {
    if (!plan) return;
    const it = plan.items[plan.idx];
    try {
      const sc = await loadScenario(it.id);
      const shiftOk = sc.shifts.includes(plan.shift) ? plan.shift : sc.defaultShift;
      const p = radioProfile(settings.station, sc.dispatch.unit);
      audio.unlock();
      startGame(sc, {
        scenarioId: sc.id, version: sc.version, seed: it.seed, shift: shiftOk, difficulty: plan.difficulty, mode: 'practice', timeLimit: false,
        ...(p.real ? { radio: toGameRadio(p) } : {}),
      });
      go('#/play');
    } catch {
      toast('לא ניתן לטעון את האירוע הבא');
    }
  };

  const end = () => {
    saveShift(null);
    setPlan(null);
  };

  if (plan) {
    const done = plan.items.filter((i) => i.result);
    const finished = done.length === plan.items.length;
    const avg = done.length ? Math.round(done.reduce((s, i) => s + i.result!.score, 0) / done.length) : 0;
    return (
      <div className="stack">
        <h1>🚓 משמרת {shiftLabel(plan.shift)}</h1>
        <section className="card stack" data-testid="shift-plan">
          <ol className="shift-list">
            {plan.items.map((it, i) => (
              <li key={i} className={it.result ? 'done' : i === plan.idx ? 'now' : ''}>
                <b>אירוע {i + 1}: {titleOf(it.id)}</b>
                {it.result ? (
                  <span>
                    ציון {it.result.score} · נוהל קשר {it.result.proc}
                    {it.result.historyId && <> · <a href={`#/debrief?h=${it.result.historyId}`}>לתחקיר</a></>}
                  </span>
                ) : i === plan.idx ? <span>ממתין לניתוב מ־401</span> : <span>בהמשך המשמרת</span>}
              </li>
            ))}
          </ol>
          {finished ? (
            <div className="shift-summary" data-testid="shift-summary">
              <h2>סיכום משמרת</h2>
              <p>
                {done.length} אירועים · ציון ממוצע <b>{avg}</b>
              </p>
              <p className="small muted">בתחקיר של כל אירוע מופיעים הנקודות לשימור ולשיפור. במשמרת הבאה נסו לשפר את האירוע עם הציון הנמוך ביותר.</p>
              <div className="btn-row">
                <button type="button" className="btn primary" onClick={end}>סיום משמרת</button>
              </div>
            </div>
          ) : (
            <div className="btn-row">
              <button type="button" className="btn primary" onClick={() => void startCurrent()} data-testid="shift-next">
                📻 {done.length ? '401 מנתב אליך את האירוע הבא ▶' : 'תחילת משמרת – קבלת אירוע ראשון ▶'}
              </button>
              <button type="button" className="btn ghost" onClick={() => { if (confirm('לבטל את המשמרת?')) end(); }}>
                ביטול המשמרת
              </button>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>🚓 משמרת מלאה</h1>
      <p>כמו בשטח: כמה אירועים ברצף באותה משמרת. אחרי כל אירוע – תחקיר קצר, ואז ראש המשמרת מנתב אליך את האירוע הבא. בסוף: סיכום משמרת.</p>
      <div className="card stack">
        <fieldset>
          <legend>משמרת</legend>
          <div className="radio-row" role="radiogroup">
            {(['morning', 'evening', 'night'] as Shift[]).map((s) => (
              <label key={s}>
                <input type="radio" name="shift" checked={shift === s} onChange={() => setShift(s)} />
                <span>{shiftLabel(s)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>מספר אירועים</legend>
          <div className="radio-row" role="radiogroup">
            {COUNTS.map((n) => (
              <label key={n}>
                <input type="radio" name="count" checked={count === n} onChange={() => setCount(n)} />
                <span>{n}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>רמת קושי</legend>
          <div className="radio-row" role="radiogroup">
            {([['basic', 'בסיסית'], ['standard', 'רגילה'], ['advanced', 'מתקדמת']] as [Difficulty, string][]).map(([d, l]) => (
              <label key={d}>
                <input type="radio" name="diff" checked={difficulty === d} onChange={() => setDifficulty(d)} />
                <span>{l}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <StationPicker fictionalUnit="סייר 23" />
        <p className="small muted">{fitting.length} תרחישים מתאימים למשמרת {shiftLabel(shift)}.</p>
        <div className="btn-row">
          <button type="button" className="btn primary" onClick={create} disabled={!fitting.length} data-testid="shift-create">
            יצירת משמרת
          </button>
        </div>
      </div>
    </div>
  );
}
