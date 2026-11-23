import { useEffect, useState } from 'react';
import { shiftLabel } from '../engine/feedback';
import { durationLabel } from '../engine/text';
import { clearAll, listHistory, type HistoryItem } from '../storage/db';
import { useApp } from '../ui/context';

export function History() {
  const { toast } = useApp();
  const [items, setItems] = useState<HistoryItem[] | null | 'blocked'>(null);
  const refresh = () => listHistory().then((h) => setItems(h ?? 'blocked'));
  useEffect(() => {
    void refresh();
  }, []);

  if (items === 'blocked')
    return (
      <div className="stack">
        <h1>היסטוריית תרגולים</h1>
        <p role="alert">האחסון המקומי חסום בדפדפן זה (למשל בגלישה פרטית). אפשר לשחק ולייצא תחקיר מהסשן הנוכחי, אך ההיסטוריה לא תישמר.</p>
      </div>
    );
  return (
    <div className="stack">
      <h1>היסטוריית תרגולים</h1>
      <p className="muted small">נשמר רק במכשיר הזה.</p>
      {items === null ? (
        <p aria-busy="true">טוען…</p>
      ) : items.length === 0 ? (
        <p>עדיין אין תרגולים שהושלמו.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }} className="stack">
          {items.map((h) => (
            <li key={h.id} className="card">
              <div className="meta">
                <strong>{h.title}</strong>
                <span className="chip">ציון: <bdi>{h.score}</bdi>/100</span>
                <span className="chip">{h.endingTitle}</span>
              </div>
              <p className="small muted">
                {new Date(h.finishedAt).toLocaleString('he-IL')} · משמרת {shiftLabel(h.shift)} · {h.mode === 'learning' ? 'למידה' : 'תרגול עצמאי'} · משך {durationLabel(h.durationMs)} · זרע <bdi>{h.seed}</bdi>
              </p>
              <a className="btn small" href={`#/debrief?h=${h.id}`}>
                פתיחת התחקיר
              </a>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="btn danger"
        onClick={async () => {
          if (!confirm('למחוק את כל ההיסטוריה ואת התרגול השמור? לא ניתן לשחזר.')) return;
          const ok = await clearAll();
          toast(ok ? 'ההיסטוריה נמחקה' : 'המחיקה נכשלה');
          void refresh();
        }}
      >
        מחיקת כל ההיסטוריה והשמירה
      </button>
    </div>
  );
}
