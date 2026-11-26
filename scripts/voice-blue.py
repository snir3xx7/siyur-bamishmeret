"""קריינות מלאה ב־BlueTTS (מקומי, חינמי): קטע נפרד לכל שורה מדוברת בכל תרחיש.

  BLUETTS_DIR=~/ai-video-agent/BlueTTS uv run --project "$BLUETTS_DIR" python scripts/voice-blue.py [--force] [--only <scenario>] [--review]

- ליהוק: docs/voice/cast.json (קול, מהירות, גובה, אפקט קשר)
- תיקוני הגייה: docs/voice/lexicon.json (מילה → IPA), חל על התעתיק הפונטי לפני ההקראה
- פלט: public/audio/voice/<scenario>/l-<key>.mp3 ומפה media.voiceLines בתרחיש (key = FNV-1a של "דובר|טקסט")
- --review: כותב docs/voice/ipa-review.txt (טקסט + תעתיק לכל שורה) לבדיקת הגייה
"""
import json, os, re, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLUE = Path(os.environ.get('BLUETTS_DIR', Path.home() / 'ai-video-agent/BlueTTS')).expanduser()
sys.path.insert(0, str(BLUE))
args = sys.argv[1:]
FORCE = '--force' in args
REVIEW = '--review' in args
ONLY = args[args.index('--only') + 1] if '--only' in args else None
RADIO = '--radio' in args
# --refem: מקליט מחדש שורות של השוטרת שהנוסח הנקבי שלהן שונה מהזכרי
REFEM = '--refem' in args

cast = json.load(open(ROOT / 'docs/voice/cast.json'))
lex = {k: v for k, v in json.load(open(ROOT / 'docs/voice/lexicon.json')).items() if not k.startswith('_')}


def fnv1a(s: str) -> str:
    h = 0x811C9DC5
    for b in s.encode('utf-8'):
        h ^= b
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f'{h:08x}'


def line_key(speaker: str, text: str) -> str:
    return fnv1a(f'{speaker}|{text}')


HEB_DIGITS = ['אפס', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע']


_FEM = json.load(open(ROOT / 'src/config/feminize.json'))['words']
_FEM_RE = re.compile(r'(^|[.,!?–]\s+|ו?אני\s+(?:לא\s+|גם\s+|רק\s+)?)(' + '|'.join(map(re.escape, _FEM)) + r')(?=[\s.,!?–]|$)')


def feminize(text: str) -> str:
    """שוטרת: פעלים בגוף ראשון בלשון נקבה (זהה ל-src/config/feminize.ts)"""
    return _FEM_RE.sub(lambda m: m.group(1) + _FEM.get(m.group(2), m.group(2)), text)


_PREFIX_SPEECH = json.load(open(ROOT / 'src/config/prefix-speech.json'))


def speech_text(speaker: str, text: str) -> str:
    """הטקסט כפי שיוקרא: בלי אותות קריאה (משתנים לפי תחנה), בלי מירכאות, מספרים בקריאה נכונה"""
    if speaker in ('playerF', 'officerF'):
        text = feminize(text)
    for k, v in _PREFIX_SPEECH.items():
        text = text.replace(k, v)
    t = re.sub(r'^סייר \d+, כאן מוקד אלון\.\s*', '', text)
    t = re.sub(r'^מוקד:\s*', '', t)
    t = re.sub(r'^\([^)]*\)\s*', '', t)  # הוראות במה בסוגריים: „(מתקרבת בבהלה)”
    t = re.sub(r'\s*\([^)]*\)\s*', ' ', t)
    t = re.sub(r'\s*\[[^\]]*\]\s*', ' ... ', t)  # [רחש], [ההודעה נקטעה] – לא מוקרא
    t = re.sub(r'(?<![\u05d0-\u05ea])([ובלכמשה])־', r'\1', t)  # „ו־8” → „ו8” (תחילית צמודה)
    t = t.replace('„', '').replace('”', '').replace('"', '').replace('…', ',').replace('–', ',').replace('־', ' ')
    # מספר רכב: בקבוצות; מספר אירוע (4 ספרות): ספרה־ספרה כמו בקשר
    t = re.sub(r'(\d{2})-(\d{3})-(\d{2})', lambda m: f'{m.group(1)}, {m.group(2)}, {m.group(3)}', t)
    t = re.sub(r'(?<![\d:])(\d{4})(?![\d:])', lambda m: ' '.join(HEB_DIGITS[int(c)] for c in m.group(1)), t)
    return re.sub(r'\s+', ' ', t).strip()


def center_text(sc):
    return f"נפתח אירוע {sc['dispatch']['incident']} – {sc['title']}, {sc['location']['name']}. מעביר אליך לטיפול."


# מכשיר קשר דיגיטלי: פס צר, דגימה של 8kHz (כמו קודק דיגיטלי), עיוות קודק עדין ודחיסה
RADIO_FX = ('highpass=f=300,lowpass=f=3300,aresample=8000,acrusher=bits=10:mode=log:mix=0.3:aa=1,'
            'aresample=32000,acompressor=threshold=-22dB:ratio=6:attack=4:release=60,volume=1.6')
UNITS = ['402', '403', '404', '405', '301', '302']
CENTER_CALLS = ['מרכז', 'אביב', 'דרום', 'חוף', 'צפון', 'ירושלים']


def radio_sets(sc):
    """כל צירופי אותות הקריאה האפשריים: בדוי (מהתרחיש) + ניידות 402–405 ו־301–302 מול 401"""
    u = sc['dispatch']['unit']
    sets = [{'unitCall': u, 'headCall': 'מוקד אלון', 'toHead': f'מוקד אלון, כאן {u}', 'headToMe': f'{u}, כאן מוקד אלון', 'unitShort': u}]
    for n in UNITS:
        sets.append({'toHead': f'401 מ{n}', 'headToMe': f'{n} מ401', 'unitShort': n})
    return sets


def openings(sc):
    """פתיחת שידור בנוהל לכל נמען: „401 מ402”, „מרכז מ402”, „11 מ402” (ובבדוי – „מוקד אלון, כאן סייר 23”)"""
    u = sc['dispatch']['unit']
    out = [f'מוקד אלון, כאן {u}', f'קצין תורן, כאן {u}']
    for n in UNITS:
        out += [f'401 מ{n}', f'11 מ{n}'] + [f'{c} מ{n}' for c in CENTER_CALLS]
    return out


def officer(ls):
    out = []
    for x in ls or []:
        # שידור בקשר מתחיל בפתיחת נוהל („{{toCenter}}, …”); כל משתנה אחר בתחילת שורה – דיבור רגיל בזירה
        if x['speaker'] == 'player' and not x['text'].startswith('{{to'):
            out += [{**x, 'speaker': 'officer'}, {**x, 'speaker': 'officerF'}]
        else:
            out.append(x)
    return out


def all_lines(sc):
    L = []
    def add(ls):
        for x in ls or []:
            L.append(x)
            if x['speaker'] == 'player':
                L.append({**x, 'speaker': 'playerF'})
    add(sc['dispatch']['lines']); add(officer(sc['arrivalLines']))
    for f in sc['dispatch']['followUps']:
        add(f.get('lines')); [add(b['lines']) for b in f.get('branches', [])]
    for h in sc['hotspots']:
        for c in h['choices']:
            # שורות השחקן מוקלטות רק כשהן שידור בקשר (נוהל קשר)
            # שורות השחקן: שידור בקשר (נוהל קשר / „{{toCenter}}, …”) בקול הקשר; דיבור בזירה – בקול השוטר והשוטרת, בלי אפקט
            keep = (lambda ls: ls) if c['id'].startswith('rp-') else (lambda ls: officer(ls))
            add(keep(c.get('lines'))); [add(keep(b['lines'])) for b in c.get('branches', [])]
    for e in sc.get('events', []):
        add(officer(e['lines'])); [add(officer(b['lines'])) for b in e.get('branches', [])]
    for p in sc.get('pressure', []):
        add(officer(p['expire']['lines']))
    for r in sc['update']['responses']:
        add(r['lines'])
        # אותה תשובה כשהעדכון נשלח לראש המשמרת או לקצין התורן (קולות אחרים)
        add([{**l, 'speaker': 'head' if l['speaker'] == 'dispatch' else l['speaker']} for l in r['lines']])
        add([{**l, 'speaker': 'duty' if l['speaker'] == 'dispatch' else l['speaker']} for l in r['lines']])
    for sp in ('dispatch', 'head', 'duty'):
        add([{'speaker': sp, 'text': 'מוקד: קיבלתי, רשמתי.'}])
    # השידור של השחקן בעדכון: פתיחה בנוהל + כל רכיב עדכון
    add([{'speaker': 'player', 'text': e['text']} for e in sc['update']['elements'] if e['id'] != 'rp-open'])
    return L


def main():
    import numpy as np, soundfile as sf
    import heb_tts_normalizer as H
    from src.blue_onnx import load_text_to_speech, load_voice_style, limit_peak

    dump = subprocess.run(['npx', 'vite-node', 'scripts/dump-scenarios.ts'], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    scenarios = json.loads(dump)
    tts = load_text_to_speech(onnx_dir=str(BLUE / 'bluev3_onnx/onnx'))
    styles = {}
    review = []
    index = {}

    def style(v):
        if v not in styles:
            styles[v] = load_voice_style([str(BLUE / f'bluev3_onnx/voices/{v}.json')])
        return styles[v]

    def to_ipa(text):
        norm = H.normalize(text)
        ipa = tts.g2p.phonemize(norm, 'he')
        inner = re.sub(r'^<he>|</he>$', '', ipa)
        words = [w for w in norm.split() if re.sub(r'[^א-ת]', '', w)]
        toks = inner.split()
        if lex and len(words) == len(toks):
            for i, w in enumerate(words):
                bare = re.sub(r'[^א-ת]', '', w)
                if bare in lex:
                    tail = re.search(r'[.,!?;:]*$', toks[i]).group(0)
                    toks[i] = lex[bare] + tail
            inner = ' '.join(toks)
        return norm, f'<he>{inner}</he>'

    def render(ipa, cfg, out):
        a, _ = tts(ipa, lang='he', style=style(cfg['voice']), total_step=8, cfg_scale=4.0, speed=cfg.get('speed', 1.0), text_is_phonemes=True)
        a = limit_peak(a[0] if a.ndim == 2 else a)
        with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
            sf.write(tmp.name, a, tts.sample_rate)
            af = []
            if cfg.get('pitch'):
                r = 2 ** (cfg['pitch'] / 12)
                af.append(f'asetrate={int(tts.sample_rate * r)},aresample={tts.sample_rate},atempo={1 / r:.4f}')
            if cfg.get('radio'):
                af.append(RADIO_FX)
            if cfg.get('device'):
                af.append('highpass=f=420,lowpass=f=4200,acompressor=threshold=-20dB:ratio=4,volume=1.3')
            af.append('silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse')
            af.append('loudnorm=I=-18:TP=-2')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp.name, '-af', ','.join(af), '-ac', '1', '-ar', '32000', '-b:a', '40k', str(out)], check=True)

    # פתיחות שידור לפי תחנה (משותף לכל התרחישים): public/audio/radio/<תחנה>/a-<key>.mp3 + index.json
    if RADIO:
        districts = json.loads(subprocess.run(['npx', 'vite-node', 'scripts/dump-stations.ts'], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
        jobs = []
        for d in districts:
            for st in d['stations']:
                pre = st['prefix']
                for u in [f'{pre} {n}' for n in st['patrols'] + st['municipal']] + [f"{c['prefix']} {n}" for c in st.get('cityUnits', []) for n in c['nums']]:
                    for dest in (st['shiftHead'], st['dutyOfficer'], d['centerCall']):
                        jobs.append((st['id'], 'player', f'{dest} מ{u}'))
                        jobs.append((st['id'], 'playerF', f'{dest} מ{u}'))
                    jobs.append((st['id'], 'dispatch', f'{u} מ{d["centerCall"]}'))
                    jobs.append((st['id'], 'dispatch', u))
                # ראש המשמרת מבקש מהמשל״ט: „מרכז מסבא 401” + „תעבירי את האירוע ל־402.”
                jobs.append((st['id'], 'head', f'{d["centerCall"]} מ{pre} {st["shiftHead"]}'))
        for n in UNITS:
            jobs.append(('common', 'head', f'תעבירי את האירוע ל{n}.'))
        # מצלמת גוף: הכרזות המכשיר והודעת השוטר על סיום הצילום
        jobs += [('common', 'bodycam', 'מצלמה מקליטה'), ('common', 'bodycam', 'סיום הקלטה'),
                 ('common', 'officer', 'אני מסיים את הצילום.'), ('common', 'officerF', 'אני מסיימת את הצילום.')]
        # תעבורת קשר ברקע (ניידות אחרות, המשל״ט, 401, 11): פתיחות לפי תחנה + גופי הודעות משותפים
        chatter = json.loads(subprocess.run(['npx', 'vite-node', 'scripts/dump-chatter.ts'], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
        for x in chatter:
            jobs.append(('common', x['who'], x['body']))
        for d in districts:
            ctr = d['centerCall']
            for st in d['stations']:
                pre, h = st['prefix'], st['shiftHead']
                for u in [f'{pre} {n}' for n in st['patrols'] + st['municipal']] + [f"{c['prefix']} {n}" for c in st.get('cityUnits', []) for n in c['nums']]:
                    for who in ('unitB', 'unitC'):
                        jobs.append((st['id'], who, f'{ctr} מ{u}'))
                    jobs.append((st['id'], 'unitB', f'{h} מ{u}'))
                    jobs.append((st['id'], 'head', f'{u} מ{h}'))
                    jobs.append((st['id'], 'duty', f'{u} מ{st["dutyOfficer"]}'))
                jobs.append((st['id'], 'dispatch', f'לכל הניידות מ{ctr}'))
                jobs.append((st['id'], 'duty', f'{h} מ{pre} {st["dutyOfficer"]}'))
        for sc in scenarios:
            u = sc['dispatch']['unit']
            jobs += [('fictional', 'duty', f'{u} מקצין תורן'), ('fictional', 'head', f'{u} ממוקד אלון')]
        for u in ('סייר 12', 'סייר 31', 'סייר 40'):
            jobs.append(('fictional', 'dispatch', u))
            jobs += [('fictional', 'unitB', f'מוקד אלון מ{u}'), ('fictional', 'unitC', f'מוקד אלון מ{u}'),
                     ('fictional', 'dispatch', f'{u} ממוקד אלון'), ('fictional', 'head', f'{u} ממוקד אלון')]
        jobs += [('fictional', 'dispatch', 'לכל הניידות ממוקד אלון'), ('fictional', 'duty', 'מוקד אלון מקצין תורן')]
        for sc in scenarios:  # בדוי: „מוקד אלון מסייר 23”
            u = sc['dispatch']['unit']
            jobs += [('fictional', 'playerF', f'מוקד אלון מ{u}'), ('fictional', 'playerF', f'קצין תורן מ{u}')]
            jobs += [('fictional', 'player', f'מוקד אלון מ{u}'), ('fictional', 'player', f'קצין תורן מ{u}'),
                     ('fictional', 'dispatch', f'{u} ממוקד אלון'), ('fictional', 'dispatch', u)]
        ridx, made = {}, 0
        for sid, sp, text in jobs:
            key = line_key(sp, text)
            if key in ridx:
                continue
            rel = f'audio/radio/{sid}/a-{key}.mp3'
            ridx[key] = rel
            out = ROOT / 'public' / rel
            out.parent.mkdir(parents=True, exist_ok=True)
            if out.exists() and not FORCE:
                continue
            render(to_ipa(speech_text(sp, text))[1], cast['special'][sp], out)
            made += 1
        json.dump(ridx, open(ROOT / 'public/audio/radio/index.json', 'w'), ensure_ascii=False, separators=(',', ':'))
        print('radio openings', len(ridx), 'made', made, flush=True)
        return

    for sc in scenarios:
        sid = sc['id']
        if ONLY and sid != ONLY:
            continue
        chars = {c['id']: c for c in sc['characters']}
        outdir = ROOT / 'public/audio/voice' / sid
        outdir.mkdir(parents=True, exist_ok=True)
        mapping, made = {}, 0
        for l in all_lines(sc):
            sp = l['speaker']
            mb = re.match(r'^(?:מוקד:\s*)?\{\{backup\}\}\s+', l['text'])
            if mb:
                # „סבא 404 בדרך אליכם” – אות הקריאה של התגבור מוקלטת לפי תחנה; כאן רק ההמשך
                l = {**l, 'text': l['text'][mb.end():]}
            m0 = re.match(r'^\{\{(toCenter|centerToMe|toHead|headToMe|dutyToMe|unitShort)\}\},\s*', l['text'])
            if m0:
                # פתיחה בנוהל („401 מסבא 402,”) מוקלטת בנפרד לכל תחנה – כאן רק גוף ההודעה
                l = {**l, 'text': l['text'][m0.end():]}
            combos = [v['vars'] for v in sc['variants']]
            for vv in combos:
                text = re.sub(r'\{\{(\w+)\}\}', lambda m: vv.get(m.group(1), m.group(0)), l['text'])
                if '{{' in text:
                    continue  # אותות קריאה לפי תחנה – נשאר בקול הדפדפן
                key = line_key(sp, text)
                if key in mapping:
                    continue
                say = speech_text(sp, text)
                if not re.search(r'[א-ת]', say):
                    continue
                cfg = cast['special'].get(sp) or cast['characters'].get(sp) or {'voice': cast['default'][chars.get(sp, {}).get('gender', 'm')]}
                rel = f'audio/voice/{sid}/l-{key}.mp3'
                mapping[key] = rel
                norm, ipa = to_ipa(say)
                index[rel] = {'speaker': sp, 'say': say, 'ipa': ipa}
                if REVIEW:
                    review.append(f'[{sid}] {sp}: {say}\n    {ipa}')
                out = ROOT / 'public' / rel
                if out.exists() and not FORCE and not (REFEM and sp in ('playerF', 'officerF') and feminize(text) != text):
                    continue
                render(ipa, cfg, out)
                made += 1
        # עדכון המפה בתרחיש (רק שורות שקיימות עכשיו; קבצים ישנים שלא בשימוש נמחקים)
        p = ROOT / 'public/scenarios' / f'{sid}.json'
        d = json.load(open(p))
        d['media']['voiceLines'] = mapping
        d['media']['narrationMissing'] = 'קריינות: קולות מסונתזים מקומית ב־BlueTTS (קוד MIT; קולות מ־LibriTTS-R, CC BY 4.0). שורות עם אות קריאה של התחנה מוקראות בקול הדפדפן אם הופעל.'
        open(p, 'w').write(json.dumps(d, ensure_ascii=False, indent=1) + '\n')
        used = {Path(v).name for v in mapping.values()}
        for f in outdir.glob('l-*.mp3'):
            if f.name not in used:
                f.unlink()
        print(sid, len(mapping), 'lines,', made, 'generated', flush=True)
    if not ONLY:
        json.dump(index, open(ROOT / 'docs/voice/lines.json', 'w'), ensure_ascii=False, indent=0)
    if REVIEW:
        (ROOT / 'docs/voice/ipa-review.txt').write_text('\n'.join(review) + '\n')


if __name__ == '__main__':
    main()
