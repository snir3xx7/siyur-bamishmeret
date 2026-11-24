/**
 * שכבת הנפשה (PixiJS): מציירת את הדמויות המאוירות מעל הזירה ומנפישה אותן –
 * נשימה, תנועת ראש וגוף, תנועה ערה יותר כשהדמות מדברת או נסערת, כניסה בהליכה לזירה,
 * אור כחול־אדום מהניידת בלילה, וטיפות גשם שניתזות על הכביש.
 *
 * ה־DOM נשאר מקור האמת (מיקום, מצב רוח, נגישות ובדיקות): השכבה קוראת את מיקום
 * תמונת הדמות מה־DOM בכל פריים ומסתירה אותה. אם WebGL לא זמין – נשארים עם ה־DOM.
 */
import { useEffect, useRef } from 'react';
import type { Application, MeshPlane, Texture } from 'pixi.js';

interface Props {
  camRef: React.RefObject<HTMLDivElement>;
  night: boolean;
  evening: boolean;
  /** אורות הניידת דולקים ובאיזה צד היא */
  lightSide: 'left' | 'right' | null;
  flash: boolean;
  rain: boolean;
  onActive: (on: boolean) => void;
}

interface Actor {
  mesh: MeshPlane;
  src: string;
  base: Float32Array;
  born: number;
  enterFrom: number;
  seed: number;
  pop: number;
}

/** האם להפעיל: לא בבדיקות אוטומטיות (אלא אם ‎?pixi=1), ולא כשביקשו פחות תנועה */
export function pixiWanted(animate: boolean): boolean {
  if (!animate) return false;
  const q = location.search + location.hash;
  if (q.includes('nopixi')) return false;
  if (q.includes('pixi=1')) return true;
  return !navigator.webdriver;
}

export function PixiLayer({ camRef, night, evening, lightSide, flash, rain, onActive }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const opts = useRef({ night, evening, lightSide, flash, rain });
  opts.current = { night, evening, lightSide, flash, rain };

  useEffect(() => {
    let app: Application | undefined;
    let dead = false;
    const actors = new Map<string, Actor>();
    let firstFrame = true;

    void (async () => {
      try {
        const PIXI = await import('pixi.js');
        if (dead || !host.current) return;
        const a = new PIXI.Application();
        await a.init({ backgroundAlpha: 0, resizeTo: host.current, antialias: true, autoDensity: true, resolution: Math.min(2, window.devicePixelRatio || 1) });
        if (dead) { a.destroy(true); return; }
        app = a;
        host.current.appendChild(a.canvas);
        const layer = new PIXI.Container();
        const fx = new PIXI.Graphics();
        a.stage.addChild(layer, fx);
        const drops = Array.from({ length: 90 }, (_, i) => ({ x: (i * 97) % 1000 / 1000, y: (i * 53) % 1000 / 1000, v: 0.9 + ((i * 31) % 10) / 20 }));
        const splashes: { x: number; y: number; t: number }[] = [];
        const loading = new Set<string>();
        onActive(true);

        let frames = 0;
        a.ticker.add((tk) => {
          if (++frames % 30 === 0 && host.current) host.current.dataset.frames = String(frames);
          const cam = camRef.current;
          if (!cam || !host.current) return;
          const t = performance.now() / 1000;
          const camRect = cam.getBoundingClientRect();
          const k = camRect.width / (cam.offsetWidth || 1);
          const W = host.current.clientWidth, H = host.current.clientHeight;
          const seen = new Set<string>();
          const o = opts.current;

          cam.querySelectorAll<HTMLElement>('.actor.person.has-sprite').forEach((el) => {
            const id = el.dataset.testid ?? '';
            const img = el.querySelector<HTMLImageElement>('img.sprite');
            if (!img || !img.complete || !img.naturalWidth) return;
            seen.add(id);
            const r = img.getBoundingClientRect();
            const x = (r.left - camRect.left) / k, y = (r.top - camRect.top) / k, w = r.width / k, h = r.height / k;
            const src = img.currentSrc || img.src;
            let act = actors.get(id);
            const tex = PIXI.Assets.get<Texture>(src);
            if (!tex) {
              if (!loading.has(src)) { loading.add(src); void PIXI.Assets.load<Texture>(src).finally(() => loading.delete(src)); }
              return;
            }
            if (!act) {
              const mesh = new PIXI.MeshPlane({ texture: tex, verticesX: 3, verticesY: 10 });
              layer.addChild(mesh);
              const buf = mesh.geometry.getAttribute('aPosition').buffer;
              act = { mesh, src, base: new Float32Array(buf.data as Float32Array), born: t, enterFrom: firstFrame ? 0 : (x + w / 2 < W / 2 ? -1 : 1), seed: id.length * 1.7 + id.charCodeAt(id.length - 1) / 9, pop: 0 };
              actors.set(id, act);
            } else if (act.src !== src) {
              act.mesh.texture = tex;
              act.src = src;
              act.pop = t;
              const buf = act.mesh.geometry.getAttribute('aPosition').buffer;
              act.base = new Float32Array(buf.data as Float32Array);
            }
            const m = act.mesh;
            const mood = el.dataset.mood ?? 'calm';
            const speaking = el.classList.contains('speaking');
            // כניסה בהליכה: מהצד הקרוב, עם קפיצת צעדים
            const age = t - act.born;
            const enter = act.enterFrom ? Math.max(0, 1 - age / 0.9) : 0;
            const ease = enter * enter;
            const step = enter > 0 ? Math.abs(Math.sin(age * 9)) * h * 0.012 : 0;
            const sx = w / tex.width, sy = h / tex.height;
            m.scale.set(sx, sy);
            m.x = x + act.enterFrom * ease * W * 0.12;
            m.y = y - step;
            m.alpha = 1 - ease;

            // עיוות הגוף: נשימה בחזה, נטייה עדינה שגדלה כלפי הראש, תנועת דיבור
            const buf = m.geometry.getAttribute('aPosition').buffer;
            const data = buf.data as Float32Array;
            const base = act.base;
            const ph = t + act.seed;
            const agit = mood === 'upset' ? 2.2 : mood === 'tense' ? 1.3 : mood === 'hurt' ? 0.6 : 1;
            const sway = Math.sin(ph * (mood === 'upset' ? 2.6 : 0.9)) * tex.width * 0.006 * agit;
            const breath = Math.sin(ph * (mood === 'hurt' ? 2.2 : 1.5)) * 0.012;
            const talk = speaking ? Math.sin(ph * 11) * tex.height * 0.0035 : 0;
            const popK = act.pop ? Math.max(0, 1 - (t - act.pop) / 0.35) : 0;
            const cx = tex.width / 2;
            for (let i = 0; i < data.length; i += 2) {
              const bx = base[i], by = base[i + 1];
              const yn = by / tex.height; // 0 = ראש, 1 = רגליים
              const up = Math.max(0, 1 - yn) ** 2;
              const chest = Math.max(0, 1 - Math.abs(yn - 0.38) / 0.18);
              data[i] = bx + sway * up + (bx - cx) * (breath * chest + popK * 0.04 * up);
              data[i + 1] = by - (yn < 0.3 ? talk * (1 - yn / 0.3) : 0) - breath * chest * tex.height * 0.12 - popK * tex.height * 0.02 * up;
            }
            buf.update();

            // תאורה: לילה/ערב, ואור כחול־אדום מהניידת לצד הקרוב
            let tint = o.night ? [0.66, 0.68, 0.78] : o.evening ? [0.92, 0.84, 0.76] : [1, 1, 1];
            if (speaking) tint = tint.map((c) => Math.min(1, c * 1.12));
            if (o.lightSide && (o.night || o.evening)) {
              const near = o.lightSide === 'left' ? 1 - (x + w / 2) / W : (x + w / 2) / W;
              const s = Math.max(0, near - 0.25) * (o.flash ? 0.55 : 0.3);
              const blue = o.flash ? Math.sin(t * Math.PI * 1.66) > 0 : true;
              tint = blue ? [tint[0] * (1 - s * 0.6), tint[1] * (1 - s * 0.2), Math.min(1, tint[2] + s * 0.5)] : [Math.min(1, tint[0] + s * 0.5), tint[1] * (1 - s * 0.4), tint[2] * (1 - s * 0.5)];
            }
            m.tint = (Math.round(tint[0] * 255) << 16) | (Math.round(tint[1] * 255) << 8) | Math.round(tint[2] * 255);
          });

          for (const [id, act] of actors) {
            if (!seen.has(id)) { act.mesh.destroy(); actors.delete(id); }
          }
          firstFrame = false;

          // גשם: טיפות אלכסוניות וניתזים על הכביש
          fx.clear();
          if (o.rain) {
            const dt = tk.deltaMS / 1000;
            for (const d of drops) {
              d.y += dt * d.v * 1.3;
              d.x -= dt * 0.08;
              if (d.y > 1) {
                if (d.x > 0 && d.x < 1 && Math.random() < 0.6) splashes.push({ x: d.x * W, y: H * (0.68 + Math.random() * 0.3), t });
                d.y = -0.05; d.x = Math.random() * 1.1;
              }
              fx.moveTo(d.x * W, d.y * H).lineTo(d.x * W - 3, d.y * H + 14);
            }
            fx.stroke({ width: 1.2, color: 0xcfe0f5, alpha: 0.35 });
            for (let i = splashes.length - 1; i >= 0; i--) {
              const sp = splashes[i];
              const a2 = 1 - (t - sp.t) / 0.4;
              if (a2 <= 0) { splashes.splice(i, 1); continue; }
              fx.ellipse(sp.x, sp.y, 2 + (1 - a2) * 7, 1 + (1 - a2) * 2).stroke({ width: 1, color: 0xdfe9f5, alpha: a2 * 0.5 });
            }
          }
        });
      } catch {
        onActive(false);
      }
    })();

    return () => {
      dead = true;
      onActive(false);
      app?.destroy(true, { children: true });
    };
  }, [camRef, onActive]);

  return <div ref={host} className="pixi-layer" aria-hidden="true" data-testid="pixi-layer" />;
}
