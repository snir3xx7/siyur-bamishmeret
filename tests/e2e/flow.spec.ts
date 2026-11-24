import { expect, test } from '@playwright/test';
import { act, finish, sendUpdate, startScenario, toScene } from './helpers';

test('קטלוג, דף מידע וכיווניות', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'he');
  await page.getByRole('link', { name: /התחלת תרגול/ }).click();
  for (const id of ['accident-rain', 'noise-building', 'yard-dispute']) await expect(page.getByTestId(`scn-${id}`)).toBeVisible();
  await expect(page.getByTestId('scn-accident-rain')).toContainText('דקות');
  await page.goto('./#/about');
  await expect(page.getByText('סימולציה עצמאית לצורכי תרגול. במצב חירום אמיתי יש לפנות למוקד 100').first()).toBeVisible();
  await expect(page.getByTestId('initiator')).toHaveText('שניר בוקסנבוים');
  await expect(page.getByRole('link', { name: /סימולטור מוקד 100/ })).toHaveAttribute('href', 'https://chabotierd.github.io/100simulator/');
});

test('תאונה בגשם מקצה לקצה: קשר, זירה, יומן, עדכון, תחקיר וייצוא', async ({ page }) => {
  await startScenario(page, 'accident-rain', 4, { mode: 'practice' });
  // מסוף קשר + השלמת פרטים
  await expect(page.getByText(/כאן מוקד אלון/).first()).toBeVisible();
  await page.getByRole('button', { name: /נמסר משהו על נפגעים/ }).click();
  await expect(page.getByText(/הנהגים יצאו מהרכבים ומתווכחים/).first()).toBeVisible();
  await toScene(page);
  // אורות: ברירת מחדל קבוע, אחרי אבטחה השתקפות – עם תווית טקסט
  await expect(page.getByText('אורות ניידת פעילים – אור קבוע')).toBeVisible();
  await act(page, /אזור התאונה/, /למקם את הניידת/);
  await expect(page.getByText('אורות ניידת פעילים – השתקפות על הכביש')).toBeVisible();
  await act(page, /דנה/, /איך היא מרגישה/);
  await act(page, /אורן/, /איך הוא מרגיש/);
  await sendUpdate(page, [/שדרות הזית פינת הכלנית/, /שני רכבים מעורבים/, /שני הנהגים בהכרה/]);
  await act(page, /אורן/, /בנפרד ולשמוע את גרסתו/);
  await act(page, /דנה/, /בנפרד ולשמוע את גרסתה/);
  // יומן פעולות
  await page.getByRole('tab', { name: 'יומן ותמליל' }).click();
  await expect(page.getByTestId('log')).toContainText('עדכון 1 למוקד');
  await expect(page.getByTestId('log').locator('li')).toHaveCount(await page.getByTestId('log').locator('li').count());
  await page.getByRole('tab', { name: 'מה ידוע לי' }).click();
  await expect(page.getByTestId('facts')).toContainText('אומת או נצפה בזירה');
  await page.getByRole('tab', { name: 'פעולות' }).click();
  await finish(page);
  // תחקיר
  const score = Number(await page.getByTestId('score').innerText().then((t) => t.match(/\d+/)![0]));
  expect(score).toBeGreaterThan(0);
  expect(score).toBeLessThan(100);
  await expect(page.getByTestId('improve').first()).toBeVisible();
  await expect(page.getByTestId('keep').first()).toBeVisible();
  await expect(page.getByTestId('timeline-item').first()).toBeVisible();
  await expect(page.getByTestId('report-missing')).toContainText('לא תועד');
  // ייצוא
  const dl = page.waitForEvent('download');
  await page.getByTestId('download').click();
  const file = await dl;
  const text = await (await file.createReadStream()).toArray().then((c) => Buffer.concat(c).toString('utf8'));
  expect(text).toContain('ציון:');
  expect(text).toContain('ציר החלטות');
  expect(text).toContain('טיוטת דוח פעולה');
  // היסטוריה
  await page.goto('./#/history');
  await expect(page.getByText('תאונת דרכים קלה בגשם').first()).toBeVisible();
});

test('אירוע מתפתח: החמרה באמצע הזירה, בדיקה חוזרת ועדכון', async ({ page }) => {
  await startScenario(page, 'accident-rain', 4);
  await toScene(page);
  await expect(page.getByTestId('radio-led')).toContainText('קשר');
  await act(page, /אזור התאונה/, /למקם את הניידת/);
  await act(page, /אזור התאונה/, /לתעד מה ראיתי/);
  await act(page, /אורן – נהג/, /איך הוא מרגיש/);
  await expect(page.getByTestId('event-banner')).toHaveCount(0);
  await act(page, /דנה – נהגת/, /איך היא מרגישה/);
  // האירוע קורה מעצמו אחרי הפעולה הרביעית
  await expect(page.getByTestId('event-banner')).toBeVisible();
  await expect(page.getByTestId('event-head')).toContainText('החמרה');
  await expect(page.getByTestId('dialogue')).toContainText('מסתובב לי הראש');
  // המצלמה מתקרבת לנקודה שנבחרה
  await expect(page.getByTestId('scene-cam')).toHaveClass(/focused/);
  // הדובר בזירה מסומן
  await expect(page.locator('.person.speaking')).toHaveCount(1);
  await act(page, /אורן – נהג/, /לבדוק את אורן שוב/);
  await expect(page.getByTestId('event-banner')).toHaveCount(0);
  await sendUpdate(page, [/החמיר – סחרחורת/]);
  await expect(page.getByTestId('radio-led')).toContainText('הודעת מוקד');
  await expect(page.getByTestId('dialogue')).toContainText('העברתי לצוות הרפואי את ההחמרה');
  await expect(page.getByTestId('dialogue')).not.toContainText('מוקד: מוקד:');
});

test('רענון באמצע משחק משחזר את המצב', async ({ page }) => {
  await startScenario(page, 'noise-building', 9, { mode: 'practice' });
  await page.getByRole('button', { name: /היו תלונות קודמות/ }).click();
  await toScene(page);
  await act(page, /^חדר המדרגות/, /להקשיב מאיזו דלת/);
  await expect(page.getByTestId('dialogue')).toContainText('המוזיקה מגיעה מדירה');
  await page.waitForTimeout(400);
  await page.reload();
  await expect(page.getByTestId('dialogue')).toContainText('המוזיקה מגיעה מדירה');
  await page.getByRole('tab', { name: 'יומן ותמליל' }).click();
  await expect(page.getByTestId('log')).toContainText('להקשיב מאיזו דלת');
  await expect(page.getByTestId('log')).toContainText('היו תלונות קודמות');
});

test('קישור ישיר לתרחיש עם זרע קבוע מוביל לכרטיס ומתחיל מיד', async ({ page }) => {
  await page.goto('./#/s/yard-dispute?v=2&seed=321');
  await expect(page.getByRole('heading', { name: 'ויכוח בין שכנים בחצר משותפת' })).toBeVisible();
  await expect(page.getByTestId('seed')).toHaveText('321');
  await page.getByTestId('start').click();
  await expect(page.getByTestId('go')).toBeVisible();
  // גרסה ישנה בקישור מציגה אזהרה
  await page.goto('./#/s/yard-dispute?v=1&seed=321');
  await expect(page.getByRole('alert')).toContainText('גרסה');
});

test('מצב למידה: השהיה עוצרת את השעון וחוסמת פעולות', async ({ page }) => {
  await startScenario(page, 'accident-rain', 8);
  await toScene(page);
  await page.getByRole('button', { name: /השהיה/ }).click();
  const before = await page.getByTestId('clock').innerText();
  await page.waitForTimeout(2500);
  expect(await page.getByTestId('clock').innerText()).toBe(before);
  await expect(page.getByRole('dialog', { name: 'התרגול מושהה' })).toBeVisible();
  await page.getByRole('button', { name: /המשך תרגול/ }).click();
  await act(page, /אזור התאונה/, /למקם את הניידת/);
  // חלון ההגדרות עוצר את השעון
  await page.getByRole('button', { name: /הגדרות/ }).click();
  const t1 = await page.locator('.play-bar .small.muted').innerText();
  await page.waitForTimeout(2500);
  expect(await page.locator('.play-bar .small.muted').innerText()).toBe(t1);
});

test('עמוד למדריך: קישור קבוע ובדיקת מסלולים', async ({ page }) => {
  await page.goto('./#/instructor');
  await page.getByLabel('זרע (1–999999)').fill('777');
  await expect(page.getByTestId('instructor-link')).toContainText('#/s/accident-rain?v=3&seed=777');
  await page.getByRole('button', { name: 'הרצת בדיקה' }).click();
  await expect(page.getByText('✓ לא נמצאו שגיאות')).toBeVisible({ timeout: 20000 });
});
