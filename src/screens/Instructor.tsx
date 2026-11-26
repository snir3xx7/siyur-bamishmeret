import { useEffect, useState } from 'react';
import { randomSeed } from '../engine/rng';
import type { CatalogEntry } from '../engine/types';
import { validateScenario, type ValidationResult } from '../engine/validate';
import { useApp } from '../ui/context';
import { loadCatalog, loadScenario } from '../ui/data';
import { scenarioLink } from '../ui/router';
import { shiftLink } from '../ui/shift';
import type { Difficulty, Shift } from '../engine/types';
import { shiftLabel } from '../engine/feedback';
import { ResultsBoard } from '../ui/ResultsBoard';

export function Instructor() {
  const { toast } = useApp();
  const [cat, setCat] = useState<CatalogEntry[]>([]);
  const [id, setId] = useState('');
  const [seed, setSeed] = useState(() => randomSeed());
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [sShift, setSShift] = useState<Shift>('night');
  const [sDiff, setSDiff] = useState<Difficulty>('standard');
  const [sPick, setSPick] = useState<{ id: string; seed: number }[]>([]);

  useEffect(() => {
    void loadCatalog().then((c) => {
      setCat(c);
      setId(c[0]?.id ?? '');
    });
  }, []);
  const entry = cat.find((c) => c.id === id);
  const link = entry ? scenarioLink(entry.id, entry.version, seed) : '';

  return (
    <div className="stack">
      <h1>למדריך</h1>
      <p>
        העמוד מרכז את מה שצריך כדי להפעיל תרגול בכיתה, להפיק קישור לגרסה קבועה ולערוך תרחישים. מדריך מלא עם דוגמה מקצה לקצה נמצא בקובץ <code>docs/INSTRUCTOR.md</code> במאגר, וסכימת התרחיש מתועדת ב־<code>docs/SCENARIO_SCHEMA.md</code>.
      </p>

      <section className="card stack" aria-labelledby="adm-link">
        <h2 id="adm-link">🔐 ניהול – מעקב חניכים</h2>
        <p className="small muted">מי נכנס, אילו תרחישים התחיל והשלים, הציון והמשוב של כל אחד. מוגן בסיסמה שרק המדריך יודע.</p>
        <a className="btn primary" href="#/admin" data-testid="admin-link">כניסה לניהול</a>
      </section>

      <ResultsBoard />

      <section className="card stack" aria-labelledby="ed-link">
        <h2 id="ed-link">✏️ עורך תרחישים</h2>
        <p className="small muted">עותק של תרחיש קיים עם טקסטים משלכם: שמות, מקום, הקריאה מהמוקד, השורות והמשוב. בדיקת תקינות, ניסיון וייצוא לקובץ לשיתוף עם מדריכים אחרים.</p>
        <a className="btn primary" href="#/editor" data-testid="editor-link">פתיחת העורך</a>
      </section>

      <section className="card stack" aria-labelledby="link-title">
        <h2 id="link-title">קישור לגרסה קבועה לכל הכיתה</h2>
        <p className="small muted">הקישור כולל מזהה תרחיש, גרסה וזרע בלבד. כל מי שפותח אותו מקבל את אותן נסיבות (למשל איזה מעורב נפגע).</p>
        <label>
          תרחיש
          <select value={id} onChange={(e) => { setId(e.target.value); setResult(null); }}>
            {cat.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} (גרסה {c.version})
              </option>
            ))}
          </select>
        </label>
        <label>
          זרע (1–999999)
          <input type="number" min={1} max={999999} value={seed} onChange={(e) => setSeed(Math.max(1, Math.min(999999, Number(e.target.value) || 1)))} />
        </label>
        <p className="ltr small" style={{ wordBreak: 'break-all' }} data-testid="instructor-link">
          {link}
        </p>
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => setSeed(randomSeed())}>
            זרע חדש
          </button>
          <button type="button" className="btn primary" onClick={() => navigator.clipboard?.writeText(link).then(() => toast('הקישור הועתק'), () => toast('העתיקו ידנית'))}>
            העתקת הקישור
          </button>
          <a className="btn" href={link}>
            פתיחת הכרטיס
          </a>
        </div>
      </section>

      <section className="card stack" aria-labelledby="shiftlink-title" data-testid="shift-builder">
        <h2 id="shiftlink-title">קישור למשמרת לכיתה</h2>
        <p className="small muted">בחרו משמרת ואירועים לפי הסדר. כל חניך שפותח את הקישור מקבל את אותה משמרת, באותו סדר ובאותן נסיבות – ובסוף סיכום משמרת. אות הקריאה נקבע לפי התחנה שכל חניך בוחר.</p>
        <div className="radio-row" role="radiogroup" aria-label="משמרת">
          {(['morning', 'evening', 'night'] as Shift[]).map((x) => (
            <label key={x}>
              <input type="radio" name="s-shift" checked={sShift === x} onChange={() => { setSShift(x); setSPick([]); }} />
              <span>{shiftLabel(x)}</span>
            </label>
          ))}
        </div>
        <div className="radio-row" role="radiogroup" aria-label="רמת קושי">
          {([['basic', 'בסיסית'], ['standard', 'רגילה'], ['advanced', 'מתקדמת']] as [Difficulty, string][]).map(([d, l]) => (
            <label key={d}>
              <input type="radio" name="s-diff" checked={sDiff === d} onChange={() => setSDiff(d)} />
              <span>{l}</span>
            </label>
          ))}
        </div>
        <div className="chips-pick">
          {cat.filter((c) => c.shifts.includes(sShift)).map((c) => {
            const i = sPick.findIndex((p) => p.id === c.id);
            return (
              <button key={c.id} type="button" className={`btn small ${i >= 0 ? 'primary' : ''}`} aria-pressed={i >= 0}
                onClick={() => setSPick(i >= 0 ? sPick.filter((p) => p.id !== c.id) : [...sPick, { id: c.id, seed: randomSeed() }].slice(0, 6))}>
                {i >= 0 ? `${i + 1}. ` : ''}{c.title}
              </button>
            );
          })}
        </div>
        {sPick.length > 0 && (
          <>
            <p className="small muted ltr" style={{ wordBreak: 'break-all' }} data-testid="shift-link">{shiftLink(sShift, sDiff, sPick)}</p>
            <div className="btn-row">
              <button type="button" className="btn small" onClick={() => navigator.clipboard?.writeText(shiftLink(sShift, sDiff, sPick)).then(() => toast('הקישור הועתק'), () => toast('העתיקו את הקישור מהשורה למעלה'))}>
                העתקת קישור המשמרת
              </button>
            </div>
          </>
        )}
      </section>

      <section className="card stack" aria-labelledby="check-title">
        <h2 id="check-title">בדיקת כל המסלולים</h2>
        <p className="small muted">הבדיקה מוודאת שכל תנאי מפנה לעובדה, בחירה ודמות קיימות, שלכל בחירה יעד תקין, שכל מסלול מסתיים או מציע פעולה נוספת, ומריצה מאות משחקים אקראיים בכל רמות הקושי.</p>
        <button
          type="button"
          className="btn"
          disabled={!id || checking}
          onClick={async () => {
            setChecking(true);
            const sc = await loadScenario(id);
            setTimeout(() => {
              setResult(validateScenario(sc, { walks: 400 }));
              setChecking(false);
            }, 10);
          }}
        >
          {checking ? 'בודק…' : 'הרצת בדיקה'}
        </button>
        {result && (
          <div role="status" className="stack">
            <p>
              <strong>{result.errors.length ? `נמצאו ${result.errors.length} שגיאות` : '✓ לא נמצאו שגיאות'}</strong> · בחירות שהושגו: {result.stats.choicesReached}/{result.stats.choicesTotal} · משחקים אקראיים: {result.stats.walks}
            </p>
            <p className="small">
              סיומים שהושגו:{' '}
              {Object.entries(result.stats.endingsReached)
                .map(([k, v]) => `${k}: ${v}`)
                .join(' · ')}
            </p>
            {result.errors.length > 0 && (
              <ul className="small" style={{ color: 'var(--bad)' }}>
                {result.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            {result.warnings.length > 0 && (
              <ul className="small" style={{ color: 'var(--warn)' }}>
                {result.warnings.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="card stack" aria-labelledby="guide-title">
        <h2 id="guide-title">עבודה עם תרחישים – בקצרה</h2>
        <h3>שכפול תרחיש</h3>
        <ol>
          <li>העתיקו קובץ קיים מ־<code>public/scenarios/</code> (למשל <code>accident-rain.json</code>) לשם חדש, ושנו את <code>id</code> לשם הקובץ.</li>
          <li>הוסיפו רשומה ל־<code>public/scenarios/index.json</code> עם אותו מזהה וגרסה.</li>
          <li>הריצו <code>npm test</code> – בדיקת התרחישים רצה אוטומטית על כל קובץ ברשימה.</li>
        </ol>
        <h3>שינוי דיאלוגים</h3>
        <p>כל שורה היא <code>{'{ "speaker": "...", "text": "..." }'}</code> בתוך <code>lines</code> של בחירה, או בתוך <code>branches</code> כשהתגובה תלויה במצב (למשל יחס הדמות). אפשר להשתמש במשתני וריאציה כמו <code>{'{{injured}}'}</code>.</p>
        <h3>הוספת מדיה</h3>
        <p>תמונות רקע: <code>public/img/&lt;שם&gt;-day.webp</code> ו־<code>-night.webp</code>. צלילים: <code>public/audio/&lt;שם&gt;.mp3</code>, והפניה ב־<code>scene.ambience</code> (עד שתי שכבות). קריינות: <code>media.voice</code> ממפה מזהה בחירה (או <code>dispatch</code>) לקובץ. רשמו כל נכס חדש ב־<code>docs/MEDIA.md</code> עם מקור ורישיון.</p>
        <h3>שינוי בתוכן – העלאת גרסה</h3>
        <p>בכל שינוי בתוכן או בניקוד העלו את <code>version</code> בקובץ ובאינדקס. קישורים ישנים יציגו הודעה שהגרסה השתנתה.</p>
        <h3>תוכן נוהלי ומשפטי</h3>
        <p className="disclaimer">
          המשוב בתרחישי ההשקה הוא משוב תרגולי כללי (תקשורת, הערכת מצב, תיאום ותיעוד). תוכן נוהלי או משפטי מחייב ייכנס רק אחרי שמדריך הזין מקור מאושר ובדק את נוסח המשוב – ציינו את המקור בשדה <code>summary</code> או בהערה בקובץ.
        </p>
      </section>
    </div>
  );
}
