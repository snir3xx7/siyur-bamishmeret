import { useMemo, useState } from 'react';
import { classSummary, type ResultCard } from '../engine/results';
import { DOMAIN_LABELS } from '../engine/scoring';
import type { Domain } from '../engine/types';
import { adminFetch, trackingOn, type AdminRow } from '../tracking/track';

const EV: Record<AdminRow['event'], string> = { enter: '🚪 כניסה', start: '▶ התחיל תרחיש', finish: '✓ סיים תרחיש', review: '🔎 מצא את הטעויות' };
const KIND: Record<string, string> = { good: '✓ טוב', partial: '◐ חלקי', retry: '✗ לתיקון' };
const when = (iso: string) => {
  const d = new Date(iso);
  return isNaN(+d) ? iso : d.toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

function toCard(r: AdminRow): ResultCard {
  return {
    v: 1, trainee: r.trainee, scenarioId: r.scenarioId, title: r.title, version: 0, variant: '', seed: 0, at: r.at,
    total: r.total ?? 0, ending: r.ending, endingKind: (r.endingKind as ResultCard['endingKind']) || 'retry',
    domains: r.domains as ResultCard['domains'], improve: r.improve, extra: { procedure: r.extra.procedure ?? 0, bodycam: r.extra.bodycam ?? 0, ...r.extra },
  };
}

/** ניהול: מי נכנס, מה עשה, אילו תרחישים השלים והמשוב שקיבל. מוגן בסיסמה שנבדקת בגיליון של המדריך */
export function Admin() {
  const [pw, setPw] = useState('');
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [team, setTeam] = useState('');
  const [who, setWho] = useState('');

  const load = async () => {
    setBusy(true);
    setErr('');
    const r = await adminFetch(pw);
    setBusy(false);
    if (r.ok) setRows(r.rows.slice().reverse());
    else setErr(r.error === 'password' ? 'סיסמה שגויה.' : r.error === 'locked' ? 'יותר מדי ניסיונות. נסו שוב בעוד רבע שעה.' : 'אין חיבור לגיליון. בדקו רשת ונסו שוב.');
  };

  const view = useMemo(() => (rows ?? []).filter((r) => !team || r.team === team), [rows, team]);
  const teams = useMemo(() => [...new Set((rows ?? []).map((r) => r.team).filter(Boolean))], [rows]);
  const finishes = view.filter((r) => r.event === 'finish');
  const sum = useMemo(() => classSummary(finishes.map(toCard)), [finishes]);
  const people = useMemo(() => {
    const names = [...new Set(view.map((r) => r.trainee))];
    return names
      .map((n) => {
        const xs = view.filter((r) => r.trainee === n);
        const fin = xs.filter((r) => r.event === 'finish');
        return {
          name: n,
          team: xs[0]?.team ?? '',
          last: xs[0]?.at ?? '',
          enters: xs.filter((r) => r.event === 'enter').length,
          started: xs.filter((r) => r.event === 'start').length,
          finished: fin.length,
          distinct: new Set(fin.map((r) => r.scenarioId)).size,
          good: fin.filter((r) => r.endingKind === 'good').length,
          avg: fin.length ? Math.round(fin.reduce((a, r) => a + (r.total ?? 0), 0) / fin.length) : null,
        };
      })
      .sort((a, b) => b.last.localeCompare(a.last));
  }, [view]);

  if (!trackingOn())
    return (
      <section className="card stack">
        <h1>🔐 ניהול</h1>
        <p>המעקב עדיין לא הופעל. כדי להפעיל: גיליון Google פרטי וסקריפט קצר – ההוראות ב־<code>docs/admin/README.md</code>.</p>
      </section>
    );

  if (!rows)
    return (
      <section className="card stack admin-login" data-testid="admin-login">
        <h1>🔐 ניהול – למדריך בלבד</h1>
        <p className="small muted">הסיסמה נבדקת בגיליון של המדריך ולא נשמרת באתר או במכשיר.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
          className="stack"
        >
          <label>
            סיסמה
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" data-testid="admin-pw" />
          </label>
          <button type="submit" className="btn primary" disabled={!pw || busy} data-testid="admin-enter">
            {busy ? 'בודק…' : 'כניסה'}
          </button>
          {err && <p className="point challenge" role="alert">{err}</p>}
        </form>
      </section>
    );

  const sel = who ? view.filter((r) => r.trainee === who) : [];
  return (
    <div className="stack admin" data-testid="admin">
      <div className="btn-row admin-top">
        <h1>🔐 ניהול – מעקב חניכים</h1>
        <button type="button" className="btn small" onClick={() => void load()} disabled={busy}>
          ↻ רענון
        </button>
        <button type="button" className="btn small ghost" onClick={() => { setRows(null); setPw(''); }}>
          יציאה
        </button>
      </div>
      {teams.length > 1 && (
        <label className="admin-filter">
          קורס / צוות
          <select value={team} onChange={(e) => { setTeam(e.target.value); setWho(''); }}>
            <option value="">כולם</option>
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      )}

      <section className="card">
        <div className="board-kpis">
          <div><b>{people.length}</b><span>חניכים</span></div>
          <div><b>{view.filter((r) => r.event === 'enter').length}</b><span>כניסות</span></div>
          <div><b>{view.filter((r) => r.event === 'start').length}</b><span>תרחישים שהתחילו</span></div>
          <div><b>{finishes.length}</b><span>הושלמו</span></div>
          <div><b>{sum.avg}</b><span>ציון ממוצע</span></div>
        </div>
      </section>

      <section className="card stack">
        <h2>חניכים</h2>
        <div className="table-wrap">
          <table className="board-table" data-testid="admin-people">
            <thead>
              <tr><th>חניך</th><th>צוות</th><th>פעילות אחרונה</th><th>כניסות</th><th>התחיל</th><th>השלים</th><th>תרחישים שונים</th><th>סיום טוב</th><th>ממוצע</th><th /></tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.name} className={who === p.name ? 'sel' : ''}>
                  <td>{p.name}</td><td>{p.team}</td><td>{when(p.last)}</td><td>{p.enters}</td><td>{p.started}</td><td>{p.finished}</td><td>{p.distinct}</td><td>{p.good}</td><td>{p.avg ?? '–'}</td>
                  <td><button type="button" className="btn small ghost" onClick={() => setWho(who === p.name ? '' : p.name)}>{who === p.name ? 'סגירה' : 'פירוט'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {who && (
        <section className="card stack" data-testid="admin-detail">
          <h2>{who} – מה עשה</h2>
          <ol className="admin-timeline">
            {sel.map((r, i) => (
              <li key={i} className={r.event}>
                <span className="small muted">{when(r.at)}</span> <b>{EV[r.event]}</b>
                {r.title && <> · {r.title}</>}
                {r.event === 'finish' && (
                  <details>
                    <summary>
                      ציון {r.total} · {KIND[r.endingKind] ?? ''} {r.ending}
                    </summary>
                    <ul className="small">
                      {(Object.keys(r.domains) as Domain[]).map((d) => <li key={d}>{DOMAIN_LABELS[d] ?? d}: {r.domains[d]}%</li>)}
                    </ul>
                    {r.improve.length > 0 && (
                      <>
                        <b className="small">משוב לשיפור:</b>
                        <ul className="small">{r.improve.map((t) => <li key={t}>{t}</li>)}</ul>
                      </>
                    )}
                  </details>
                )}
                {r.event === 'review' && <> · {r.ending} ({r.total}% החלטות נכונות)</>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {finishes.length > 0 && (
        <>
          <section className="card stack">
            <h2>תחומים לחיזוק</h2>
            <ul className="board-bars">
              {sum.domains.map((d) => (
                <li key={d.d}>
                  <span>{d.label}</span>
                  <span className="bar"><i style={{ width: `${d.avg}%` }} className={d.avg < 60 ? 'low' : d.avg < 80 ? 'mid' : 'high'} /></span>
                  <b>{d.avg}%</b>
                </li>
              ))}
            </ul>
            {sum.common.length > 0 && (
              <>
                <h3>משוב שחוזר הכי הרבה</h3>
                <ul className="proc-list">
                  {sum.common.map((c) => (
                    <li key={c.text} className="bad"><b>{c.n} סבבים</b><span>{c.text}</span></li>
                  ))}
                </ul>
              </>
            )}
          </section>
          <section className="card stack">
            <h2>לפי תרחיש</h2>
            <div className="table-wrap">
              <table className="board-table">
                <thead><tr><th>תרחיש</th><th>התחילו</th><th>השלימו</th><th>ממוצע</th><th>סיום טוב</th></tr></thead>
                <tbody>
                  {sum.byScenario.map((s) => (
                    <tr key={s.id}><td>{s.title}</td><td>{view.filter((r) => r.event === 'start' && r.scenarioId === s.id).length}</td><td>{s.n}</td><td>{s.avg}</td><td>{s.good}/{s.n}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
