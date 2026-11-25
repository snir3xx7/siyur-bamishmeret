import { useEffect, useState } from 'react';
import { useApp } from '../ui/context';
import { assetUrl } from '../ui/data';
import { audio } from '../audio/audio';
import { loadRadioIndex, voiceKey } from '../audio/voiceKey';
import { callTo, radioProfile } from '../config/stations';

const CHOICES = [
  { id: 'm', title: 'שוטר', who: 'player', line: 'הקול שלך בקשר ובזירה – גבר.' },
  { id: 'f', title: 'שוטרת', who: 'playerF', line: 'הקול שלך בקשר ובזירה – אישה.' },
] as const;

/**
 * בחירת דמות: שוטר או שוטרת. קובע את הקול שלך בקשר ובזירה ואת לשון הפנייה.
 * מוצג בכניסה הראשונה, ונגיש תמיד ממסך הפתיחה.
 */
export function Officer() {
  const { settings, setSettings } = useApp();
  const [sel, setSel] = useState<'m' | 'f'>(settings.officerVoice ?? 'm');
  const [idx, setIdx] = useState<Record<string, string>>({});
  const [art, setArt] = useState<Record<string, boolean>>({ m: true, f: true });
  useEffect(() => {
    void loadRadioIndex().then(setIdx);
  }, []);

  const prof = radioProfile(settings.station, 'סייר 23');
  const sample = callTo(prof, 'center');
  const preview = (id: 'm' | 'f') => {
    const who = id === 'f' ? 'playerF' : 'player';
    const f = idx[voiceKey(who, sample)];
    audio.unlock();
    if (f) void audio.playLines([{ file: f, radio: true, who }]);
  };
  const pick = (id: 'm' | 'f') => {
    setSel(id);
    preview(id);
  };
  const confirm = () => {
    setSettings({ ...settings, officerVoice: sel, officerChosen: true });
    location.hash = '#/catalog';
  };

  return (
    <section className="officer-select" aria-labelledby="officer-title">
      <div className="os-bg" aria-hidden="true">
        <span className="os-flash blue" />
        <span className="os-flash red" />
      </div>
      <header className="os-head">
        <p className="os-kicker">משמרת ערב · {prof.real ? prof.stationName : 'קריית אלון (בדוי)'}</p>
        <h1 id="officer-title">מי יוצא לסיור הערב?</h1>
        <p className="os-sub">הבחירה קובעת את הקול שלך בקשר ובשיחה עם המעורבים, ואת לשון הפנייה אליך. אפשר להחליף בכל רגע.</p>
      </header>
      <div className="os-cards" role="radiogroup" aria-label="בחירת דמות">
        {CHOICES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={sel === c.id}
            className={`os-card ${sel === c.id ? 'on' : ''}`}
            onClick={() => pick(c.id)}
            data-testid={`officer-${c.id}`}
          >
            <span className="os-portrait">
              {art[c.id] ? (
                <img src={assetUrl(`img/officer-${c.id}.webp`)} alt="" onError={() => setArt((a) => ({ ...a, [c.id]: false }))} />
              ) : (
                <span className="os-fallback">{c.id === 'f' ? '👮‍♀️' : '👮‍♂️'}</span>
              )}
              <span className="os-shade" />
            </span>
            <span className="os-label">
              <b>{c.title}</b>
              <span>{c.line}</span>
              <span className="os-call">
                <span aria-hidden="true">📻</span> <bdi>{prof.unit}</bdi>
              </span>
            </span>
            {sel === c.id && <span className="os-check" aria-hidden="true">✓</span>}
          </button>
        ))}
      </div>
      <div className="os-actions">
        <button type="button" className="btn primary big" onClick={confirm} data-testid="officer-confirm">
          יוצא{sel === 'f' ? 'ת' : ''} לסיור ▶
        </button>
        <button type="button" className="btn glass" onClick={() => preview(sel)}>
          🔊 לשמוע את הקול
        </button>
      </div>
    </section>
  );
}
