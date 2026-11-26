"""בונה את התרחיש „רכב שנמלט – החלטות במרדף” (public/scenarios/pursuit.json).
החלטות בלבד – בלי נהיגה, בלי נשק ובלי מגע. עקרונות פומביים: דיווח רציף, הנחיית מפקד, הערכת סיכון לציבור,
הפסקת מרדף כשהסיכון גובר, העברה לאיתור, וטיפול בקטין בסיום. הרצה: python3 scripts/scenarios/build-pursuit.py
"""
import json, os

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
P = os.path.join(ROOT, 'public/scenarios/pursuit.json')
old = json.load(open(P)) if os.path.exists(P) else {}

L = lambda sp, t: {'speaker': sp, 'text': t}
me = lambda t: L('player', t)
nar = lambda t: L('narrator', t)
zi = lambda t: L('ziv', t)
flag = lambda f: {'flag': f}
NOT = lambda c: {'not': c}
ALL = lambda *c: {'all': list(c)}
ANY = lambda *c: {'any': list(c)}
ch = lambda i: {'chosen': i}
var = lambda *v: {'variant': list(v)}
look = {'skin': '#d6a57c', 'hair': '#3a2a20', 'hairStyle': 'short', 'top': '#555', 'bottom': '#333'}
LIVE = ALL(flag('chasing'), NOT(flag('stopped')), NOT(flag('found')))
PHASE1 = ['p-lights', 'p-report', 'p-head', 'p-distance', 'p-speed', 'p-block']


def rule(id, domain, label, mx, when, explain, keep, fexplain, improve, required=True, applies=None, partial=None):
    tiers = [{'when': when, 'points': mx, 'explain': explain, 'keep': keep}]
    if partial:
        tiers.append(partial)
    r = {'id': id, 'domain': domain, 'label': label, 'max': mx, 'required': required, 'tiers': tiers,
         'fallback': {'explain': fexplain, 'improve': improve}}
    if applies:
        r['appliesWhen'] = applies
    return r


sc = {
    'id': 'pursuit',
    'version': old.get('version', 1),
    'title': 'רכב שנמלט – החלטות במרדף',
    'category': 'תנועה ובטיחות בדרך',
    'summary': 'רכב לבן לא עוצר לסימון ומאיץ. אין כאן נהיגה – רק החלטות: אורות וסירנה, דיווח רציף, הנחיה מ־401, מרחק בטוח, ומתי מפסיקים כי הסיכון לציבור גדול מהתועלת. בסוף – נהג צעיר, וטיפול בקטין.',
    'estimatedMinutes': 10,
    'difficultyLabel': 'מתקדמת',
    'skills': ['דיווח רציף בקשר', 'הנחיית מפקד', 'הערכת סיכון לציבור', 'הפסקת מרדף והעברה לאיתור', 'טיפול בנהג קטין'],
    'shifts': ['evening', 'night'],
    'defaultShift': 'night',
    'location': {'name': 'רחוב הרצל, ליד בית הספר „אופק”', 'area': 'מרכז קריית אלון (בדוי)'},
    'objectives': [
        'להפעיל אורות וסירנה ולדווח מיד: רכב, מספר, כיוון',
        'לקבל הנחיה מ־401 ולעדכן בכל פנייה',
        'לשמור מרחק – בלי לחסום ובלי „להדביק בכל מחיר”',
        'להפסיק כשהסיכון לציבור גדל, ולהעביר את האיתור',
        'בסיום: לגשת ברוגע, לעכב בהסבר ולערב הורה',
    ],
    'variants': [
        {'id': 'father', 'label': 'הרכב של האבא – נהג בלי רישיון', 'set': {'stolen': False},
         'vars': {'car_record': 'הרכב רשום על שם אלי כהן, מרחוב הזית 3. אין דיווח על גניבה.',
                  'ziv_why': 'לקחתי את האוטו של אבא שלי. אין לי רישיון… נבהלתי כשראיתי אתכם',
                  'ziv_offence': 'נהיגה בלי רישיון ואי ציות להוראת שוטר'}},
        {'id': 'stolen', 'label': 'הרכב דווח כגנוב לפני שעתיים', 'set': {'stolen': True},
         'vars': {'car_record': 'הרכב דווח כגנוב לפני שעתיים, מחניון ברחוב הגפן.',
                  'ziv_why': 'חבר נתן לי את האוטו, אמר שזה של דוד שלו. כשראיתי אתכם הבנתי שמשהו לא בסדר ונבהלתי',
                  'ziv_offence': 'שימוש ברכב בלי רשות, נהיגה בלי רישיון ואי ציות להוראת שוטר'}},
    ],
}

sc['scoring'] = {
    'weights': {'info': 20, 'assessment': 25, 'communication': 10, 'authority': 25, 'dispatch': 10, 'documentation': 10},
    'rules': [
        rule('pu-info-report', 'info', 'דיווח ראשוני', 10, ch('p-report'),
             'נמסר דיווח עם פרטי הרכב והכיוון.', 'דיווחת מיד: סוג רכב, מספר, כיוון ומספר נוסעים. כך כל הכוחות יודעים מה מחפשים.',
             'לא נמסר דיווח.', 'לא דיווחת על המרדף. בסבב הבא: מיד בקשר – רכב, מספר, כיוון.'),
        rule('pu-info-updates', 'info', 'עדכונים רציפים', 10, ch('p-distance'),
             'הכיוון עודכן לאורך הדרך.', 'עדכנת בכל פנייה. אם תצטרך להפסיק – כבר יודעים איפה הוא.',
             'לא היו עדכוני כיוון.', 'אחרי הדיווח הראשון לא עדכנת. בסבב הבא: כל פנייה – בקשר.'),
        rule('pu-assess-stop', 'assessment', 'הפסקת המרדף כשהסיכון גדל', 15, ALL(ch('p-stop'), NOT(ch('p-continue'))),
             'המרדף הופסק לפני שהסכנה התממשה.', 'ליד בית הספר, עם אנשים על המדרכה ורמזור אדום – הפסקת. אף נהג נמלט לא שווה סיכון לילד במעבר חצייה.',
             'המרדף לא הופסק.', 'המשכת לרדוף גם ליד בית הספר באדום. בסבב הבא: כשהסיכון לציבור גובר – מפסיקים ומעבירים.',
             partial={'when': ch('p-stop'), 'points': 5, 'explain': 'המרדף הופסק – אחרי שכמעט קרה אסון.', 'improve': 'הפסקת רק אחרי מעבר באדום ליד ילדים. בסבב הבא – לפני.'}),
        rule('pu-assess-safe', 'assessment', 'בלי חסימה ובלי „בכל מחיר”', 10, ALL(NOT(ch('p-speed')), NOT(ch('p-block'))),
             'נשמר מרחק בטוח.', 'לא ניסית לחסום ולא האצת בפראות. המטרה היא שכולם יגיעו הביתה, גם הנהג.',
             'הייתה נהיגה מסוכנת.', 'האצה „בכל מחיר” או ניסיון לחסום רכב בתנועה מסכנים את כולם. בסבב הבא – מרחק ודיווח.'),
        rule('pu-comm-ziv', 'communication', 'גישה רגועה לנהג', 10, ALL(ch('z-approach'), NOT(ch('z-yell'))),
             'הגישה לנהג הייתה רגועה.', 'אחרי מרדף הדם רותח. ניגשת ברוגע, בדקת שהוא לא פצוע והסברת מה קורה.',
             'הגישה לא הייתה רגועה.', 'צעקות אחרי מרדף מסלימות. בסבב הבא: נשימה, הצגה עצמית, ובדיקה שאיש לא נפגע.'),
        rule('pu-auth-lights', 'authority', 'אורות וסירנה', 5, ch('p-lights'),
             'הופעלו אורות וסירנה.', 'הפעלת אורות וסירנה – כך הנהג וכל מי שבדרך יודעים שזו ניידת.',
             'לא הופעלו אורות וסירנה.', 'נסיעה אחרי רכב בלי אורות וסירנה – מסוכנת ולא מזוהה. בסבב הבא – קודם כול.'),
        rule('pu-auth-head', 'authority', 'הנחיה מ־401', 8, ch('p-head'),
             'התקבלה הנחיה מראש המשמרת.', 'עדכנת את 401 וקיבלת הנחיה. במרדף – ההחלטה אם להמשיך היא של המפקד, לא רק של הצוות.',
             'לא התקבלה הנחיה.', 'המשכת בלי לעדכן את 401. בסבב הבא בקש הנחיה מיד.'),
        rule('pu-auth-detain', 'authority', 'עיכוב בהסבר', 6, flag('detainedProper'),
             'הנהג עוכב בהסבר.', 'אמרת לזיו במה הוא חשוד ולמה הוא מעוכב.',
             'הנהג לא עוכב.', 'נהג שנמלט משוטר – מעכבים ומסבירים. בסבב הבא אל תשאיר את זה פתוח.', applies=flag('found')),
        rule('pu-auth-parent', 'authority', 'קטין – יידוע הורה', 6, ch('z-parent'),
             'הורה עודכן.', 'זיו בן 17. התקשרת להורה עוד בזירה.',
             'הורה לא עודכן.', 'זיו קטין ואף הורה לא עודכן. בסבב הבא – מיד כשמתברר הגיל.', applies=flag('minor')),
        rule('pu-disp-hand', 'dispatch', 'העברה לאיתור', 10, ch('p-handover'),
             'האיתור הועבר למשל״ט.', 'ביקשת שהמשל״ט יפעיל מצלמות וניידות באזור – כך הרכב נמצא בלי לרדוף אחריו.',
             'האיתור לא הועבר.', 'הפסקת בלי לבקש איתור. בסבב הבא: המשל״ט ממשיך במקומך – מצלמות וניידות.'),
        rule('pu-doc', 'documentation', 'תיעוד', 10, ch('z-doc'),
             'האירוע תועד.', 'תיעדת: שעה, מסלול, מהירות, למה הפסקת, ואיך נמצא הנהג.',
             'האירוע לא תועד.', 'מרדף מתועד תמיד – כולל ההחלטה להפסיק. בסבב הבא רשום.'),
    ],
}

sc['facts'] = [
    {'id': 'd-report', 'kind': 'dispatch', 'text': 'בדיקה שגרתית: רכב לבן ברחוב הרצל לא עצר לסימון והאיץ'},
    {'id': 'd-plate', 'kind': 'dispatch', 'text': 'מאזדה לבנה, מספר 54-321-87, נהג יחיד'},
    {'id': 'd-car', 'kind': 'dispatch', 'text': '{{car_record}}'},
    {'id': 'o-school', 'kind': 'observation', 'text': 'הרכב נכנס לרחוב בית הספר ועבר באדום; הורים וילדים על המדרכה'},
    {'id': 'o-found', 'kind': 'observation', 'text': 'הרכב נמצא עצור ברחוב צדדי; הנהג יושב על המדרכה, לא פצוע'},
    {'id': 'o-ziv-age', 'kind': 'observation', 'text': 'הנהג: זיו כהן, בן 17 – קטין, בלי רישיון'},
    {'id': 'c-ziv', 'kind': 'claim', 'text': '{{ziv_why}}', 'source': 'ziv'},
]

sc['characters'] = [
    {'id': 'ziv', 'name': 'זיו כהן', 'role': 'נהג הרכב שנמלט', 'gender': 'm', 'look': look, 'attitude': 0,
     'x': 62, 'y': 95, 'scale': 1.25, 'when': flag('found'),
     'moodRules': [{'when': flag('zivShaken'), 'mood': 'upset'}, {'when': NOT(flag('zivCalm')), 'mood': 'tense'}],
     'sprite': 'img/chars/ziv', 'spriteMoods': ['calm', 'tense', 'upset']},
]

sc['dispatch'] = {
    'time': {'evening': '20:50', 'night': '22:35'},
    'unit': 'סייר 32',
    'incident': '7215',
    'lines': [L('dispatch', 'סייר 32, כאן מוקד אלון. מבקשת שתבצעו בדיקה לרכב לבן שעומד עם מנוע דולק בחניון ליד רחוב הרצל, דיווח של שכן. אשר קבלה.')],
    'initialFacts': [],
    'basicExtraFacts': [],
    'followUps': [
        {'id': 'f-units', 'label': 'לשאול: יש עוד ניידות פעילות באזור?',
         'lines': [me('מוקד, יש עוד ניידות פעילות באזור הרצל?'), L('dispatch', 'ניידת אחת באזור התחנה המרכזית, כחמש דקות ממך.')],
         'effects': {'set': {'knowUnits': True}}, 'report': 'בירור כוחות באזור'},
    ],
    'goLabel': 'אישור קבלה ויציאה לרחוב הרצל',
}
sc['transition'] = {'kind': 'car', 'text': 'ברחוב הרצל אתם מאתרים את הרכב הלבן. כשאתם מסמנים לו לעצור – הוא מאיץ ופונה ימינה.', 'travelMinutes': 3,
                    'ambience': ['engine-wipers', 'radio-chatter']}
sc['scene'] = {
    'background': 'img/school-street',
    'alt': 'רחוב עירוני בלילה: בית ספר עם גדר ושער מימין, מעבר חצייה עם רמזור, בניינים מוארים, ורמזור אדום בקצה הרחוב.',
    'fallbackColor': '#1b2130', 'ambience': ['traffic', 'siren'], 'lights': 'steady', 'weather': 'none',
    'ambienceRules': [{'when': ANY(flag('stopped'), flag('found')), 'ambience': ['traffic']}],
    'bgByShift': {'evening': 'night', 'night': 'night'},
    'props': [
        {'id': 'patrol', 'kind': 'patrol', 'x': 10, 'y': 99, 'scale': 0.8},
        {'id': 'car', 'kind': 'car-silver', 'x': 82, 'y': 99, 'scale': 0.8, 'when': flag('found')},
        {'id': 'sg-school', 'kind': 'sign', 'x': 78, 'y': 36, 'text': 'בית ספר אופק', 'sign': 'plate', 'scale': 0.8},
    ],
    'painted': True,
}
sc['arrivalLines'] = [
    nar('הרכב הלבן מאיץ ברחוב הרצל. אתם מאחוריו, כמאה מטר. הרחוב מוביל לבית הספר „אופק”, ובקצהו רמזור.'),
]
sc['arrivalFacts'] = ['d-report']

road = [
    {'id': 'p-lights', 'label': 'להפעיל אורות וסירנה', 'when': NOT(flag('stopped')),
     'lines': [nar('האורות הכחולים והסירנה פועלים. מכוניות לפניכם זזות לצד.')],
     'effects': {'set': {'lights': True, 'chasing': True}}, 'report': 'הפעלת אורות וסירנה'},
    {'id': 'p-report', 'label': 'לדווח מיד למשל״ט: רכב, מספר, כיוון, נהג יחיד',
     'lines': [me('{{toCenter}}, רכב לא עצר לסימון ונמלט. מאזדה לבנה, 54-321-87, נהג יחיד, נוסע צפונה ברחוב הרצל לכיוון בית הספר אופק. אני בעקבותיו.'),
               L('dispatch', '{{centerToMe}}, קיבלתי. בודקת את הרכב. תעדכן בכל פנייה.'),
               L('dispatch', '{{car_record}}')],
     'effects': {'set': {'reported': True, 'chasing': True}, 'reveal': ['d-plate', 'd-car']}, 'report': 'דיווח ראשוני על מרדף'},
    {'id': 'p-head', 'label': 'לעדכן את 401 ולבקש הנחיה: להמשיך או לא',
     'lines': [me('{{toHead}}, אני במרדף אחרי רכב שנמלט מסימון, ברחוב הרצל לכיוון בית הספר. מבקש הנחיה.'),
               L('head', '{{headToMe}}, ממשיך במעקב בזהירות, בלי סיכונים. אם הוא נכנס לאזור עם אנשים – מפסיק ומעביר למשל״ט.')],
     'effects': {'set': {'guided': True, 'chasing': True}}, 'report': 'קבלת הנחיה מראש המשמרת'},
    {'id': 'p-distance', 'label': 'לשמור מרחק בטוח ולעדכן בקשר בכל פנייה', 'when': ALL(flag('chasing'), NOT(flag('stopped'))),
     'lines': [me('{{toCenter}}, הוא פנה שמאלה לרחוב הגפן, עדיין צפונה, מהירות גבוהה.'), L('dispatch', '{{centerToMe}}, קיבלתי, הגפן צפונה.')],
     'effects': {'set': {'updating': True}}, 'report': 'עדכוני כיוון לאורך הדרך'},
    {'id': 'p-speed', 'label': 'להאיץ ולהדביק אותו בכל מחיר', 'when': LIVE,
     'lines': [nar('המחוג עולה. בצומת האחרון כמעט פגעתם ברכב שיצא מחניה. הנהג שלפניכם מאיץ עוד יותר.')],
     'effects': {'set': {'reckless': True}, 'note': 'האצה מסוכנת – הנהג הנמלט האיץ עוד יותר'}},
    {'id': 'p-block', 'label': 'לעקוף אותו ולחסום אותו עם הניידת', 'when': LIVE,
     'lines': [nar('הניידת מתחילה לעקוף. הרכב הלבן סוטה בחדות, עולה על המדרכה ונוחת בחזרה לכביש. רק במזל איש לא עמד שם.')],
     'effects': {'set': {'reckless': True}, 'note': 'ניסיון לחסום רכב בתנועה – כמעט פגיעה בעוברי אורח'}},
    {'id': 'p-stop', 'label': 'להפסיק את המרדף: לכבות סירנה, להאט, ולמסור את הכיוון האחרון', 'when': ALL(flag('ev:school'), NOT(flag('stopped'))),
     'lines': [me('{{toCenter}}, אני מפסיק את המרדף – הוא עבר באדום ליד בית הספר ויש אנשים על המדרכה. כיוון אחרון: צפונה ברחוב הגפן.'),
               L('dispatch', '{{centerToMe}}, קיבלתי. מפסיק.'), nar('הסירנה כבויה. הרכב הלבן נעלם בקצה הרחוב.')],
     'effects': {'set': {'stopped': True}}, 'report': 'הפסקת המרדף בגלל סיכון לציבור'},
    {'id': 'p-continue', 'label': 'להמשיך אחריו גם באדום – הוא עוד רגע נתפס', 'when': ALL(flag('ev:school'), NOT(flag('stopped'))),
     'lines': [nar('אתם חוצים באדום. אם עם עגלה כבר עלתה על מעבר החצייה ונעצרת ברגע האחרון. הרכב הלבן עדיין לפניכם.')],
     'effects': {'set': {'nearMiss': True, 'reckless': True}, 'note': 'מעבר באדום ליד בית ספר – כמעט פגיעה באם עם עגלה'}},
    {'id': 'p-handover', 'label': 'לבקש מהמשל״ט להפעיל מצלמות וניידות באזור כדי לאתר את הרכב', 'when': flag('stopped'),
     'lines': [me('{{toCenter}}, מבקש שתפעילי מצלמות ותכווני ניידות לאזור הגפן לאיתור הרכב.'),
               L('dispatch', '{{centerToMe}}, קיבלתי, מכוונת. … הרכב נראה במצלמה עוצר ברחוב השקד, הנהג יצא ממנו.')],
     'effects': {'set': {'handed': True}}, 'report': 'העברת האיתור למשל״ט'},
    {'id': 'p-go', 'label': 'לנסוע בזהירות לרחוב השקד, למקום שבו נעצר הרכב', 'when': ANY(flag('handed'), ALL(flag('nearMiss'), NOT(flag('stopped')))),
     'lines': [nar('רחוב השקד. המאזדה הלבנה עומדת באלכסון, דלת הנהג פתוחה. על המדרכה יושב נער ומחזיק את הראש בידיים.')],
     'effects': {'set': {'found': True}, 'reveal': ['o-found']}, 'report': 'הגעה למקום שבו נעצר הרכב'},
]

ziv = [
    {'id': 'z-approach', 'label': 'לגשת ברוגע, להציג את עצמך ולבדוק שהוא לא פצוע',
     'lines': [me('אני מצוות הסיור. אתה בסדר? נפגעת?'), zi('(רועד) לא… אני בסדר. סליחה. אני לא יודע למה ברחתי.')],
     'effects': {'set': {'zivCalm': True}, 'attitude': {'ziv': 1}}, 'report': 'גישה רגועה ובדיקת שלום הנהג'},
    {'id': 'z-yell', 'label': 'לצעוק עליו: „אתה יודע שכמעט הרגת מישהו?!”',
     'lines': [me('אתה יודע שכמעט הרגת מישהו?!'), zi('(מתחיל לבכות) …')],
     'effects': {'set': {'zivShaken': True}, 'attitude': {'ziv': -2}, 'note': 'צעקות על הנהג אחרי המרדף'}},
    {'id': 'z-id', 'label': 'לבקש ממנו להזדהות ולשמוע למה ברח',
     'lines': [me('אני צריך לזהות אותך. מה השם שלך, בן כמה אתה, ולמה לא עצרת?'), zi('זיו כהן, בן 17. {{ziv_why}}.')],
     'effects': {'set': {'identified': True, 'minor': True}, 'reveal': ['o-ziv-age', 'c-ziv']}, 'report': 'זיהוי הנהג ושמיעת גרסתו'},
    {'id': 'z-detain', 'label': 'להודיע לזיו שהוא מעוכב, במה הוא חשוד, ומה יקרה עכשיו', 'when': ALL(flag('identified'), NOT(flag('detained'))),
     'lines': [me('זיו, אתה חשוד ב{{ziv_offence}}. אתה מעוכב, ותועבר לתחנה. נתקשר להורים שלך, והם יוכלו להיות איתך.'), zi('…אוקיי.')],
     'effects': {'set': {'detained': True, 'detainedProper': True}}, 'report': 'עיכוב הנהג בהסבר'},
    {'id': 'z-parent', 'label': 'להתקשר להורה של זיו', 'when': flag('minor'),
     'lines': [me('זיו, אני מתקשר לאחד ההורים שלך. מה המספר?'), nar('אבא של זיו עונה. הוא בשקט לרגע, ואז אומר שהוא יוצא מיד לתחנה.')],
     'effects': {'set': {'parent': True}}, 'report': 'יידוע הורה של קטין'},
]

sc['hotspots'] = [
    {'id': 'h-road', 'label': 'הכביש לפנים', 'kind': 'area', 'x': 50, 'y': 70, 'when': NOT(flag('found')),
     'description': 'הרכב הלבן כמאה מטר לפניכם.', 'choices': road},
    {'id': 'h-ziv', 'label': 'זיו – הנהג', 'kind': 'character', 'character': 'ziv', 'x': 62, 'y': 48, 'when': flag('found'),
     'description': 'נער יושב על המדרכה ליד הרכב הלבן.', 'choices': ziv},
    {'id': 'h-doc', 'label': 'פנקס ותיעוד', 'kind': 'item', 'x': 90, 'y': 20, 'description': 'תיעוד האירוע.', 'when': flag('found'),
     'choices': [{'id': 'z-doc', 'label': 'לתעד: שעה, מסלול, מהירות, למה הופסק המרדף, ואיך נמצא הנהג',
                  'lines': [nar('רשמת: שעת הסימון, המסלול, המהירות, ההנחיה מ־401, הרגע שבו הופסק המרדף ולמה, ואיך אותר הרכב.')],
                  'effects': {'set': {'documented': True}}, 'report': 'תיעוד המרדף'}]},
]

sc['custody'] = [{'char': 'ziv', 'hotspot': 'h-ziv', 'offence': 'נהיגה בלי רישיון ואי ציות להוראת שוטר', 'minor': True,
                  'arrestOk': flag('stolen')}]

sc['events'] = [
    {'id': 'school', 'title': 'התפתחות: ליד בית הספר', 'when': {'countChosen': {'ids': PHASE1, 'gte': 3}},
     'lines': [nar('הרכב הלבן נכנס לרחוב של בית הספר. מסתיים שם אירוע ערב: הורים וילדים על המדרכה, ורמזור אדום בצומת. הנהג לא מאט – ועובר באדום.')],
     'effects': {'reveal': ['o-school'], 'note': 'המרדף הגיע לאזור עם הולכי רגל'}, 'sfx': 'alert'},
    {'id': 'caught', 'title': 'התפתחות: הרכב נעצר', 'when': ALL(flag('nearMiss'), NOT(flag('stopped'))),
     'lines': [L('dispatch', '{{centerToMe}}, הרכב נעצר ברחוב השקד, הנהג יצא ממנו.')],
     'effects': {'note': 'הרכב נעצר אחרי מעבר באדום'}},
]

sc['update'] = {
    'categories': {'location': 'מקום', 'situation': 'מצב נוכחי', 'status': 'מצב המעורבים', 'verified': 'מה אומת', 'missing': 'מה עדיין חסר', 'assistance': 'סיוע נדרש', 'judgement': 'קביעה'},
    'elements': [
        {'id': 'u-loc', 'category': 'location', 'text': 'נמצא ברחוב השקד', 'when': flag('found')},
        {'id': 'u-found', 'category': 'situation', 'text': 'הרכב אותר עצור, הנהג במקום ולא פצוע', 'when': flag('found')},
        {'id': 'u-minor', 'category': 'status', 'text': 'הנהג קטין בן 17, בלי רישיון – מעוכב, הורה בדרך', 'when': ALL(flag('detained'), flag('parent'))},
        {'id': 'u-tow', 'category': 'assistance', 'text': 'מבקש גרר לרכב', 'when': flag('found')},
        {'id': 'u-stolen', 'category': 'verified', 'text': 'הרכב שדווח כגנוב נמצא', 'when': ALL(flag('found'), flag('stolen'))},
        {'id': 'u-caught', 'category': 'judgement', 'text': 'תפסנו אותו סוף סוף', 'when': flag('found')},
    ],
    'responses': [
        {'when': {'inUpdate': 'u-minor'}, 'lines': [L('dispatch', 'מוקד: רשמתי. תעבירו אותו לתחנה, נוער מעודכן.')], 'effects': {'set': {'closedReport': True}}},
        {'when': {'inUpdate': 'u-tow'}, 'lines': [L('dispatch', 'מוקד: גרר מוזמן, כעשרים דקות.')], 'effects': {'set': {'towCalled': True}}},
    ],
}
sc['finish'] = {'label': 'סיום הטיפול במקום', 'confirm': 'לסיים את הטיפול ולעבור לתחקיר? אפשר לשלוח עדכון אחרון למשל״ט לפני הסיום.'}
sc['endings'] = [
    {'id': 'e-good', 'kind': 'good', 'title': 'המרדף הופסק בזמן – והנהג אותר בלי שאיש נפגע',
     'text': 'דיווחת והתעדכנת, קיבלת הנחיה, הפסקת כשהסיכון לציבור גדל, והמשל״ט איתר את הרכב. בסוף – גישה רגועה, עיכוב בהסבר והורה מעודכן.',
     'when': ALL(ch('p-report'), ch('p-head'), flag('stopped'), NOT(flag('reckless')), flag('handed'), flag('detainedProper'), flag('parent'), NOT(flag('zivShaken')))},
    {'id': 'e-partial', 'kind': 'partial', 'title': 'הנהג אותר – אבל במחיר סיכון',
     'text': 'הרכב נמצא, אבל בדרך: נהיגה מסוכנת, מעבר באדום, דיווח חסר או טיפול חלקי בנהג הקטין.',
     'when': flag('found')},
    {'id': 'e-retry', 'kind': 'retry', 'title': 'הזדמנות לתיקון: האירוע לא הסתיים',
     'text': 'הרכב לא אותר והנהג לא טופל.', 'when': {'always': True}},
]
sc['hints'] = [
    {'when': ALL({'stage': ['scene']}, NOT(ch('p-report'))), 'text': 'מי יודע עכשיו שאתם במרדף? רכב, מספר, כיוון – בקשר.'},
    {'when': ALL({'stage': ['scene']}, NOT(ch('p-head'))), 'text': 'מי מחליט אם להמשיך? 401.'},
    {'when': ALL(flag('ev:school'), NOT(flag('stopped'))), 'text': 'ילדים על המדרכה ורמזור אדום. מה שווה יותר?'},
    {'when': ALL(flag('stopped'), NOT(flag('handed'))), 'text': 'הפסקת. מי ממשיך לחפש במקומך?'},
    {'when': ALL(flag('found'), NOT(flag('minor'))), 'text': 'מי הנהג, בן כמה, ולמה ברח?'},
    {'when': {'always': True}, 'text': 'מרדף הוא החלטה שמתחדשת כל רגע: האם התועלת עדיין גדולה מהסיכון?'},
]
sc['challenges'] = [
    'הפסק את המרדף לפני שהרכב מגיע לבית הספר – מה השתנה?',
    'נסה גרסה אחרת – אולי הרכב גנוב. האם זה מצדיק סיכון גדול יותר לציבור?',
    'נסח עדכון: איפה, מה המצב, ומה נדרש – בלי „תפסנו אותו סוף סוף”.',
]
sc['report'] = {'reason': 'במהלך בדיקה ברחוב הרצל רכב לא עצר לסימון ונמלט.',
                'checklist': [{'label': 'פרטי הרכב', 'when': {'fact': 'd-plate'}}, {'label': 'הסיכון ליד בית הספר', 'when': {'fact': 'o-school'}},
                              {'label': 'איתור הרכב', 'when': {'fact': 'o-found'}}, {'label': 'זיהוי הנהג', 'when': {'fact': 'o-ziv-age'}}]}

imgs = ['img/school-street-day.webp', 'img/school-street-night.webp'] + [f'img/chars/ziv-{m}.webp' for m in ['calm', 'tense', 'upset']]
imgs += ['img/props/car-silver.webp', 'img/props/patrol.webp', 'img/drive/interior.webp', 'img/drive/road-day.webp', 'img/drive/road-night.webp']
sc['media'] = {'images': imgs,
               'audio': ['audio/radio-chatter.mp3', 'audio/traffic.mp3', 'audio/siren.mp3', 'audio/engine-wipers.mp3', 'audio/radio-chirp.mp3', 'audio/alert.mp3'],
               'voice': {}, 'voiceLines': old.get('media', {}).get('voiceLines', {}),
               'narrationMissing': 'קריינות: קולות מסונתזים מקומית ב־BlueTTS (קוד MIT; קולות מ־LibriTTS-R, CC BY 4.0). שורות עם אות קריאה של התחנה מוקראות בקול הדפדפן אם הופעל.'}

open(P, 'w').write(json.dumps(sc, ensure_ascii=False, indent=1) + '\n')
ip = os.path.join(ROOT, 'public/scenarios/index.json')
idx = json.load(open(ip))
entry = {k: sc[k] for k in ['id', 'version', 'title', 'category', 'summary', 'estimatedMinutes', 'difficultyLabel', 'skills', 'shifts']}
entry['file'] = 'pursuit.json'
idx['scenarios'] = [e for e in idx['scenarios'] if e['id'] != 'pursuit'] + [entry]
open(ip, 'w').write(json.dumps(idx, ensure_ascii=False, indent=1) + '\n')
print('ok')
