import { identity, trackingOn } from '../tracking/track';
import { useEffect, useState } from 'react';
import { SITE } from '../config/site';
import { loadCurrent, type SavedGame } from '../storage/db';
import { useApp } from '../ui/context';
import { chatterLines, radioProfile } from '../config/stations';
import { assetUrl, loadCatalog, loadScenario } from '../ui/data';
import { go } from '../ui/router';

export function Home() {
  const { startGame, toast, settings } = useApp();
  const prof = radioProfile(settings.station, 'סייר 23');
  const ticker = chatterLines(prof).map((l) => l.text);
  // כניסה ראשונה: קודם בוחרים דמות (לא בבדיקות אוטומטיות)
  useEffect(() => {
    // בכניסה: חובה לבחור דמות ותחנה (לא בבדיקות אוטומטיות)
    if ((!settings.officerChosen || settings.station.mode === 'fictional' || (trackingOn() && !identity().team)) && !navigator.webdriver) location.replace('#/officer');
  }, [settings.officerChosen, settings.station.mode]);
  const [saved, setSaved] = useState<SavedGame | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [heroOk, setHeroOk] = useState(true);

  useEffect(() => {
    void loadCurrent().then(setSaved);
    loadCatalog().then((c) => setCount(c.length), () => setCount(null));
  }, []);

  /** שיתוף: גיליון השיתוף של המכשיר, ואם אין – העתקת הקישור */
  const share = async () => {
    const url = location.href.split('#')[0];
    try {
      if (navigator.share) {
        await navigator.share({ title: SITE.name, text: `${SITE.name} – ${SITE.tagline}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast('הקישור הועתק – אפשר להדביק ולשלוח.');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast(`אפשר להעתיק את הקישור: ${url}`);
    }
  };

  const resume = async () => {
    if (!saved) return;
    try {
      const sc = await loadScenario(saved.config.scenarioId);
      startGame(sc, { ...saved.config }, saved.actions, saved.activeMs);
      go('#/play?resume=1');
    } catch {
      toast('לא ניתן לטעון את התרחיש השמור.');
    }
  };

  return (
    <div className="stack">
      <section className={`hero cine ${heroOk ? '' : 'no-art'}`}>
        <div className="cine-bg" aria-hidden="true">
          <div className="cine-art">
            {heroOk && <img src={assetUrl('img/hero.webp')} alt="" onError={() => setHeroOk(false)} />}
            {heroOk && <><span className="cine-flash blue" /><span className="cine-flash red" /><span className="cine-wash" /></>}
          </div>
          <span className="cine-mist" />
        </div>
        <span className="cine-rain" aria-hidden="true" />
        <div className="cine-hud" aria-hidden="true">
          <span className="hud-c tl" /><span className="hud-c tr" /><span className="hud-c bl" /><span className="hud-c br" />
          <span className="hud-live"><i /> בשידור · {prof.real ? prof.stationName : 'משמרת ערב'}</span>
          <span className="hud-wave">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ animationDelay: `${(i * 0.13) % 1}s` }} />)}</span>
        </div>
        <div className="cine-content">
          <p className="cine-kicker">סימולטור אימון לשוטרי סיור</p>
          <h1 className="cine-title" data-text={SITE.name}>{SITE.name}</h1>
          <div className="cine-rule">
            <a href="#/officer" data-testid="home-callsign">📻 {prof.real ? <><bdi>{prof.unit}</bdi> · {prof.center} · החלפה</> : <>משל״ט מ402 · בחרו מחוז ותחנה</>}</a>
          </div>
          <p className="cine-tag">{SITE.tagline}</p>
          <p className="cine-credit" data-testid="home-credit">{SITE.creditLine}</p>
          <a className="cine-officer" href="#/officer" data-testid="home-officer">
            <img src={assetUrl(`img/officer-${settings.officerVoice ?? 'm'}.webp`)} alt="" />
            <span>
              <small>הדמות שלך</small>
              <b>{settings.officerVoice === 'f' ? 'שוטרת' : 'שוטר'}</b>
            </span>
            <em>החלפה</em>
          </a>
          <p className="cine-lead">מקבלים משימה מהמשל״ט, אוספים מידע, מגיעים לזירה, משוחחים עם המעורבים, מעדכנים את המשל״ט – ומסיימים בתחקיר ובטיוטת דוח פעולה.</p>
          <div className="btn-row">
            <a className="btn primary big" href="#/catalog">
              ▶ יציאה לסיור
            </a>
            <a className="btn glass" href="#/help" data-testid="home-help">
              ❓ איך משחקים?
            </a>
            <a className="btn glass" href="#/shift" data-testid="home-shift">
              🚓 משמרת מלאה
            </a>
            {saved && (
              <button type="button" className="btn glass" onClick={resume}>
                ↺ המשך תרגול: {saved.title}
              </button>
            )}
          </div>
          <ul className="cine-stats" aria-label="במשחק">
            <li><b>{count ?? '…'}</b> תרחישים</li>
            <li><b>3</b> משמרות</li>
            <li><b>100</b> נקודות בתחקיר</li>
          </ul>
        </div>
        <div className="cine-ticker" aria-hidden="true">
          <div className="ticker-track">
            {[...ticker, ...ticker].map((t, i) => <span key={i}>📻 {t}</span>)}
          </div>
        </div>
      </section>
      <div className="grid2">
        <div className="card">
          <h2>איך זה עובד</h2>
          <ul>
            <li>בוחרים תרחיש, משמרת, רמת קושי ומצב (למידה או תרגול עצמאי).</li>
            <li>כל נקודת עניין בתמונה מופיעה גם ברשימת הפעולות – אפשר לשחק במגע, בעכבר או במקלדת.</li>
            <li>אין ציון מהירות: מותר לעצור, לשאול שוב ולתקן עדכון.</li>
            <li>בסיום: ציון מתוך 100 לפי תחומים, נקודות לשימור ולשיפור, ציר החלטות וטיוטת דוח.</li>
          </ul>
        </div>
        <div className="card">
          <h2>שתפו לתרגול</h2>
          <p>מכירים מישהו שיכול להתאמן? שלחו לו קישור למשחק. ההתקדמות וההיסטוריה נשמרות רק במכשיר של כל משתמש.</p>
          <div className="btn-row">
            <button type="button" className="btn" onClick={share}>
              🔗 שיתוף המשחק
            </button>
          </div>
          <p className="small muted">{SITE.fictionNote}</p>
        </div>
      </div>
      <p className="disclaimer" role="note">
        {SITE.disclaimer}.
      </p>
    </div>
  );
}
