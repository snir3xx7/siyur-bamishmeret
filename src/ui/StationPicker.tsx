import { DISTRICTS, parseUnit, radioProfile, unitOptions, type RadioSettings } from '../config/stations';
import { useApp } from './context';

/** בחירת מחוז, תחנה ואות קריאה. נשמר במכשיר וחל על כל התרחישים */
export function StationPicker({ fictionalUnit, required }: { fictionalUnit: string; required?: boolean }) {
  const { settings, setSettings } = useApp();
  const r = settings.station;
  const set = (patch: Partial<RadioSettings>) => {
    const next = { ...r, ...patch };
    // מחוז בלי תחנות מוגדרות → הזנה ידנית
    const d = DISTRICTS.find((x) => x.id === next.district);
    if (next.mode === 'station' && d && !d.stations.some((s) => s.id === next.station)) {
      if (d.stations.length) next.station = d.stations[0].id;
      else next.mode = 'custom';
    }
    const units = unitOptions(next).map((u) => u.value);
    const cur = next.unitPrefix ? `${next.unitPrefix}|${next.unit}` : next.unit;
    if (units.length && !units.includes(cur)) Object.assign(next, parseUnit(units[0]));
    setSettings({ ...settings, station: next });
  };
  const district = DISTRICTS.find((d) => d.id === r.district) ?? DISTRICTS[0];
  const p = radioProfile(r, fictionalUnit);

  return (
    <fieldset className="station-picker" data-testid="station-picker">
      <legend>תחנה ואות קריאה</legend>
      {!required && (
        <div className="radio-row" role="radiogroup">
          <label>
            <input type="radio" name="radio-mode" checked={r.mode === 'fictional'} onChange={() => set({ mode: 'fictional' })} />
            <span>תחנה בדויה</span>
          </label>
          <label>
            <input type="radio" name="radio-mode" checked={r.mode !== 'fictional'} onChange={() => set({ mode: district.stations.length ? 'station' : 'custom' })} />
            <span>התחנה שלי</span>
          </label>
        </div>
      )}
      {(r.mode !== 'fictional' || required) && (
        <div className="station-grid">
          <label>
            מחוז
            <select value={r.mode === 'fictional' ? '' : r.district} onChange={(e) => set({ district: e.target.value, mode: 'station', station: '' })} data-testid="district-select">
              {r.mode === 'fictional' && <option value="" disabled>בחרו מחוז…</option>}
              {DISTRICTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          {r.mode !== 'fictional' && (<>
          <label>
            תחנה
            <select data-testid="station-select" value={r.mode === 'custom' ? 'custom' : r.station} onChange={(e) => (e.target.value === 'custom' ? set({ mode: 'custom' }) : set({ mode: 'station', station: e.target.value }))}>
              {district.stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              <option value="custom">תחנה אחרת – הזנה ידנית</option>
            </select>
          </label>
          {r.mode === 'custom' && (
            <>
              <label>
                שם התחנה
                <input value={r.customName} onChange={(e) => set({ customName: e.target.value })} placeholder="למשל: תחנת רעננה" maxLength={30} />
              </label>
              <label>
                קידומת בקשר
                <input value={r.customPrefix} onChange={(e) => set({ customPrefix: e.target.value })} placeholder="למשל: רעננה" maxLength={14} />
              </label>
            </>
          )}
          <label>
            הניידת שלך
            <select value={r.unitPrefix ? `${r.unitPrefix}|${r.unit}` : r.unit} onChange={(e) => set(parseUnit(e.target.value))} data-testid="unit-select">
              {unitOptions(r).map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </label>
          </>)}
        </div>
      )}
      {(p.real || !required) && <p className="small muted" data-testid="radio-summary">
        {p.real
          ? `בקשר: אתה ${p.unit}. ${p.center} („${p.centerCall}”) פותח את האירוע, ${p.head} (ראש המשמרת) מבקש להעביר אותו אליך, ואת האירוע מנהלים מול המשל״ט. קצין תורן: ${p.dutyOfficer}.`
          : `שמות בדויים: ${fictionalUnit} ומוקד אלון.`}
      </p>}
    </fieldset>
  );
}
