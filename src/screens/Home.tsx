import { useEffect, useState } from 'react';
import { SITE } from '../config/site';
import { loadCurrent, type SavedGame } from '../storage/db';
import { useApp } from '../ui/context';
import { assetUrl, loadScenario } from '../ui/data';
import { go } from '../ui/router';

export function Home() {
  const { startGame, toast } = useApp();
  const [saved, setSaved] = useState<SavedGame | null>(null);

  useEffect(() => {
    void loadCurrent().then(setSaved);
  }, []);

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
      <section className="hero">
        <img src={assetUrl('icons/icon.svg')} alt="" />
        <h1>{SITE.name}</h1>
        <p className="muted">{SITE.tagline}</p>
        <p>מקבלים משימה מהמוקד, אוספים מידע, מגיעים לזירה, משוחחים עם המעורבים, מעדכנים את המוקד – ומסיימים בתחקיר ובטיוטת דוח פעולה.</p>
        <div className="btn-row">
          <a className="btn primary" href="#/catalog">
            ▶ התחלת תרגול
          </a>
          {saved && (
            <button type="button" className="btn" onClick={resume}>
              ↺ המשך תרגול: {saved.title}
            </button>
          )}
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
          <h2>בחינם ובלי חשבון</h2>
          <p>אין הרשמה, פרסומות או שירות בתשלום. ההתקדמות וההיסטוריה נשמרות רק במכשיר שלכם, וניתן למחוק אותן בעמוד ההיסטוריה.</p>
          <p className="small muted">{SITE.fictionNote}</p>
        </div>
      </div>
      <p className="disclaimer" role="note">
        {SITE.disclaimer}.
      </p>
    </div>
  );
}
