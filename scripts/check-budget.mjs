/**
 * תקציב ביצועים: העברה ראשונית לקטלוג עד 1MB (דחוס).
 * סופר את מה שהקטלוג טוען: index.html, JS, CSS, manifest, אייקון, index.json.
 * תמונות ואודיו של תרחיש נטענים רק בפתיחתו – ומדווחים בנפרד.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const dist = new URL('../dist/', import.meta.url).pathname;
const BUDGET = 1024 * 1024;
const gz = (p) => gzipSync(readFileSync(join(dist, p))).length;
const raw = (p) => statSync(join(dist, p)).size;

// רק מה ש־index.html טוען בפועל (סקריפט ו־CSS ראשיים); חלקים שנטענים בעצלתיים (PixiJS) – בנפרד
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const entry = [...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+)"/g)].map((m) => m[1]);
const lazy = readdirSync(join(dist, 'assets')).map((f) => `assets/${f}`).filter((f) => !entry.includes(f));
const initial = ['index.html', 'manifest.webmanifest', 'icons/icon.svg', 'scenarios/index.json', ...entry];
let total = 0;
console.log('טעינה ראשונית (קטלוג):');
for (const f of initial) {
  const s = /\.(js|css|html|json|webmanifest|svg)$/.test(f) ? gz(f) : raw(f);
  total += s;
  console.log(`  ${f.padEnd(40)} ${(s / 1024).toFixed(1)} KB`);
}
console.log(`סה״כ: ${(total / 1024).toFixed(1)} KB מתוך תקציב ${(BUDGET / 1024).toFixed(0)} KB`);

console.log('\nנטען בעצלתיים (רק בזירה):');
for (const f of lazy) console.log(`  ${f.padEnd(40)} ${(gz(f) / 1024).toFixed(1)} KB`);

const idx = JSON.parse(readFileSync(join(dist, 'scenarios/index.json'), 'utf8'));
console.log('\nנטען בפתיחת תרחיש:');
for (const e of idx.scenarios) {
  const sc = JSON.parse(readFileSync(join(dist, 'scenarios', e.file), 'utf8'));
  const files = [`scenarios/${e.file}`, ...sc.media.images, ...sc.media.audio, ...Object.values(sc.media.voiceLines ?? {})];
  const sum = files.reduce((a, f) => a + raw(f), 0);
  console.log(`  ${e.id.padEnd(20)} ${(sum / 1024).toFixed(0)} KB (כל המשמרות והשכבות)`);
}
if (total > BUDGET) {
  console.error('חריגה מהתקציב!');
  process.exit(1);
}
