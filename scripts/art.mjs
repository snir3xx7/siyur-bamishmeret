/**
 * איורי רקע מקוריים לזירות (SVG שנבנה בקוד → WebP).
 * כל איור נוצר בשתי גרסאות: day (בוקר/ערב, הערב מקבל שכבת גוון באפליקציה) ו-night.
 * הדמויות, הרכבים והניידת אינם חלק מהרקע – הם שכבות נפרדות באפליקציה.
 */

const W = 1600;
const H = 900;

// מחולל דטרמיניסטי כדי שהאיורים יהיו זהים בכל בנייה
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

const FONT = "font-family=\"Arial Hebrew, Arial, sans-serif\"";

function svg(body, defs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${body}</svg>`;
}

/** בניין מגורים ישראלי טיפוסי: אבן בהירה, מרפסות, תריסים, דודי שמש על הגג */
function building(x, y, w, h, opt, night, r) {
  const { color = '#d9cfbd', floors = 4, cols = 4, balcony = true, solar = true } = opt;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
  // פסי אבן
  for (let i = 1; i < floors * 3; i++) s += `<line x1="${x}" x2="${x + w}" y1="${y + (h / (floors * 3)) * i}" y2="${y + (h / (floors * 3)) * i}" stroke="#00000010" stroke-width="2"/>`;
  const fh = h / floors;
  const cw = w / cols;
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const wx = x + c * cw + cw * 0.2;
      const wy = y + f * fh + fh * 0.22;
      const ww = cw * 0.6;
      const wh = fh * 0.5;
      const lit = night && r() < 0.45;
      const warm = r() < 0.7 ? '#ffd98a' : '#cfe3ff';
      const fill = lit ? warm : night ? '#1c2533' : '#7f95a8';
      s += `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="${fill}"/>`;
      // תריס גלילה חלקי
      const shut = r() * 0.6;
      s += `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh * shut}" fill="${night ? '#3a3f47' : '#b9b2a4'}"/>`;
      for (let k = 1; k < 6; k++) s += `<line x1="${wx}" x2="${wx + ww}" y1="${wy + (wh * shut * k) / 6}" y2="${wy + (wh * shut * k) / 6}" stroke="#0000001a"/>`;
      if (lit) s += `<rect x="${wx - 6}" y="${wy - 6}" width="${ww + 12}" height="${wh + 12}" fill="${warm}" opacity="0.12"/>`;
      if (balcony && c % 2 === 1 && f < floors) {
        s += `<rect x="${wx - cw * 0.25}" y="${wy + wh + 2}" width="${ww + cw * 0.5}" height="${fh * 0.16}" fill="${night ? '#4b4f57' : '#cbc2b2'}" stroke="#00000022"/>`;
        // מעקה
        for (let k = 0; k < 8; k++) s += `<line x1="${wx - cw * 0.25 + ((ww + cw * 0.5) * k) / 7}" x2="${wx - cw * 0.25 + ((ww + cw * 0.5) * k) / 7}" y1="${wy + wh + 2}" y2="${wy + wh - fh * 0.12}" stroke="#55555580" stroke-width="2"/>`;
        s += `<line x1="${wx - cw * 0.25}" x2="${wx + ww + cw * 0.25}" y1="${wy + wh - fh * 0.12}" y2="${wy + wh - fh * 0.12}" stroke="#555" stroke-width="3"/>`;
        if (r() < 0.4) s += `<rect x="${wx + ww * 0.6}" y="${wy + wh - fh * 0.3}" width="${cw * 0.12}" height="${fh * 0.18}" fill="#3f7a3a"/>`; // עציץ
      }
      // מזגן
      if (r() < 0.35) s += `<rect x="${wx + ww + 4}" y="${wy + wh * 0.3}" width="${cw * 0.16}" height="${fh * 0.16}" fill="${night ? '#8a8f96' : '#ececec'}" stroke="#00000033"/>`;
    }
  }
  if (solar) {
    for (let i = 0; i < Math.max(2, Math.floor(w / 90)); i++) {
      const sx = x + 12 + i * 85;
      if (sx + 60 > x + w) break;
      s += `<polygon points="${sx},${y} ${sx + 26},${y - 34} ${sx + 54},${y - 34} ${sx + 28},${y}" fill="${night ? '#1f2a3a' : '#355a7c'}" stroke="#222" stroke-width="1"/>`;
      s += `<rect x="${sx + 34}" y="${y - 52}" width="38" height="16" rx="8" fill="${night ? '#6d6f72' : '#d8d8d8'}" stroke="#555"/>`;
      s += `<line x1="${sx + 40}" x2="${sx + 40}" y1="${y - 36}" y2="${y}" stroke="#666" stroke-width="2"/>`;
    }
    s += `<line x1="${x + w - 30}" x2="${x + w - 30}" y1="${y}" y2="${y - 70}" stroke="#555" stroke-width="2"/><line x1="${x + w - 48}" x2="${x + w - 12}" y1="${y - 60}" y2="${y - 60}" stroke="#555" stroke-width="2"/>`;
  }
  return s;
}

function lamp(x, y, h, night) {
  let s = `<rect x="${x - 4}" y="${y - h}" width="8" height="${h}" fill="#3d434b"/><path d="M${x} ${y - h} q 0 -20 40 -20" stroke="#3d434b" stroke-width="7" fill="none"/><rect x="${x + 30}" y="${y - h - 26}" width="34" height="10" rx="4" fill="${night ? '#ffe6a6' : '#9aa3ad'}"/>`;
  if (night) s += `<ellipse cx="${x + 47}" cy="${y - h - 10}" rx="90" ry="70" fill="url(#halo)"/>`;
  return s;
}

const haloDefs = `<radialGradient id="halo"><stop offset="0" stop-color="#ffe2a0" stop-opacity="0.55"/><stop offset="1" stop-color="#ffe2a0" stop-opacity="0"/></radialGradient>
<radialGradient id="warm"><stop offset="0" stop-color="#ffcf7a" stop-opacity="0.75"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>`;

/* ===================== זירה 1: צומת רטוב ===================== */
export function accidentStreet(night) {
  const r = rng(11);
  const sky = night
    ? `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#26324a"/></linearGradient>`
    : `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8c99a8"/><stop offset="1" stop-color="#c3ccd4"/></linearGradient>`;
  const road = `<linearGradient id="road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${night ? '#1d2129' : '#4d535b'}"/><stop offset="1" stop-color="${night ? '#101318' : '#363b42'}"/></linearGradient>
  <linearGradient id="wet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
  <linearGradient id="wetwarm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd98a" stop-opacity="0.55"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></linearGradient>`;
  let b = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  // עננים
  for (let i = 0; i < 7; i++) b += `<ellipse cx="${r() * W}" cy="${40 + r() * 120}" rx="${160 + r() * 200}" ry="${30 + r() * 30}" fill="${night ? '#1a2335' : '#a7b1bb'}" opacity="0.7"/>`;
  // רקע רחוק
  b += building(-20, 210, 330, 340, { floors: 5, cols: 5, color: night ? '#5d5a55' : '#cfc5b3' }, night, r);
  b += building(330, 160, 380, 390, { floors: 6, cols: 6, color: night ? '#66625b' : '#d8cdb9' }, night, r);
  b += building(1060, 180, 300, 370, { floors: 5, cols: 4, color: night ? '#615d57' : '#d3c8b6' }, night, r);
  b += building(1380, 230, 260, 320, { floors: 5, cols: 4, color: night ? '#5a5752' : '#cbbfac' }, night, r);
  // בניין קדמי עם מכולת (מימין, בתצוגה)
  b += building(720, 120, 330, 330, { floors: 4, cols: 4, color: night ? '#706b62' : '#e1d6c2' }, night, r);
  // קומת קרקע מסחרית
  b += `<rect x="700" y="450" width="560" height="120" fill="${night ? '#3a3631' : '#bdb19e'}"/>`;
  b += `<rect x="720" y="470" width="320" height="100" fill="${night ? '#f3d38e' : '#9fb3c0'}" opacity="${night ? 0.85 : 1}"/>`;
  for (let i = 0; i < 5; i++) b += `<rect x="730" y="${480 + i * 17}" width="300" height="5" fill="#6b4b2a" opacity="0.7"/>`;
  for (let i = 0; i < 40; i++) b += `<rect x="${734 + r() * 290}" y="${470 + Math.floor(r() * 5) * 17}" width="${8 + r() * 10}" height="10" fill="${['#c0392b', '#e67e22', '#2980b9', '#27ae60', '#f1c40f'][Math.floor(r() * 5)]}"/>`;
  // סוכך פסים
  let aw = '';
  for (let i = 0; i < 14; i++) aw += `<rect x="${710 + i * 25}" y="440" width="25" height="34" fill="${i % 2 ? '#2f7d4f' : '#f2efe6'}"/>`;
  b += aw + `<path d="M710 474 ${Array.from({ length: 14 }, () => 'q 12.5 14 25 0').join(' ')}" fill="#2f7d4f"/>`;
  // שלט
  b += `<rect x="760" y="392" width="250" height="46" rx="4" fill="#f8f4e8" stroke="#2f7d4f" stroke-width="4"/>`;
  b += `<text x="885" y="425" ${FONT} font-size="30" font-weight="bold" fill="#2f7d4f" text-anchor="middle" direction="rtl">מכולת הגפן</text>`;
  // חנות שנייה – מספרה סגורה
  b += `<rect x="1060" y="470" width="180" height="100" fill="${night ? '#2a2d33' : '#8f9aa3'}"/>`;
  for (let i = 0; i < 12; i++) b += `<line x1="1060" x2="1240" y1="${470 + i * 8.5}" y2="${470 + i * 8.5}" stroke="#00000033"/>`;
  b += `<rect x="1070" y="438" width="160" height="30" fill="#334" /><text x="1150" y="460" ${FONT} font-size="20" fill="#e9e3d0" text-anchor="middle" direction="rtl">מספרת רון</text>`;
  // מדרכה
  b += `<rect x="0" y="566" width="${W}" height="44" fill="${night ? '#3a3e45' : '#a3a49f'}"/>`;
  for (let i = 0; i < 40; i++) b += `<rect x="${i * 40}" y="606" width="20" height="10" fill="${i % 2 ? '#d9d9d9' : '#333'}"/>`; // אבן שפה
  // כביש
  b += `<rect x="0" y="614" width="${W}" height="${H - 614}" fill="url(#road)"/>`;
  // מעבר חציה ורחוב צדדי (הכלנית) משמאל
  b += `<polygon points="420,566 600,566 660,614 380,614" fill="${night ? '#2a2e35' : '#5a6068'}"/>`;
  for (let i = 0; i < 7; i++) b += `<polygon points="${330 + i * 48},${640} ${360 + i * 48},${640} ${330 + i * 52},${700} ${296 + i * 52},${700}" fill="#e8e8e8" opacity="${night ? 0.55 : 0.8}"/>`;
  // קווי נתיב
  for (let i = 0; i < 12; i++) b += `<rect x="${i * 150 + 40}" y="752" width="80" height="8" fill="#f0f0f0" opacity="${night ? 0.4 : 0.65}"/>`;
  // השתקפויות רטובות
  if (night) {
    b += `<rect x="760" y="616" width="260" height="260" fill="url(#wetwarm)"/>`;
    for (const lx of [210, 1290]) b += `<rect x="${lx + 25}" y="616" width="46" height="250" fill="url(#wetwarm)" opacity="0.8"/>`;
  } else {
    b += `<rect x="740" y="616" width="300" height="200" fill="url(#wet)" opacity="0.5"/>`;
  }
  for (let i = 0; i < 18; i++) b += `<ellipse cx="${r() * W}" cy="${650 + r() * 230}" rx="${30 + r() * 90}" ry="${4 + r() * 8}" fill="#ffffff" opacity="${0.05 + r() * 0.08}"/>`;
  // תמרור עצור ביציאה מהכלנית
  b += `<rect x="388" y="470" width="7" height="140" fill="#777"/><polygon points="${oct(391, 455, 28)}" fill="#c0262d" stroke="#fff" stroke-width="3"/><text x="391" y="463" ${FONT} font-size="17" font-weight="bold" fill="#fff" text-anchor="middle" direction="rtl">עצור</text>`;
  // שלט רחוב
  b += `<rect x="470" y="470" width="6" height="140" fill="#777"/><rect x="420" y="458" width="110" height="28" rx="3" fill="#f2f2f2" stroke="#1d4f91" stroke-width="3"/><text x="475" y="479" ${FONT} font-size="17" fill="#1d4f91" text-anchor="middle" direction="rtl">רח׳ הכלנית</text>`;
  b += `<rect x="1200" y="520" width="6" height="90" fill="#777"/><rect x="1150" y="508" width="120" height="28" rx="3" fill="#f2f2f2" stroke="#1d4f91" stroke-width="3"/><text x="1210" y="529" ${FONT} font-size="17" fill="#1d4f91" text-anchor="middle" direction="rtl">שד׳ הזית</text>`;
  // תחנת אוטובוס
  b += `<rect x="1440" y="470" width="6" height="140" fill="#666"/><rect x="1416" y="440" width="54" height="40" rx="4" fill="#f1f1f1" stroke="#555"/><text x="1443" y="466" ${FONT} font-size="15" fill="#333" text-anchor="middle">תחנה</text>`;
  // עמודי תאורה
  b += lamp(210, 600, 260, night) + lamp(1290, 600, 260, night);
  // עץ
  b += `<rect x="610" y="470" width="14" height="140" fill="#5a4630"/><circle cx="617" cy="450" r="60" fill="${night ? '#1e3324' : '#3f6b3d'}"/><circle cx="580" cy="470" r="40" fill="${night ? '#1a2d20' : '#4b7a45'}"/>`;
  return svg(b, sky + road + haloDefs);
}

function oct(cx, cy, r) {
  return Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

/* ===================== זירה 2: חדר מדרגות ===================== */
export function stairwell(night) {
  const r = rng(22);
  const wall = night ? '#6b6155' : '#d9ceb8';
  let b = `<rect width="${W}" height="${H}" fill="${wall}"/>`;
  // אריחי טראצו בחלק התחתון של הקיר
  b += `<rect x="0" y="560" width="${W}" height="110" fill="${night ? '#5a5248' : '#c8bba2'}"/>`;
  // רצפת טראצו
  b += `<rect x="0" y="670" width="${W}" height="230" fill="${night ? '#5e5a54' : '#bdb6aa'}"/>`;
  for (let i = 0; i < 700; i++) b += `<circle cx="${r() * W}" cy="${672 + r() * 228}" r="${1 + r() * 2.5}" fill="${['#8a8172', '#e8e1d2', '#6d6457', '#a19582'][Math.floor(r() * 4)]}" opacity="0.6"/>`;
  // גרם מדרגות עולה (משמאל)
  for (let i = 0; i < 9; i++) {
    const x = 40 + i * 52;
    const y = 670 - i * 52;
    b += `<rect x="${x}" y="${y - 52}" width="${560 - i * 52}" height="52" fill="${night ? '#6a645b' : '#cfc6b6'}" stroke="#00000030"/>`;
    b += `<rect x="${x}" y="${y - 52}" width="${560 - i * 52}" height="8" fill="#ffffff22"/>`;
  }
  // מעקה
  b += `<path d="M 40 560 L 520 90" stroke="#3b3631" stroke-width="10" fill="none"/>`;
  for (let i = 0; i < 10; i++) b += `<line x1="${60 + i * 48}" y1="${560 - i * 47}" x2="${60 + i * 48}" y2="${660 - i * 47}" stroke="#3b3631" stroke-width="4"/>`;
  // דלת דירה 7 (במרכז) ודלת 8 (מימין)
  const door = (x, num, warm) => {
    let d = '';
    if (warm) d += `<ellipse cx="${x + 90}" cy="420" rx="260" ry="320" fill="url(#warm)" opacity="${night ? 0.9 : 0.45}"/>`;
    d += `<rect x="${x}" y="250" width="180" height="420" fill="${night ? '#4a2f22' : '#7a4b33'}" stroke="#2b1a12" stroke-width="6"/>`;
    d += `<rect x="${x + 20}" y="280" width="140" height="160" fill="none" stroke="#2b1a1266" stroke-width="4"/><rect x="${x + 20}" y="470" width="140" height="170" fill="none" stroke="#2b1a1266" stroke-width="4"/>`;
    d += `<circle cx="${x + 150}" cy="470" r="8" fill="#d4b26a"/><circle cx="${x + 90}" cy="320" r="7" fill="#222"/>`;
    d += `<rect x="${x + 55}" y="200" width="70" height="36" rx="4" fill="#f4efe3" stroke="#555"/><text x="${x + 90}" y="227" ${FONT} font-size="26" text-anchor="middle" fill="#222">${num}</text>`;
    d += `<rect x="${x - 40}" y="380" width="22" height="34" rx="3" fill="#eee" stroke="#777"/><circle cx="${x - 29}" cy="397" r="6" fill="#bbb"/>`; // פעמון
    d += `<rect x="${x + 30}" y="652" width="120" height="16" fill="${night ? '#ffcf7a' : '#ffffff00'}" opacity="${warm ? 0.9 : 0}"/>`; // אור מתחת לדלת
    d += `<rect x="${x + 10}" y="672" width="160" height="20" rx="4" fill="#6b3b2a"/>`; // שטיח
    return d;
  };
  // אור מהדירה הרועשת הוא שכבה נפרדת באפליקציה (תלוי בווריאציה)
  b += door(820, '7', false) + door(1220, '8', false);
  // תיבות דואר
  b += `<rect x="610" y="300" width="160" height="150" fill="#9aa0a6" stroke="#555" stroke-width="3"/>`;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) b += `<rect x="${618 + i * 50}" y="${308 + j * 35}" width="44" height="30" fill="#b9bec4" stroke="#666"/><rect x="${626 + i * 50}" y="${314 + j * 35}" width="28" height="4" fill="#444"/>`;
  // לוח ועד הבית
  b += `<rect x="600" y="480" width="180" height="120" fill="#a77b4f" stroke="#5a3b22" stroke-width="4"/><text x="690" y="505" ${FONT} font-size="18" fill="#fff" text-anchor="middle" direction="rtl">ועד הבית</text>`;
  for (let i = 0; i < 4; i++) b += `<rect x="${612 + (i % 2) * 85}" y="${516 + Math.floor(i / 2) * 40}" width="70" height="34" fill="#fffef6" transform="rotate(${(r() - 0.5) * 6} ${640 + (i % 2) * 85} ${530 + Math.floor(i / 2) * 40})"/>`;
  // שלט שקט
  b += `<rect x="1050" y="120" width="190" height="56" rx="6" fill="#fff8e1" stroke="#8a6d1d" stroke-width="3"/><text x="1145" y="157" ${FONT} font-size="22" fill="#5b4510" text-anchor="middle" direction="rtl">נא לשמור על השקט</text>`;
  // מתג חדר מדרגות + מנורה
  b += `<rect x="1110" y="420" width="24" height="34" rx="3" fill="#f0f0f0" stroke="#888"/><circle cx="1122" cy="437" r="5" fill="#ff9a3c"/>`;
  b += `<rect x="1080" y="30" width="90" height="26" rx="10" fill="${night ? '#ffe3a3' : '#f4f4f4'}" stroke="#999"/>`;
  if (night) b += `<ellipse cx="1125" cy="60" rx="380" ry="260" fill="url(#halo)" opacity="0.6"/>`;
  // חלון צר
  b += `<rect x="1470" y="120" width="80" height="260" fill="${night ? '#0f1726' : '#b9d3e8'}" stroke="#777" stroke-width="6"/>`;
  for (let i = 1; i < 6; i++) b += `<line x1="1470" x2="1550" y1="${120 + i * 43}" y2="${120 + i * 43}" stroke="#777" stroke-width="3"/>`;
  // הצללה כללית בלילה
  if (night) b += `<rect width="${W}" height="${H}" fill="#0b0f18" opacity="0.25"/>`;
  return svg(b, haloDefs);
}

/* ===================== זירה 3: חצר משותפת ===================== */
export function yard(night) {
  const r = rng(33);
  const sky = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${night ? '#141c2e' : '#a8cbe6'}"/><stop offset="1" stop-color="${night ? '#3a3550' : '#e3eef5'}"/></linearGradient>`;
  let b = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  b += building(-40, 60, 640, 560, { floors: 5, cols: 6, color: night ? '#69645c' : '#dccfb9' }, night, r);
  b += building(1000, 40, 640, 580, { floors: 5, cols: 6, color: night ? '#625e57' : '#d5c9b4' }, night, r);
  b += building(600, 200, 400, 300, { floors: 3, cols: 4, color: night ? '#57534d' : '#c9bda8', solar: true }, night, r);
  // חבלי כביסה
  for (let k = 0; k < 2; k++) {
    const y = 300 + k * 110;
    b += `<path d="M 560 ${y} Q 800 ${y + 30} 1040 ${y}" stroke="#ddd" stroke-width="2" fill="none"/>`;
    for (let i = 0; i < 7; i++) {
      const x = 600 + i * 60 + r() * 20;
      b += `<rect x="${x}" y="${y + 12 + Math.sin((x - 560) / 150) * 10}" width="${26 + r() * 16}" height="${30 + r() * 26}" fill="${['#e74c3c', '#f5f5f5', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c'][Math.floor(r() * 6)]}" opacity="0.9"/>`;
    }
  }
  // קרקע ומרצפות
  b += `<rect x="0" y="610" width="${W}" height="${H - 610}" fill="${night ? '#4c4842' : '#b9ac95'}"/>`;
  for (let i = 0; i < 20; i++) for (let j = 0; j < 6; j++) b += `<rect x="${i * 80 + (j % 2) * 40}" y="${615 + j * 48}" width="78" height="46" fill="none" stroke="#00000018"/>`;
  // ערוגה ועץ פיקוס
  b += `<rect x="60" y="560" width="320" height="70" fill="#8c7b62"/><rect x="60" y="560" width="320" height="16" fill="#a8977c"/>`;
  b += `<rect x="200" y="380" width="26" height="190" fill="#5b4632"/><circle cx="214" cy="350" r="110" fill="${night ? '#1d3022' : '#4e7d43'}"/><circle cx="140" cy="400" r="70" fill="${night ? '#1a2b1e' : '#5a8a4d'}"/><circle cx="290" cy="395" r="75" fill="${night ? '#1b2d20' : '#477740'}"/>`;
  // מחסן משותף (הסכסוך)
  b += `<rect x="1080" y="430" width="300" height="200" fill="${night ? '#5b5f64' : '#9ca5ad'}" stroke="#555" stroke-width="4"/>`;
  for (let i = 0; i < 14; i++) b += `<line x1="${1080 + i * 22}" x2="${1080 + i * 22}" y1="430" y2="630" stroke="#00000020"/>`;
  b += `<polygon points="1060,430 1400,430 1380,400 1080,400" fill="${night ? '#3c3f44' : '#6d757d'}"/>`;
  b += `<rect x="1180" y="480" width="100" height="150" fill="${night ? '#4a4e53' : '#7f8a94'}" stroke="#444" stroke-width="3"/>`;
  b += `<rect x="1100" y="448" width="120" height="26" rx="3" fill="#fff" stroke="#999"/><text x="1160" y="467" ${FONT} font-size="17" fill="#333" text-anchor="middle" direction="rtl">מחסן משותף</text>`;
  // אופניים ועגלה
  const bike = (x, y, c) => `<circle cx="${x}" cy="${y}" r="26" fill="none" stroke="#222" stroke-width="4"/><circle cx="${x + 70}" cy="${y}" r="26" fill="none" stroke="#222" stroke-width="4"/><path d="M ${x} ${y} L ${x + 30} ${y - 40} L ${x + 70} ${y} M ${x + 30} ${y - 40} L ${x + 60} ${y - 40} M ${x + 22} ${y - 50} l 16 0" stroke="${c}" stroke-width="5" fill="none"/>`;
  b += bike(1405, 640, '#c0392b') + bike(1480, 652, '#2471a3');
  // פחי אשפה
  for (let i = 0; i < 3; i++) b += `<rect x="${470 + i * 70}" y="560" width="60" height="80" rx="6" fill="#2e7d4f" stroke="#1d5235" stroke-width="3"/><rect x="${466 + i * 70}" y="552" width="68" height="12" rx="4" fill="#256b42"/>`;
  // ספסל
  b += `<rect x="720" y="620" width="200" height="16" fill="#8a5a33"/><rect x="720" y="590" width="200" height="12" fill="#8a5a33"/><rect x="735" y="636" width="10" height="34" fill="#444"/><rect x="895" y="636" width="10" height="34" fill="#444"/>`;
  // חומה נמוכה לבניין הסמוך + שער
  b += `<rect x="0" y="600" width="60" height="70" fill="#a29785"/><rect x="1540" y="600" width="60" height="70" fill="#a29785"/>`;
  // עציצים
  for (let i = 0; i < 5; i++) b += `<rect x="${960 + i * 22}" y="600" width="18" height="22" fill="#b5651d"/><circle cx="${969 + i * 22}" cy="594" r="12" fill="#3f7a3a"/>`;
  // תאורת חצר
  b += lamp(980, 640, 220, night);
  if (night) b += `<rect width="${W}" height="${H}" fill="#0b0f18" opacity="0.2"/>`;
  return svg(b, sky + haloDefs);
}

/* ===================== אייקון ===================== */
export function iconSvg(size, maskable = false) {
  const pad = maskable ? size * 0.12 : 0;
  const s = size - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${maskable ? 0 : size * 0.2}" fill="#13202f"/>
  <g transform="translate(${pad} ${pad}) scale(${s / 100})">
    <path d="M50 8 L84 20 V48 C84 70 68 84 50 92 C32 84 16 70 16 48 V20 Z" fill="#1d3550" stroke="#e8c15a" stroke-width="4"/>
    <circle cx="50" cy="48" r="20" fill="none" stroke="#e8c15a" stroke-width="3"/>
    <path d="M50 30 L50 48 L62 56" stroke="#f2f2f2" stroke-width="4" fill="none" stroke-linecap="round"/>
    <rect x="34" y="72" width="14" height="6" rx="2" fill="#e04b4b"/><rect x="52" y="72" width="14" height="6" rx="2" fill="#4b7be0"/>
  </g></svg>`;
}
