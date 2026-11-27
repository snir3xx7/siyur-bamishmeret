import { createContext, useContext } from 'react';
import { radioProfile, type RadioProfile } from '../config/stations';

/** פרופיל הקשר של המשחק הנוכחי (אות קריאה, ראש משמרת, משל״ט) */
export const RadioCtx = createContext<RadioProfile>(radioProfile(undefined, ''));
export const useRadio = () => useContext(RadioCtx);

/** שרשרת הקשר: אזרח → המשל״ט פותח אירוע → 401 מבקש להעביר אליך → המשל״ט מעדכן אותך → אתה עובד מול המשל״ט */
export function RadioChain({ p, incident }: { p: RadioProfile; incident: string }) {
  if (!p.real) return null;
  const steps = [
    { icon: '📞', who: 'אזרח', what: 'פנייה למוקד 100' },
    { icon: '🖥', who: p.center, what: `נפתח אירוע ${incident}` },
    { icon: '🎧', who: p.head, what: `„תעבירי ל־${p.unitNum}”` },
    { icon: '📡', who: p.center, what: `מעדכן את ${p.unitNum}` },
    { icon: '🚓', who: p.unit, what: p.fem ? 'את – מול המשל״ט' : 'אתה – מול המשל״ט' },
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
