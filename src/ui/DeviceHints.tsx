import { useEffect, useState } from 'react';

const safeGet = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const safeSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* אחסון חסום – ההנחיה תופיע שוב בפעם הבאה */
  }
};

/** טלפון לאורך: הצעה לסובב לרוחב (נעלם לבד כשמסובבים, או בלחיצה) */
export function RotateHint() {
  const q = '(orientation: portrait) and (max-width: 600px) and (pointer: coarse)';
  const [portraitPhone, setPortraitPhone] = useState(() => typeof matchMedia === 'function' && matchMedia(q).matches);
  const [closed, setClosed] = useState(() => { try { return sessionStorage.getItem('siyur.rotate.closed') === '1'; } catch { return false; } });
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const m = matchMedia(q);
    const on = () => setPortraitPhone(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, []);
  if (!portraitPhone || closed) return null;
  return (
    <div className="rotate-hint" role="status" data-testid="rotate-hint">
      <span className="rot-icon" aria-hidden="true">📱↻</span>
      <span>לתמונה גדולה יותר – <b>סובבו את הטלפון לרוחב</b></span>
      <button type="button" className="btn small ghost" onClick={() => { try { sessionStorage.setItem('siyur.rotate.closed', '1'); } catch { /* */ } setClosed(true); }} aria-label="סגירת ההנחיה">
        ✕
      </button>
    </div>
  );
}

/** מדריך קצר בפעם הראשונה בזירה: 3 צעדים, כפתור אחד */
export function FirstSceneGuide() {
  const [open, setOpen] = useState(() => !navigator.webdriver && safeGet('siyur.guide.seen') !== '1');
  if (!open) return null;
  const close = () => {
    safeSet('siyur.guide.seen', '1');
    setOpen(false);
  };
  return (
    <div className="first-guide" role="dialog" aria-modal="false" aria-labelledby="fg-title" data-testid="first-guide">
      <h2 id="fg-title">הגעתם לזירה 👋</h2>
      <ol>
        <li><b>נוגעים במספר</b> על התמונה – או בשורה ברשימה – כדי לראות מה אפשר לעשות.</li>
        <li><b>בוחרים פעולה</b>: לדבר עם מישהו, לבדוק משהו, לשדר בקשר.</li>
        <li><b>„📻 עדכון למוקד”</b> לשידור בקשר, ו<b>„✓ סיום הטיפול”</b> כשסיימתם.</li>
      </ol>
      <button type="button" className="btn primary big" onClick={close} autoFocus>
        הבנתי, מתחילים
      </button>
    </div>
  );
}

/** מסך מלא – רק במכשירים שתומכים (אנדרואיד, מחשב, חלק מהאייפדים) */
export function FullscreenButton() {
  const supported = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen && document.fullscreenEnabled;
  const [on, setOn] = useState(false);
  useEffect(() => {
    const f = () => setOn(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);
  if (!supported) return null;
  return (
    <button
      type="button"
      className="btn small fs-btn"
      aria-label={on ? 'יציאה ממסך מלא' : 'מסך מלא'}
      onClick={() => (on ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => undefined))}
      aria-pressed={on}
      title="מסך מלא"
    >
      {on ? '⤡' : '⛶'}<span className="fs-txt"> {on ? 'יציאה ממסך מלא' : 'מסך מלא'}</span>
    </button>
  );
}
