import { SITE } from '../config/site';

export function About() {
  return (
    <div className="stack">
      <h1>אודות</h1>
      <p className="disclaimer" role="note">
        {SITE.disclaimer}.
      </p>
      <div className="card">
        <h2>הפרויקט</h2>
        <p>
          „{SITE.name}” הוא משחק סימולציה מקורי בעברית לחניכי קורס יסוד סייר ולמדריכים. המשחק פתוח בחינם, ללא חשבון, פרסומות או חיבור למערכות חיצוניות.
        </p>
        <p>{SITE.fictionNote}</p>
        <p>
          <strong>{SITE.initiatorRole}:</strong> <span data-testid="initiator">{SITE.initiatorCredit}</span>
        </p>
      </div>
      <div className="card">
        <h2>מקורות השראה</h2>
        <p className="small muted">המימוש, התרחישים, האיורים והצלילים מקוריים. הקישורים מובאים כקרדיט; השימוש בהם אופציונלי.</p>
        <ul>
          {SITE.inspirations.map((i) => (
            <li key={i.url}>
              <a href={i.url} target="_blank" rel="noopener noreferrer">
                {i.title}
              </a>{' '}
              – {i.note}
            </li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h2>נכסי מדיה</h2>
        <p>
          האיורים (רקעים, דמויות, רכבים, מסך הפתיחה) נוצרו במיוחד לפרויקט במחשב מקומי עם מודל FLUX.1 [schnell] (רישיון Apache-2.0). הצלילים (גשם, תנועה, מגבים, צלילי מכשיר קשר ועוד) סונתזו בקוד. פירוט מלא בקובץ <code>docs/MEDIA.md</code>.
        </p>
        <p>
          <strong>קריינות:</strong> קולות מסונתזים מקומית ב־<a href="https://github.com/maxmelichov/BlueTTS">BlueTTS</a> (קוד MIT; פענוח קול נגזר מ־Supertonic, OpenRAIL-M). הקולות מבוססים על דוברי הקורפוס LibriTTS-R (Koizumi et al., 2023), ברישיון CC BY 4.0. ההגייה העברית: RenikudPlus (Apache-2.0).
        </p>
      </div>
      <div className="card">
        <h2>פרטיות</h2>
        <p>המשחק אינו אוסף פרטים אישיים, מיקום, מיקרופון או מצלמה. הגדרות, שמירה והיסטוריה נשמרות רק בדפדפן במכשיר זה.</p>
      </div>
    </div>
  );
}
