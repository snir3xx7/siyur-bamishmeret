"""מפיק תסריטי הקלטה רציפה (גבר / אישה) מקבצי התרחישים, ומניפסט שממפה כל קטע למפתח media.voice.
   python3 scripts/voice-script.py  →  docs/voice/script-male.txt, script-female.txt, manifest.json
"""
import json, os, re
ROOT = os.path.join(os.path.dirname(__file__), '..')
R = os.path.join(ROOT, 'public/scenarios/')
idx = json.load(open(R + 'index.json'))['scenarios']

def clean(t):
    t = re.sub(r'^סייר \d+, כאן מוקד אלון\.\s*', '', t)
    t = re.sub(r'^מוקד:\s*', '', t)
    return t.strip()

has_var = lambda t: '{{' in t
segs = {'male': [], 'female': []}
for e in idx:
    d = json.load(open(R + e['file']))
    sid = e['id']
    g = {c['id']: c['gender'] for c in d['characters']}
    def add(gender, key, kind, text, who, situation=''):
        if text and not has_var(text):
            segs[gender].append({'scenario': sid, 'title': d['title'], 'key': key, 'kind': kind, 'who': who, 'situation': situation, 'text': text})
    # קשר (401) – קול גברי
    add('male', 'dispatch', 'radio', ' '.join(clean(l['text']) for l in d['dispatch']['lines'] if l['speaker'] == 'dispatch'), 'ראש המשמרת (קשר)', 'הודעת הפתיחה – ניתוב האירוע לניידת')
    for f in d['dispatch']['followUps']:
        if f.get('branches'):
            continue
        add('male', f['id'], 'radio', ' '.join(clean(l['text']) for l in f.get('lines', []) if l['speaker'] == 'dispatch'), 'ראש המשמרת (קשר)', 'תשובה לשאלה: ' + f['label'])
    names = {c['id']: c['name'] for c in d['characters']}
    for h in d['hotspots']:
        for c in h['choices']:
            if c.get('branches'):
                continue
            ls = [l for l in c.get('lines', []) if l['speaker'] not in ('player', 'narrator')]
            if not ls:
                continue
            if all(l['speaker'] == 'dispatch' for l in ls):
                add('male', c['id'], 'radio', ' '.join(clean(l['text']) for l in ls), 'ראש המשמרת (קשר)', 'תשובה בקשר: ' + c['label'])
                continue
            if any(l['speaker'] == 'dispatch' for l in ls):
                continue
            gs = {g.get(l['speaker']) for l in ls}
            if len(gs) == 1 and len({l['speaker'] for l in ls}) == 1:
                gender = 'female' if 'f' in gs else 'male'
                add(gender, c['id'], 'character', ' '.join(l['text'] for l in ls), names.get(ls[0]['speaker'], ''), 'תגובה לפעולה: ' + c['label'])
os.makedirs(os.path.join(ROOT, 'docs/voice'), exist_ok=True)
for gender, L in segs.items():
    for i, s in enumerate(L, 1):
        s['n'] = i
    words = sum(len(s['text'].split()) for s in L)
    body = '\n\n...\n\n'.join(s['text'] for s in L)
    open(os.path.join(ROOT, f'docs/voice/script-{gender}.txt'), 'w').write(body + '\n')
    print(gender, len(L), 'segments', words, 'words')
guide = ['# תסריט הקלטה – סיור במשמרת', '',
 'שני קבצים להקלטה רציפה באתר ההקראה: script-male.txt (קול גברי) ו־script-female.txt (קול נשי).',
 'מדביקים את כל הטקסט כמו שהוא, כולל שורות „...” שבין הקטעים – הן יוצרות הפסקה שלפיה ההקלטה מפורקת לקטעים.',
 'לא משנים סדר, לא מוחקים ולא מוסיפים קטעים. אם צריך לחלק לשתי הקלטות – לחלק בין קטעים, ולציין מאיזה מספר מתחילה ההקלטה השנייה.', '']
for gender, title in (('male', 'קול גברי'), ('female', 'קול נשי')):
    guide += [f'## {title} – {len(segs[gender])} קטעים', '', '| # | תרחיש | מי מדבר | סיטואציה | טקסט |', '|---|---|---|---|---|']
    guide += [f"| {s['n']} | {s['title']} | {s['who']} | {s['situation']} | {s['text']} |" for s in segs[gender]]
    guide.append('')
open(os.path.join(ROOT, 'docs/voice/README.md'), 'w').write('\n'.join(guide))
json.dump(segs, open(os.path.join(ROOT, 'docs/voice/manifest.json'), 'w'), ensure_ascii=False, indent=1)
