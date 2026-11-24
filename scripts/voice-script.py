"""מפיק תסריטי הקלטה לפי קבוצות קול (קשר, גברים לפי גיל, נשים לפי גיל), מחולקים לחלקים קצרים
   (עד LIMIT תווים לחלק – בקולות הטבעיים באתר ההקראה המגבלה היא 1000), ומניפסט שממפה כל קטע למפתח media.voice.
   python3 scripts/voice-script.py  →  docs/voice/parts/*.txt, docs/voice/README.md, docs/voice/manifest.json
"""
import json, os, re, glob
ROOT = os.path.join(os.path.dirname(__file__), '..')
R = os.path.join(ROOT, 'public/scenarios/')
LIMIT = 950
SEP = '\n\n...\n\n'

# קבוצות קול: מי מדבר, איזה קול מומלץ באתר ולמה
GROUPS = {
    'radio':   {'title': 'קשר – ראש המשמרת (401)', 'voice': 'Gil (Corporate)', 'alt': 'Eitan (Documentary)', 'why': 'קול יציב, ענייני וברור – מתאים להודעות קשר קצרות'},
    'men':     {'title': 'גברים 30–49', 'voice': 'Ariel (Conversational)', 'alt': 'Amit', 'why': 'קול שיחתי וטבעי לדמויות בגיל העמידה'},
    'older':   {'title': 'גברים מבוגרים (50+)', 'voice': 'Yonatan (Narration)', 'alt': 'Eitan', 'why': 'קול בוגר ועמוק יותר – שכנים ותיקים, סוחרים, קשישים'},
    'young':   {'title': 'גברים צעירים ונערים', 'voice': 'Noam (YouTube)', 'alt': 'Ariel', 'why': 'קול צעיר ואנרגטי – בני 16–29'},
    'women':   {'title': 'נשים עד 49', 'voice': 'Yael (Podcast)', 'alt': 'Hila', 'why': 'קול נשי שיחתי וטבעי'},
    'women50': {'title': 'נשים מבוגרות (50+)', 'voice': 'Noa (Audiobook)', 'alt': 'Michal', 'why': 'קול נשי חם ובוגר'},
}
AGE = {  # לפי תיאור האיורים
    'oren': 'men', 'michael': 'men', 'n1': 'men', 'roni': 'men',
    'samir': 'older', 'shmuel': 'older', 'avraham': 'older', 'yossi': 'older', 'beni': 'older', 'nissim': 'older', 'haim': 'older', 'moshe': 'older',
    'ido': 'young', 'alon': 'young', 'dor': 'young', 'maor': 'young', 'tomer': 'young', 'film1': 'young', 'film3': 'young',
    'rina': 'women50', 'ilana': 'women50',
}

def clean(t):
    t = re.sub(r'^סייר \d+, כאן מוקד אלון\.\s*', '', t)
    t = re.sub(r'^מוקד:\s*', '', t)
    return t.strip()

idx = json.load(open(R + 'index.json'))['scenarios']
segs = {g: [] for g in GROUPS}
for e in idx:
    d = json.load(open(R + e['file']))
    sid = e['id']
    gender = {c['id']: c['gender'] for c in d['characters']}
    names = {c['id']: c['name'] for c in d['characters']}
    def group_of(ch):
        if ch == 'omri':
            return None  # ילד – אין קול מתאים באתר
        return AGE.get(ch) or ('women' if gender.get(ch) == 'f' else 'men')
    def add(group, key, text, who, situation):
        if group and text and '{{' not in text:
            segs[group].append({'scenario': sid, 'title': d['title'], 'key': key, 'who': who, 'situation': situation, 'text': text})
    add('radio', 'dispatch', ' '.join(clean(l['text']) for l in d['dispatch']['lines'] if l['speaker'] == 'dispatch'), 'ראש המשמרת', 'הודעת הפתיחה')
    for f in d['dispatch']['followUps']:
        if not f.get('branches'):
            add('radio', f['id'], ' '.join(clean(l['text']) for l in f.get('lines', []) if l['speaker'] == 'dispatch'), 'ראש המשמרת', 'תשובה לשאלה: ' + f['label'])
    for h in d['hotspots']:
        for c in h['choices']:
            if c.get('branches'):
                continue
            ls = [l for l in c.get('lines', []) if l['speaker'] not in ('player', 'narrator')]
            if not ls:
                continue
            if all(l['speaker'] == 'dispatch' for l in ls):
                add('radio', c['id'], ' '.join(clean(l['text']) for l in ls), 'ראש המשמרת', 'תשובה בקשר: ' + c['label'])
            elif len({l['speaker'] for l in ls}) == 1 and ls[0]['speaker'] != 'dispatch':
                ch = ls[0]['speaker']
                add(group_of(ch), c['id'], ' '.join(l['text'] for l in ls), names.get(ch, ch), 'תגובה ל: ' + c['label'])

out = os.path.join(ROOT, 'docs/voice')
os.makedirs(os.path.join(out, 'parts'), exist_ok=True)
for f in glob.glob(os.path.join(out, 'parts', '*.txt')) + glob.glob(os.path.join(out, 'script-*.txt')):
    os.remove(f)
guide = ['# תסריט הקלטה – סיור במשמרת', '',
         'כל קובץ בתיקייה parts הוא הקלטה אחת (עד 950 תווים). מדביקים את כל הטקסט כמו שהוא, כולל שורות „...”, בקול שמופיע בטבלה, ומורידים MP3.',
         'שם הקובץ מספיק כדי שאדע מה הוקלט – אפשר לשלוח כמה הקלטות יחד, בכל סדר.', '',
         '| קובץ | קבוצה | קול מומלץ באתר | חלופה | תווים | קטעים |', '|---|---|---|---|---|---|']
n = 0
for g, L in segs.items():
    parts, cur = [], []
    for s in L:
        if cur and len(SEP.join(x['text'] for x in cur + [s])) > LIMIT:
            parts.append(cur); cur = []
        cur.append(s)
    if cur:
        parts.append(cur)
    for k, p in enumerate(parts, 1):
        n += 1
        name = f'{n:02d}-{g}-{k}.txt'
        body = SEP.join(x['text'] for x in p)
        open(os.path.join(out, 'parts', name), 'w').write(body + '\n')
        for x in p:
            x['group'], x['part'] = g, name
        guide.append(f"| {name} | {GROUPS[g]['title']} | **{GROUPS[g]['voice']}** | {GROUPS[g]['alt']} | {len(body)} | {len(p)} |")
guide += ['', '## למה הקולות האלה', '']
guide += [f"- **{v['title']}** – {v['voice']}: {v['why']}." for v in GROUPS.values()]
guide += ['- עומרי (ילד בן 6) לא מוקלט – אין באתר קול של ילד; נשאר טקסט.', '',
          '## פירוט הקטעים', '', '| קובץ | תרחיש | מי מדבר | סיטואציה | טקסט |', '|---|---|---|---|---|']
for g, L in segs.items():
    guide += [f"| {s['part']} | {s['title']} | {s['who']} | {s['situation']} | {s['text']} |" for s in L]
open(os.path.join(out, 'README.md'), 'w').write('\n'.join(guide) + '\n')
json.dump(segs, open(os.path.join(out, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
for g, L in segs.items():
    print(g, len(L), 'segments', sum(len(s['text']) for s in L), 'chars')
print(n, 'parts')
