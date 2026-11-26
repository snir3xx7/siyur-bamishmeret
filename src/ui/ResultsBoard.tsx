import { useMemo, useState } from 'react';
import { classSummary, decodeResults, mergeResults, resultsCsv, type ResultCard } from '../engine/results';
import { useApp } from './context';

const KEY = 'siyur.instructor.results';

function load(): ResultCard[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}
function save(rs: ResultCard[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rs));
  } catch {
    /* אחסון חסום – נשאר בזיכרון */
  }
}

const KIND = { good: '✓ טוב', partial: '◐ חלקי', retry: '✗ לתיקון' } as const;

/** לוח תוצאות הכיתה: מדביקים קודים מהחניכים או טוענים קבצים. נשמר רק במכשיר הזה */
export function ResultsBoard() {
  const { toast } = useApp();
  const [rs, setRs] = useState<ResultCard[]>(load);
  const [text, setText] = useState('');
  const [who, setWho] = useState('');
  const sum = useMemo(() => classSummary(rs), [rs]);
  const shown = who ? rs.filter((r) => r.trainee === who) : rs;

  const add = (found: ResultCard[]) => {
    if (!found.length) return toast('לא נמצאו קודי תוצאה תקינים');
    const next = mergeResults(rs, found);
    setRs(next);
    save(next);
    toast(`נוספו ${found.length} תוצאות`);
  };

  return (
    <section className="card stack" aria-labelledby="board-title" data-testid="results-board">
      <h2 id="board-title">📊 לוח תוצאות הכיתה</h2>
      <p className="small muted">
        בסוף כל תרחיש החניך לוחץ „העתקת קוד תוצאה” ושולח לך. הדביקו כאן כמה קודים יחד (גם הודעות שלמות), או טענו קבצים. הנתונים נשמרים רק בדפדפן הזה.
      </p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="SIYUR1:…" className="ltr" data-testid="results-paste" />
      <div className="btn-row">
        <button type="button" className="btn primary" onClick={() => { add(decodeResults(text)); setText(''); }} data-testid="results-add">
          הוספת תוצאות
        </button>
        <label className="btn">
          טעינת קבצים
          <input
            type="file"
            accept=".json,.txt,application/json,text/plain"
            multiple
            hidden
            onChange={async (e) => {
              const files = [...(e.target.files ?? [])];
              const found = (await Promise.all(files.map((f) => f.text()))).flatMap(decodeResults);
              add(found);
              e.target.value = '';
            }}
          />
        </label>
        {rs.length > 0 && (
          <>
            <button
              type="button"
              className="btn"
              onClick={() => {
                const blob = new Blob(['﻿' + resultsCsv(rs)], { type: 'text/csv;charset=utf-8' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'תוצאות-כיתה.csv';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
              }}
            >
              ⬇ ייצוא לאקסל (CSV)
            </button>
            <button type="button" className="btn ghost" onClick={() => { if (confirm('למחוק את כל התוצאות מהמכשיר הזה?')) { setRs([]); save([]); } }}>
              ניקוי הלוח
            </button>
          </>
        )}
      </div>

      {rs.length > 0 && (
        <>
          <div className="board-kpis">
            <div><b>{sum.trainees.length}</b><span>חניכים</span></div>
            <div><b>{sum.attempts}</b><span>סבבים</span></div>
            <div><b>{sum.avg}</b><span>ציון ממוצע</span></div>
            <div><b>{sum.extra.procedure}%</b><span>נוהל קשר</span></div>
            <div><b>{sum.extra.bodycam}%</b><span>מצלמת גוף</span></div>
          </div>

          <h3>תחומים לחיזוק (מהחלש לחזק)</h3>
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
              <h3>נקודות לשיפור שחוזרות בכיתה</h3>
              <ul className="proc-list">
                {sum.common.map((c) => (
                  <li key={c.text} className="bad">
                    <b>{c.n} סבבים</b>
                    <span>{c.text}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3>לפי תרחיש</h3>
          <div className="table-wrap">
            <table className="board-table">
              <thead><tr><th>תרחיש</th><th>סבבים</th><th>ממוצע</th><th>סיום טוב</th></tr></thead>
              <tbody>
                {sum.byScenario.map((s) => (
                  <tr key={s.id}><td>{s.title}</td><td>{s.n}</td><td>{s.avg}</td><td>{s.good}/{s.n}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>לפי חניך</h3>
          <div className="table-wrap">
            <table className="board-table" data-testid="board-trainees">
              <thead><tr><th>חניך</th><th>סבבים</th><th>ממוצע</th><th /></tr></thead>
              <tbody>
                {sum.byTrainee.map((t) => (
                  <tr key={t.trainee} className={who === t.trainee ? 'sel' : ''}>
                    <td>{t.trainee}</td><td>{t.n}</td><td>{t.avg}</td>
                    <td><button type="button" className="btn small ghost" onClick={() => setWho(who === t.trainee ? '' : t.trainee)}>{who === t.trainee ? 'הכול' : 'פירוט'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>{who ? `הסבבים של ${who}` : 'כל הסבבים'}</h3>
          <div className="table-wrap">
            <table className="board-table">
              <thead><tr><th>תאריך</th><th>חניך</th><th>תרחיש</th><th>ציון</th><th>סיום</th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={`${r.trainee}|${r.scenarioId}|${r.at}`} title={r.improve.join('\n')}>
                    <td className="ltr">{r.at.slice(0, 16).replace('T', ' ')}</td><td>{r.trainee}</td><td>{r.title}</td><td>{r.total}</td><td>{KIND[r.endingKind]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
