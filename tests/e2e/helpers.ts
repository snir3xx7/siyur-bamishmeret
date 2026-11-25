import { expect, type Page } from '@playwright/test';

/** גרסאות התרחישים הנוכחיות (כמו ב-public/scenarios/index.json) */
export const VERSIONS: Record<string, number> = {
  'accident-rain': 5,
  'noise-building': 3,
  'yard-dispute': 3,
  'missing-elder': 2,
  'suspicious-object': 3,
  'blocked-parking': 2,
  'lost-child': 3,
  'bar-fight': 3,
  'gas-smell': 3,
  'park-youths': 1,
  'shoplifting': 1,
  'burglary': 1,
  'domestic-call': 1,
};

export async function startScenario(page: Page, id = 'accident-rain', seed = 4, opts: { mode?: 'learning' | 'practice' } = {}) {
  await page.goto(`./#/s/${id}?v=${VERSIONS[id]}&seed=${seed}`);
  await expect(page.getByTestId('seed')).toHaveText(String(seed));
  if (opts.mode === 'practice') await page.getByLabel('תרגול עצמאי – משוב בסיום').check();
  await page.getByTestId('start').click();
  await expect(page.getByTestId('go')).toBeVisible();
}

export async function toScene(page: Page) {
  await page.getByTestId('go').click();
  await page.getByRole('button', { name: /דילוג על המעבר/ }).click();
  await expect(page.getByTestId('hotspots')).toBeVisible();
}

/** בחירת פעולה בנקודת עניין לפי טקסט */
export async function act(page: Page, hotspot: RegExp | string, choice: RegExp | string) {
  const list = page.getByTestId('hotspots');
  const hs = list.getByRole('button', { name: hotspot }).first();
  if ((await hs.getAttribute('aria-expanded')) !== 'true') await hs.click();
  await list.getByRole('button', { name: choice }).click();
}

export async function sendUpdate(page: Page, items: (RegExp | string)[]) {
  await page.getByTestId('open-composer').click();
  const dlg = page.getByRole('dialog', { name: 'שידור בקשר' });
  for (const i of items) await dlg.getByLabel(i).check();
  await dlg.getByRole('button', { name: /שליחת העדכון/ }).click();
  await expect(dlg).toBeHidden();
}

export async function finish(page: Page) {
  await page.getByTestId('finish').click();
  await page.getByTestId('confirm-finish').click();
  await expect(page.getByTestId('score')).toBeVisible();
}
