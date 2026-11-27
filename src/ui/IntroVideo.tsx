import { useEffect, useRef, useState } from 'react';
import { assetUrl } from './data';
import { SITE } from '../config/site';

const KEY = 'siyur.intro.seen';

/**
 * טריילר פתיחה בסגנון סרט: מסך מלא (גם בטלפון לאורך – הפריים ממלא את המסך עם תנועת מצלמה איטית לרוחב),
 * שכבות ערפל נעות, גרעיניות של פילם, וינייטה ופסי קולנוע. בסוף – כותרת המשחק עולה מתוך הערפל,
 * ואז החשכה ומעבר למסך הכניסה. מתחיל מושתק (דפדפנים חוסמים קול בלי לחיצה); „עם קול” ו„דילוג”.
 */
export function IntroVideo() {
  const [show, setShow] = useState(() => {
    try {
      if (navigator.webdriver || sessionStorage.getItem(KEY)) return false;
    } catch {
      /* אחסון חסום – מציגים */
    }
    const h = location.hash.replace(/^#\/?/, '');
    return h === '' || h === 'officer';
  });
  const [phase, setPhase] = useState<'play' | 'title' | 'out'>('play');
  const [muted, setMuted] = useState(true);
  const fg = useRef<HTMLVideoElement>(null);

  const finish = () => {
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setPhase('out');
    window.setTimeout(() => setShow(false), 1200);
  };
  // סוף הסרטון: כותרת מתוך הערפל, ואחריה מעבר למסך הכניסה
  const toTitle = () => {
    if (phase !== 'play') return;
    setPhase('title');
    window.setTimeout(finish, 5600);
  };

  useEffect(() => {
    if (!show) return;
    const v = fg.current;
    if (v) {
      v.muted = true;
      void v.play().catch(() => undefined);
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show) return null;
  const src = assetUrl('video/intro.mp4');
  return (
    <div className={`intro film ${phase}`} role="dialog" aria-label="טריילר פתיחה" data-testid="intro">
      <div className="intro-frame">
        <video ref={fg} className="intro-fg" src={src} poster={assetUrl('video/intro-poster.jpg')} playsInline muted={muted} autoPlay preload="auto" onEnded={toTitle} onError={finish} />
      </div>
      <span className="fog f1" aria-hidden="true" />
      <span className="fog f2" aria-hidden="true" />
      <span className="fog f3" aria-hidden="true" />
      <span className="grain" aria-hidden="true" />
      <span className="vignette" aria-hidden="true" />
      <span className="bars" aria-hidden="true" />
      {/* סוף הטריילר: סמלי המכללה הלאומית לשוטרים ואגף ההדרכה נכנסים מתוך המצלמה – אחד מימין ואחד משמאל */}
      <div className="intro-crest r" aria-hidden="true" style={{ ['--crest' as string]: `url(${assetUrl('img/brand/academy.webp')})` }}>
        <img src={assetUrl('img/brand/academy.webp')} alt="" />
      </div>
      <div className="intro-crest l" aria-hidden="true" style={{ ['--crest' as string]: `url(${assetUrl('img/brand/training.webp')})` }}>
        <img src={assetUrl('img/brand/training.webp')} alt="" />
      </div>
      <span className="intro-flash" aria-hidden="true" />
      <div className="intro-title" aria-live="polite">
        <p>{SITE.creditLine}</p>
        <h2>{SITE.name}</h2>
        <span>סימולטור אימון לשוטרי סיור</span>
      </div>
      <div className="intro-bar">
        <button
          type="button"
          className="btn glass"
          onClick={() => {
            const v = fg.current;
            if (!v) return;
            v.muted = !muted;
            setMuted(!muted);
            void v.play().catch(() => undefined);
          }}
        >
          {muted ? '🔊 עם קול' : '🔇 השתקה'}
        </button>
        <button type="button" className="btn glass" onClick={finish} data-testid="intro-skip">
          דילוג ⏭
        </button>
      </div>
    </div>
  );
}
