import { useEffect, useMemo, useRef, useState } from 'react';
import { buildReview } from '../engine/review';
import { randomSeed } from '../engine/rng';
import type { Scenario } from '../engine/types';
import { loadScenario } from '../ui/data';
import { Lines } from './Play';
import { track } from '../tracking/track';

/**
 * „מצא את הטעויות”: צופים בטיפול של שוטר אחר באירוע, צעד אחרי צעד, ומסמנים בכל צעד – תקין או טעות.
 * בסוף: כמה טעויות זוהו, ומה הוא בכלל לא עשה.
 */
export function Review({ id }: { id: string }) {
  const [sc, setSc] = useState<Scenario | null>(null);
  const [err, setErr] = useState(false);
  const [seed, setSeed] = useState(() => randomSeed());
  const [i, setI] = useState(0);
  const reported = useRef(false);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadScenario(id).then(setSc, () => setErr(true));
  }, [id]);
  const r = useMemo(() => (sc ? buildReview(sc, seed) : null), [sc, seed]);
  // מעקב: סיום תרגול „מצא את הטעויות”
  useEffect(() => {
    if (!sc || !r || i < r.steps.length || reported.current) return;
    reported.current = true;
    const right = r.steps.filter((s, k) => answers[k] === s.mistake).length;
    const caught = r.steps.filter((s, k) => s.mistake && answers[k] === true).length;
    const total = r.steps.filter((s) => s.mistake).length;
    track({ event: 'review', scenarioId: sc.id, title: sc.title, version: sc.version, total: Math.round((100 * right) / Math.max(1, r.steps.length)), ending: `מצא את הטעויות: זוהו ${caught}/${total}` });
  }, [i, r, sc, answers]);

  if (err) return <p className="card">התרחיש לא נמצא.</p>;
  if (!sc || !r) return <p className="card">טוען…</p>;

  const step = r.steps[i];
  const given = answers[i];
  const done = i >= r.steps.length;
  const restart = (newSeed = false) => {
    if (newSeed) setSeed(randomSeed());
    setI(0);
    setAnswers({});
    reported.current = false;
  };
  const right = r.steps.filter((s, k) => answers[k] === s.mistake).length;
  const caught = r.steps.filter((s, k) => s.mistake && answers[k] === true).length;
  const total = r.steps.filter((s) => s.mistake).length;
  const falseAlarms = r.steps.filter((s, k) => !s.mistake && answers[k] === true).length;

  return (
    <div className="review" data-testid="review">
      <section className="card">
        <p className="kicker">🔎 מצא את הטעויות</p>
        <h1>{sc.title}</h1>
        <p className="small muted">
          צוות אחר טיפל באירוע. עברו על הטיפול צעד אחרי צעד, ובכל צעד החליטו: תקין, או טעות – בסמכות, בנוהל, בפנייה או בתעדוף.
        </p>
        <div className="review-progress" aria-label="התקדמות">
          {r.steps.map((s, k) => (
            <span key={k} className={`rv-dot${k === i ? ' cur' : ''}${answers[k] === undefined ? '' : answers[k] === s.mistake ? ' ok' : ' bad'}`} />
          ))}
        </div>
      </section>

      {!done ? (
        <section className="card review-step" aria-live="polite">
          <p className="small muted">
            צעד {i + 1} מתוך {r.steps.length}
          </p>
          <h2 className="rv-label">השוטר בחר: {step.label}</h2>
          <div className="dialog-box">
            <Lines sc={sc} lines={step.lines} playerName="השוטר מהצוות האחר" />
          </div>
          {given === undefined ? (
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setAnswers({ ...answers, [i]: false })} data-testid="rv-ok">
                ✓ תקין
              </button>
              <button type="button" className="btn primary" onClick={() => setAnswers({ ...answers, [i]: true })} data-testid="rv-bad">
                ✗ טעות
              </button>
            </div>
          ) : (
            <>
              <p className={`point ${given === step.mistake ? '' : 'challenge'}`} data-testid="rv-verdict">
                <b>{given === step.mistake ? 'נכון!' : 'לא בדיוק.'}</b> {step.mistake ? `זו טעות: ${step.why}.` : step.why}
              </p>
              <button type="button" className="btn primary" onClick={() => setI(i + 1)} data-testid="rv-next">
                {i + 1 < r.steps.length ? 'הצעד הבא ←' : 'לסיכום ←'}
              </button>
            </>
          )}
        </section>
      ) : (
        <section className="card" data-testid="rv-summary">
          <h2>סיכום</h2>
          <p>
            <b>
              {right}/{r.steps.length}
            </b>{' '}
            החלטות נכונות. זיהית {caught} מתוך {total} טעויות{falseAlarms ? `, וסימנת ${falseAlarms} צעדים תקינים כטעות` : ''}.
          </p>
          {r.omissions.length > 0 && (
            <>
              <h3>ומה הוא בכלל לא עשה?</h3>
              <ul className="proc-list">
                {r.omissions.map((o) => (
                  <li key={o} className="bad">
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="btn-row">
            <button type="button" className="btn primary" onClick={() => restart(true)} data-testid="rv-again">
              🎲 טיפול אחר באותו אירוע
            </button>
            <button type="button" className="btn" onClick={() => restart()}>
              ↺ שוב את אותו טיפול
            </button>
            <a className="btn ghost" href={`#/s/${sc.id}`}>
              לשחק בעצמי
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
