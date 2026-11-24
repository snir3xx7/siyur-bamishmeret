// דף בדיקה: רקע + כל מצבי הדמויות על רקע משובץ (לבדיקת שקיפות). שימוש: contact-sheet.mjs <out.jpg> <bg.webp> <char-prefix...>
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
const [out, bg, ...prefixes] = process.argv.slice(2);
const tiles = [];
const checker = Buffer.from('<svg width="20" height="20"><rect width="20" height="20" fill="#bbb"/><rect width="10" height="10" fill="#888"/><rect x="10" y="10" width="10" height="10" fill="#888"/></svg>');
for (const p of prefixes) for (const f of readdirSync('public/img/chars').filter((f) => f.startsWith(p + '-')).sort())
  tiles.push(await sharp('public/img/chars/' + f).resize({ height: 300 }).toBuffer());
const b = await sharp(bg).resize(800, 450).toBuffer();
let x = 810; const comps = [{ input: b, left: 0, top: 0 }];
for (const t of tiles) { const m = await sharp(t).metadata(); comps.push({ input: t, left: x, top: 140 }); x += m.width + 8; }
await sharp({ create: { width: x, height: 450, channels: 4, background: '#999' } })
  .composite([{ input: checker, tile: true, left: 0, top: 0 }, ...comps]).jpeg({ quality: 85 }).toFile(out);
