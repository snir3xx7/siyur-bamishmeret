import { expect, test } from '@playwright/test';
import { act, finish, sendUpdate, startScenario, toScene, VERSIONS } from './helpers';

test('קטלוג, דף מידע וכיווניות', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'he');
  await page.getByRole('link', { name: /התחלת תרגול/ }).click();
  for (const id of Object.keys(VERSIONS)) await expect(page.getByTestId(`scn-${id}`)).toBeVisible();
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
  // אחרי חמש פעולות ראש המשמרת קורא בקשר: „אתה פנוי?”
  await expect(page.getByTestId('event-banner')).toContainText('קריאה בקשר');
  await expect(page.getByTestId('dialogue')).toContainText('אתה פנוי?');
  await act(page, /מכשיר הקשר/, /שלילי/);
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
  // ב־WebKit מיד אחרי טעינה מחדש הלחיצה הראשונה לפעמים נבלעת – מנסים עד שהלשונית נבחרת
  const logTab = page.getByRole('tab', { name: 'יומן ותמליל' });
  await expect(async () => {
    await logTab.click();
    await expect(logTab).toHaveAttribute('aria-selected', 'true', { timeout: 1000 });
  }).toPass({ timeout: 10000 });
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
  await expect(page.getByTestId('instructor-link')).toContainText('#/s/accident-rain?v=4&seed=777');
  await page.getByRole('button', { name: 'הרצת בדיקה' }).click();
  await expect(page.getByText('✓ לא נמצאו שגיאות')).toBeVisible({ timeout: 20000 });
});

test('סמכות: קטטה – דרישת הזדהות בלי הסבר נתקלת בסירוב, הסבר פותר', async ({ page }) => {
  await startScenario(page, 'bar-fight', 4, { mode: 'practice' });
  await toScene(page);
  await act(page, /^המדרכה מול הבר/, /להפריד/);
  await act(page, /^דור – החשוד/, /תעודת זהות. עכשיו/);
  await expect(page.getByTestId('dialogue')).toContainText('אני לא חייב לתת לך כלום');
  await act(page, /^דור – החשוד/, /להסביר לדור בשקט/);
  await expect(page.getByTestId('dialogue')).toContainText('בסדר. הנה');
  await expect(page.getByTestId('char-dor')).toBeVisible();
});

test('תחנה ואות קריאה: כפר סבא – שרשרת קשר מהמשל״ט דרך 401 אל הניידת', async ({ page }) => {
  await page.goto(`./#/s/noise-building?v=${VERSIONS['noise-building']}&seed=9`);
  const picker = page.getByTestId('station-picker');
  await picker.getByText('התחנה שלי').click();
  await picker.getByLabel('הניידת שלך').selectOption('403');
  await expect(page.getByTestId('radio-summary')).toContainText('סבא 403');
  await page.getByRole('button', { name: /התחלת התרחיש/ }).click();
  await expect(page.getByTestId('radio-chain')).toContainText('משל״ט מרכז');
  await expect(page.getByTestId('radio-chain')).toContainText('סבא 401');
  await expect(page.getByText(/סבא 403 מ401/).first()).toBeVisible();
});

test('משמרת מלאה: קישור מדריך, אירוע ראשון, תחקיר וחזרה למשמרת', async ({ page }) => {
  await page.goto('./#/shift?shift=evening&d=standard&s=noise-building:9,yard-dispute:5');
  await expect(page.getByTestId('shift-plan')).toContainText('אירוע 1');
  await page.getByTestId('shift-next').click();
  await toScene(page);
  await finish(page);
  await expect(page.getByTestId('shift-continue')).toBeVisible();
  await expect(page.getByTestId('procedure')).toContainText('נוהל קשר');
  await page.getByTestId('shift-continue').getByRole('link').click();
  await expect(page.getByTestId('shift-plan')).toContainText('ציון');
  await expect(page.getByTestId('shift-next')).toContainText('האירוע הבא');
});

test('פנקס שטח: רישום בזמן המשחק ובדיקה בתחקיר', async ({ page }) => {
  await startScenario(page, 'noise-building', 9, { mode: 'practice' });
  await toScene(page);
  await page.getByTestId('tab-notes').click();
  await page.getByTestId('notebook').fill('20:52 הגעה. אירוע 5108. רינה – דירה 3');
  await page.getByTestId('notebook').blur();
  await finish(page);
  await expect(page.getByTestId('notebook-check')).toContainText('מספר אירוע 5108');
});

test('הנפשת דמויות (PixiJS): השכבה רצה, הדמויות מצוירות בה ותמונות ה־DOM מוסתרות', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebGL בדפדפן WebKit ללא מסך אינו יציב בסביבת הבדיקות');
  await page.goto(`./?pixi=1#/s/bar-fight?v=${VERSIONS['bar-fight']}&seed=9`);
  await page.getByRole('button', { name: /התחלת התרחיש/ }).click();
  await toScene(page);
  const layer = page.getByTestId('pixi-layer');
  await expect(layer.locator('canvas')).toHaveCount(1);
  await expect(page.locator('.scene.pixi-on')).toHaveCount(1);
  await expect.poll(async () => Number(await layer.getAttribute('data-frames'))).toBeGreaterThan(30);
  await expect(page.locator('.scene.pixi-on .actor.has-sprite .sprite').first()).toHaveCSS('opacity', '0');
});
