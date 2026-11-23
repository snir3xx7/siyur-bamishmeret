import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * אחרי build: יוצר precache.json עם רשימת קבצי מעטפת האפליקציה (JS/CSS/HTML/אייקונים),
 * כדי שה-service worker ישמור אותם מראש. נכסי תרחישים (תמונות/אודיו) לא נכללים –
 * הם נשמרים רק בלחיצה על „הורדת תרחיש לשימוש לא מקוון”.
 */
function precacheManifest(): Plugin {
  let outDir = 'dist';
  return {
    name: 'siyur-precache-manifest',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const f of readdirSync(dir)) {
          const p = join(dir, f);
          if (statSync(p).isDirectory()) walk(p);
          else files.push(relative(outDir, p).split('\\').join('/'));
        }
      };
      walk(outDir);
      const shell = files.filter((f) =>
        /^(index\.html|manifest\.webmanifest|assets\/.*\.(js|css)|icons\/.*|scenarios\/index\.json)$/.test(f),
      );
      const version = Date.now().toString(36);
      writeFileSync(join(outDir, 'precache.json'), JSON.stringify({ version, files: ['./', ...shell] }, null, 1));
    },
  };
}

export default defineConfig({
  // './' = נתיבים יחסיים, עובד גם בשורש וגם בתת-נתיב של מאגר ב-GitHub Pages.
  base: './',
  plugins: [react(), precacheManifest()],
  build: { target: 'es2019', assetsInlineLimit: 0 },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    setupFiles: ['tests/unit/setup.ts'],
  },
} as never);
