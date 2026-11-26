/**
 * „סיור במשמרת” – מעקב חניכים בגיליון Google פרטי.
 *
 * התקנה (פעם אחת):
 *  1. גיליון Google חדש → הרחבות → Apps Script → מוחקים הכול ומדביקים את הקובץ הזה → שמירה.
 *  2. הגדרות הפרויקט (⚙) → מאפייני סקריפט → מוסיפים:
 *       ADMIN_PASSWORD = הסיסמה שלכם (רק אתם יודעים אותה; לא נשמרת באתר)
 *       TEAMS          = רשימת קורסים/צוותים מופרדת בפסיקים, למשל: קורס סיור 12, קורס סיור 13
 *  3. פריסה → פריסה חדשה → סוג: אפליקציית אינטרנט → „ביצוע בתור: אני”, „גישה: כל אחד” → פריסה → אישור הרשאות.
 *  4. מעתיקים את כתובת אפליקציית האינטרנט (…/exec) ושולחים למפתח – היא נכנסת להגדרות האתר.
 *
 * מה נשמר: גיליון „Events” – שורה לכל אירוע (כניסה, התחלת תרחיש, סיום עם ציון ומשוב, תרגול „מצא את הטעויות”).
 * הסיסמה נבדקת כאן, בצד השרת. ניסיונות שגויים רבים חוסמים לרבע שעה.
 */

const SHEET = 'Events';
const HEAD = ['זמן', 'חניך', 'צוות', 'מזהה מכשיר', 'אירוע', 'תרחיש', 'שם התרחיש', 'ציון', 'סיום', 'סוג סיום', 'תחומים', 'לשיפור', 'נוספים', 'גרסה'];
const EVENTS = ['enter', 'start', 'finish', 'review'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(HEAD);
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
  }
  return sh;
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

const s_ = (v, n) => String(v == null ? '' : v).slice(0, n);

function doGet(e) {
  // רשימת הצוותים לבחירה בכניסה – ציבורי
  const teams = (PropertiesService.getScriptProperties().getProperty('TEAMS') || '').split(',').map((t) => t.trim()).filter(String);
  return out_({ ok: true, teams });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return out_({ ok: false, error: 'bad json' });
  }
  if (body.action === 'admin') return admin_(body);
  if (body.action === 'log') return log_(body.events || [body]);
  return out_({ ok: false, error: 'unknown action' });
}

/** רישום אירועים מהאתר (תור – כמה יחד) */
function log_(events) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_();
    const rows = events.slice(0, 50).filter((ev) => EVENTS.indexOf(ev.event) >= 0 && ev.trainee).map((ev) => [
      new Date(ev.at || Date.now()),
      s_(ev.trainee, 40),
      s_(ev.team, 40),
      s_(ev.device, 40),
      ev.event,
      s_(ev.scenarioId, 60),
      s_(ev.title, 120),
      typeof ev.total === 'number' ? ev.total : '',
      s_(ev.ending, 160),
      s_(ev.endingKind, 10),
      s_(JSON.stringify(ev.domains || {}), 400),
      s_((ev.improve || []).join(' | '), 2000),
      s_(JSON.stringify(ev.extra || {}), 400),
      s_(ev.version, 10),
    ]);
    if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEAD.length).setValues(rows);
    return out_({ ok: true, n: rows.length });
  } finally {
    lock.releaseLock();
  }
}

/** לוח המנהל: רק עם הסיסמה הנכונה */
function admin_(body) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('fails') || 0);
  if (fails >= 8) return out_({ ok: false, error: 'locked' });
  const pass = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!pass || body.password !== pass) {
    cache.put('fails', String(fails + 1), 900);
    Utilities.sleep(800);
    return out_({ ok: false, error: 'password' });
  }
  cache.remove('fails');
  const sh = sheet_();
  const n = sh.getLastRow() - 1;
  const take = Math.min(n, 5000);
  const vals = take > 0 ? sh.getRange(sh.getLastRow() - take + 1, 1, take, HEAD.length).getValues() : [];
  const rows = vals.map((r) => ({
    at: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
    trainee: r[1],
    team: r[2],
    device: r[3],
    event: r[4],
    scenarioId: r[5],
    title: r[6],
    total: r[7] === '' ? null : Number(r[7]),
    ending: r[8],
    endingKind: r[9],
    domains: parse_(r[10]),
    improve: r[11] ? String(r[11]).split(' | ') : [],
    extra: parse_(r[12]),
    version: r[13],
  }));
  return out_({ ok: true, rows, total: n });
}

function parse_(s) {
  try {
    return JSON.parse(s || '{}');
  } catch (e) {
    return {};
  }
}
