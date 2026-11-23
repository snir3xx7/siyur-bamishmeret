import { defineConfig, devices } from '@playwright/test';

/** הבדיקות רצות מול ה-build האמיתי, מוגש בתת-נתיב כמו ב-GitHub Pages */
const BASE = 'http://localhost:4178/siyur-bamishmeret/';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 2,
  reporter: [['list']],
  use: { baseURL: BASE, locale: 'he-IL', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build && node scripts/serve-subpath.mjs',
    url: BASE,
    // תמיד בונים מחדש כדי לבדוק את הקוד העדכני
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile-android-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'iphone-webkit', use: { ...devices['iPhone 14'] } },
  ],
});
