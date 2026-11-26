import { useState } from 'react';
import { buildResult, encodeResult } from '../engine/results';
import type { GameState, Scenario } from '../engine/types';
import { useApp } from './context';

const NAME_KEY = 'siyur.trainee';

function savedName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

/** שליחת התוצאה למדריך: קוד קצר להעתקה (וואטסאפ/מייל) או קובץ. בלי שרת – רק מה שהחניך בוחר לשלוח */
export function SendResult({ sc, st }: { sc: Scenario; st: GameState }) {
  const { toast } = useApp();
  const [name, setName] = useState(savedName);
  const keep = (v: string) => {
    setName(v);
    try {
      localStorage.setItem(NAME_KEY, v);
    } catch {
      /* אחסון חסום */
    }
  };
  const code = () => encodeResult(buildResult(sc, st, name));

  return (
    <section className="card print-hide" aria-labelledby="send-title" data-testid="send-result">
      <h2 id="send-title">📤 שליחת התוצאה למדריך</h2>
      <p className="small muted">נשלח רק תקציר: שם, תרחיש, ציון לפי תחומים ונקודות לשיפור. בלי הפנקס ובלי מה שכתבת. המדריך מדביק את הקוד בעמוד „למדריך”.</p>
      <label>
        השם שלך (כפי שהמדריך יזהה)
        <input value={name} onChange={(e) => keep(e.target.value)} maxLength={40} placeholder="למשל: שירן כ." data-testid="trainee-name" />
      </label>
      <div className="btn-row">
        <button
          type="button"
          className="btn primary"
          disabled={!name.trim()}
          data-testid="copy-result"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code());
              toast('קוד התוצאה הועתק – הדביקו אותו בהודעה למדריך');
            } catch {
              toast('ההעתקה נחסמה – השתמשו בהורדה כקובץ');
            }
          }}
        >
          📋 העתקת קוד תוצאה
        </button>
        <button
          type="button"
          className="btn"
          disabled={!name.trim()}
          onClick={() => {
            const blob = new Blob([JSON.stringify(buildResult(sc, st, name), null, 1)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `תוצאה-${name.trim()}-${sc.id}.json`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              URL.revokeObjectURL(a.href);
              a.remove();
            }, 500);
          }}
        >
          ⬇ הורדה כקובץ
        </button>
      </div>
    </section>
  );
}
