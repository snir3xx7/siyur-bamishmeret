import { expect, test } from '@playwright/test';
import { act, startScenario, toScene } from './helpers';

test('פריסה: זירה, מגש פעולות ואין גלילה אופקית', async ({ page, isMobile }) => {
  await startScenario(page, 'accident-rain', 2);
  await toScene(page);
  const scene = await page.locator('.scene').boundingBox();
  const tray = await page.locator('.tray').boundingBox();
  const vp = page.viewportSize()!;
  expect(scene).not.toBeNull();
  expect(tray).not.toBeNull();
  if (isMobile) {
    expect(scene!.y).toBeLessThan(80); // הזירה בראש המסך
    expect(tray!.y + tray!.height).toBeGreaterThan(vp.height - 120); // מגש תחתון
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  // כפתורים גדולים למגע
  const h = await page.getByTestId('hotspots').getByRole('button').first().boundingBox();
  expect(h!.height).toBeGreaterThanOrEqual(44);
  await act(page, /אזור התאונה/, /למקם את הניידת/);
  await expect(page.getByTestId('dialogue')).toContainText('מיקמת את הניידת');
});

test('מצב אופקי בנייד', async ({ page, isMobile }) => {
  test.skip(!isMobile);
  const vp = page.viewportSize()!;
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await startScenario(page, 'yard-dispute', 2);
  await toScene(page);
  const scene = await page.locator('.scene').boundingBox();
  expect(scene!.width).toBeLessThan(vp.height); // הזירה לצד הלוח
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
