/**
 * סינתזה מקורית של צלילי סביבה ואפקטים (ללא דגימות חיצוניות).
 * כל לולאה נבנית עם הצלבת קצוות (crossfade) כדי שתתנגן ברצף.
 */
export const SR = 44100;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const buf = (sec) => new Float32Array(Math.round(sec * SR));

function lowpass(x, fc) {
  const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
  let y = 0;
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = y += a * (x[i] - y);
  return out;
}
function highpass(x, fc) {
  const lp = lowpass(x, fc);
  return x.map((v, i) => v - lp[i]);
}
function bandpass(x, f0, q) {
  const w = (2 * Math.PI * f0) / SR;
  const alpha = Math.sin(w) / (2 * q);
  const b0 = alpha, b2 = -alpha, a0 = 1 + alpha, a1 = -2 * Math.cos(w), a2 = 1 - alpha;
  const out = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = (b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
}
function noise(sec, seed) {
  const r = rng(seed);
  return buf(sec).map(() => r() * 2 - 1);
}
function mix(...parts) {
  const n = Math.max(...parts.map(([p]) => p.length));
  const out = new Float32Array(n);
  for (const [p, g] of parts) for (let i = 0; i < p.length; i++) out[i] += p[i] * g;
  return out;
}
function normalize(x, peak = 0.8) {
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  return m ? x.map((v) => (v / m) * peak) : x;
}
/** לולאה חלקה: מייצרים len+fade ומצליבים את הזנב עם ההתחלה */
function loopify(x, fadeSec = 0.5) {
  const f = Math.round(fadeSec * SR);
  const n = x.length - f;
  const out = x.slice(0, n);
  for (let i = 0; i < f; i++) {
    const g = i / f;
    out[i] = x[i] * g + x[n + i] * (1 - g);
  }
  return out;
}

export function rain() {
  const T = 10.5;
  const base = lowpass(highpass(noise(T, 1), 400), 5000);
  const drops = buf(T);
  const r = rng(2);
  for (let k = 0; k < 900; k++) {
    const s = Math.floor(r() * (drops.length - 2000));
    const f = 1500 + r() * 4000;
    const amp = 0.2 + r() * 0.5;
    for (let i = 0; i < 600; i++) drops[s + i] += Math.sin((2 * Math.PI * f * i) / SR) * Math.exp(-i / 90) * amp;
  }
  return normalize(loopify(mix([base, 0.7], [drops, 0.25])), 0.6);
}

export function traffic() {
  const T = 12.6;
  const rumble = lowpass(noise(T, 3), 140);
  const out = mix([rumble, 3]);
  const r = rng(4);
  for (let c = 0; c < 4; c++) {
    const start = 0.5 + c * 3 + r() * 0.6;
    const dur = 2.6;
    const n = noise(dur, 10 + c);
    const hiss = bandpass(n, 900 + r() * 500, 0.7); // צמיגים על כביש רטוב
    const eng = lowpass(noise(dur, 20 + c), 250);
    const s0 = Math.round(start * SR);
    for (let i = 0; i < hiss.length && s0 + i < out.length; i++) {
      const t = i / hiss.length;
      const e = Math.exp(-Math.pow((t - 0.5) * 4, 2));
      out[s0 + i] += (hiss[i] * 1.6 + eng[i] * 2) * e;
    }
  }
  return normalize(loopify(out), 0.55);
}

export function engineWipers() {
  const T = 8.5;
  const n = buf(T);
  for (let i = 0; i < n.length; i++) {
    const t = i / SR;
    const wob = 1 + 0.01 * Math.sin(2 * Math.PI * 0.7 * t);
    n[i] = 0.5 * Math.sin(2 * Math.PI * 42 * wob * t) + 0.3 * Math.sin(2 * Math.PI * 84 * wob * t) + 0.15 * Math.sin(2 * Math.PI * 126 * t);
  }
  const engine = lowpass(mix([n, 1], [lowpass(noise(T, 5), 200), 1.5]), 300);
  const swish = bandpass(noise(T, 6), 1800, 0.9);
  const sw = buf(T);
  const period = 1.6;
  for (let i = 0; i < sw.length; i++) {
    const ph = ((i / SR) % period) / period;
    const e = ph < 0.35 ? Math.sin((ph / 0.35) * Math.PI) : 0;
    sw[i] = swish[i] * e;
  }
  const roof = highpass(noise(T, 7), 2500);
  return normalize(loopify(mix([engine, 1], [sw, 0.5], [roof, 0.08])), 0.6);
}

export function radioChirp() {
  const out = buf(0.62);
  let p = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = t < 0.1 ? 1250 : t < 0.2 ? 1650 : 0;
    if (f) {
      p += (2 * Math.PI * f) / SR;
      out[i] = 0.5 * Math.sign(Math.sin(p)) * 0.6 + 0.4 * Math.sin(p);
    }
  }
  const sq = bandpass(noise(0.62, 8), 2200, 0.6);
  for (let i = Math.round(0.24 * SR); i < out.length; i++) {
    const t = (i / SR - 0.24) / 0.38;
    out[i] += sq[i] * 1.4 * (1 - t);
  }
  return normalize(bandpass(out, 1500, 0.5), 0.7);
}

export function radioEnd() {
  const n = bandpass(noise(0.3, 9), 2000, 0.6);
  return normalize(n.map((v, i) => v * (1 - i / n.length)), 0.5);
}

export function musicMuffled() {
  const bpm = 112;
  const beat = 60 / bpm;
  const T = beat * 16;
  const out = buf(T + 0.5);
  const bassNotes = [55, 55, 65.4, 49];
  for (let b = 0; b < 17; b++) {
    const s0 = Math.round(b * beat * SR);
    for (let i = 0; i < 0.35 * SR && s0 + i < out.length; i++) {
      const t = i / SR;
      out[s0 + i] += Math.sin(2 * Math.PI * (50 + 60 * Math.exp(-t * 30)) * t) * Math.exp(-t * 9) * 1.2; // תוף בס
    }
    const f = bassNotes[Math.floor(b / 4) % 4];
    const s1 = Math.round((b + 0.5) * beat * SR);
    for (let i = 0; i < beat * 0.45 * SR && s1 + i < out.length; i++) {
      const t = i / SR;
      out[s1 + i] += Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 4) * 0.7;
    }
  }
  // אקורדים עמומים
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const bar = Math.floor(t / (beat * 4)) % 4;
    const root = [220, 220, 261.6, 196][bar];
    out[i] += 0.08 * (Math.sin(2 * Math.PI * root * t) + Math.sin(2 * Math.PI * root * 1.25 * t) + Math.sin(2 * Math.PI * root * 1.5 * t));
  }
  return normalize(loopify(lowpass(lowpass(out, 380), 380), 0.5), 0.7);
}

export function buildingHum() {
  const T = 10.5;
  const h = buf(T);
  for (let i = 0; i < h.length; i++) {
    const t = i / SR;
    h[i] = 0.4 * Math.sin(2 * Math.PI * 100 * t) + 0.15 * Math.sin(2 * Math.PI * 200 * t) + 0.08 * Math.sin(2 * Math.PI * 300 * t);
  }
  const room = lowpass(noise(T, 12), 300);
  const out = mix([h, 0.25], [room, 2]);
  // טריקת דלת רחוקה
  const s0 = Math.round(5.2 * SR);
  const thump = lowpass(noise(0.4, 13), 120);
  for (let i = 0; i < thump.length; i++) out[s0 + i] += thump[i] * 6 * Math.exp(-i / (0.08 * SR));
  return normalize(loopify(out), 0.45);
}

export function crowd() {
  const T = 10.5;
  const out = buf(T);
  const r = rng(14);
  for (let v = 0; v < 6; v++) {
    const src = noise(T, 30 + v);
    const f1 = 400 + r() * 300;
    const f2 = 1100 + r() * 600;
    const voice = mix([bandpass(src, f1, 4), 1], [bandpass(src, f2, 5), 0.6]);
    const rate = 3.5 + r() * 2.5;
    const phase = r() * 10;
    for (let i = 0; i < out.length; i++) {
      const t = i / SR;
      const syl = Math.max(0, Math.sin(2 * Math.PI * rate * t + phase)) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.23 * t + v));
      out[i] += voice[i] * syl;
    }
  }
  return normalize(loopify(lowpass(out, 2200)), 0.5);
}

export function yardEvening() {
  const T = 10.5;
  const out = mix([lowpass(noise(T, 40), 150), 1.5]);
  const r = rng(41);
  for (let c = 0; c < 3; c++) {
    const f = 4200 + c * 350;
    const rate = 14 + c * 3;
    const ph = r() * 6;
    for (let i = 0; i < out.length; i++) {
      const t = i / SR;
      const gate = Math.sin(2 * Math.PI * rate * t) > 0.3 ? 1 : 0;
      const burst = Math.sin(2 * Math.PI * 0.45 * t + ph) > 0 ? 1 : 0;
      out[i] += Math.sin(2 * Math.PI * f * t) * gate * burst * 0.05;
    }
  }
  return normalize(loopify(out), 0.4);
}

export function yardMorning() {
  const T = 10.5;
  const out = mix([lowpass(noise(T, 50), 180), 1.6]);
  const r = rng(51);
  for (let k = 0; k < 26; k++) {
    const s0 = Math.floor(r() * (T - 0.5) * SR);
    const f0 = 2500 + r() * 2000;
    const len = Math.round((0.08 + r() * 0.12) * SR);
    let p = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      p += (2 * Math.PI * (f0 + Math.sin(t * Math.PI * 3) * 600)) / SR;
      out[s0 + i] += Math.sin(p) * Math.sin(t * Math.PI) * 0.12;
    }
  }
  return normalize(loopify(out), 0.4);
}

export function knock() {
  const out = buf(1.1);
  for (const at of [0.05, 0.3, 0.55]) {
    const s0 = Math.round(at * SR);
    const n = lowpass(noise(0.15, Math.round(at * 100)), 400);
    for (let i = 0; i < n.length; i++) out[s0 + i] += (n[i] * 3 + Math.sin((2 * Math.PI * 140 * i) / SR)) * Math.exp(-i / (0.02 * SR));
  }
  return normalize(out, 0.8);
}

export function uiClick() {
  const out = buf(0.06);
  for (let i = 0; i < out.length; i++) out[i] = Math.sin((2 * Math.PI * 1800 * i) / SR) * Math.exp(-i / (0.006 * SR));
  return normalize(out, 0.4);
}

export function alert() {
  // צליל תשומת לב עדין לאירוע מתפתח: שני צלילים יורדים, רכים (לא סירנה)
  const out = buf(0.8);
  [740, 554].forEach((f, k) => {
    const s0 = Math.round(k * 0.22 * SR);
    for (let i = 0; i < 0.4 * SR; i++) {
      const env = Math.min(1, i / (0.01 * SR)) * Math.exp(-i / (0.12 * SR));
      out[s0 + i] += (Math.sin((2 * Math.PI * f * i) / SR) + 0.3 * Math.sin((2 * Math.PI * f * 2 * i) / SR)) * env;
    }
  });
  return normalize(out, 0.5);
}

export function sample() {
  // צליל דוגמה להגדרות: שלושה צלילים עולים
  const out = buf(0.9);
  [523, 659, 784].forEach((f, k) => {
    const s0 = Math.round(k * 0.25 * SR);
    for (let i = 0; i < 0.3 * SR; i++) out[s0 + i] += Math.sin((2 * Math.PI * f * i) / SR) * Math.exp(-i / (0.1 * SR));
  });
  return normalize(out, 0.6);
}

export function toWav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.max(-1, Math.min(1, samples[i])) * 32767, i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}


/** תעבורת קשר ברקע: פרצי „דיבור” עמום ובלתי מובן (רעש מסונן עם מעטפת הברות), רחש פתיחת סקוולץ' וצפצופי סיום – בלי מילים */
export function radioChatter() {
  const T = 12;
  const out = buf(T);
  const r = rng(41);
  const hiss = bandpass(noise(T, 42), 2400, 0.5);
  let t = 0.6;
  while (t < T - 2.2) {
    const len = 0.9 + r() * 1.6;
    const s0 = Math.round(t * SR), n = Math.round(len * SR);
    // רחש פתיחה קצר
    for (let i = 0; i < 0.07 * SR; i++) out[s0 + i] += hiss[s0 + i] * 0.5;
    // „דיבור”: רעש בפס הקול עם מעטפת הברות 4–6 בשנייה
    const voice = bandpass(noise(len, 50 + Math.floor(t * 10)), 900 + r() * 500, 1.2);
    const syl = 4 + r() * 2.5;
    for (let i = 0; i < n; i++) {
      const tt = i / SR;
      const env = Math.max(0, Math.sin(Math.PI * syl * tt + r() * 0.02)) ** 0.6 * (0.7 + 0.3 * Math.sin(2 * Math.PI * 0.7 * tt));
      out[s0 + 3000 + i] += voice[i] * env * 1.6 + hiss[(s0 + i) % hiss.length] * 0.06;
    }
    // צפצוף סיום קצר ורחש סגירה
    const e0 = s0 + 3000 + n;
    for (let i = 0; i < 0.06 * SR; i++) out[e0 + i] += Math.sin((2 * Math.PI * 1450 * i) / SR) * 0.25;
    for (let i = 0; i < 0.12 * SR; i++) out[e0 + 0.07 * SR + i | 0] += hiss[(e0 + i) % hiss.length] * 0.35 * (1 - i / (0.12 * SR));
    t += len + 1.2 + r() * 2.2;
  }
  return normalize(loopify(highpass(out, 300), 0.4), 0.5);
}

export const SOUNDS = {
  rain, traffic, 'engine-wipers': engineWipers, 'radio-chirp': radioChirp, 'radio-end': radioEnd,
  'music-muffled': musicMuffled, 'building-hum': buildingHum, crowd, 'yard-evening': yardEvening,
  'yard-morning': yardMorning, knock, 'ui-click': uiClick, sample, alert, 'radio-chatter': radioChatter,
};
