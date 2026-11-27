import { useEffect, useState } from 'react';
import { audio } from '../audio/audio';
import { shiftLabel } from '../engine/feedback';
import { StationPicker } from '../ui/StationPicker';
import { radioProfile, toGameRadio } from '../config/stations';
import { parseSeed, randomSeed } from '../engine/rng';
import type { Difficulty, Mode, Scenario, Shift } from '../engine/types';
import { useApp } from '../ui/context';
import { loadScenario } from '../ui/data';
import { downloadScenario, offlineStatus, removeScenario, type OfflineState } from '../ui/offline';
import { go, scenarioLink } from '../ui/router';

const DIFF: [Difficulty, string, string][] = [
  ['basic', 'בסיסית', 'המשל״ט מוסר יותר פרטים מראש'],
  ['standard', 'רגילה', 'מידע חלקי, צריך לשאול'],
  ['advanced', 'מתקדמת', 'קטיעות קשר וסתירות נוספות'],
];

export function ScenarioCard({ id, query }: { id: string; query: URLSearchParams }) {
  const { startGame, toast, settings } = useApp();
  const [sc, setSc] = useState<Scenario | null>(null);
  const [err, setErr] = useState(false);
  const linkSeed = parseSeed(query.get('seed'));
  const linkVersion = Number(query.get('v')) || null;
  const [seed, setSeed] = useState<number>(() => linkSeed ?? randomSeed());
  const [shift, setShift] = useState<Shift>('night');
  const [difficulty, setDifficulty] = useState<Difficulty>('standard');
  const [mode, setMode] = useState<Mode>('learning');
  const [timeLimit, setTimeLimit] = useState(false);
  const [off, setOff] = useState<OfflineState | 'working'>('none');
  const [progress, setProgress] = useState('');

  useEffect(() => {
    loadScenario(id).then(
      (s) => {
        setSc(s);
        setShift(s.defaultShift);
        void offlineStatus(s).then(setOff);
      },
      () => setErr(true),
    );
  }, [id]);

  useEffect(() => {
    if (linkSeed) setSeed(linkSeed);
  }, [linkSeed]);

  if (err) return <p role="alert">התרחיש „{id}” לא נמצא. <a href="#/catalog">חזרה לקטלוג</a></p>;
  if (!sc) return <p aria-busy="true">טוען תרחיש…</p>;

  const link = scenarioLink(sc.id, sc.version, seed);
  const start = () => {
    audio.unlock();
    const p = radioProfile(settings.station, sc.dispatch.unit);
    startGame(sc, { scenarioId: sc.id, version: sc.version, seed, shift, difficulty, mode, timeLimit, ...(p.real ? { radio: toGameRadio(p) } : {}) });
    go('#/play');
  };

  return (
    <div className="stack">
      <p>
        <a href="#/catalog">→ חזרה לקטלוג</a>
      </p>
      <h1>{sc.title}</h1>
      {linkVersion && linkVersion !== sc.version && (
        <p className="disclaimer" role="alert">
          הקישור נוצר לגרסה <bdi>{linkVersion}</bdi> של התרחיש, והגרסה הזמינה כעת היא <bdi>{sc.version}</bdi>. ייתכנו הבדלים בתוכן.
        </p>
      )}
      <div className="grid2">
        <div className="card stack">
          <p>{sc.summary}</p>
          <div className="meta">
            <span className="chip">⏱ כ־<bdi>{sc.estimatedMinutes}</bdi> דקות</span>
            <span className="chip">רמת קושי בסיסית: {sc.difficultyLabel}</span>
            <span className="chip">{sc.category}</span>
          </div>
          <p className="small muted">
            מיקום בדוי: {sc.location.name}, {sc.location.area}
          </p>
          <h2>מטרות התרגול</h2>
          <ul>
            {sc.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
          <h2>מיומנויות</h2>
          <div className="skills">
            {sc.skills.map((s) => (
              <span key={s} className="chip ok">
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="card stack">
          <fieldset>
            <legend>משמרת</legend>
            <div className="radio-row" role="radiogroup">
              {sc.shifts.map((s) => (
                <label key={s}>
                  <input type="radio" name="shift" checked={shift === s} onChange={() => setShift(s)} />
                  <span>{shiftLabel(s)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>רמת קושי</legend>
            <div className="radio-row" role="radiogroup">
              {DIFF.map(([v, l, d]) => (
                <label key={v} title={d}>
                  <input type="radio" name="diff" checked={difficulty === v} onChange={() => setDifficulty(v)} />
                  <span>{l}</span>
                </label>
              ))}
            </div>
            <p className="small muted">{DIFF.find((d) => d[0] === difficulty)![2]}</p>
          </fieldset>
          <fieldset>
            <legend>מצב</legend>
            <div className="radio-row" role="radiogroup">
              <label>
                <input type="radio" name="mode" checked={mode === 'learning'} onChange={() => setMode('learning')} />
                <span>למידה – השהיה ורמזים</span>
              </label>
              <label>
                <input type="radio" name="mode" checked={mode === 'practice'} onChange={() => setMode('practice')} />
                <span>תרגול עצמאי – משוב בסיום</span>
              </label>
            </div>
          </fieldset>
          {sc.scoring.timeTarget ? (
            <label className="radio-row">
              <input type="checkbox" checked={timeLimit} onChange={(e) => setTimeLimit(e.target.checked)} />
              יעד זמן: <bdi>{sc.scoring.timeTarget.minutes}</bdi> דקות (משפיע על הציון רק אם מופעל)
            </label>
          ) : (
            <p className="small muted">בתרחיש זה אין מגבלת זמן. משך התרגול מוצג בתחקיר ואינו משפיע על הציון.</p>
          )}
          <StationPicker fictionalUnit={sc.dispatch.unit} />
          <fieldset>
            <legend>גרסת הגרלה (זרע)</legend>
            <p className="small">
              זרע: <bdi data-testid="seed">{seed}</bdi> · אותו זרע = אותן נסיבות לכל המשתתפים.
            </p>
            <div className="btn-row">
              <button type="button" className="btn small" onClick={() => setSeed(randomSeed())}>
                הגרלת גרסה אחרת
              </button>
              <button
                type="button"
                className="btn small"
                onClick={() => {
                  navigator.clipboard?.writeText(link).then(
                    () => toast('הקישור הועתק'),
                    () => toast('לא ניתן להעתיק – הקישור מוצג למטה'),
                  );
                }}
              >
                העתקת קישור לגרסה קבועה
              </button>
            </div>
            <p className="small muted ltr" style={{ wordBreak: 'break-all' }}>
              {link}
            </p>
          </fieldset>
          <div>
            <button
              type="button"
              className="btn"
              disabled={off === 'working' || off === 'unsupported'}
              onClick={async () => {
                setOff('working');
                const s = await downloadScenario(sc, (d, t) => setProgress(`${d}/${t}`), settings.station?.mode === 'station' ? settings.station.station : undefined);
                setOff(s);
                setProgress('');
              }}
            >
              ⤓ הורדת תרחיש לשימוש לא מקוון
            </button>
            <p className="small" role="status" data-testid="offline-status">
              {off === 'ready' && '✓ מוכן לשימוש לא מקוון'}
              {off === 'working' && `שומר נכסים… ${progress}`}
              {off === 'partial' && 'חלק מהנכסים נשמרו – נסו שוב כשיש חיבור.'}
              {off === 'none' && 'התרחיש עדיין לא נשמר לשימוש לא מקוון.'}
              {off === 'unsupported' && 'שמירה לשימוש לא מקוון אינה זמינה כאן (נדרש דפדפן תומך וגרסת אתר מפורסמת).'}
            </p>
            {off === 'ready' && (
              <button type="button" className="btn small ghost" onClick={async () => { await removeScenario(sc); setOff(await offlineStatus(sc)); }}>
                הסרת השמירה הלא מקוונת
              </button>
            )}
          </div>
          <button type="button" className="btn primary" onClick={start} data-testid="start">
            ▶ התחלת התרחיש
          </button>
          <a className="btn" href={`#/review/${sc.id}`} data-testid="review-link">
            🔎 מצא את הטעויות – צפייה בטיפול של צוות אחר
          </a>
        </div>
      </div>
    </div>
  );
}
