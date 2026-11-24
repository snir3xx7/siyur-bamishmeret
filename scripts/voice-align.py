"""יישור תמלול ההקלטה לקטעי התסריט: align.py manifest.json gender transcript.json → קטעים עם זמני התחלה/סיום"""
import sys, json, re, difflib
man = json.load(open(sys.argv[1]))[sys.argv[2]]
tr = json.load(open(sys.argv[3]))
norm = lambda w: re.sub(r'[^א-ת0-9a-z]', '', w.lower().replace('ך','כ').replace('ם','מ').replace('ן','נ').replace('ף','פ').replace('ץ','צ'))
S = []  # (token, seg index)
for i, s in enumerate(man):
    for w in s['text'].split():
        t = norm(w)
        if t: S.append((t, i))
T = []  # (token, start, end)
for seg in tr:
    for w in seg['words']:
        t = norm(w['w'])
        if t: T.append((t, w['s'], w['e']))
sm = difflib.SequenceMatcher(None, [a for a, _ in S], [a for a, *_ in T], autojunk=False)
first, last, hits, firstPos, lastPos = {}, {}, {}, {}, {}
segStart = {}
for pos, (_, i) in enumerate(S):
    segStart.setdefault(i, pos)
for a, b, n in sm.get_matching_blocks():
    for k in range(n):
        i = S[a + k][1]
        _, s0, e0 = T[b + k]
        if i not in first:
            first[i] = s0
            firstPos[i] = a + k - segStart[i]
        last[i] = e0
        lastPos[i] = a + k - segStart[i]
        hits[i] = hits.get(i, 0) + 1
out = []
for i, s in enumerate(man):
    tot = len([1 for _, j in S if j == i])
    # lead = מילים בתחילת הקטע שלא זוהו; trail = מילים בסופו שלא זוהו (להזזת נקודת החיתוך)
    out.append({'n': s.get('n', i + 1), 'start': first.get(i), 'end': last.get(i), 'cover': round(hits.get(i, 0) / max(1, tot), 2),
                'lead': firstPos.get(i, 0), 'trail': (tot - 1 - lastPos[i]) if i in lastPos else 0})
json.dump(out, open(sys.argv[4], 'w'))
for o in out:
    if o['start'] is not None: print(o)
