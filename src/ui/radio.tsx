import { createContext, useContext } from 'react';
import { radioProfile, type RadioProfile } from '../config/stations';

/** פרופיל הקשר של המשחק הנוכחי (אות קריאה, ראש משמרת, משל״ט) */
export const RadioCtx = createContext<RadioProfile>(radioProfile(undefined, ''));
export const useRadio = () => useContext(RadioCtx);

/** שרשרת הקשר: אזרח → משל״ט → משגר → ראש המשמרת → אתה */
export function RadioChain({ p, incident }: { p: RadioProfile; incident: string }) {
  if (!p.real) return null;
  const steps = [
    { icon: '📞', who: 'אזרח', what: 'פנייה למוקד' },
    { icon: '🖥', who: p.center, what: `נפתח אירוע ${incident}` },
    { icon: '📡', who: 'משגר', what: `מעביר ל־${p.head}` },
    { icon: '🎧', who: p.head, what: 'ראש המשמרת מנתב' },
    { icon: '🚓', who: p.unit, what: 'אתה' },
  ];
  return (
    <ol className="radio-chain" aria-label="שרשרת הקשר" data-testid="radio-chain">
      {steps.map((s, i) => (
        <li key={i} style={{ animationDelay: `${i * 0.25}s` }}>
          <span className="ic" aria-hidden="true">{s.icon}</span>
          <b>{s.who}</b>
          <span>{s.what}</span>
        </li>
      ))}
    </ol>
  );
}
