import { describe, expect, it } from 'vitest';
import { DEFAULT_RADIO, radioProfile, radioize, unitOptions } from '../../src/config/stations';

describe('תחנות ואותות קריאה', () => {
  it('ברירת המחדל בדויה – הטקסט לא משתנה', () => {
    const p = radioProfile(DEFAULT_RADIO, 'סייר 23');
    expect(p.real).toBe(false);
    expect(radioize('סייר 23, כאן מוקד אלון. אשר קבלה.', p)).toBe('סייר 23, כאן מוקד אלון. אשר קבלה.');
  });

  it('כפר סבא: הניידת „סבא 402”, ראש המשמרת „סבא 401”, קצין תורן „סבא 11”, משל״ט מרכז', () => {
    const p = radioProfile({ ...DEFAULT_RADIO, mode: 'station', district: 'center', station: 'kfar-saba', unit: '402' }, 'סייר 23');
    expect(p).toMatchObject({ real: true, unit: 'סבא 402', head: 'סבא 401', dutyOfficer: 'סבא 11', center: 'משל״ט מרכז' });
    expect(radioize('סייר 23, כאן מוקד אלון. תלונה על רעש.', p)).toBe('סבא 402 מ401. תלונה על רעש.');
    expect(p.centerCall).toBe('מרכז');
    expect(radioize('מוקד: קיבלתי, רשמתי.', p)).toBe('סבא 401: קיבלתי, רשמתי.');
  });

  it('נתניה ושיטור עירוני: „נתניה 301”', () => {
    const r = { ...DEFAULT_RADIO, mode: 'station' as const, district: 'center', station: 'netanya', unit: '301' };
    expect(radioProfile(r, 'סייר 9').unit).toBe('נתניה 301');
    expect(unitOptions(r).map((u) => u.value)).toEqual(['402', '403', '404', '405', '301', '302']);
  });

  it('תחנה שהוזנה ידנית במחוז אחר – משל״ט לפי המחוז', () => {
    const p = radioProfile({ ...DEFAULT_RADIO, mode: 'custom', district: 'tel-aviv', customName: 'תחנת יפו', customPrefix: 'יפו', unit: '403' }, 'סייר 9');
    expect(p).toMatchObject({ unit: 'יפו 403', head: 'יפו 401', center: 'משל״ט אביב', stationName: 'תחנת יפו' });
  });
});
