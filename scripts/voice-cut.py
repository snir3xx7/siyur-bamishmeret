"""חיתוך הקלטה רציפה לקטעים לפי יישור (align.json) ועדכון media.voice בתרחישים.
   python3 scripts/voice-cut.py <recording.mp3> <male|female> <align.json>
"""
import json, os, subprocess, sys
import numpy as np
ROOT = os.path.join(os.path.dirname(__file__), '..')
rec, gender, align = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3]))
man = json.load(open(os.path.join(ROOT, 'docs/voice/manifest.json')))[gender]
ok = [(m, a) for m, a in zip(man, align) if a['start'] is not None and a['cover'] >= 0.6]
# מעטפת אנרגיה (חלונות של 10ms) – החיתוך בין קטעים נעשה בנקודה השקטה ביותר בין המילה האחרונה לראשונה של הבא
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', rec, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True).stdout
pcm = np.frombuffer(raw, dtype=np.float32)
HOP = 160
env = np.sqrt(np.convolve(pcm[: len(pcm) // HOP * HOP].reshape(-1, HOP).astype(np.float64).__pow__(2).mean(axis=1), np.ones(3) / 3, mode='same'))
def quietest(t0, t1):
    i0, i1 = max(0, int(t0 * 100)), min(len(env) - 1, int(t1 * 100))
    if i1 <= i0:
        return (t0 + t1) / 2
    return (i0 + int(np.argmin(env[i0:i1 + 1]))) / 100
WORD = 0.38  # משך ממוצע של מילה
def boundary(a, b):
    end = a['end'] + a.get('trail', 0) * WORD
    start = b['start'] - b.get('lead', 0) * WORD
    if start < end:  # מילים לא מזוהות משני הצדדים – מעריכים לפי האמצע
        end = start = (end + start) / 2
    return quietest(end - 0.2, start + 0.2)
cuts = [boundary(ok[k][1], ok[k + 1][1]) for k in range(len(ok) - 1)]
done = {}
for k, (m, a) in enumerate(ok):
    prev_end = ok[k - 1][1]['end'] if k else 0
    nxt = ok[k + 1][1]['start'] if k + 1 < len(ok) else a['end'] + 0.6
    s = cuts[k - 1] if k else max(0, a['start'] - a.get('lead', 0) * WORD - 0.25)
    e = cuts[k] if k < len(cuts) else a['end'] + a.get('trail', 0) * WORD + 0.5
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
