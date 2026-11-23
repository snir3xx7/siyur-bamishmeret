import { useEffect, useRef, useSyncExternalStore } from 'react';
import { audio } from '../audio/audio';
import { DEFAULT_SETTINGS, type Settings } from '../storage/settings';
import { useApp } from './context';

export function useAudioStatus() {
  return useSyncExternalStore(
    (fn) => audio.subscribe(fn),
    () => `${audio.status}|${audio.failed.size}|${audio.hebrewVoice ? 1 : 0}`,
  );
}

export function Modal({ open, title, onClose, children, labelId }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode; labelId: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="modal" aria-labelledby={labelId} onClose={onClose} onCancel={onClose}>
      <div className="modal-head">
        <h2 id={labelId}>{title}</h2>
        <button type="button" className="btn small" onClick={onClose} aria-label="סגירה">
          ✕
        </button>
      </div>
      <div className="modal-body">{open && children}</div>
    </dialog>
  );
}

const CHANNELS: [keyof Settings, string][] = [
  ['master', 'עוצמה כללית'],
  ['speech', 'דיבור'],
  ['radio', 'קשר'],
  ['ambience', 'סביבה'],
  ['sfx', 'אפקטים'],
];

export function SettingsDialog() {
  const { settings: s, setSettings, settingsOpen, openSettings } = useApp();
  useAudioStatus();
  const set = (patch: Partial<Settings>) => setSettings({ ...s, ...patch });

  return (
    <Modal open={settingsOpen} title="הגדרות" onClose={() => openSettings(false)} labelId="settings-title">
      <div className="stack">
        <p className="small muted">ההגדרות נשמרות במכשיר זה בלבד. שעון התרחיש עצור כל עוד החלון פתוח.</p>
        <fieldset>
          <legend>שמע</legend>
          <div className="stack">
            <label className="radio-row">
              <input type="checkbox" checked={s.muted} onChange={(e) => set({ muted: e.target.checked })} /> השתקה כוללת
            </label>
            <label className="radio-row">
              <input type="checkbox" checked={s.textOnly} onChange={(e) => set({ textOnly: e.target.checked })} /> טקסט בלבד (ללא שמע כלל, כל ההודעות מוצגות כתמליל)
            </label>
            {CHANNELS.map(([k, label]) => (
              <label key={k} style={{ display: 'block' }}>
                {label}: <span className="ltr">{Math.round((s[k] as number) * 100)}%</span>
                <input type="range" min={0} max={1} step={0.05} value={s[k] as number} onChange={(e) => set({ [k]: Number(e.target.value) } as Partial<Settings>)} aria-label={`עוצמת ${label}`} />
              </label>
            ))}
            <div className="btn-row">
              <button type="button" className="btn small" onClick={() => { audio.unlock(); void audio.play('sample', 'sfx'); }}>
                ▶ השמעת דוגמה
              </button>
              <button type="button" className="btn small" onClick={() => { audio.unlock(); void audio.play('radio-chirp', 'radio'); }}>
                ▶ דוגמת קשר
              </button>
              <button type="button" className="btn small" onClick={() => { audio.unlock(); void audio.say('בדיקת הקראה. סייר עשרים ושלוש, כאן מוקד.', undefined, 'speech'); }} disabled={!audio.hebrewVoice || !s.tts}>
                ▶ דוגמת הקראה
              </button>
            </div>
            <label className="radio-row">
              <input type="checkbox" checked={s.tts} onChange={(e) => set({ tts: e.target.checked })} /> הקראת הודעות בקול הדפדפן (אם קיים קול עברי במכשיר)
            </label>
            <p className="small muted">
              {audio.hebrewVoice ? `נמצא קול עברי: ${audio.hebrewVoice.name}` : 'לא נמצא קול עברי במכשיר – ההודעות יוצגו כתמליל.'}
              {audio.status === 'blocked' && ' הדפדפן חוסם כרגע השמעה – לחצו על „הפעלת שמע” במסך המשחק.'}
              {audio.failed.size > 0 && ` חלק מקובצי השמע לא נטענו (${audio.failed.size}); המשחק ממשיך עם תמלילים.`}
            </p>
          </div>
        </fieldset>
        <fieldset>
          <legend>תצוגה ותנועה</legend>
          <div className="stack">
            <label className="radio-row">
              <input type="checkbox" checked={s.lightsAnim} onChange={(e) => set({ lightsAnim: e.target.checked })} /> אנימציה עדינה של אורות הניידת (ברירת מחדל: כבוי – אור קבוע)
            </label>
            <div role="radiogroup" aria-label="הפחתת תנועה" className="radio-row">
              {([['system', 'לפי הגדרות המכשיר'], ['on', 'הפחתת תנועה'], ['off', 'תנועה מלאה']] as const).map(([v, l]) => (
                <label key={v}>
                  <input type="radio" name="rm" checked={s.reduceMotion === v} onChange={() => set({ reduceMotion: v })} />
                  <span>{l}</span>
                </label>
              ))}
            </div>
            <div role="radiogroup" aria-label="גודל טקסט" className="radio-row">
              {([['normal', 'טקסט רגיל'], ['large', 'טקסט גדול']] as const).map(([v, l]) => (
                <label key={v}>
                  <input type="radio" name="ts" checked={s.textSize === v} onChange={() => set({ textSize: v })} />
                  <span>{l}</span>
                </label>
              ))}
            </div>
            <label className="radio-row">
              <input type="checkbox" checked={s.showHotspotLabels} onChange={(e) => set({ showHotspotLabels: e.target.checked })} /> הצגת שמות נקודות העניין על התמונה
            </label>
          </div>
        </fieldset>
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => setSettings({ ...DEFAULT_SETTINGS })}>
            איפוס לברירת מחדל
          </button>
          <button type="button" className="btn primary" onClick={() => openSettings(false)}>
            סגירה
          </button>
        </div>
      </div>
    </Modal>
  );
}
