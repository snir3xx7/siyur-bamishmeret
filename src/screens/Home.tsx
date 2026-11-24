import { useEffect, useState } from 'react';
import { SITE } from '../config/site';
import { loadCurrent, type SavedGame } from '../storage/db';
import { useApp } from '../ui/context';
import { assetUrl, loadCatalog, loadScenario } from '../ui/data';
import { go } from '../ui/router';

export function Home() {
  const { startGame, toast } = useApp();
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
        <div className="cine-content">
          <img className="cine-icon" src={assetUrl('icons/icon.svg')} alt="" />
          <h1>{SITE.name}</h1>
          <p className="cine-tag">{SITE.tagline}</p>
          <p className="cine-credit" data-testid="home-credit">{SITE.creditLine}</p>
          <p className="cine-lead">מקבלים משימה מהמוקד, אוספים מידע, מגיעים לזירה, משוחחים עם המעורבים, מעדכנים את המוקד – ומסיימים בתחקיר ובטיוטת דוח פעולה.</p>
          <div className="btn-row">
            <a className="btn primary big" href="#/catalog">
              ▶ התחלת תרגול
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
