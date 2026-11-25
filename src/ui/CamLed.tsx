import { useEffect, useState } from 'react';

/** נורית הקלטה של מצלמת הגוף: נקודה אדומה מהבהבת בצד המסך ושעון הקלטה */
export function CamLed({ since }: { since: number | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const sec = since ? Math.max(0, Math.floor((now - since) / 1000)) : 0;
  const t = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  return (
    <div className="cam-led" role="status" aria-label={`מצלמת הגוף מקליטה ${t}`} data-testid="cam-led">
      <i aria-hidden="true" />
      <span>REC</span>
      <bdi>{t}</bdi>
    </div>
  );
}
