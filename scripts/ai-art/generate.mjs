#!/usr/bin/env node
/**
 * הפקת איורים חצי־ריאליסטיים דרך ComfyUI מקומי (FLUX.1 schnell, רישיון Apache-2.0).
 *
 *   node scripts/ai-art/generate.mjs [--only <id,...>] [--force]
 *
 * - הגדרות והנחיות: scripts/ai-art/art.json
 * - רקעים: גרסה אחת מטקסט (base), והשנייה נגזרת ממנה בתיקון צבע – אותה קומפוזיציה בדיוק.
 * - דמויות ורכבים: על רקע ירוק אחיד, מוסר במפתח צבע, נחתך לגבולות ונשמר כ-WebP שקוף.
 * - קבצי מקור (PNG) נשמרים ב-art-src/ (לא נכנס ל-build), התוצרים ב-public/img/.
 * דורש ComfyUI פעיל (ברירת מחדל http://127.0.0.1:8188, או COMFY_URL).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const COMFY = process.env.COMFY_URL ?? 'http://127.0.0.1:8188';
const SRC = join(ROOT, 'art-src');
const OUT = join(ROOT, 'public/img');
const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/ai-art/art.json'), 'utf8'));
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const force = args.includes('--force');
mkdirSync(SRC, { recursive: true });
mkdirSync(join(OUT, 'chars'), { recursive: true });
mkdirSync(join(OUT, 'props'), { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function upload(path) {
  const fd = new FormData();
  fd.append('image', new Blob([readFileSync(path)]), path.split('/').pop());
  fd.append('overwrite', 'true');
  const r = await fetch(`${COMFY}/upload/image`, { method: 'POST', body: fd });
  return (await r.json()).name;
}

/** מריץ גרף FLUX. init = תמונת מקור ל-img2img */
async function render({ prompt, w, h, seed, steps = 4, init = undefined, denoise = 1 }) {
  const wf = {
    6: { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['30', 1] } },
    33: { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['30', 1] } },
    30: { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'flux1-schnell-fp8.safetensors' } },
    31: { class_type: 'KSampler', inputs: { seed, steps, cfg: 1, sampler_name: 'euler', scheduler: 'simple', denoise, model: ['30', 0], positive: ['6', 0], negative: ['33', 0], latent_image: init ? ['41', 0] : ['27', 0] } },
    8: { class_type: 'VAEDecode', inputs: { samples: ['31', 0], vae: ['30', 2] } },
    9: { class_type: 'SaveImage', inputs: { filename_prefix: 'siyur', images: ['8', 0] } },
  };
  if (init) {
    wf[40] = { class_type: 'LoadImage', inputs: { image: await upload(init) } };
    wf[41] = { class_type: 'VAEEncode', inputs: { pixels: ['40', 0], vae: ['30', 2] } };
  } else wf[27] = { class_type: 'EmptySD3LatentImage', inputs: { width: w, height: h, batch_size: 1 } };
  const { prompt_id: id } = await (await fetch(`${COMFY}/prompt`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: wf }) })).json();
  for (;;) {
    const hist = await (await fetch(`${COMFY}/history/${id}`)).json();
    const job = hist[id];
    if (job?.status?.status_str === 'error') throw new Error(JSON.stringify(job.status).slice(0, 500));
    if (job?.outputs?.['9']) {
      const img = job.outputs['9'].images[0];
      const q = new URLSearchParams({ filename: img.filename, subfolder: img.subfolder, type: img.type });
      return Buffer.from(await (await fetch(`${COMFY}/view?${q}`)).arrayBuffer());
    }
    await sleep(1500);
  }
}

/**
 * הסרת רקע: דוגמים את צבע הרקע מהשוליים (FLUX לא תמיד מצייר ירוק טהור),
 * מציפים מהשוליים פיקסלים קרובים לצבע הזה, ומסירים גם "חורים" סגורים (בין ידיים/רגליים) רק כשהם קרובים מאוד.
 * קצוות מקבלים שקיפות חלקית והסרת שפך ירוק. בסוף חותכים לגבולות הדמות.
 */
async function keyGreen(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const border = [];
  for (let x = 0; x < W; x += 4) border.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y += 4) border.push(y * W, y * W + W - 1);
  const med = (k) => { const v = border.map((p) => data[p * 4 + k]).sort((a, b) => a - b); return v[v.length >> 1]; };
  const bg = [med(0), med(1), med(2)];
  const dist = (p) => { const i = p * 4; return Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]); };
  const greenish = (p) => { const i = p * 4; return data[i + 1] - Math.max(data[i], data[i + 2]); };
  const NEAR = 95, TIGHT = 45;
  const out = new Uint8Array(W * H); // 1 = רקע
  const st = [];
  for (let x = 0; x < W; x++) st.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
  while (st.length) {
    const p = st.pop();
    // גם צללים ירקרקים כהים (רצפת המסך הירוק) נחשבים רקע
    if (out[p] || (dist(p) > NEAR && greenish(p) < 22)) continue;
    out[p] = 1;
    const x = p % W, y = (p / W) | 0;
    if (x > 0) st.push(p - 1); if (x < W - 1) st.push(p + 1); if (y > 0) st.push(p - W); if (y < H - 1) st.push(p + W);
  }
  for (let p = 0; p < W * H; p++) if (!out[p] && dist(p) < TIGHT) out[p] = 1;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let p = 0; p < W * H; p++) {
    const i = p * 4, x = p % W, y = (p / W) | 0;
    if (out[p]) { data[i + 3] = 0; continue; }
    const edge = (x > 0 && out[p - 1]) || (x < W - 1 && out[p + 1]) || (y > 0 && out[p - W]) || (y < H - 1 && out[p + W]);
    if (edge) {
      data[i + 3] = Math.round(255 * Math.min(1, Math.max(0.15, (dist(p) - TIGHT) / (NEAR - TIGHT))));
    }
    if (edge || greenish(p) > 40) data[i + 1] = Math.min(data[i + 1], Math.max(data[i], data[i + 2]) + 8); // despill
    if (data[i + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return sharp(data, { raw: { width: W, height: H, channels: 4 } }).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 });
}

const want = (id) => !only || only.some((o) => id === o || id.startsWith(o + '-'));

/** גרסת התאורה השנייה נגזרת מהציור עצמו (תיקון צבע) – כך הזירה זהה בדיוק בכל משמרת */
async function regrade(file, to) {
  const base = sharp(file).resize(1600, 900, { fit: 'cover' });
  if (to === 'day') {
    // לילה → יום מעונן: הבהרה, הורדת רוויה, אובך שמיים
    const haze = Buffer.from('<svg width="1600" height="900"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfe6ea" stop-opacity=".55"/><stop offset=".55" stop-color="#c9d2d6" stop-opacity=".25"/><stop offset="1" stop-color="#9aa5aa" stop-opacity=".12"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/></svg>');
    return base.modulate({ brightness: 1.55, saturation: 0.6 }).gamma(1.6).linear(0.92, 14).composite([{ input: haze, blend: 'screen' }]);
  }
  // יום → ערב: החשכה וגוון כתום־סגלגל של שקיעה
  const dusk = Buffer.from('<svg width="1600" height="900"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f29a5c"/><stop offset=".6" stop-color="#8a6a8f"/><stop offset="1" stop-color="#3b3550"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/></svg>');
  return base.modulate({ brightness: 0.62, saturation: 0.9 }).composite([{ input: dusk, blend: 'multiply' }]).linear(1.25, 0);
}

for (const bg of cfg.backgrounds) {
  if (!want(bg.id)) continue;
  const src = join(SRC, `${bg.id}-${bg.base}.png`);
  if (force || !existsSync(src)) {
    console.log('רקע', bg.id);
    writeFileSync(src, await render({ prompt: `${cfg.style} ${bg.prompt}`, w: 1344, h: 768, seed: bg.seed }));
  }
  const other = bg.base === 'night' ? 'day' : 'night';
  await sharp(src).resize(1600, 900, { fit: 'cover' }).webp({ quality: 76 }).toFile(join(OUT, `${bg.out}-${bg.base}.webp`));
  await (await regrade(src, other)).webp({ quality: 76 }).toFile(join(OUT, `${bg.out}-${other}.webp`));
}

for (const ch of cfg.characters) {
  for (const mood of ch.moods) {
    const id = `${ch.id}-${mood}`;
    if (!want(id) && !want(ch.id)) continue;
    const src = join(SRC, `char-${id}.png`);
    if (force || !existsSync(src)) {
      console.log('דמות', id);
      // הרקע הירוק חייב להופיע בתחילת ההנחיה, אחרת FLUX מצייר רקע סטודיו אפור
      const prompt = `${cfg.greenScreen} ${cfg.style} ${ch.desc} ${cfg.figure} ${cfg.moods[mood]} ${(mood === 'hurt' && ch.hurt) || ''}`;
      writeFileSync(src, await render({ prompt, w: 768, h: 1344, seed: ch.seed }));
    }
    await (await keyGreen(src)).resize({ height: 640 }).webp({ quality: 80, alphaQuality: 90 }).toFile(join(OUT, 'chars', `${id}.webp`));
  }
}

for (const pr of cfg.props) {
  if (!want(pr.id)) continue;
  const src = join(SRC, `prop-${pr.id}.png`);
  if (force || !existsSync(src)) {
    console.log('פריט', pr.id);
    writeFileSync(src, await render({ prompt: `${cfg.propsBackdrop} ${cfg.style} ${pr.desc}`, w: 1344, h: 768, seed: pr.seed }));
  }
  let img = await keyGreen(src);
  if (pr.flip) img = img.flop();
  // רכב כסוף מחזיר את הירוק של המסך – מורידים רוויה
  if (pr.desaturate) img = sharp(await img.png().toBuffer()).modulate({ saturation: pr.desaturate });
  img = img.resize({ width: 720 });
  // כיסוי כיתוב מקרי שהמודל צייר (למשל על דלת הניידת) – [x, y, רוחב, גובה, צבע] בפיקסלים אחרי שינוי הגודל
  if (pr.patch) {
    const buf = await img.png().toBuffer();
    const { width, height } = await sharp(buf).metadata();
    const rects = pr.patch.map(([x, y, w, h, c]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${c}"/>`).join('');
    img = sharp(buf).composite([{ input: Buffer.from(`<svg width="${width}" height="${height}">${rects}</svg>`), blend: 'atop' }]);
  }
  await img.webp({ quality: 80, alphaQuality: 90 }).toFile(join(OUT, 'props', `${pr.id}.webp`));
}

/** הסרת מסך ירוק בכל התמונה (לא רק מהשוליים) – לחלון הקדמי של הניידת */
async function keyAllGreen(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const g = data[i + 1] - Math.max(data[i], data[i + 2]);
    if (g > 70) data[i + 3] = 0;
    else if (g > 35) { data[i + 3] = Math.round(255 * (70 - g) / 35); data[i + 1] = Math.max(data[i], data[i + 2]); }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
}

// קטע המעבר: פנים הניידת (חלון שקוף), כביש מנקודת מבט הנהג, ורחוב במבט צד לנסיעה החיצונית
if (cfg.drive) {
  mkdirSync(join(OUT, 'drive'), { recursive: true });
  for (const [id, d] of Object.entries(cfg.drive)) {
    if (!want(`drive-${id}`) && !want('drive')) continue;
    const src = join(SRC, `drive-${id}${d.base ? '-' + d.base : ''}.png`);
    if (force || !existsSync(src)) {
      console.log('מעבר', id);
      const prompt = id === 'interior' ? `${d.prompt} ${cfg.style}` : `${cfg.style} ${d.prompt}`;
      writeFileSync(src, await render({ prompt, w: 1344, h: 768, seed: d.seed }));
    }
    if (id === 'interior') {
      await (await keyAllGreen(src)).resize(1600, 900, { fit: 'cover' }).webp({ quality: 80, alphaQuality: 90 }).toFile(join(OUT, 'drive', 'interior.webp'));
      continue;
    }
    const other = d.base === 'night' ? 'day' : 'night';
    await sharp(src).resize(1600, 900, { fit: 'cover' }).webp({ quality: 76 }).toFile(join(OUT, 'drive', `${id}-${d.base}.webp`));
    await (await regrade(src, other)).webp({ quality: 76 }).toFile(join(OUT, 'drive', `${id}-${other}.webp`));
  }
}

// מסך הפתיחה: כמה זרעים לבחירה, הנבחר (pick) נשמר כ-public/img/hero.webp
if (cfg.hero && (want('hero') || (only && only.includes('hero')))) {
  for (const seed of cfg.hero.seeds) {
    const src = join(SRC, `hero-${seed}.png`);
    if (force || !existsSync(src)) {
      console.log('פתיחה', seed);
      writeFileSync(src, await render({ prompt: `${cfg.style} ${cfg.hero.prompt}`, w: 1344, h: 768, seed }));
    }
  }
  // „חותמת שכפול”: מכסים כיתוב או סמל שהמודל צייר בצבע מאזור סמוך – [x, y, w, h, dx, dy] בפיקסלי המקור
  const pickSrc = join(SRC, `hero-${cfg.hero.pick}.png`);
  const patches = [];
  for (const [x, y, w, h, dx, dy] of cfg.hero.clone ?? []) {
    const piece = await sharp(pickSrc).extract({ left: x + dx, top: y + dy, width: w, height: h }).blur(0.6).png().toBuffer();
    patches.push({ input: piece, left: x, top: y });
  }
  const cleaned = await sharp(pickSrc).composite(patches).png().toBuffer();
  await sharp(cleaned).resize(1600, 900, { fit: 'cover' }).webp({ quality: 78 }).toFile(join(OUT, 'hero.webp'));
}
console.log('הסתיים');
