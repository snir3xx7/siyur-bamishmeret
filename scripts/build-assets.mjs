/**
 * מפיק את כל נכסי המדיה המקוריים של הפרויקט:
 *   public/img/*.webp      – רקעי זירות (יום/לילה)
 *   public/icons/*         – אייקוני PWA
 *   public/audio/*.mp3     – צלילי סביבה ואפקטים מסונתזים
 * הרצה: npm run assets  (דורש ffmpeg להמרת אודיו ל-MP3)
 */
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { accidentStreet, stairwell, yard, iconSvg } from './art.mjs';
import { SOUNDS, toWav } from './sound.mjs';

const root = new URL('..', import.meta.url).pathname;
const pub = join(root, 'public');
for (const d of ['img', 'icons', 'audio']) mkdirSync(join(pub, d), { recursive: true });

const only = process.argv[2];

if (!only || only === 'img') {
  const scenes = { 'accident-street': accidentStreet, stairwell, yard };
  for (const [name, fn] of Object.entries(scenes)) {
    for (const v of ['day', 'night']) {
      const out = join(pub, 'img', `${name}-${v}.webp`);
      await sharp(Buffer.from(fn(v === 'night'))).webp({ quality: 70 }).toFile(out);
      console.log('img', out);
    }
  }
}

if (!only || only === 'icons') {
  const icons = [
    ['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true], ['apple-touch-icon.png', 180, true],
  ];
  for (const [f, s, m] of icons) await sharp(Buffer.from(iconSvg(s, m))).png().toFile(join(pub, 'icons', f));
  writeFileSync(join(pub, 'icons', 'icon.svg'), iconSvg(64));
  console.log('icons ok');
}

if (!only || only === 'audio') {
  const tmp = mkdtempSync(join(tmpdir(), 'siyur-audio-'));
  for (const [name, fn] of Object.entries(SOUNDS)) {
    const wav = join(tmp, `${name}.wav`);
    writeFileSync(wav, toWav(fn()));
    const mp3 = join(pub, 'audio', `${name}.mp3`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-b:a', '64k', mp3]);
    console.log('audio', mp3);
  }
  rmSync(tmp, { recursive: true });
}
