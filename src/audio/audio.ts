import type { Settings } from '../storage/settings';

/**
 * מנוע שמע עם ארבעה ערוצים: דיבור, קשר, סביבה ואפקטים.
 * – מופעל רק אחרי פעולת משתמש (unlock).
 * – בזמן דיבור עוצמת הסביבה יורדת אוטומטית וחוזרת בהדרגה.
 * – כשל בטעינת קובץ אינו עוצר את המשחק; התמליל תמיד מוצג.
 */
export type Channel = 'speech' | 'radio' | 'ambience' | 'sfx';
export type AudioStatus = 'idle' | 'running' | 'blocked' | 'unsupported';

type Listener = () => void;

const DUCK = 0.25;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Partial<Record<Channel, GainNode>> = {};
  private duckGain: GainNode | null = null;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private loops = new Map<string, { src: AudioBufferSourceNode; gain: GainNode }>();
  private wantedAmbience: string[] = [];
  private settings: Settings | null = null;
  private speaking = 0;
  private listeners = new Set<Listener>();
  status: AudioStatus = 'idle';
  failed = new Set<string>();
  hebrewVoice: SpeechSynthesisVoice | null = null;

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    this.listeners.forEach((l) => l());
  }

  url(name: string) {
    return `${import.meta.env.BASE_URL}audio/${name}.mp3`;
  }

  /** קריאה מתוך handler של לחיצה/מקש בלבד */
  unlock() {
    if (this.status === 'unsupported') return;
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) {
          this.status = 'unsupported';
          this.emit();
          return;
        }
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.duckGain = this.ctx.createGain();
        this.duckGain.connect(this.master);
        for (const ch of ['speech', 'radio', 'sfx'] as Channel[]) {
          const g = this.ctx.createGain();
          g.connect(this.master);
          this.buses[ch] = g;
        }
        const amb = this.ctx.createGain();
        amb.connect(this.duckGain);
        this.buses.ambience = amb;
        // iOS: צליל שקט קצר "פותח" את ערוץ השמע
        const b = this.ctx.createBuffer(1, 1, 22050);
        const s = this.ctx.createBufferSource();
        s.buffer = b;
        s.connect(this.ctx.destination);
        s.start(0);
        this.applySettings(this.settings);
        this.initVoices();
      }
      const p = this.ctx.resume();
      p.then(() => {
        this.status = this.ctx?.state === 'running' ? 'running' : 'blocked';
        this.emit();
        if (this.status === 'running') this.setAmbience(this.wantedAmbience);
      }).catch(() => {
        this.status = 'blocked';
        this.emit();
      });
      if (this.ctx.state !== 'running') {
        this.status = 'blocked';
        this.emit();
      }
    } catch {
      this.status = 'unsupported';
      this.emit();
    }
  }

  private initVoices() {
    try {
      const pick = () => {
        const vs = window.speechSynthesis?.getVoices() ?? [];
        this.hebrewVoice = vs.find((v) => /^(he|iw)(-|_|$)/i.test(v.lang)) ?? null;
        this.emit();
      };
      pick();
      window.speechSynthesis?.addEventListener?.('voiceschanged', pick);
    } catch {
      this.hebrewVoice = null;
    }
  }

  applySettings(s: Settings | null) {
    this.settings = s;
    if (!s || !this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const silent = s.muted || s.textOnly;
    this.master.gain.setTargetAtTime(silent ? 0 : s.master, now, 0.05);
    this.buses.speech?.gain.setTargetAtTime(s.speech, now, 0.05);
    this.buses.radio?.gain.setTargetAtTime(s.radio, now, 0.05);
    this.buses.ambience?.gain.setTargetAtTime(s.ambience, now, 0.05);
    this.buses.sfx?.gain.setTargetAtTime(s.sfx, now, 0.05);
    if (silent) window.speechSynthesis?.cancel();
  }

  private load(name: string): Promise<AudioBuffer | null> {
    if (!this.ctx) return Promise.resolve(null);
    let p = this.buffers.get(name);
    if (!p) {
      const ctx = this.ctx;
      p = fetch(this.url(name))
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.arrayBuffer();
        })
        .then(
          (ab) =>
            new Promise<AudioBuffer>((resolve, reject) => {
              // תאימות ל-Safari ישן: decodeAudioData עם callbacks
              const ret = ctx.decodeAudioData(ab, resolve, reject);
              if (ret && typeof ret.then === 'function') ret.then(resolve, reject);
            }),
        )
        .catch(() => {
          this.failed.add(name);
          this.buffers.delete(name);
          this.emit();
          return null;
        });
      this.buffers.set(name, p);
    }
    return p;
  }

  /** טעינה מוקדמת של צלילי תרחיש (בפתיחתו בלבד) */
  preload(names: string[]) {
    names.forEach((n) => void this.load(n));
  }

  /** לכל היותר שתי שכבות סביבה בכל רגע */
  setAmbience(names: string[]) {
    this.wantedAmbience = names.slice(0, 2);
    if (!this.ctx || this.status !== 'running') return;
    const ctx = this.ctx;
    for (const [n, l] of this.loops) {
      if (!this.wantedAmbience.includes(n)) {
        l.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
        const src = l.src;
        setTimeout(() => {
          try {
            src.stop();
          } catch {
            /* כבר נעצר */
          }
        }, 1500);
        this.loops.delete(n);
      }
    }
    for (const n of this.wantedAmbience) {
      if (this.loops.has(n)) continue;
      const placeholder = { src: ctx.createBufferSource(), gain: ctx.createGain() };
      this.loops.set(n, placeholder);
      void this.load(n).then((buf) => {
        if (!buf || this.loops.get(n) !== placeholder || !this.buses.ambience) {
          if (this.loops.get(n) === placeholder) this.loops.delete(n);
          return;
        }
        const { src, gain } = placeholder;
        src.buffer = buf;
        src.loop = true;
        // מדלגים על ריפוד המקודד של MP3 כדי שהלולאה תהיה רציפה
        src.loopStart = Math.min(0.06, buf.duration / 4);
        src.loopEnd = Math.max(src.loopStart + 0.1, buf.duration - 0.06);
        gain.gain.value = 0;
        src.connect(gain).connect(this.buses.ambience);
        src.start(0, src.loopStart);
        gain.gain.setTargetAtTime(1, ctx.currentTime, 0.6);
      });
    }
  }

  stopAll() {
    this.setAmbience([]);
    window.speechSynthesis?.cancel();
    this.speaking = 0;
    this.unduck();
  }

  play(name: string, channel: Channel = 'sfx') {
    if (!this.ctx || this.status !== 'running') return Promise.resolve();
    const ctx = this.ctx;
    return this.load(name).then(
      (buf) =>
        new Promise<void>((resolve) => {
          const bus = this.buses[channel];
          if (!buf || !bus) return resolve();
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(bus);
          src.onended = () => resolve();
          src.start();
        }),
    );
  }

  private duck() {
    if (!this.ctx || !this.duckGain) return;
    this.duckGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.duckGain.gain.setTargetAtTime(DUCK, this.ctx.currentTime, 0.12);
  }
  private unduck() {
    if (!this.ctx || !this.duckGain) return;
    this.duckGain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.5);
  }

  private lineToken = 0;

  /**
   * השמעת שורות בקולות מוקלטים, אחת אחרי השנייה. שורות קשר (radio) עטופות בצפצוף פתיחה וסגירה.
   * פעולה חדשה של השחקן מפסיקה את הרצף הקודם בין קטעים.
   */
  async playLines(items: { file: string; radio: boolean; who?: string }[]) {
    const s = this.settings;
    if (!s || s.muted || s.textOnly || this.status !== 'running' || !items.length) return;
    const token = ++this.lineToken;
    this.speaking++;
    this.duck();
    try {
      for (let i = 0; i < items.length; i++) {
        if (token !== this.lineToken) return;
        const it = items[i];
        const name = it.file.replace(/^audio\//, '').replace(/\.mp3$/, '');
        // שידור חדש (צפצוף פתיחה/סגירה) בכל החלפת דובר בקשר
        const startRadio = it.radio && (i === 0 || !items[i - 1].radio || items[i - 1].who !== it.who);
        const endRadio = it.radio && (i === items.length - 1 || !items[i + 1].radio || items[i + 1].who !== it.who);
        if (startRadio) await this.play('radio-chirp', 'radio');
        await this.play(name, it.radio ? 'radio' : 'speech');
        if (endRadio) await this.play('radio-end', 'radio');
      }
    } finally {
      this.speaking = Math.max(0, this.speaking - 1);
      if (this.speaking === 0) this.unduck();
    }
  }

  /** צליל קשר קצר ואז הקראה (הקלטה מקומית אם יש, אחרת הקראת דפדפן אם הופעלה) */
  async radioMessage(text: string, voiceFile?: string) {
    await this.play('radio-chirp', 'radio');
    await this.say(text, voiceFile, 'radio');
    void this.play('radio-end', 'radio');
  }

  async say(text: string, voiceFile?: string, channel: Channel = 'speech') {
    const s = this.settings;
    if (!s || s.muted || s.textOnly || this.status !== 'running') return;
    this.speaking++;
    this.duck();
    try {
      if (voiceFile) {
        const name = voiceFile.replace(/^audio\//, '').replace(/\.mp3$/, '');
        await this.play(name, channel);
      } else if (s.tts && this.hebrewVoice && 'speechSynthesis' in window) {
        await new Promise<void>((resolve) => {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = this.hebrewVoice!.lang;
          u.voice = this.hebrewVoice;
          u.rate = 1.05;
          u.volume = Math.min(1, s.master * (channel === 'radio' ? s.radio : s.speech));
          u.onend = () => resolve();
          u.onerror = () => resolve();
          window.speechSynthesis.speak(u);
          setTimeout(resolve, 20000);
        });
      }
    } finally {
      this.speaking = Math.max(0, this.speaking - 1);
      if (this.speaking === 0) this.unduck();
    }
  }

  /** מעבר לרקע: השהיית שמע. חזרה: המשך */
  suspend() {
    window.speechSynthesis?.cancel();
    void this.ctx?.suspend().catch(() => undefined);
  }
  resume() {
    if (!this.ctx) return;
    this.ctx
      .resume()
      .then(() => {
        this.status = this.ctx?.state === 'running' ? 'running' : 'blocked';
        this.emit();
      })
      .catch(() => {
        this.status = 'blocked';
        this.emit();
      });
  }
}

export const audio = new AudioEngine();
