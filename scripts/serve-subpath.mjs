/**
 * שרת סטטי קטן שמגיש את dist תחת תת-נתיב, כמו GitHub Pages של מאגר:
 *   http://localhost:4178/siyur-bamishmeret/
 * משמש לבדיקת ה-build בתת-נתיב ולבדיקות מקצה לקצה.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.env.PORT ?? 4178);
const PREFIX = process.env.SUBPATH ?? '/siyur-bamishmeret/';
const ROOT = new URL('../dist/', import.meta.url).pathname;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg',
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname === '/' || url.pathname === PREFIX.slice(0, -1)) {
    res.writeHead(302, { Location: PREFIX });
    return res.end();
  }
  if (!url.pathname.startsWith(PREFIX)) {
    res.writeHead(404);
    return res.end('not found (outside subpath)');
  }
  let rel = decodeURIComponent(url.pathname.slice(PREFIX.length)) || 'index.html';
  const file = normalize(join(ROOT, rel));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end();
  }
  try {
    const s = await stat(file);
    if (s.isDirectory()) rel = join(rel, 'index.html');
    const body = await readFile(s.isDirectory() ? join(file, 'index.html') : file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}).listen(PORT, () => console.log(`serving dist at http://localhost:${PORT}${PREFIX}`));
