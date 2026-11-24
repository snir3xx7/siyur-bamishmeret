"""חיתוך הקלטה רציפה לקטעים לפי יישור (align.json) ועדכון media.voice בתרחישים.
   python3 scripts/voice-cut.py <recording.mp3> <male|female> <align.json>
"""
import json, os, subprocess, sys
ROOT = os.path.join(os.path.dirname(__file__), '..')
rec, gender, align = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3]))
man = json.load(open(os.path.join(ROOT, 'docs/voice/manifest.json')))[gender]
ok = [(m, a) for m, a in zip(man, align) if a['start'] is not None and a['cover'] >= 0.6]
done = {}
for k, (m, a) in enumerate(ok):
    prev_end = ok[k - 1][1]['end'] if k else 0
    nxt = ok[k + 1][1]['start'] if k + 1 < len(ok) else a['end'] + 0.6
    s = max(prev_end + 0.05, a['start'] - 0.15, (prev_end + a['start']) / 2 if k else 0)
    e = min(nxt - 0.05, a['end'] + 0.3)
    rel = f"audio/voice/{m['scenario']}/{m['key']}.mp3"
    out = os.path.join(ROOT, 'public', rel)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', rec, '-ss', f'{s:.2f}', '-to', f'{e:.2f}', '-af', 'afade=t=in:d=0.03,areverse,afade=t=in:d=0.08,areverse,loudnorm=I=-18:TP=-2',
                    '-ac', '1', '-ar', '44100', '-b:a', '64k', out], check=True)
    done.setdefault(m['scenario'], {})[m['key']] = rel
for sid, voices in done.items():
    p = os.path.join(ROOT, 'public/scenarios', f'{sid}.json')
    d = json.load(open(p))
    d['media']['voice'].update(voices)
    if len(d['media']['voice']) and 'narrationMissing' in d['media']:
        d['media']['narrationMissing'] = 'קריינות חלקית: חלק מהשורות מוקלטות (קול מסונתז מאתר הקראה), והשאר מוקראות בקול הדפדפן אם הופעל.'
    open(p, 'w').write(json.dumps(d, ensure_ascii=False, indent=1) + '\n')
    print(sid, len(voices), 'clips')
