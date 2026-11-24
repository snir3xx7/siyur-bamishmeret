import { expect, test } from '@playwright/test';

test.skip(({ browserName }) => browserName !== 'chromium', 'service worker נבדק ב-Chromium');

test('הורדת תרחיש ופתיחתו ללא רשת', async ({ page, context }) => {
  await page.goto('./#/s/accident-rain?v=4&seed=11');
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== undefined);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.getByRole('button', { name: /הורדת תרחיש לשימוש לא מקוון/ }).click();
  await expect(page.getByTestId('offline-status')).toHaveText(/מוכן לשימוש לא מקוון/, { timeout: 30000 });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('seed')).toHaveText('11');
  await page.getByTestId('start').click();
  await page.getByTestId('go').click();
  await page.getByRole('button', { name: /דילוג על המעבר/ }).click();
  await expect(page.getByTestId('hotspots')).toBeVisible();
  // תמונת הרקע נטענה מהמטמון (אין טקסט חלופי)
  await expect(page.getByText(/התמונה לא נטענה/)).toHaveCount(0);
  const ok = await page.evaluate(() => {
    const img = document.querySelector<HTMLImageElement>('.scene .bg');
    return !!img && img.complete && img.naturalWidth > 0;
  });
  expect(ok).toBe(true);
  await context.setOffline(false);
});
