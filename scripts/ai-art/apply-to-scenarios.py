"""מחבר את האיורים לתרחישים: sprite/spriteMoods לכל דמות, painted, ורשימת media.images להורדה לא מקוונת."""
import json, os, sys
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
art = json.load(open(os.path.join(ROOT, 'scripts/ai-art/art.json')))
moods = {c['id']: c['moods'] for c in art['characters']}
outs = {b['out'] for b in art['backgrounds']}
index = json.load(open(os.path.join(ROOT, 'public/scenarios/index.json')))['scenarios']
for sid in [e['id'] for e in index]:
    p = os.path.join(ROOT, 'public/scenarios', f'{sid}.json')
    d = json.load(open(p))
    sc = d['scene']
    if sc['background'].split('/')[-1] not in outs:
        continue
    sc['painted'] = True
    imgs = [f"{sc['background']}-day.webp", f"{sc['background']}-night.webp"]
    for c in d['characters']:
        if c['id'] in moods:
            c['sprite'] = f"img/chars/{c['id']}"
            c['spriteMoods'] = moods[c['id']]
            imgs += [f"img/chars/{c['id']}-{m}.webp" for m in moods[c['id']]]
    for k in sorted({pr['kind'] for pr in sc.get('props', []) if pr['kind'] in ('car-red', 'car-silver', 'patrol', 'bag')}):
        imgs.append(f'img/props/{k}.webp')
    d['media']['images'] = imgs
    open(p, 'w').write(json.dumps(d, ensure_ascii=False, indent=1) + '\n')
    print(sid, len(imgs), 'images')
