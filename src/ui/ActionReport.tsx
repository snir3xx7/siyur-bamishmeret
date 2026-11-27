import { useMemo, useState } from 'react';
import { FACT_CLASS_LABEL, factQuiz, gradeActionReport, powerQuiz, type ActionReportAnswers, type FactClass } from '../engine/actionReport';
import type { GameState, Scenario } from '../engine/types';

const CLASSES: FactClass[] = ['seen', 'said', 'dispatch', 'none'];

/** „כתוב את הדוח שלך”: סיווג כל פרט וסימון הסמכויות שהופעלו, ואז השוואה למה שקרה בפועל */
export function ActionReport({ sc, st }: { sc: Scenario; st: GameState }) {
  const facts = useMemo(() => factQuiz(sc, st), [sc, st]);
  const powers = useMemo(() => powerQuiz(sc, st), [sc, st]);
  const [a, setA] = useState<ActionReportAnswers>({ facts: {}, powers: {} });
  const [why, setWhy] = useState('');
  const [checked, setChecked] = useState(false);
  const g = checked ? gradeActionReport(sc, st, a) : null;
  const done = facts.every((f) => a.facts[f.id]);

  return (
    <section className="card print-debrief action-report" aria-labelledby="ar-title" data-testid="action-report">
      <h2 id="ar-title">✍️ הדוח שלך <span className="small muted">(לא נכלל בציון)</span></h2>
      <p className="small muted">
        כתוב דוח פעולה: לכל פרט – האם ראית או אימתת אותו, האם מישהו טען אותו, האם רק המשל״ט מסר, או שבכלל לא ידוע לך. אחר כך סמן אילו סמכויות הפעלת.
      </p>
      <ol className="ar-facts">
        {facts.map((f, i) => {
          const r = g?.facts[i];
          return (
            <li key={f.id} className={r ? (r.ok ? 'ok' : 'bad') : ''} data-testid={`ar-fact-${f.id}`}>
              <span className="ar-text">{f.text}</span>
              <span className="ar-opts" role="radiogroup" aria-label={f.text}>
                {CLASSES.map((c) => (
                  <label key={c} className={`ar-opt${a.facts[f.id] === c ? ' on' : ''}`}>
                    <input type="radio" name={`ar-${f.id}`} checked={a.facts[f.id] === c} disabled={checked} onChange={() => setA({ ...a, facts: { ...a.facts, [f.id]: c } })} />
                    {FACT_CLASS_LABEL[c]}
                  </label>
                ))}
              </span>
              {r && !r.ok && (
                <span className="small ar-why">
                  ✗ הנכון: <b>{FACT_CLASS_LABEL[r.answer]}</b> – {r.why}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {powers.length > 0 && (
        <fieldset className="ar-powers">
          <legend>סמכויות שהפעלתי</legend>
          {powers.map((p, i) => {
            const r = g?.powers[i];
            return (
              <label key={p.id} className={r ? (r.ok ? 'ok' : 'bad') : ''}>
                <input type="checkbox" checked={!!a.powers[p.id]} disabled={checked} onChange={(e) => setA({ ...a, powers: { ...a.powers, [p.id]: e.target.checked } })} data-testid={`ar-power-${p.id}`} />
                {p.label}
                {r && !r.ok && <span className="small"> – {p.used ? 'הופעלה ולא סומנה' : 'סומנה אבל לא הופעלה'}</span>}
              </label>
            );
          })}
          <label className="ar-why-box">
            למה הופעלו (או לא הופעלו) – בשתי שורות:
            <textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={2} maxLength={400} disabled={checked} placeholder="למשל: דרשתי הזדהות בגלל חשד לעבירה מהדיווח; לא עיכבתי כי הפרטים אומתו." />
          </label>
        </fieldset>
      )}
      {!checked ? (
        <button type="button" className="btn primary" disabled={!done} onClick={() => setChecked(true)} data-testid="ar-check">
          {done ? 'בדיקת הדוח מול מה שקרה' : 'סווגו את כל הפרטים כדי לבדוק'}
        </button>
      ) : (
        <div className={`point ${g!.serious ? 'challenge' : 'ok'}`} data-testid="ar-result">
          <b>
            {g!.ok}/{g!.total} נכון.
          </b>{' '}
          {g!.serious
            ? `${g!.serious} טעויות חמורות: טענה שנכתבה כעובדה, או פרט שלא היה ידוע לך ונכתב. בדוח אמיתי זה עלול לפגוע בתיק ובאמינות שלך.`
            : 'אין טעויות חמורות – הפרדת בין מה שראית למה שנטען, ולא כתבת מה שלא ידעת.'}
          {why.trim() && (
            <p className="small">
              הנימוק שכתבת: „{why.trim()}”. השווה לפירוט הסמכות בתחקיר.
            </p>
          )}
          <button type="button" className="btn ghost small" onClick={() => { setChecked(false); setA({ facts: {}, powers: {} }); setWhy(''); }}>
            לנסות שוב
          </button>
        </div>
      )}
    </section>
  );
}
