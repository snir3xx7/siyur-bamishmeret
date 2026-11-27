"""אחידות מונחים: „מוקד” (כשהכוונה לניהול האירוע מול הניידת) → „משל״ט”.
משאיר: מוקד 100, „מוקד אלון” (שם בדוי – מוחלף לפי התחנה), אזרח שהתקשר „למוקד”, ושורות מדוברות (יש להן הקלטה).
הרצה: python3 scripts/terminology-mashlat.py
"""
import json, os, re, glob
ROOT = os.path.join(os.path.dirname(__file__), '..')
RE = re.compile(r'(?<![א-ת])((?:ו|ש|וש)?(?:ה|ל|מה|ב|כ|לה)?)מוקד(?![א-ת])(?! אלון)(?! 100)(?! ה?סיוע)')
KEEP_BEFORE = re.compile(r'(התקשר\w*|פנייה|פנה|פנתה|שיחה|חייג\w*|התקבל\w*)\s+$')

def conv(t: str) -> str:
    def rep(m):
        before = t[:m.start()]
        if KEEP_BEFORE.search(before):
            return m.group(0)
        pre = m.group(1)
        return pre + 'משל״ט'
    return RE.sub(rep, t)

# שדות שמוצגים בלבד (לא מוקראים)
TEXT_KEYS = {'alternative', 'label', 'report', 'description', 'explain', 'keep', 'improve', 'title', 'summary', 'confirm', 'reason', 'goLabel', 'note', 'alt'}
n = 0
for p in glob.glob(os.path.join(ROOT, 'public/scenarios/*.json')):
    d = json.load(open(p))
    if 'scenarios' in d:
        for e in d['scenarios']:
            for k in ('summary',):
                e[k] = conv(e[k])
            e['skills'] = [conv(x) for x in e['skills']]
        json.dump(d, open(p, 'w'), ensure_ascii=False, indent=1); open(p, 'a').write('\n')
        continue
    def walk(o, key=None, in_lines=False):
        global n
        if isinstance(o, dict):
            is_line = 'speaker' in o
            for k, v in list(o.items()):
                if k == 'media':
                    continue
                if isinstance(v, str):
                    if not is_line and (k in TEXT_KEYS) or (k == 'text' and not is_line and key in ('hints', 'facts', 'checklist', 'endings')):
                        nv = conv(v)
                        if nv != v:
                            n += 1
                            o[k] = nv
                else:
                    walk(v, k)
        elif isinstance(o, list):
            if key in ('objectives', 'skills', 'challenges'):
                for i, v in enumerate(o):
                    if isinstance(v, str):
                        nv = conv(v)
                        if nv != v:
                            n += 1
                            o[i] = nv
                return
            for v in o:
                walk(v, key)
    walk(d)
    open(p, 'w').write(json.dumps(d, ensure_ascii=False, indent=1) + '\n')
print('שדות שעודכנו בתרחישים:', n)
