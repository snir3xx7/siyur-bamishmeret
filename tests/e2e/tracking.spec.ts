import { createServer, type Server } from 'node:http';
import { expect, test } from '@playwright/test';
import { finish, startScenario, toScene } from './helpers';

/**
 * מעקב חניכים מול שרת מדומה שמתנהג כמו סקריפט Google (docs/admin/Code.gs):
 * GET → צוותים; POST log → שמירה; POST admin → שורות רק עם הסיסמה הנכונה.
 */
let server: Server;
let rows: Record<string, unknown>[] = [];
const PORT = 5199 + Math.floor(Math.random() * 300);
const URL = `http://127.0.0.1:${PORT}/exec`;

test.beforeAll(async () => {
  server = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'GET') return res.end(JSON.stringify({ ok: true, teams: ['קורס סיור 12', 'קורס סיור 13'] }));
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      const j = JSON.parse(b);
      if (j.action === 'log') {
        for (const ev of j.events) rows.push({ ...ev, domains: ev.domains ?? {}, improve: ev.improve ?? [], extra: ev.extra ?? {}, total: ev.total ?? null });
        return res.end(JSON.stringify({ ok: true }));
      }
      if (j.action === 'admin') return res.end(JSON.stringify(j.password === 'סוד-מדריך' ? { ok: true, rows } : { ok: false, error: 'password' }));
      res.end('{}');
    });
  });
  await new Promise<void>((r) => server.listen(PORT, '127.0.0.1', r));
});
test.afterAll(() => server.close());

test('מעקב: שם וצוות בכניסה, התחלה וסיום נרשמים, ולוח הניהול מוגן בסיסמה', async ({ page }) => {
  rows = [];
  await page.goto('./');
  await page.evaluate((u) => localStorage.setItem('siyur.trackUrl', u), URL);
  await page.goto('./#/officer');
  await expect(page.getByTestId('who')).toBeVisible();
  await expect(page.getByTestId('officer-confirm')).toBeDisabled();
  await page.getByTestId('who-name').fill('שירן כ.');
  await page.getByTestId('who-team').selectOption('קורס סיור 13');
  await page.getByTestId('district-select').selectOption('center');
  // בסימולציית האייפון של Playwright הלחיצה נחסמת אחרי הקלדה בשדה (באג של הכלי, לא של הדף) – לוחצים במקלדת
  await page.getByTestId('officer-confirm').focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => rows.filter((r) => r.event === 'enter').length).toBeGreaterThan(0);

  await startScenario(page, 'shoplifting', 3);
  await toScene(page);
  await finish(page);
  await expect.poll(() => rows.map((r) => r.event)).toEqual(expect.arrayContaining(['start', 'finish']));
  const fin = rows.find((r) => r.event === 'finish')!;
  expect(fin.trainee).toBe('שירן כ.');
  expect(fin.team).toBe('קורס סיור 13');
  expect(typeof fin.total).toBe('number');
  expect(JSON.stringify(fin)).not.toContain('notebook');

  await page.goto('./#/admin');
  await page.getByTestId('admin-pw').fill('לא נכון');
  await page.getByTestId('admin-enter').click();
  await expect(page.getByRole('alert')).toContainText('סיסמה שגויה');
  await page.getByTestId('admin-pw').fill('סוד-מדריך');
  await page.getByTestId('admin-enter').click();
  const table = page.getByTestId('admin-people');
  await expect(table).toContainText('שירן כ.');
  await expect(table).toContainText('קורס סיור 13');
  await table.getByRole('button', { name: 'פירוט' }).click();
  await expect(page.getByTestId('admin-detail')).toContainText('סיים תרחיש');
  await expect(page.getByTestId('admin-detail')).toContainText('חשד לגניבה');
});

test('בלי כתובת מעקב – אין שדות זיהוי ואין שליחה', async ({ page }) => {
  await page.goto('./#/officer');
  await expect(page.getByTestId('officer-confirm')).toBeVisible();
  await expect(page.getByTestId('who')).toHaveCount(0);
  await page.goto('./#/admin');
  await expect(page.getByText('המעקב עדיין לא הופעל')).toBeVisible();
});
