import { expect, test } from '@playwright/test';
import { act, finish, sendUpdate, startScenario, toScene } from './helpers';

// בדיקות כשל: חוסמים service worker כדי שחסימת הבקשות תחול גם על נכסים שהוא היה מגיש
test.use({ serviceWorkers: 'block' });

test('כשל בטעינת אודיו לא עוצר את המשחק', async ({ page }) => {
  await page.route('**/*.mp3', (r) => r.abort());
  await startScenario(page, 'accident-rain', 5);
  await toScene(page);
  await expect(page.getByText(/חלק מקובצי השמע לא נטענו/).first()).toBeVisible({ timeout: 10000 });
  await act(page, /אזור התאונה/, /למקם את הניידת/);
  await finish(page);
});

test('כשל בטעינת תמונת רקע מציג תיאור טקסט', async ({ page }) => {
  await page.route('**/*.webp', (r) => r.abort());
  await startScenario(page, 'yard-dispute', 5);
  await toScene(page);
  await expect(page.getByText(/התמונה לא נטענה. תיאור הזירה/)).toBeVisible();
});

test('מצב טקסט בלבד, הפחתת תנועה ומקלדת בלבד – משחק שלם', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('siyur.settings.v1', JSON.stringify({ textOnly: true })));
  await page.goto('./#/s/noise-building?v=3&seed=12');
  // ניווט במקלדת בלבד: פוקוס ו-Enter
  const press = async (loc: ReturnType<typeof page.getByRole>) => {
    await loc.focus();
    await page.keyboard.press('Enter');
  };
  await press(page.getByTestId('start'));
  await press(page.getByTestId('go'));
  await press(page.getByRole('button', { name: /דילוג על המעבר/ }));
  const list = page.getByTestId('hotspots');
  await press(list.getByRole('button', { name: /^חדר המדרגות/ }));
  await press(list.getByRole('button', { name: /להקשיב מאיזו דלת/ }));
  await expect(page.getByTestId('dialogue')).toContainText('המוזיקה מגיעה מדירה');
  await press(page.getByTestId('finish'));
  await press(page.getByTestId('confirm-finish'));
  await expect(page.getByTestId('score')).toBeVisible();
  // אין אנימציות פעילות בזירה במצב הפחתת תנועה
  const animated = await page.evaluate(() => document.querySelectorAll('.anim-ok').length);
  expect(animated).toBe(0);
});

test('תקציב ביצועים: העברה ראשונית לקטלוג קטנה מ-1MB', async ({ page }) => {
  let bytes = 0;
  page.on('response', async (r) => {
    try {
      bytes += (await r.body()).length;
    } catch {
      /* redirect */
    }
  });
  await page.goto('./#/catalog');
  await expect(page.getByTestId('scn-accident-rain')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(bytes).toBeLessThan(1024 * 1024);
  // לא נטענו תמונות או אודיו של תרחישים
  const media = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => /\.(webp|mp3)/.test(e.name)).length);
  expect(media).toBe(0);
});

test('שמירה חסומה: אפשר להשלים משחק ולייצא תחקיר', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { get() { throw new Error('blocked'); } });
  });
  await startScenario(page, 'accident-rain', 3);
  await expect(page.getByText(/השמירה המקומית חסומה/)).toBeVisible();
  await toScene(page);
  await sendUpdate(page, [/שדרות הזית/]);
  await finish(page);
  const dl = page.waitForEvent('download');
  await page.getByTestId('download').click();
  expect((await dl).suggestedFilename()).toMatch(/\.txt$/);
});

test('לחיצה כפולה מהירה לא משכפלת החלטה', async ({ page }) => {
  await startScenario(page, 'accident-rain', 6);
  const btn = page.getByRole('button', { name: /נמסר משהו על נפגעים/ });
  await expect(btn).toBeEnabled();
  // שתי לחיצות באותו רגע, לפני שהממשק מתעדכן – המקרה הקשה ביותר לשכפול.
  // (dblclick של העכבר היה תלוי בתזמון ובשכבות צפות ונכשל לסירוגין ב-CI)
  await btn.evaluate((b: HTMLElement) => { b.click(); b.click(); });
  await page.getByRole('button', { name: /תמליל/ }).click();
  await expect(page.getByTestId('log').getByText('לשאול: נמסר משהו על נפגעים?')).toHaveCount(1);
});
