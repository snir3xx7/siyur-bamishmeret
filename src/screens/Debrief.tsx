import { fill } from '../engine/text';
import { useEffect, useMemo, useState } from 'react';
import { buildDebrief, debriefText, shiftLabel } from '../engine/feedback';
import { replay } from '../engine/game';
import { buildReport, reportText, type ReportSection } from '../engine/report';
import { gameProfile, radioize } from '../config/stations';
import { notebookCheck, procedureReport } from '../engine/procedure';
import { custodyReport } from '../engine/custody';
import { evalCond } from '../engine/conditions';
import { RadioCtx } from '../ui/radio';
import { loadShift } from '../ui/shift';
import { randomSeed } from '../engine/rng';
import { listHistory, updateHistory, type HistoryItem } from '../storage/db';
import { useApp } from '../ui/context';
import { loadScenario } from '../ui/data';
import { go } from '../ui/router';
import { Lines } from './Play';

function download(name: string, text: string) {
  const blob = new Blob(['﻿' + text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

async function copy(text: string, toast: (m: string) => void) {
  try {
    await navigator.clipboard.writeText(text);
    toast('הועתק ללוח');
  } catch {
    toast('ההעתקה נחסמה – השתמשו בהורדה כטקסט');
  }
}

function printPart(part: 'debrief' | 'report') {
  document.body.dataset.print = part;
  document.querySelectorAll('details.tl').forEach((d) => d.setAttribute('open', ''));
  setTimeout(() => {
    window.print();
    delete document.body.dataset.print;
  }, 50);
}

export function DebriefScreen({ query }: { query: URLSearchParams }) {
  const { game, setGame, startGame, toast, settings } = useApp();
  const [hist, setHist] = useState<HistoryItem | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [projector, setProjector] = useState(false);
  const hid = Number(query.get('h')) || null;

  // פתיחת תחקיר מההיסטוריה – שחזור דטרמיניסטי מהפעולות שנשמרו
  useEffect(() => {
    if (!hid) return;
    void listHistory().then(async (all) => {
      const h = all?.find((x) => x.id === hid);
      if (!h) return;
      setHist(h);
      setEdits(h.reportEdits ?? {});
      const sc = await loadScenario(h.scenarioId);
      const st = replay(sc, h.config, h.actions, h.startedAt);
      st.activeMs = h.activeMs;
      st.finishedAt = h.finishedAt;
      setGame({ sc, st, historyId: h.id });
    });
  }, [hid, setGame]);

  useEffect(() => {
    document.body.classList.toggle('projector', projector);
    return () => document.body.classList.remove('projector');
  }, [projector]);

  const d = useMemo(() => (game && game.st.stage === 'ended' ? buildDebrief(game.sc, game.st) : null), [game]);
  const report = useMemo<ReportSection[]>(() => (game && game.st.stage === 'ended' ? buildReport(game.sc, game.st) : []), [game]);

  if (!game || !d) {
    return hid ? (
      <p aria-busy="true">טוען תחקיר…</p>
    ) : (
      <p>
        אין תחקיר להצגה. <a href="#/catalog">לקטלוג התרחישים</a>
      </p>
    );
  }
  const { sc, st } = game;
  const radio = { ...gameProfile(st.config, settings.station, sc.dispatch.unit), fem: settings.officerVoice === 'f' };
  const proc = procedureReport(st, sc);
  const custody = custodyReport(st, sc, (c) => evalCond({ sc, st }, c));
  const shiftPlan = loadShift();
  const nb = notebookCheck(sc, st);
  const reportFinal = report.map((s) => ({ ...s, text: edits[s.id] ?? radioize(s.text.replace(`צוות: ${sc.dispatch.unit}`, `צוות: ${radio.unit}${radio.real ? ` | ${radio.stationName}, ${radio.districtName}` : ''}`), radio) }));

  const saveEdits = (next: Record<string, string>) => {
    setEdits(next);
    const id = game.historyId;
    if (!id) return;
    void (async () => {
      const all = await listHistory();
      const h = hist ?? all?.find((x) => x.id === id);
      if (h) await updateHistory({ ...h, reportEdits: next });
    })();
  };

  const retrySame = () => {
    startGame(sc, { ...st.config });
    go('#/play');
  };
  const retryVariant = () => {
    let seed = randomSeed();
    if (seed === st.config.seed) seed = (seed % 999_998) + 1;
    startGame(sc, { ...st.config, seed });
    go('#/play');
  };
  const reopenAt = (actionIndex: number) => {
    if (!confirm('לפתוח מחדש את התרחיש מנקודת החלטה זו? זהו תרגול חדש לצורכי דיון, והוא לא יחליף את התחקיר הזה.')) return;
    startGame(sc, { ...st.config, mode: 'learning' }, st.actions.slice(0, Math.max(0, actionIndex)));
    go('#/play');
  };

  const full = `${debriefText(sc, st, d)}\n\n${reportText(sc, reportFinal)}`;

  return (
    <RadioCtx.Provider value={radio}>
    <div className="stack">
      <section className="card print-debrief" aria-labelledby="dbf-title">
        <div className="score-head">
          <div className="score-ring" aria-label={`ציון ${d.score.total} מתוך 100`} data-testid="score">
            <div>
              {d.score.total}
              <small>מתוך 100</small>
            </div>
          </div>
          <div>
            <h1 id="dbf-title" style={{ marginBottom: 4 }}>
              תחקיר: {d.title}
            </h1>
            <p className={`ending ${d.endingKind}`} data-testid="ending">
              <strong>{d.endingTitle}</strong>
            </p>
            <p data-testid="summary">{d.summary}</p>
            <p className="small muted">
              {d.endingText}
            </p>
            <p className="small muted">
              משך תרגול: {d.duration} · משמרת {shiftLabel(st.config.shift)} · {st.config.mode === 'learning' ? 'מצב למידה' : 'תרגול עצמאי'} · זרע <bdi>{st.config.seed}</bdi> · גרסה <bdi>{sc.version}</bdi>
            </p>
          </div>
        </div>
        <div className="btn-row no-print" style={{ marginTop: 12 }}>
          <button type="button" className="btn primary" onClick={retrySame} data-testid="retry-same">
            ↺ ניסיון חוזר באותו תרחיש
          </button>
          <button type="button" className="btn" onClick={retryVariant} data-testid="retry-variant">
            🎲 תרגול בגרסה אחרת
          </button>
          <button type="button" className="btn" onClick={() => copy(debriefText(sc, st, d), toast)}>
            📋 העתקת משוב
          </button>
          <button type="button" className="btn" onClick={() => download(`תחקיר-${sc.id}-${st.config.seed}.txt`, full)} data-testid="download">
            ⤓ הורדת תחקיר ודוח כטקסט
          </button>
          <button type="button" className="btn" onClick={() => printPart('debrief')}>
            🖨 הדפסה או שמירה כ־PDF
          </button>
          <button type="button" className="btn" aria-pressed={projector} onClick={() => setProjector((p) => !p)}>
            🖥 מצב מקרן
          </button>
        </div>
      </section>

      <div className="grid2 print-debrief">
        <section className="card" aria-labelledby="keep-title">
          <h2 id="keep-title">נקודות לשימור</h2>
          {d.keep.length === 0 && <p className="muted small">אין בסבב זה פעולה שקיבלה ניקוד מלא ומבוססת ביומן.</p>}
          {d.keep.map((k) => (
            <div key={k.ruleId} className="point" data-testid="keep">
              <p style={{ margin: 0 }}>{k.text}</p>
              {k.where && <p className="where">{k.where}</p>}
            </div>
          ))}
        </section>
        <section className="card" aria-labelledby="imp-title">
          <h2 id="imp-title">{d.improve.length ? 'נקודות לשיפור' : 'אתגר להמשך'}</h2>
          {d.improve.map((k) => (
            <div key={k.ruleId} className="point improve" data-testid="improve">
              <p style={{ margin: 0 }}>{k.text}</p>
              {k.where && <p className="where">{k.where}</p>}
            </div>
          ))}
          {d.challenge && (
            <div className="point challenge" data-testid="challenge">
              {d.challenge}
            </div>
          )}
        </section>
      </div>

      {shiftPlan && shiftPlan.items.some((i) => i.result?.historyId === game.historyId) && (
        <section className="card shift-next" data-testid="shift-continue">
          <b>🚓 משמרת: {shiftPlan.items.filter((i) => i.result).length} מתוך {shiftPlan.items.length} אירועים</b>
          <a className="btn primary" href="#/shift">
            {shiftPlan.items.every((i) => i.result) ? 'לסיכום המשמרת ▶' : '📻 חזרה למשמרת – האירוע הבא ▶'}
          </a>
        </section>
      )}

      <div className="grid2">
        <section className="card print-debrief" aria-labelledby="rp-title" data-testid="procedure">
          <h2 id="rp-title">📻 נוהל קשר <span className="small muted">({proc.score}/{proc.max} – לא נכלל בציון)</span></h2>
          <ul className="proc-list">
            {proc.items.map((i) => (
              <li key={i.label} className={i.ok === null ? '' : i.ok ? 'ok' : 'bad'}>
                <b>{i.ok === null ? '–' : i.ok ? '✓' : '✗'} {i.label}</b>
                <span>{i.detail}</span>
              </li>
            ))}
          </ul>
        </section>
        {custody.length > 0 && (
          <section className="card print-debrief" aria-labelledby="cs-title" data-testid="custody">
            <h2 id="cs-title">🚔 עיכוב, מעצר וחיפוש <span className="small muted">(לא נכלל בציון)</span></h2>
            <ul className="proc-list">
              {custody.map((i) => (
                <li key={i.label} className={i.ok ? 'ok' : 'bad'}>
                  <b>{i.ok ? '✓' : '✗'} {i.label}</b>
                  <span>{i.detail}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="card print-debrief" aria-labelledby="nb-title" data-testid="notebook-check">
          <h2 id="nb-title">📒 פנקס השטח</h2>
          {st.notebook?.trim() ? (
            <>
              <pre className="notebook-view">{st.notebook}</pre>
              <ul className="proc-list">
                {nb.map((x) => (
                  <li key={x.item} className={x.ok ? 'ok' : 'bad'}>
                    <b>{x.ok ? '✓' : '✗'} {x.item}</b>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="small muted">לא נרשם דבר בפנקס. בשטח, פנקס מסודר (שמות, מספרי רכב, שעות, מי אמר מה) הוא הבסיס לדוח הפעולה.</p>
          )}
        </section>
      </div>

      <section className="card print-debrief" aria-labelledby="bd-title">
        <h2 id="bd-title">פירוט הציון</h2>
        {d.score.normalized && (
          <p className="small muted">
            חלק מהקריטריונים לא היו רלוונטיים במהלך שהתרחש ולכן לא נכללו; המשקלים נורמלו לציון מתוך 100.
          </p>
        )}
        {d.score.domains.map((dom) => (
          <div key={dom.domain} style={{ marginBottom: 14 }} data-testid={`domain-${dom.domain}`}>
            <div className="meta" style={{ justifyContent: 'space-between' }}>
              <strong>{dom.label}</strong>
              <span>
                <bdi>{dom.score}</bdi> מתוך <bdi>{dom.weight}</bdi>
              </span>
            </div>
            <div className="bar" aria-hidden="true">
              <span style={{ width: `${dom.weight ? (dom.score / dom.weight) * 100 : 0}%` }} />
            </div>
            {dom.rules.map((r) => (
              <div key={r.rule.id} className="rule-row">
                <div>
                  {r.rule.label} <span className={`chip ${r.rule.required ? 'warn' : ''}`}>{r.rule.required ? 'נדרש למטרת התרגול' : 'בחירה סבירה מתוך כמה'}</span>
                  <div className="small muted">{r.explain}</div>
                </div>
                <div className="pts">
                  <bdi>{r.points}</bdi> מתוך <bdi>{r.max}</bdi>
                </div>
              </div>
            ))}
          </div>
        ))}
        {d.score.rules.filter((r) => !r.applicable).length > 0 && (
          <p className="small muted">
            לא נכלל בחישוב: {d.score.rules.filter((r) => !r.applicable).map((r) => r.rule.label).join(', ')} (הפעולה לא הייתה רלוונטית במהלך שהתרחש).
          </p>
        )}
      </section>

      <section className="card print-debrief" aria-labelledby="tl-title">
        <h2 id="tl-title">ציר החלטות</h2>
        <p className="small muted">כל החלטה מוערכת לפי מה שהיה ידוע ברגע ההחלטה. פתחו שורה כדי לראות מה ידעתם, מה בחרתם, מה קרה וכמה נקודות התקבלו.</p>
        {d.timeline.map((t) => (
          <details key={`${t.entry.turn}-${t.entry.ref}`} className={`tl ${t.significant ? 'sig' : ''}`} data-testid="timeline-item">
            <summary>
              <bdi className="ltr small muted">{t.time}</bdi>
              <span>
                {fill(t.entry.label, st.vars)}
                {t.rules.length > 0 && (
                  <span className="small muted">
                    {' '}
                    · {t.rules.map((r) => `${r.rule.label}: ${r.points}/${r.max}`).join(' · ')}
                  </span>
                )}
              </span>
            </summary>
            <div className="tl-body stack">
              <div>
                <strong>מה ידעת באותו רגע</strong>
                {t.knownDispatch.length + t.knownVerified.length + t.knownClaims.length === 0 ? (
                  <p className="small muted">עדיין לא היה מידע.</p>
                ) : (
                  <ul className="small">
                    {t.knownDispatch.map((x) => (
                      <li key={x}>מהמוקד: {x}</li>
                    ))}
                    {t.knownVerified.map((x) => (
                      <li key={x}>אומת: {x}</li>
                    ))}
                    {t.knownClaims.map((x) => (
                      <li key={x}>נטען: {x}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <strong>מה בחרת ומה קרה</strong>
                <p className="small">{fill(t.entry.label, st.vars)}</p>
                <Lines sc={sc} lines={t.entry.lines} />
                {t.entry.consequences.map((c) => (
                  <p key={c} className="consequence">
                    ⚑ השלכה: {c}
                  </p>
                ))}
              </div>
              {t.rules.map((r) => (
                <div key={r.rule.id} className="small">
                  <strong>
                    {r.rule.label} | <bdi>{r.points}</bdi> מתוך <bdi>{r.max}</bdi>
                  </strong>{' '}
                  | {r.explain} <span className="muted">({r.rule.required ? 'פעולה נדרשת למטרת התרגול' : 'בחירה סבירה מתוך כמה אפשרויות'})</span>
                  {r.rule.alternative && <p className="muted">בחירה נוספת סבירה: {r.rule.alternative}</p>}
                </div>
              ))}
              {t.entry.actionIndex >= 0 && (
                <button type="button" className="btn small no-print" onClick={() => reopenAt(t.entry.actionIndex)}>
                  ↩ פתיחה מחדש מנקודה זו (לדיון בכיתה)
                </button>
              )}
            </div>
          </details>
        ))}
      </section>

      <section className="card print-report" aria-labelledby="rep-title">
        <h2 id="rep-title">טיוטת דוח פעולה (לתרגול)</h2>
        <p className="small muted">
          הטיוטה נבנתה רק ממה שגילית ומהפעולות שביצעת. פרט חסר מסומן „לא תועד”. אפשר לערוך כל סעיף; העריכות נשמרות במכשיר.
        </p>
        {reportFinal.map((s) => (
          <div key={s.id} className="report-sec">
            <label htmlFor={`rep-${s.id}`}>{s.title}</label>
            <textarea
              id={`rep-${s.id}`}
              className="no-print"
              value={s.text}
              rows={Math.min(12, s.text.split('\n').length + 1)}
              onChange={(e) => saveEdits({ ...edits, [s.id]: e.target.value })}
              data-testid={`report-${s.id}`}
            />
            <div className="print-only">{s.text}</div>
          </div>
        ))}
        <div className="btn-row no-print">
          <button type="button" className="btn" onClick={() => copy(reportText(sc, reportFinal), toast)}>
            📋 העתקת הדוח
          </button>
          <button type="button" className="btn" onClick={() => download(`דוח-פעולה-${sc.id}-${st.config.seed}.txt`, reportText(sc, reportFinal))}>
            ⤓ הורדת הדוח כטקסט
          </button>
          <button type="button" className="btn" onClick={() => printPart('report')}>
            🖨 הדפסת הדוח
          </button>
          {Object.keys(edits).length > 0 && (
            <button type="button" className="btn ghost" onClick={() => saveEdits({})}>
              ביטול עריכות
            </button>
          )}
        </div>
      </section>
    </div>
    </RadioCtx.Provider>
  );
}
