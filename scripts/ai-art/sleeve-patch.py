"""מדביק את סמל משטרת ישראל הרשמי (באישור) על השרוול בתמונות השוטר והשוטרת.
מקור: public/img/brand/police-patch.webp. התמונות בלי הסמל נשמרות פעם אחת ב-art-src/ (כדי שהרצה חוזרת לא תדביק פעמיים).
הרצה: python3 scripts/ai-art/sleeve-patch.py
"""
import os, shutil
from PIL import Image, ImageEnhance, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
PATCH = Image.open(os.path.join(ROOT, 'public/img/brand/police-patch.webp')).convert('RGBA')
# מרכז, רוחב, סיבוב (מעלות), בהירות – לפי מקום הפאץ' המעוצב שהיה בתמונה
SPOTS = {
    'm': dict(cx=228, cy=492, w=138, rot=1, light=0.82),
    'f': dict(cx=402, cy=476, w=104, rot=-4, light=0.78),
}

for k, s in SPOTS.items():
    out = os.path.join(ROOT, f'public/img/officer-{k}.webp')
    base = os.path.join(ROOT, f'art-src/officer-{k}-nopatch.webp')
    if not os.path.exists(base):
        shutil.copy(out, base)
    im = Image.open(base).convert('RGBA')
    p = PATCH.copy()
    h = round(s['w'] * p.height / p.width)
    p = p.resize((s['w'], h), Image.LANCZOS)
    p = ImageEnhance.Brightness(p).enhance(s['light'])
    p = p.rotate(s['rot'], resample=Image.BICUBIC, expand=True)
    # צל רך מתחת לפאץ' – נראה תפור על הבד
    shadow = Image.new('RGBA', p.size, (0, 0, 0, 0))
    shadow.putalpha(p.getchannel('A').point(lambda a: int(a * 0.55)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(3))
    x, y = s['cx'] - p.width // 2, s['cy'] - p.height // 2
    im.alpha_composite(shadow, (x + 2, y + 3))
    im.alpha_composite(p, (x, y))
    im.convert('RGB').save(out, 'WEBP', quality=90)
    print(k, (x, y, p.width, p.height))
