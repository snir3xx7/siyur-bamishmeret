import { useEffect, useRef, useState } from 'react';
import { assetUrl } from './data';

const KEY = 'siyur.intro.seen';

/**
 * טריילר פתיחה: מוצג כשפותחים את הקישור (פעם אחת בכל ביקור), מסתיים בהחשכה איטית ונפתח למסך הכניסה.
 * מתחיל מושתק (דפדפנים חוסמים ניגון עם קול בלי לחיצה); כפתור „עם קול” ו„דילוג”.
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
  const [leaving, setLeaving] = useState(false);
  const [muted, setMuted] = useState(true);
  const ref = useRef<HTMLVideoElement>(null);

  const close = () => {
    if (leaving) return;
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setLeaving(true);
    window.setTimeout(() => setShow(false), 900);
  };

  useEffect(() => {
    if (!show) return;
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    void v.play().catch(() => undefined);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show) return null;
  return (
    <div className={`intro ${leaving ? 'leaving' : ''}`} role="dialog" aria-label="טריילר פתיחה" data-testid="intro">
      <video
        ref={ref}
        src={assetUrl('video/intro.mp4')}
        poster={assetUrl('video/intro-poster.jpg')}
        playsInline
        muted={muted}
        autoPlay
        preload="auto"
        onEnded={close}
        onError={close}
      />
      <div className="intro-bar">
        <button
          type="button"
          className="btn glass"
          onClick={() => {
            const v = ref.current;
            if (!v) return;
            v.muted = !muted;
            setMuted(!muted);
            void v.play().catch(() => undefined);
          }}
        >
          {muted ? '🔊 עם קול' : '🔇 השתקה'}
        </button>
        <button type="button" className="btn glass" onClick={close} data-testid="intro-skip">
          דילוג ⏭
        </button>
      </div>
    </div>
  );
}
