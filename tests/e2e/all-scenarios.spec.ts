import { expect, test } from '@playwright/test';
import { VERSIONS, finish, startScenario, toScene } from './helpers';

/**
 * בדיקה מקיפה: כל תרחיש – מהקריאה, דרך הזירה ופעולה ראשונה בכל נקודה, ועד התחקיר עם כל הכרטיסים.
 * רץ בשלושת המכשירים (מחשב, אנדרואיד, אייפון). נכשל על כל שגיאת JavaScript בדף.
 */
for (const id of Object.keys(VERSIONS)) {
  test(`תרחיש מלא: ${id}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await startScenario(page, id, 7);
    await toScene(page);
    // בכל נקודה בזירה: פותחים ובוחרים את הפעולה הראשונה הזמינה (עד 6 פעולות)
    const list = page.getByTestId('hotspots');
    for (let k = 0; k < 6; k++) {
      const spots = list.locator('button[aria-expanded]');
      const n = await spots.count();
      if (!n) break;
      const hs = spots.nth(k % n);
      if ((await hs.getAttribute('aria-expanded')) !== 'true') await hs.click();
      const choice = list.locator('.choices button').first();
      if (!(await choice.count())) continue;
      await choice.click();
      await expect(page.getByTestId('dialogue')).toBeVisible();
    }
    await finish(page);
    await expect(page.getByTestId('action-report')).toBeVisible();
    await expect(page.getByTestId('send-result')).toBeVisible();
    await expect(page.getByTestId('bodycam')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test('מצא את הטעויות – עד הסיכום', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./#/review/id-check');
  for (let i = 0; i < 20; i++) {
    const next = page.getByTestId('rv-next');
    if (await page.getByTestId('rv-summary').isVisible()) break;
    await page.getByTestId(i % 2 ? 'rv-ok' : 'rv-bad').click();
    await next.click();
  }
  await expect(page.getByTestId('rv-summary')).toBeVisible();
  expect(errors).toEqual([]);
});

test('לוח מדריך ועורך – נפתחים', async ({ page }) => {
  await page.goto('./#/instructor');
  await expect(page.getByTestId('results-board')).toBeVisible();
  await page.getByTestId('editor-link').click();
  await expect(page.getByTestId('editor')).toBeVisible();
  await page.getByTestId('ed-fork').click();
  await expect(page.getByTestId('ed-validate')).toBeVisible();
  await page.getByTestId('ed-validate').click();
  await expect(page.getByTestId('ed-check')).toContainText('תקין');
});
