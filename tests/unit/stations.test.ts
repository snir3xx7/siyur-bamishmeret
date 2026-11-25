import { describe, expect, it } from 'vitest';
import { DEFAULT_RADIO, DISTRICTS, headRouteText, parseUnit, radioProfile, radioize, unitOptions } from '../../src/config/stations';

describe('תחנות ואותות קריאה', () => {
  it('ברירת המחדל בדויה – הטקסט לא משתנה', () => {
    const p = radioProfile(DEFAULT_RADIO, 'סייר 23');
    expect(p.real).toBe(false);
    expect(radioize('סייר 23, כאן מוקד אלון. אשר קבלה.', p)).toBe('סייר 23, כאן מוקד אלון. אשר קבלה.');
  });

  it('כפר סבא: הניידת „סבא 402”, ראש המשמרת „סבא 401”, קצין תורן „סבא 11”, משל״ט מרכז', () => {
    const p = radioProfile({ ...DEFAULT_RADIO, mode: 'station', district: 'center', station: 'kfar-saba', unit: '402' }, 'סייר 23');
    expect(p).toMatchObject({ real: true, unit: 'סבא 402', head: 'סבא 401', dutyOfficer: 'סבא 11', center: 'משל״ט מרכז' });
    expect(radioize('סייר 23, כאן מוקד אלון. תלונה על רעש.', p)).toBe('סבא 402 ממרכז. תלונה על רעש.');
    expect(p.centerCall).toBe('מרכז');
    expect(headRouteText(p)).toEqual({ open: 'מרכז מסבא 401', body: 'תעבירי את האירוע ל402.' });
    expect(radioize('מוקד: קיבלתי, רשמתי.', p)).toBe('משל״ט מרכז: קיבלתי, רשמתי.');
  });

  it('שיטור עירוני: „סבא 301” בכפר סבא, „רעננה 301” בתחום התחנה, „קל 301” בטייבה, „קדימה/כפר 301” בשדות', () => {
    const ks = { ...DEFAULT_RADIO, mode: 'station' as const, district: 'center', station: 'kfar-saba', unit: '301' };
    expect(radioProfile(ks, 'סייר 9').unit).toBe('סבא 301');
    expect(unitOptions(ks).map((u) => u.value)).toEqual(['402', '403', '404', '405', '301', '302', 'רעננה|301', 'רעננה|302']);
    const ra = radioProfile({ ...ks, ...parseUnit('רעננה|301') }, 'סייר 9');
    expect(ra).toMatchObject({ unit: 'רעננה 301', head: 'סבא 401', center: 'משל״ט מרכז' });
    const ty = radioProfile({ ...ks, station: 'tayibe', unit: '301', unitPrefix: 'קל' }, 'סייר 9');
    expect(ty.unit).toBe('קל 301');
    const sd = unitOptions({ ...ks, station: 'sdot' }).map((u) => u.value);
    expect(sd).toContain('קדימה|301');
    expect(sd).toContain('כפר|301');
  });

  it('7 מחוזות ושמות המשל״ט בקשר', () => {
    expect(DISTRICTS.map((d) => d.centerCall).sort()).toEqual(['אביב', 'דרום', 'חוף', 'ים', 'מרכז', 'צפון', 'שי'].sort());
    expect(radioProfile({ ...DEFAULT_RADIO, mode: 'station', district: 'center', station: 'petah-tikva', unit: '402' }, 'x').unit).toBe('פ״ת 402');
  });

  it('תחנה שהוזנה ידנית במחוז אחר – משל״ט לפי המחוז', () => {
    const p = radioProfile({ ...DEFAULT_RADIO, mode: 'custom', district: 'tel-aviv', customName: 'תחנת יפו', customPrefix: 'יפו', unit: '403' }, 'סייר 9');
    expect(p).toMatchObject({ unit: 'יפו 403', head: 'יפו 401', center: 'משל״ט אביב', stationName: 'תחנת יפו' });
  });
});
