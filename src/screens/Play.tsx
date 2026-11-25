import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../audio/audio';
import { loadRadioIndex, voiceKey } from '../audio/voiceKey';
import { buildDebrief } from '../engine/feedback';
import {
  ambienceOf, availableChoices, availableElements, availableFollowUps, currentHint, factText, findChoice, moodOf, simNow, startTimeOf, visibleHotspots,
} from '../engine/game';
import { clockLabel, durationLabel, fill } from '../engine/text';
import type { GameState, Line, Scenario } from '../engine/types';
import { SceneView, moodLabel } from '../scene/SceneView';
import { Transition } from '../scene/Transition';
import { addHistory, clearCurrent, loadCurrent, saveCurrent } from '../storage/db';
import { useApp } from '../ui/context';
import { loadScenario } from '../ui/data';
import { go } from '../ui/router';
import { currentShiftItem, loadShift, saveShift } from '../ui/shift';
import { procedureReport } from '../engine/procedure';
import { RadioChain, RadioCtx, useRadio } from '../ui/radio';
import { RadioGuide } from '../ui/RadioGuide';
import { FirstSceneGuide, FullscreenButton, RotateHint } from '../ui/DeviceHints';
import { custodyStatus } from '../engine/custody';
import { LocateMap } from '../ui/LocateMap';
import { callTo, chatterLines, gameProfile, headRouteText, radioize, RADIO_TO_LABEL, type RadioProfile, type RadioTo } from '../config/stations';
import { Modal, useAudioStatus } from '../ui/SettingsDialog';

export function speakerName(sc: Scenario, id: string, p?: RadioProfile): string {
  if (id === 'player') return p?.fem ? (p?.real ? `את (${p.unit})` : 'את (הסיירת)') : p?.real ? `אתה (${p.unit})` : 'אתה (הסייר)';
  if (id === 'dispatch' || id === 'center') return p?.real ? p.center : 'מוקד';
  if (id === 'head') return p?.real ? p.head : 'ראש המשמרת';
  if (id === 'duty') return p?.dutyOfficer ?? 'קצין תורן';
  if (id === 'narrator') return '';
  return sc.characters.find((c) => c.id === id)?.name ?? id;
}

export function Lines({ sc, lines }: { sc: Scenario; lines: Line[] }) {
  const p = useRadio();
  return (
    <>
      {lines.map((l, i) => {
        const named = speakerName(sc, l.speaker, p);
        const text = radioize(l.text, p);
        // אם הטקסט כבר פותח בשם הדובר (למשל „מוקד: …”) – לא מכפילים
        const who = named && text.startsWith(`${named}:`) ? '' : named;
        return (
          <p key={i} className={`line ${['center', 'duty', 'head'].includes(l.speaker) ? 'dispatch' : l.speaker === 'dispatch' || l.speaker === 'player' || l.speaker === 'narrator' ? l.speaker : ''}`}>
            {who && <span className="who">{who}: </span>}
            {text}
          </p>
        );
      })}
    </>
  );
}

function FactsPanel({ sc, st }: { sc: Scenario; st: GameState }) {
  const ids = Object.keys(st.known);
  const kind = (id: string) => sc.facts.find((f) => f.id === id);
  const dispatch = ids.filter((id) => kind(id)?.kind === 'dispatch' && !st.known[id].verified);
  const verified = ids.filter((id) => st.known[id].verified && kind(id)?.kind !== 'claim');
  const claims = ids.filter((id) => kind(id)?.kind === 'claim');
  const List = ({ items, empty }: { items: string[]; empty: string }) =>
    items.length ? (
      <ul>
        {items.map((id) => (
          <li key={id}>
            {kind(id)?.kind === 'claim' && <strong>{speakerName(sc, kind(id)!.source ?? '')}: </strong>}
            {factText(sc, st, id)}
          </li>
        ))}
      </ul>
    ) : (
      <p className="small muted">{empty}</p>
    );
  return (
    <div className="facts" data-testid="facts">
      <h4>📻 מידע מהמוקד – טרם אומת בזירה</h4>
      <List items={dispatch} empty="אין מידע פתוח מהמוקד." />
      <h4>✓ אומת או נצפה בזירה</h4>
      <List items={verified} empty="עדיין לא אומת דבר בזירה." />
      <h4>🗣 נטען על ידי מעורבים (גרסאות)</h4>
      <List items={claims} empty="עדיין לא נמסרו גרסאות." />
      {st.updates.length > 0 && (
        <>
          <h4>עדכונים שנשלחו למוקד</h4>
          <ul>
            {st.updates.map((u) => (
              <li key={u.n}>
                <bdi>{clockLabel(startTimeOf(sc, st.config.shift), u.t)}</bdi> – {u.elements.map((id) => fill(sc.update.elements.find((e) => e.id === id)?.text ?? id, st.vars)).join('; ')}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function LogPanel({ sc, st }: { sc: Scenario; st: GameState }) {
  const t0 = startTimeOf(sc, st.config.shift);
  return (
    <ol className="stack" style={{ listStyle: 'none', padding: 0 }} data-testid="log" aria-label="יומן פעולות ותמליל">
      {st.log.map((e) => (
        <li key={`${e.turn}-${e.ref}`} className="dialog-box">
          <div className="small muted">
            <bdi className="ltr">{clockLabel(t0, e.t)}</bdi> · {fill(e.label, st.vars)}
          </div>
          <Lines sc={sc} lines={e.lines} />
          {e.consequences.map((c) => (
            <p key={c} className="consequence">
              ⚑ {c}
            </p>
          ))}
        </li>
      ))}
    </ol>
  );
}

/** פנקס שטח: החניך רושם בעצמו שמות, מספרי רכב, שעות וגרסאות. נבדק בתחקיר */
function Notebook({ st, onChange }: { st: GameState; onChange: (text: string) => void }) {
  const [text, setText] = useState(st.notebook ?? '');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const ended = st.stage === 'ended';
  return (
    <div className="notebook">
      <p className="small muted">כמו בשטח: רשמו בעצמכם שמות, מספרי רכב, שעות ומה כל אחד אמר. בתחקיר נבדוק אילו פרטים חשובים נרשמו.</p>
      <textarea
        data-testid="notebook"
        value={text}
        readOnly={ended}
        rows={9}
        maxLength={4000}
        placeholder={'21:14 – הגעה. נהגת: …\nרכב: …\nלדבריו: …'}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => onChange(v), 500);
        }}
        onBlur={() => { window.clearTimeout(timer.current); onChange(text); }}
      />
    </div>
  );
}

function Composer({ sc, st, onSend, learning }: { sc: Scenario; st: GameState; onSend: (els: string[], note: string, to: RadioTo) => void; learning: boolean }) {
  const els = availableElements(sc, st);
  const [sel, setSel] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const cats = Object.keys(sc.update.categories).filter((c) => els.some((e) => e.category === c));
  const chosen = sc.update.elements.filter((e) => sel.includes(e.id));
  const covered = new Set(chosen.map((e) => e.category));
  const p = useRadio();
  const [to, setTo] = useState<RadioTo>('center');
  const opened = sel.includes('rp-open');
  const body = chosen.filter((e) => e.id !== 'rp-open').map((e) => fill(e.text, st.vars)).join('. ');
  const preview = `${opened ? `${callTo(p, to)}, ` : ''}${body}${note ? `. ${note}` : ''}`;
  return (
    <div className="stack">
      <fieldset className="composer-to" data-testid="composer-to">
        <legend>למי משדרים</legend>
        <div className="radio-row" role="radiogroup">
          {(['center', 'head', 'duty'] as RadioTo[]).map((k) => (
            <label key={k}>
              <input type="radio" name="radio-to" checked={to === k} onChange={() => setTo(k)} />
              <span>{p.real ? `${RADIO_TO_LABEL[k]}${k === 'center' ? ` – ${p.center}` : ''}` : k === 'center' ? 'המוקד' : RADIO_TO_LABEL[k]}</span>
            </label>
          ))}
        </div>
        <p className="small muted">המשל״ט – כל ניהול האירוע: פרטים, קבלה, הגעה, עדכונים, מד״א, כב״ה, גורם מוסמך · 401 – תגבור וניתוב בין ניידות · 11 – אירוע משמעותי (נפגע, עיכוב, פינוי)</p>
      </fieldset>
      <p className="small muted">בחרו רכיבים לעדכון קצר. כדאי לכלול: מקום, מצב נוכחי, מה אומת, מה עדיין חסר וסיוע נדרש. אפשר לשלוח עדכון נוסף בכל עת.</p>
      {cats.map((c) => (
        <fieldset key={c} className="composer-cat">
          <legend>{sc.update.categories[c]}</legend>
          {els
            .filter((e) => e.category === c)
            .map((e) => (
              <label key={e.id}>
                <input
                  type="checkbox"
                  checked={sel.includes(e.id)}
                  onChange={(ev) => setSel((s) => (ev.target.checked ? [...s, e.id] : s.filter((x) => x !== e.id)))}
                />
                <span>{fill(e.text, st.vars)}</span>
              </label>
            ))}
        </fieldset>
      ))}
      <label>
        הערה חופשית (לא חובה, עד 280 תווים)
        <textarea maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} style={{ minHeight: 60 }} />
      </label>
      {learning && (
        <p className="small" aria-live="polite">
          כיסוי:{' '}
          {['location', 'situation', 'status', 'verified', 'missing', 'assistance'].map((c) => (
            <span key={c} className={`chip ${covered.has(c) ? 'ok' : ''}`} style={{ marginInlineEnd: 4 }}>
              {covered.has(c) ? '✓' : '○'} {sc.update.categories[c]}
            </span>
          ))}
        </p>
      )}
      <div className="preview" aria-label="תצוגה מקדימה של העדכון">
        {sel.length ? preview : 'בחרו לפחות רכיב אחד.'}
      </div>
      <button type="button" className="btn primary" disabled={!sel.length} onClick={() => onSend(sel, note.trim(), to)}>
        📻 שליחת העדכון למוקד
      </button>
    </div>
  );
}

export function Play() {
  const { game, dispatch, settings, settingsOpen, openSettings, reducedMotion, storageOk, startGame, setGame, toast } = useApp();
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  const [tab, setTab] = useState<'actions' | 'info' | 'log' | 'notes'>('actions');
  const [chatter, setChatter] = useState<string | undefined>();
  const chatterIdx = useRef(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [composer, setComposer] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [guide, setGuide] = useState(false);
  const [radioIdx, setRadioIdx] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    void loadRadioIndex().then(setRadioIdx);
  }, []);
  const [loading, setLoading] = useState(!game);
  useAudioStatus();
  const sc = game?.sc;
  const st = game?.st;
  const mode = st?.config.mode;

  // רענון באמצע משחק: טעינת השמירה האחרונה
  useEffect(() => {
    if (game) return;
    let alive = true;
    void loadCurrent().then(async (saved) => {
      if (!alive) return;
      if (!saved) return go('#/');
      try {
        const s = await loadScenario(saved.config.scenarioId);
        startGame(s, saved.config, saved.actions, saved.activeMs);
      } catch {
        go('#/');
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [game, startGame]);

  const stage = st?.stage;
  // מעבר מהנסיעה לזירה פותח את לשונית הפעולות (לא בשחזור אחרי רענון)
  const prevStage = useRef(stage);
  useEffect(() => {
    if (prevStage.current === 'transition' && stage === 'scene') setTab('actions');
    prevStage.current = stage;
  }, [stage]);
  const running = !!st && !paused && !hidden && !settingsOpen && (stage === 'dispatch' || stage === 'scene');

  // שעון: נעצר בהשהיה, בחלון הגדרות, ברקע ובמעבר
  useEffect(() => {
    if (!running) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      dispatch({ type: 'TICK', ms: Math.min(5000, now - last) });
      last = now;
    }, 1000);
    return () => clearInterval(id);
  }, [running, dispatch]);

  useEffect(() => {
    const on = () => {
      setHidden(document.hidden);
      if (document.hidden && mode === 'learning') setPaused(true);
    };
    document.addEventListener('visibilitychange', on);
    window.addEventListener('pagehide', on);
    return () => {
      document.removeEventListener('visibilitychange', on);
      window.removeEventListener('pagehide', on);
    };
  }, [mode]);

  // שמירה אחרי כל פעולה וכל ~10 שניות
  const savedTurn = useRef(-1);
  const saveTick = Math.floor((st?.activeMs ?? 0) / 10000);
  useEffect(() => {
    if (!sc || !st || st.stage === 'ended') return;
    savedTurn.current = st.turn;
    void saveCurrent({ config: st.config, actions: st.actions, activeMs: st.activeMs, startedAt: st.startedAt, savedAt: new Date().toISOString(), title: sc.title });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st?.turn, saveTick]);

  // שמירה מיידית כשהדף נסגר או עובר לרקע (נעילת מסך, החלפת אפליקציה)
  const latest = useRef(game);
  latest.current = game;
  useEffect(() => {
    const flush = () => {
      const g = latest.current;
      if (!g || g.st.stage === 'ended') return;
      void saveCurrent({ config: g.st.config, actions: g.st.actions, activeMs: g.st.activeMs, startedAt: g.st.startedAt, savedAt: new Date().toISOString(), title: g.sc.title });
    };
    const onVis = () => document.hidden && flush();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // סיום: שמירה להיסטוריה ומעבר לתחקיר
  const finishedRef = useRef(false);
  useEffect(() => {
    if (!game || !sc || !st || st.stage !== 'ended' || finishedRef.current) return;
    finishedRef.current = true;
    audio.stopAll();
    const d = buildDebrief(sc, st);
    void (async () => {
      const id = await addHistory({
        scenarioId: sc.id, title: sc.title, version: sc.version, seed: st.config.seed, shift: st.config.shift, difficulty: st.config.difficulty,
        mode: st.config.mode, score: d.score.total, endingTitle: d.endingTitle, finishedAt: st.finishedAt ?? new Date().toISOString(),
        durationMs: st.activeMs, config: st.config, actions: st.actions, activeMs: st.activeMs, startedAt: st.startedAt,
      });
      await clearCurrent();
      // משמרת מלאה: רישום התוצאה לאירוע הנוכחי
      const plan = loadShift();
      const it = currentShiftItem(plan, sc.id, st.config.seed);
      if (plan && it) {
        const pr = procedureReport(st, sc);
        it.result = { score: d.score.total, proc: `${pr.score}/${pr.max}`, title: sc.title, historyId: id ?? undefined };
        plan.idx = Math.min(plan.idx + 1, plan.items.length);
        saveShift(plan);
      }
      setGame({ ...game, historyId: id ?? undefined });
      go('#/debrief');
    })();
  }, [game, sc, st, setGame]);

  // שמע לפי שלב (לכל היותר שתי שכבות סביבה)
  useEffect(() => {
    if (!sc) return;
    const strip = (a: string) => a.replace(/^audio\//, '').replace(/\.mp3$/, '');
    // קטעי הפתיחה (הודעת המשל״ט) נטענים מראש – כדי שהשידור הראשון יתחיל מיד
    const vl = sc.media.voiceLines ?? {};
    const opening = sc.dispatch.lines.map((l) => vl[voiceKey(l.speaker, l.text)]).filter(Boolean) as string[];
    audio.preload([...sc.media.audio.map(strip), 'radio-chirp', 'radio-end', ...opening.map(strip)]);
    return () => {
      audio.stopAll();
      audio.releaseVoice();
    };
  }, [sc]);
  const ambienceKey = sc && st && stage === 'scene' ? ambienceOf(sc, st).join(',') : '';
  const audioStatus = audio.status;
  useEffect(() => {
    if (!sc || !stage) return;
    if (stage === 'transition') audio.setAmbience(sc.transition.ambience);
    else if (stage === 'scene') audio.setAmbience(ambienceKey ? ambienceKey.split(',') : []);
    else audio.setAmbience([]);
  }, [sc, stage, audioStatus, ambienceKey]);

  // השמעת שורות חדשות: הודעות מוקד בערוץ קשר, השאר בדיבור
  const spokenTurn = useRef(-1);
  useEffect(() => {
    if (!sc || !st || spokenTurn.current === st.turn) return;
    // פתיחות השידור לפי תחנה עוד נטענות – מחכים להן כדי שהפתיחה תישמע מלאה
    if (!radioIdx && st.config.radio) return;
    spokenTurn.current = st.turn;
    const ref = st.log[st.log.length - 1]?.ref;
    const voice = ref ? sc.media.voice[ref] : undefined;
    const dispatchText = st.lastLines.filter((l) => ['dispatch', 'center', 'duty'].includes(l.speaker)).map((l) => l.text).join(' ');
    const other = st.lastLines.filter((l) => !['dispatch', 'center', 'duty', 'player'].includes(l.speaker)).map((l) => l.text).join(' ');
    const ev = st.lastEvent ? sc.events?.find((e) => e.id === st.lastEvent) : undefined;
    if (ev?.sfx) void audio.play(ev.sfx);
    // קריינות לכל שורה (BlueTTS): אם לכל השורות המדוברות יש קטע – משמיעים אותם בקולות הדמויות
    const vl = sc.media.voiceLines ?? {};
    const clip = (sp: string, text: string) => (sp === 'player' ? pl(text) : vl[voiceKey(sp, text)]);
    const addr = (sp: string, text: string) => (sp === 'player' && settings.officerVoice === 'f' && radioIdx?.[voiceKey('playerF', text)]) || radioIdx?.[voiceKey(sp, text)];
    const isRadio = (sp: string) => ['dispatch', 'center', 'duty', 'head', 'player'].includes(sp);
    const prof = gameProfile(st.config, settings.station, sc.dispatch.unit);
    // שורות השחקן: שידור בקשר (קול השחקן עם אפקט קשר) או דיבור בזירה (קול השוטר/השוטרת, בלי אפקט)
    const off = settings.officerVoice === 'f' ? 'officerF' : 'officer';
    const fem = settings.officerVoice === 'f';
    // שוטרת: השידורים שלך בקשר בקול נשי (playerF), אם הוקלטו
    const pl = (text: string) => (fem && vl[voiceKey('playerF', text)] ? vl[voiceKey('playerF', text)] : vl[voiceKey('player', text)]);
    const spoken = st.lastLines
      .map((l) => (l.speaker === 'player' && !clip('player', l.text) && clip(off, l.text) ? { ...l, speaker: off } : l))
      .filter((l) => l.speaker !== 'player' || clip('player', l.text) || clip('player', l.text.slice(l.text.indexOf(', ') + 2)))
      // הוראות במה בלבד („(שותקת, מורידה את העיניים)”) – אין מה להשמיע, ולא חוסמות את שאר השורות
      .filter((l) => /[א-ת]/.test(l.text.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').replace(/^[^:]{0,20}:\s*/, '')));
    const items: { file: string; radio: boolean; who: string }[] = [];
    // פתיחת אירוע בתחנה: ראש המשמרת מבקש מהמשל״ט „מרכז מסבא 401, תעבירי את האירוע ל־402”, ואז המשל״ט (קול נשי) מעדכן אותך
    if (st.turn === 0 && prof.real) {
      const r = headRouteText(prof);
      const a = addr('head', r.open), b = addr('head', r.body);
      if (a && b) items.push({ file: a, radio: true, who: 'head' }, { file: b, radio: true, who: 'head' });
    }
    // עדכון: קודם השידור שלך („מרכז מסבא 402” + הרכיבים), ואז התשובה
    const last = st.log[st.log.length - 1];
    if (last?.kind === 'update') {
      const up = st.updates[st.updates.length - 1];
      const open = up.elements.includes('rp-open') ? addr('player', callTo(prof, up.to ?? 'center')) : undefined;
      if (open) items.push({ file: open, radio: true, who: 'player' });
      for (const id of up.elements.filter((x) => x !== 'rp-open')) {
        const f = clip('player', fill(sc.update.elements.find((e) => e.id === id)?.text ?? '', st.vars));
        if (f) items.push({ file: f, radio: true, who: 'player' });
      }
    }
    let complete = spoken.length > 0;
    for (const l of spoken) {
      const who = l.speaker;
      const full = clip(who, l.text);
      if (full) {
        // פתיחה: „סבא 402 ממרכז” לפני הודעת המשל״ט בפתיחת האירוע
        if (st.turn === 0 && who === 'dispatch') {
          const a = addr('dispatch', prof.real ? `${prof.unit} מ${prof.centerCall}` : `${prof.unit} ממוקד אלון`);
          if (a) items.push({ file: a, radio: true, who });
        }
        items.push({ file: full, radio: isRadio(who), who });
        continue;
      }
      // שורה שפותחת באות הקריאה של ניידת התגבור: „סבא 404 בדרך אליכם.” → אות קריאה + גוף ההודעה
      const bk = st.vars.backup;
      const t0 = l.text.replace(/^מוקד:\s*/, '');
      if (bk && t0.startsWith(`${bk} `) && clip(who, t0.slice(bk.length + 1)) && addr(who, bk)) {
        items.push({ file: addr(who, bk)!, radio: true, who }, { file: clip(who, t0.slice(bk.length + 1))!, radio: isRadio(who), who });
        continue;
      }
      // שורה עם פתיחה בנוהל: „401 מסבא 402, …” → פתיחה (לפי תחנה) + גוף ההודעה
      const i = l.text.indexOf(', ');
      const body = i > 0 ? clip(who, l.text.slice(i + 2)) : undefined;
      if (body) {
        const a = addr(who, l.text.slice(0, i));
        if (a) items.push({ file: a, radio: true, who });
        items.push({ file: body, radio: isRadio(who), who });
        continue;
      }
      complete = false;
    }
    if (complete && items.length) void audio.playLines(items);
    else if (dispatchText) void audio.radioMessage(dispatchText, voice);
    else if (other) void audio.say(other, voice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st?.turn, radioIdx]);

  const choose = useCallback(
    (choiceId: string) => {
      if (!st || !sc) return;
      const found = findChoice(sc, choiceId);
      void audio.play(found?.choice.sfx ?? 'ui-click');
      dispatch({ type: 'CHOOSE', choiceId, turn: st.turn });
      setHint(null);
    },
    [st, sc, dispatch],
  );

  const dialogRef = useRef<HTMLDivElement>(null);
  const hotspots = useMemo(() => (sc && st ? visibleHotspots(sc, st) : []), [sc, st]);

  // תעבורת קשר של ניידות אחרות ברקע (כל ~38 שניות תרגול פעיל בזירה)
  const stage0 = st?.stage;
  const cfg0 = st?.config;
  useEffect(() => {
    if (!sc || !cfg0 || stage0 !== 'scene' || paused || settingsOpen || hidden) return;
    const lines = chatterLines(gameProfile(cfg0, settings.station, sc.dispatch.unit));
    let hide: number | undefined;
    const id = window.setInterval(() => {
      const l = lines[chatterIdx.current++ % lines.length];
      setChatter(l.text);
      // שידור רקע בקול (פתיחה לפי התחנה + גוף ההודעה) – רק כשאין שידור אחר באוויר
      const open = radioIdx?.[voiceKey(l.who, l.open)];
      const body = radioIdx?.[voiceKey(l.who, l.body)];
      if (!settings.textOnly) {
        if (open && body) void audio.background([{ file: open, radio: true, who: l.who }, { file: body, radio: true, who: l.who }]);
        else void audio.play('radio-chirp', 'radio');
      }
      hide = window.setTimeout(() => setChatter(undefined), 7000);
    }, 38000);
    return () => { window.clearInterval(id); window.clearTimeout(hide); };
  }, [sc, cfg0, stage0, paused, settingsOpen, hidden, settings.station, settings.textOnly, radioIdx]);

  if (!game || !sc || !st) return <p className="page" aria-busy="true">{loading ? 'טוען תרגול…' : ''}</p>;

  const t0 = startTimeOf(sc, st.config.shift);
  const clock = clockLabel(t0, simNow(st));
  const learning = st.config.mode === 'learning';
  const animate = !reducedMotion;
  const audioBlocked = !settings.muted && !settings.textOnly && audio.status === 'blocked';
  const audioIdle = !settings.muted && !settings.textOnly && audio.status === 'idle';

  const sceneArea =
    stage === 'scene' || stage === 'ended' ? (
      <SceneView sc={sc} st={st} selected={selected} onSelect={(id) => { setSelected(id); setTab('actions'); }} animate={animate} lightsAnim={settings.lightsAnim && !reducedMotion} showLabels={settings.showHotspotLabels} chatter={chatter} />
    ) : (
      <Transition
        kind={sc.transition.kind}
        shift={st.config.shift}
        rain={sc.scene.weather === 'rain'}
        text={stage === 'transition' ? sc.transition.text : 'הניידת ממתינה. קראו את הודעת המוקד, בקשו השלמת פרטים לפי הצורך ואשרו יציאה.'}
        animate={animate && stage === 'transition'}
        running={stage === 'transition'}
        paused={paused || settingsOpen}
        onDone={(skipped) => dispatch({ type: 'ARRIVE', turn: st.turn, skipped })}
      />
    );

  const sel = selected && hotspots.some((h) => h.id === selected) ? selected : null;
  const radio = { ...gameProfile(st.config, settings.station, sc.dispatch.unit), fem: settings.officerVoice === 'f' };

  return (
    <RadioCtx.Provider value={radio}>
    <div className="play">
      <header className="play-bar">
        <a href="#/" className="btn small ghost" onClick={(e) => { if (!confirm('לצאת מהתרגול? ההתקדמות נשמרת ואפשר להמשיך מאוחר יותר.')) e.preventDefault(); }} aria-label="יציאה למסך הבית">
          ✕
        </a>
        <span className="title">{sc.title}</span>
        <span className="chip">
          צוות <bdi>{radio.unit}</bdi>
        </span>
        <span className="chip">
          אירוע <bdi className="ltr">{sc.dispatch.incident}</bdi>
        </span>
        <span className="spacer" />
        <FullscreenButton />
        <span className="clock ltr" aria-label={`שעה מדומה ${clock}`} data-testid="clock">
          {clock}
        </span>
        <span className="small muted duration" title="משך תרגול פעיל">⏱ {durationLabel(st.activeMs)}</span>
        {learning && stage !== 'ended' && (
          <button type="button" className="btn small" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
            {paused ? '▶ המשך' : '⏸ השהיה'}
          </button>
        )}
        <button type="button" className="btn small" onClick={() => openSettings(true)} aria-haspopup="dialog">
          ⚙ הגדרות
        </button>
      </header>

      {(audioBlocked || audioIdle) && (
        <div className="audio-banner" role="status">
          {audioBlocked ? 'הדפדפן חוסם השמעת שמע. המשחק ממשיך עם תמלילים.' : 'השמע כבוי עד לפעולה ראשונה.'}
          <button type="button" className="btn small" onClick={() => audio.unlock()}>
            🔊 הפעלת שמע
          </button>
        </div>
      )}
      {audio.failed.size > 0 && !settings.textOnly && (
        <p className="small muted" role="status" style={{ margin: '4px 10px' }}>
          חלק מקובצי השמע לא נטענו – ההודעות מוצגות כתמליל.
        </p>
      )}
      {!storageOk && (
        <p className="small muted" role="status" style={{ margin: '4px 10px' }}>
          השמירה המקומית חסומה בדפדפן זה. אפשר להשלים את התרגול ולייצא תחקיר מהסשן הנוכחי.
        </p>
      )}

      <div className="play-main">
        <div className="scene-col">
          {stage === 'scene' && <RotateHint />}
          <div style={{ position: 'relative' }}>
            {sceneArea}
            {stage === 'scene' && !paused && <FirstSceneGuide />}
            {paused && (
              <div className="scene-overlay" role="dialog" aria-label="התרגול מושהה">
                <div className="stack">
                  <p>התרגול מושהה. שעון התרחיש עצור.</p>
                  <button type="button" className="btn primary" onClick={() => setPaused(false)} autoFocus>
                    ▶ המשך תרגול
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="panel-col" id="main" {...(paused ? { inert: '' } : {})} style={paused ? { opacity: 0.5 } : undefined}>
          {stage === 'dispatch' && (
            <section className="terminal" aria-label="מסוף קשר">
              <header>
                <span>מסוף קשר</span>
                <span>
                  שעה <bdi className="ltr">{clock}</bdi>
                </span>
                <span>
                  צוות <bdi>{radio.unit}</bdi>
                </span>
                <span>
                  אירוע <bdi className="ltr">{sc.dispatch.incident}</bdi>
                </span>
                <span>📍 {sc.location.name}</span>
              </header>
              <RadioChain p={radio} incident={sc.dispatch.incident} />
              {st.flags.located && sc.media.locateMap && <LocateMap {...sc.media.locateMap} />}
              <div aria-live="polite" ref={dialogRef}>
                {radio.real && (
                  <p className="line dispatch relay">
                    <span className="who">{radio.head}: </span>
                    {headRouteText(radio).open}, {headRouteText(radio).body}
                  </p>
                )}
                <Lines sc={sc} lines={st.log[0].lines} />
                {st.log.slice(1).filter((l) => l.kind === 'followup').map((l) => (
                  <div key={l.turn}>
                    <Lines sc={sc} lines={l.lines} />
                  </div>
                ))}
              </div>
              <div className="btn-row" style={{ margin: '8px 0' }}>
                <button type="button" className="btn small" onClick={() => {
                  audio.unlock();
                  const first = st.log[0].lines;
                  const files = first.map((l) => sc.media.voiceLines?.[voiceKey(l.speaker, l.text)]);
                  if (files.every(Boolean)) void audio.playLines(first.map((l, i) => ({ file: files[i]!, radio: l.speaker === 'dispatch' })));
                  else void audio.radioMessage(first.map((l) => radioize(l.text, radio)).join(' '), sc.media.voice.dispatch);
                }}>
                  🔁 השמעה חוזרת
                </button>
                <button type="button" className="btn small" onClick={() => setTab(tab === 'log' ? 'actions' : 'log')} aria-pressed={tab === 'log'}>
                  📄 תמליל
                </button>
                <button type="button" className="btn small" onClick={() => setGuide(true)} data-testid="open-radio-guide">
                  📻 נוהל קשר
                </button>
                {learning && (
                  <button type="button" className="btn small" onClick={() => setHint(currentHint(sc, st) ?? null)}>
                    💡 רמז
                  </button>
                )}
              </div>
              {hint && <p className="point challenge small">{hint}</p>}
              <h3 style={{ fontSize: '1em' }}>בקשת השלמת פרטים</h3>
              <div className="stack" style={{ marginTop: 0 }}>
                {availableFollowUps(sc, st).map((c) => (
                  <button key={c.id} type="button" className="btn block" onClick={() => choose(c.id)}>
                    {fill(c.label, st.vars)}
                  </button>
                ))}
                {availableFollowUps(sc, st).length === 0 && <p className="small muted">אין שאלות נוספות למוקד.</p>}
              </div>
              <button type="button" className="btn primary" style={{ marginTop: 12 }} onClick={() => { audio.unlock(); dispatch({ type: 'GO', turn: st.turn }); }} data-testid="go">
                🚓 {sc.dispatch.goLabel}
              </button>
            </section>
          )}

          {stage === 'transition' && <p className="dialog-box">בדרך לזירה… שעון התרחיש עצור במהלך המעבר. המידע שנאסף נשמר.</p>}

          {stage === 'scene' && (
            <>
              <section className="dialog-box" aria-live="polite" aria-label="מה קרה עכשיו" data-testid="dialogue">
                {(() => {
                  // אירוע מתפתח: מפרידים בין התגובה לבחירה לבין מה שקרה מעצמו בזירה
                  const evEntry = st.lastEvent ? st.log[st.log.length - 1] : undefined;
                  const evLines = evEntry?.kind === 'event' ? evEntry.lines.length : 0;
                  const own = st.lastLines.slice(0, st.lastLines.length - evLines);
                  return (
                    <>
                      <Lines sc={sc} lines={own} />
                      {evEntry && evLines > 0 && (
                        <>
                          <p className="event-head" data-testid="event-head">{evEntry.ref.startsWith('event:rp-') ? '📻' : '⚠'} {fill(evEntry.label, st.vars)}</p>
                          <Lines sc={sc} lines={st.lastLines.slice(own.length)} />
                        </>
                      )}
                    </>
                  );
                })()}
                {st.log.filter((l) => l.turn === st.turn).flatMap((l) => l.consequences).map((c) => (
                  <p key={c} className="consequence">
                    ⚑ {c}
                  </p>
                ))}
              </section>
              {hint && <p className="point challenge small">💡 {hint}</p>}
            </>
          )}

          {(stage === 'scene' || tab !== 'actions') && (
            <div>
              <div className="tabs" role="tablist" aria-label="לוח פעולות">
                {stage === 'scene' && (
                  <button role="tab" aria-selected={tab === 'actions'} onClick={() => setTab('actions')}>
                    פעולות
                  </button>
                )}
                <button role="tab" aria-selected={tab === 'info'} onClick={() => setTab('info')}>
                  מה ידוע לי
                </button>
                <button role="tab" aria-selected={tab === 'log'} onClick={() => setTab('log')}>
                  יומן ותמליל
                </button>
                <button role="tab" aria-selected={tab === 'notes'} onClick={() => setTab('notes')} data-testid="tab-notes">
                  📒 פנקס
                </button>
              </div>
              <div role="tabpanel" style={{ paddingTop: 10 }}>
                {st.flags.located && sc.media.locateMap && tab !== 'info' && <LocateMap {...sc.media.locateMap} />}
                {tab === 'info' && (
                  <>
                    {st.flags.located && sc.media.locateMap && <LocateMap {...sc.media.locateMap} />}
                    <FactsPanel sc={sc} st={st} />
                  </>
                )}
                {tab === 'log' && <LogPanel sc={sc} st={st} />}
                {tab === 'notes' && <Notebook st={st} onChange={(text) => dispatch({ type: 'NOTE', text })} />}
                {tab === 'actions' && stage === 'scene' && (
                  <div className="hotspot-list" data-testid="hotspots">
                    {hotspots.map((h, i) => {
                      const choices = availableChoices(sc, st, h.id);
                      const mood = h.character ? moodLabel(moodOf(sc, st, h.character), sc.characters.find((c) => c.id === h.character)?.gender) : null;
                      return (
                        <div key={h.id}>
                          <button
                            type="button"
                            className="btn block"
                            aria-pressed={sel === h.id}
                            aria-expanded={sel === h.id}
                            onClick={() => setSelected(sel === h.id ? null : h.id)}
                          >
                            <span className="num" aria-hidden="true">
                              {i + 1}
                            </span>
                            <span>
                              {fill(h.label, st.vars)}
                              {h.character && custodyStatus(sc, st, h.character) && <span className="chip warn cs-chip" data-testid="custody-status">{custodyStatus(sc, st, h.character)}</span>}
                              <span className="small muted" style={{ display: 'block' }}>
                                {mood ? `שפת גוף: ${mood}` : fill(h.description, st.vars)}
                                {choices.length === 0 && ' · אין פעולות נוספות כאן'}
                              </span>
                            </span>
                          </button>
                          {sel === h.id && (
                            <div className="choices" role="group" aria-label={`פעולות: ${h.label}`}>
                              {choices.map((c) => (
                                <button key={c.id} type="button" className="btn block" onClick={() => choose(c.id)}>
                                  {fill(c.label, st.vars)}
                                </button>
                              ))}
                              {choices.length === 0 && <p className="small muted">כל הפעולות כאן בוצעו.</p>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {stage === 'scene' && (
            <div className="tray" role="toolbar" aria-label="פעולות עיקריות">
              <button type="button" className="btn" onClick={() => setComposer(true)} data-testid="open-composer">
                📻 עדכון למוקד
              </button>
              <button type="button" className="btn" onClick={() => setTab('info')}>
                ℹ מה ידוע
              </button>
              <button type="button" className="btn" onClick={() => setTab('log')}>
                📄 יומן
              </button>
              <button type="button" className="btn" onClick={() => setGuide(true)}>
                📻 נוהל
              </button>
              {learning && (
                <button type="button" className="btn" onClick={() => setHint(currentHint(sc, st) ?? null)}>
                  💡 רמז
                </button>
              )}
              <button type="button" className="btn" onClick={() => setFinishing(true)} data-testid="finish">
                ✓ {sc.finish.label}
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal open={guide} title="נוהל קשר" onClose={() => setGuide(false)} labelId="guide-title">
        <RadioGuide p={radio} />
      </Modal>
      <Modal open={composer} title="שידור בקשר" onClose={() => setComposer(false)} labelId="composer-title">
        <Composer
          sc={sc}
          st={st}
          learning={learning}
          onSend={(elements, note, to) => {
            dispatch({ type: 'SEND_UPDATE', elements, note, turn: st.turn, ...(to !== 'center' ? { to } : {}) });
            setComposer(false);
            toast(to === 'head' ? 'השידור נשלח לראש המשמרת' : to === 'duty' ? 'השידור נשלח לקצין התורן' : 'השידור נשלח למשל״ט');
          }}
        />
      </Modal>
      <Modal open={finishing} title={sc.finish.label} onClose={() => setFinishing(false)} labelId="finish-title">
        <div className="stack">
          <p>{sc.finish.confirm}</p>
          <div className="btn-row">
            <button type="button" className="btn primary" onClick={() => { setFinishing(false); dispatch({ type: 'FINISH', turn: st.turn }); }} data-testid="confirm-finish">
              סיום ומעבר לתחקיר
            </button>
            <button type="button" className="btn" onClick={() => { setFinishing(false); setComposer(true); }}>
              שליחת עדכון נוסף קודם
            </button>
            <button type="button" className="btn ghost" onClick={() => setFinishing(false)}>
              חזרה לזירה
            </button>
          </div>
        </div>
      </Modal>
    </div>
    </RadioCtx.Provider>
  );
}
