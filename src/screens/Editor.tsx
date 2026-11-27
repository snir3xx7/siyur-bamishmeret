import { useEffect, useMemo, useState } from 'react';
import type { CatalogEntry, Scenario } from '../engine/types';
import { validateScenario, type ValidationResult } from '../engine/validate';
import { assetUrl, loadCatalog } from '../ui/data';
import { useApp } from '../ui/context';
import { go } from '../ui/router';
import { deleteCustom, forkScenario, getCustom, listCustom, saveCustom } from '../storage/custom';

/** שדות טקסט שאפשר לערוך (המבנה – מזהים, תנאים והשפעות – נשאר כמו במקור) */
const TEXT_KEYS = new Set(['text', 'label', 'title', 'summary', 'name', 'role', 'description', 'alt', 'reason', 'keep', 'improve', 'explain', 'goLabel', 'confirm', 'note', 'area']);
const SKIP_TOP = new Set(['media', 'id', 'version', 'file']);

type Path = (string | number)[];
interface Slot {
  path: Path;
  key: string;
  value: string;
  group: string;
  hint: string;
}

const TOP_LABEL: Record<string, string> = {
  dispatch: 'קריאה מהמשל״ט ושאלות המשך',
  transition: 'הנסיעה',
  scene: 'הזירה',
  arrivalLines: 'בהגעה',
  characters: 'דמויות',
  hotspots: 'נקודות בזירה',
  events: 'התפתחויות',
  update: 'עדכון למשל״ט',
  endings: 'סיומים',
  hints: 'רמזים',
  facts: 'עובדות',
  variants: 'גרסאות',
  scoring: 'ציון ומשוב',
  location: 'מקום',
  report: 'דוח',
  finish: 'סיום',
  pressure: 'לחץ זמן',
  custody: 'עיכוב ומעצר',
  records: 'בדיקה במערכת',
};
const KEY_LABEL: Record<string, string> = { text: 'טקסט', label: 'כותרת', title: 'כותרת', name: 'שם', role: 'תפקיד', description: 'תיאור', summary: 'תקציר', explain: 'הסבר', keep: 'לשימור', improve: 'לשיפור', note: 'השלכה', alt: 'תיאור תמונה' };

function collect(sc: Scenario): Slot[] {
  const out: Slot[] = [];
  const walk = (v: unknown, path: Path, group: string, hint: string) => {
    if (typeof v === 'string') {
      const k = String(path[path.length - 1]);
      const inVars = path.includes('vars');
      if ((TEXT_KEYS.has(k) || inVars) && /[א-ת]/.test(v)) out.push({ path, key: k, value: v, group, hint: inVars ? `משתנה {{${k}}}` : hint || KEY_LABEL[k] || k });
      return;
    }
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, [...path, i], group, hint));
    else if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      const sp = typeof o.speaker === 'string' ? `שורה – ${speakerLabel(sc, o.speaker)}` : '';
      const id = typeof o.id === 'string' ? o.id : '';
      for (const [k, x] of Object.entries(o)) {
        if (path.length === 0 && SKIP_TOP.has(k)) continue;
        const g = path.length === 0 ? (typeof x === 'string' ? 'פרטי התרחיש' : TOP_LABEL[k] ?? k) : path[0] === 'hotspots' && path.length === 2 ? `נקודה: ${(o.label as string) ?? id}` : group;
        walk(x, [...path, k], g, sp || hint);
      }
    }
  };
  walk(sc, [], '', '');
  return out;
}

function speakerLabel(sc: Scenario, sp: string) {
  const c = sc.characters.find((x) => x.id === sp);
  if (c) return c.name;
  return ({ player: 'השוטר', dispatch: 'המשל״ט', narrator: 'קריין', head: '401', duty: 'קצין תורן' } as Record<string, string>)[sp] ?? sp;
}

function setPath(sc: Scenario, path: Path, value: string): Scenario {
  const next = JSON.parse(JSON.stringify(sc)) as Record<string | number, unknown>;
  let o = next as Record<string | number, unknown>;
  for (const k of path.slice(0, -1)) o = o[k] as Record<string | number, unknown>;
  o[path[path.length - 1]] = value;
  return next as unknown as Scenario;
}

function download(name: string, text: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

/** עורך תרחישים: עותק של תרחיש קיים, עריכת כל הטקסטים, בדיקת תקינות, ניסיון וייצוא */
export function Editor({ id }: { id?: string }) {
  const { toast } = useApp();
  const [cat, setCat] = useState<CatalogEntry[]>([]);
  const [base, setBase] = useState('');
  const [mine, setMine] = useState(listCustom);
  const [sc, setSc] = useState<Scenario | undefined>(() => (id ? getCustom(id) : undefined));
  const [q, setQ] = useState('');
  const [check, setCheck] = useState<ValidationResult | null>(null);

  useEffect(() => {
    void loadCatalog().then((c) => {
      setCat(c);
      setBase(c[0]?.id ?? '');
    });
  }, []);
  useEffect(() => setSc(id ? getCustom(id) : undefined), [id]);

  const slots = useMemo(() => (sc ? collect(sc) : []), [sc]);
  const shown = q.trim() ? slots.filter((s) => s.value.includes(q.trim())) : slots;
  const groups = [...new Set(shown.map((s) => s.group))];

  const update = (next: Scenario) => {
    setSc(next);
    setCheck(null);
    try {
      saveCustom(next);
      setMine(listCustom());
    } catch {
      toast('השמירה נכשלה – אולי האחסון מלא');
    }
  };

  const fork = async () => {
    const r = await fetch(assetUrl(`scenarios/${base}.json`), { cache: 'no-cache' });
    if (!r.ok) return toast('לא ניתן לטעון את התרחיש');
    const next = forkScenario((await r.json()) as Scenario);
    saveCustom(next);
    setMine(listCustom());
    go(`#/editor/${next.id}`);
  };

  return (
    <div className="stack editor" data-testid="editor">
      <h1>✏️ עורך תרחישים</h1>
      <p className="small muted">
        בוחרים תרחיש קיים כתבנית ועורכים את כל הטקסטים: שמות, מקום, הקריאה מהמשל״ט, השורות, הבחירות והמשוב. המבנה (מה כל בחירה עושה) נשאר כמו במקור. התרחישים נשמרים בדפדפן הזה בלבד; לשיתוף – ייצוא לקובץ. שורה שערכתם מאבדת את ההקלטה ומוקראת בקול הדפדפן (אם הופעל בהגדרות).
      </p>

      <section className="card stack" aria-labelledby="ed-new">
        <h2 id="ed-new">עותק חדש</h2>
        <div className="btn-row">
          <select value={base} onChange={(e) => setBase(e.target.value)} aria-label="תרחיש בסיס">
            {cat.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <button type="button" className="btn primary" onClick={() => void fork()} data-testid="ed-fork">
            יצירת עותק לעריכה
          </button>
          <label className="btn">
            טעינת קובץ תרחיש
            <input
              type="file"
              accept=".json,application/json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  const s = JSON.parse(await f.text()) as Scenario;
                  if (!s.hotspots || !s.dispatch) throw new Error('bad');
                  if (!s.id.startsWith('my-')) s.id = `my-${s.id}`;
                  saveCustom(s);
                  setMine(listCustom());
                  go(`#/editor/${s.id}`);
                } catch {
                  toast('הקובץ אינו תרחיש תקין');
                }
              }}
            />
          </label>
        </div>
        {mine.length > 0 && (
          <ul className="ed-mine">
            {mine.map((m) => (
              <li key={m.id} className={m.id === sc?.id ? 'sel' : ''}>
                <a href={`#/editor/${m.id}`}>{m.title}</a>
                <span className="btn-row">
                  <a className="btn small" href={`#/s/${m.id}`}>▶ לנסות</a>
                  <button type="button" className="btn small ghost" onClick={() => { if (confirm(`למחוק את „${m.title}”?`)) { deleteCustom(m.id); setMine(listCustom()); if (m.id === sc?.id) go('#/editor'); } }}>
                    מחיקה
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {sc && (
        <section className="card stack" aria-labelledby="ed-edit">
          <h2 id="ed-edit">עריכה: {sc.title}</h2>
          <div className="btn-row">
            <button
              type="button"
              className="btn"
              data-testid="ed-validate"
              onClick={() => setCheck(validateScenario(sc, { walks: 200 }))}
            >
              בדיקת תקינות
            </button>
            <a className="btn primary" href={`#/s/${sc.id}`} data-testid="ed-try">
              ▶ לנסות את התרחיש
            </a>
            <button type="button" className="btn" onClick={() => download(`${sc.id}.json`, JSON.stringify(sc, null, 1))}>
              ⬇ ייצוא לקובץ
            </button>
          </div>
          {check && (
            <p className={`point ${check.errors.length ? 'challenge' : ''}`} data-testid="ed-check">
              {check.errors.length ? `נמצאו ${check.errors.length} שגיאות: ${check.errors.slice(0, 3).join(' · ')}` : `תקין. ${check.warnings.length ? `${check.warnings.length} הערות.` : ''}`}
            </p>
          )}
          <label>
            חיפוש טקסט
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="למשל: שם של דמות, רחוב…" />
          </label>
          <p className="small muted">{shown.length} שדות טקסט</p>
          {groups.map((g) => (
            <details key={g} className="ed-group" open={!!q.trim() || g === 'פרטי התרחיש' || g === TOP_LABEL.dispatch}>
              <summary>{g}</summary>
              {shown
                .filter((s) => s.group === g)
                .map((s) => (
                  <label key={s.path.join('.')} className="ed-field">
                    <span className="small muted">{s.hint}</span>
                    <textarea
                      value={s.value}
                      rows={Math.min(5, Math.ceil(s.value.length / 70))}
                      onChange={(e) => update(setPath(sc, s.path, e.target.value))}
                      data-testid={`ed-${s.path.join('.')}`}
                    />
                  </label>
                ))}
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
