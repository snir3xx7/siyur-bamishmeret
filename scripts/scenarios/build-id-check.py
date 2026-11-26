"""בונה את התרחיש „בקשת הזדהות ברחוב – עילה סבירה” (public/scenarios/id-check.json).
מבוסס על עקרונות מהחוק הפומבי בלבד: חוק החזקת תעודת זהות והצגתה, חוק סדר הדין הפלילי (סמכויות אכיפה – מעצרים)
ושוויון בהפעלת סמכות. בלי נהלים מסווגים. הרצה: python3 scripts/scenarios/build-id-check.py
"""
import json, os

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
P = os.path.join(ROOT, 'public/scenarios/id-check.json')
old = json.load(open(P)) if os.path.exists(P) else {}

L = lambda sp, t: {'speaker': sp, 'text': t}
me = lambda t: L('player', t)
nar = lambda t: L('narrator', t)
mi = lambda t: L('miriam', t)
of = lambda t: L('ofer', t)
yu = lambda t: L('yuval', t)
flag = lambda f: {'flag': f}
NOT = lambda c: {'not': c}
ALL = lambda *c: {'all': list(c)}
ANY = lambda *c: {'any': list(c)}
ch = lambda i: {'chosen': i}
var = lambda *v: {'variant': list(v)}
look = {'skin': '#d6a57c', 'hair': '#3a2a20', 'hairStyle': 'short', 'top': '#555', 'bottom': '#333'}

OFER_IDS = ['o-intro', 'o-demand', 'o-looks', 'o-details', 'o-explain', 'o-car', 'o-nocard-detain', 'o-check', 'o-give-name', 'm-ask', 'm-equal']

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
    'id': 'id-check',
    'version': old.get('version', 1),
    'title': 'בקשת הזדהות ברחוב – עילה סבירה',
    'category': 'סמכויות ושוויון',
    'summary': 'דיירת מדווחת על גבר שמנסה לפתוח רכבים חונים, ומבקשת „לבדוק אותו, הוא לא מפה”. יש לדרוש הזדהות רק על בסיס עילה, להציג את עצמך ולהסביר, לטפל במי שאין עליו תעודה בלי לעכב סתם, לאמת במערכת – ובדרך גם לברר גיל של נער עם בירות.',
    'estimatedMinutes': 12,
    'difficultyLabel': 'בינונית',
    'skills': ['עילה לדרישת הזדהות', 'הצגה עצמית והסבר', 'אין תעודה – אימות פרטים', 'שוויון ולא מראה חיצוני', 'בירור גיל של קטין'],
    'shifts': ['evening', 'night'],
    'defaultShift': 'night',
    'location': {'name': 'רחוב האלה 9, ליד הקיוסק', 'area': 'שכונת גבעת הברושים, קריית אלון (בדוי)'},
    'objectives': [
        'לברר עם המדווחת מה בדיוק ראתה – מעשים ולא מראה',
        'לדרוש הזדהות רק על בסיס עילה, ולהציג את עצמך ואת הסיבה',
        'אם אין תעודה – לקבל פרטים ולאמת במערכת, בלי לעכב סתם',
        'לפעול לפי תוצאת הבדיקה: לשחרר בתודה, או לעכב ולהעביר',
        'לברר גיל של נער עם אלכוהול ולערב הורה',
    ],
    'variants': [
        {'id': 'own', 'label': 'הרכב שלו – השלט לא עבד', 'set': {'own': True},
         'vars': {'saw': 'הוא משך את הידית של הרכב הכסוף כמה פעמים, הסתכל פנימה, ואז הלך לרכב הבא והסתכל גם עליו',
                  'ofer_record': 'עופר נחום, בן 31. אין רישום ואין נגדו צו. הרכב הכסוף רשום על שמו.'}},
        {'id': 'tried', 'label': 'ניסה לפתוח רכבים – ויש נגדו צו מעצר', 'set': {'own': False},
         'vars': {'saw': 'הוא ניסה ידיות של שלושה רכבים, אחד אחרי השני, והסתכל לצדדים כל פעם',
                  'ofer_record': 'עופר נחום, בן 31. יש נגדו צו מעצר מבית משפט על אי התייצבות לדיון, ותיק פתוח בחשד לגניבות מרכבים. הרכב הכסוף לא רשום על שמו.'}},
    ],
}

sc['scoring'] = {
    'weights': {'info': 20, 'assessment': 20, 'communication': 15, 'authority': 25, 'dispatch': 10, 'documentation': 10},
    'rules': [
        rule('ic-info-caller', 'info', 'מה המדווחת ראתה בפועל', 10, ch('m-ask'),
             'נשמעה עדות המדווחת על המעשים.', 'שאלת את מרים מה בדיוק ראתה. כך העילה נשענת על מעשה, לא על תחושה.',
             'המדווחת לא נשאלה.', 'לא שאלת את מרים מה ראתה. בסבב הבא התחל ממי שדיווח.'),
        rule('ic-info-check', 'info', 'אימות הפרטים במערכת', 10, flag('checked_ofer'),
             'הפרטים נבדקו במערכת.', 'בדקת את הפרטים דרך המשל״ט, בצד, בלי שהמעורבים ישמעו.',
             'הפרטים לא נבדקו.', 'לא בדקת את הפרטים במערכת. כשאין תעודה – זה הצעד שמאמת את הזהות.'),
        rule('ic-assess-ground', 'assessment', 'עילה לדרישת ההזדהות', 12, ALL(ch('o-intro'), NOT(flag('profiled'))),
             'הדרישה נשענה על עילה.', 'דרשת הזדהות בגלל חשד לעבירה מהדיווח – ניסיון לפתוח רכבים – ולא בגלל איך שהוא נראה.',
             'לא הייתה עילה מוסברת.', 'לא הסברת על מה נשענת הדרישה. בסבב הבא: עילה – חשד לעבירה, בירור גיל, הגשת עזרה או אדם שמחפשים.',
             partial={'when': ch('o-intro'), 'points': 4, 'explain': 'הייתה עילה, אך גם התייחסות למראה.', 'improve': '„אתה נראה חשוד” זו לא עילה. מראה, מוצא או לבוש – אף פעם לא סיבה לבדיקה.'}),
        rule('ic-assess-verify', 'assessment', 'בדיקת הטענה על הרכב', 8, ch('o-car'),
             'נבדק אם הרכב שלו.', 'ביקשת ממנו להראות שהרכב שלו – בדיקה פשוטה שמבררת את החשד.',
             'הטענה לא נבדקה.', 'לא בדקת אם הרכב באמת שלו. בסבב הבא בקש שיראה מפתח או מסמכים.'),
        rule('ic-comm-ofer', 'communication', 'פנייה מכבדת ומוסברת', 8, ALL(ch('o-intro'), NOT(ch('o-demand')), NOT(flag('profiled'))),
             'הפנייה הייתה מכבדת ומוסברת.', 'הצגת את עצמך, אמרת למה פנית אליו ומה יקרה עכשיו. הוא הבין ושיתף פעולה.',
             'הפנייה לא הוסברה.', 'דרישה בלי הסבר מעוררת התנגדות. בסבב הבא: מי אתה, למה פנית, ומה אתה מבקש.',
             partial={'when': ch('o-explain'), 'points': 4, 'explain': 'ההסבר הגיע רק אחרי סירוב.', 'improve': 'הסברת רק אחרי שהוא סירב. הסבר מההתחלה חוסך את העימות.'}),
        rule('ic-comm-caller', 'communication', 'מעשים ולא מראה – מול המדווחת', 7, ch('m-equal'),
             'הובהר למדווחת על מה נשענת הבדיקה.', 'הבהרת למרים שבודקים לפי מה שאדם עשה, לא לפי איך שהוא נראה – בלי לזלזל בדיווח שלה.',
             'דברי המדווחת על המראה לא נענו.', 'מרים אמרה „הוא לא מפה” ולא קיבלה תשובה. בסבב הבא הבהר: בודקים מעשים, לא מראה.',
             applies=flag('ev:looks')),
        rule('ic-auth-name', 'authority', 'הזדהות השוטר', 5, ch('o-give-name'),
             'השוטר הזדהה כשהתבקש.', 'כשעופר שאל מי אתה, מסרת שם ומספר. גם השוטר חייב להזדהות.',
             'השוטר לא הזדהה.', 'עופר ביקש לדעת מי אתה ולא קיבל תשובה. בסבב הבא מסור שם ומספר שוטר.',
             applies=flag('ev:name')),
        rule('ic-auth-nocard', 'authority', 'אין תעודה – לא סיבה לעיכוב', 6, ALL(flag('identified'), NOT(flag('wrongDetain'))),
             'הפרטים נמסרו ואומתו בלי עיכוב מיותר.', 'הוא לא נשא תעודה, אז קיבלת שם, מספר זהות וכתובת ובדקת. עיכוב שמור למי שמסרב או כשיש חשש שהפרטים כוזבים.',
             'נעשה עיכוב רק בגלל היעדר תעודה.', 'עיכבת רק כי לא הייתה עליו תעודה. בסבב הבא בקש פרטים ואמת אותם – זה מספיק.'),
        rule('ic-auth-outcome', 'authority', 'פעולה לפי תוצאת הבדיקה', 8,
             ANY(ALL(var('own'), flag('released')), ALL(var('tried'), flag('detainedProper'))),
             'הפעולה התאימה לממצאים.', 'פעלת לפי מה שאומת: שחרור בתודה כשהכול תקין, או עיכוב מוסבר כשעלה צו ונמצא בסיס לחשד.',
             'הבדיקה לא הסתיימה בהחלטה.', 'הבדיקה נשארה פתוחה. בסבב הבא סיים אותה: לשחרר בהסבר, או לעכב לפי הממצאים.'),
        rule('ic-auth-minor', 'authority', 'נער עם אלכוהול – גיל והורה', 6, ALL(ch('y-age'), ch('y-alcohol'), ch('y-parent')),
             'הגיל התברר, האלכוהול נלקח והורה עודכן.', 'ביקשת מיובל להזדהות כדי לברר גיל, לקחת את הבירות והתקשרת להורה – בלי השפלה.',
             'הטיפול בנער לא הושלם.', 'נער עם בירות ברחוב בלילה – מבררים גיל, לוקחים את האלכוהול ומעדכנים הורה.',
             applies=flag('ev:teen'),
             partial={'when': ch('y-age'), 'points': 3, 'explain': 'הגיל התברר, אך הטיפול לא הושלם.', 'improve': 'בררת גיל אבל לא השלמת: אלכוהול והורה.'}),
        rule('ic-disp', 'dispatch', 'עדכון המשל״ט', 10, ANY({'sent': 'u-clear'}, {'sent': 'u-warrant'}),
             'נמסר עדכון לפי הממצאים.', 'עדכנת את המשל״ט במה שאומת ובמה שנעשה.',
             'לא נשלח עדכון.', 'לא עדכנת את המשל״ט בתוצאת הבדיקה.',
             partial={'when': {'updatesGte': 1}, 'points': 4, 'explain': 'נשלח עדכון בלי התוצאה.', 'improve': 'העדכון לא כלל את תוצאת הבדיקה.'}),
        rule('ic-doc', 'documentation', 'תיעוד', 10, ch('z-doc'),
             'האירוע תועד.', 'תיעדת את העילה, את מה שנמסר ואת תוצאת הבדיקה.',
             'האירוע לא תועד.', 'לא תיעדת. בסבב הבא רשום: עילה, פרטים, תוצאה.'),
    ],
}

sc['facts'] = [
    {'id': 'd-report', 'kind': 'dispatch', 'text': 'דיירת ברחוב האלה 9 מדווחת על גבר שמסתובב בין רכבים חונים ומנסה לפתוח דלתות'},
    {'id': 'd-desc', 'kind': 'dispatch', 'text': 'לפי המדווחת: גבר כבן 30, קפוצ׳ון כהה ותיק גב'},
    {'id': 'c-miriam-saw', 'kind': 'claim', 'text': '{{saw}}', 'source': 'miriam'},
    {'id': 'c-miriam-looks', 'kind': 'claim', 'text': 'אומרת שהוא „לא נראה מהשכונה”', 'source': 'miriam'},
    {'id': 'c-ofer', 'kind': 'claim', 'text': 'אומר שהרכב הכסוף שלו ושהשלט לא עובד', 'source': 'ofer'},
    {'id': 'o-details', 'kind': 'observation', 'text': 'מסר פרטים: עופר נחום, מספר זהות וכתובת – בלי תעודה עליו'},
    {'id': 'o-car-own', 'kind': 'observation', 'text': 'עם המפתח הרכב נפתח, ובתא הכפפות רישיון רכב על שמו'},
    {'id': 'o-car-not', 'kind': 'observation', 'text': 'אין לו מפתח לרכב, והגרסה השתנתה: „זה של חבר”'},
    {'id': 'o-yuval-age', 'kind': 'observation', 'text': 'הנער הזדהה: יובל, בן 16 – קטין, עם בירות'},
    {'id': 'c-kiosk', 'kind': 'claim', 'text': 'הבירות נקנו בקיוסק בלי שביקשו ממנו תעודה', 'source': 'yuval'},
]

sc['characters'] = [
    {'id': 'miriam', 'name': 'מרים גולן', 'role': 'המדווחת, דיירת ברחוב', 'gender': 'f', 'look': look, 'attitude': 0,
     'x': 15, 'y': 95, 'scale': 1.25,
     'moodRules': [{'when': ALL(flag('ev:looks'), NOT(flag('miriamCalm'))), 'mood': 'upset'}, {'when': NOT(flag('miriamCalm')), 'mood': 'tense'}]},
    {'id': 'ofer', 'name': 'עופר נחום', 'role': 'האדם שנבדק', 'gender': 'm', 'look': look, 'attitude': 0,
     'x': 60, 'y': 96, 'scale': 1.3,
     'moodRules': [{'when': ANY(flag('oferAngry'), flag('profiled')), 'mood': 'upset'}, {'when': NOT(flag('oferCalm')), 'mood': 'tense'}]},
    {'id': 'yuval', 'name': 'יובל שגיא', 'role': 'נער שיצא מהקיוסק', 'gender': 'm', 'look': look, 'attitude': 0,
     'x': 36, 'y': 95, 'scale': 1.15, 'when': flag('ev:teen'),
     'moodRules': [{'when': flag('yuvalShamed'), 'mood': 'upset'}, {'when': NOT(flag('yuvalCalm')), 'mood': 'tense'}]},
]

sc['dispatch'] = {
    'time': {'evening': '21:40', 'night': '23:15'},
    'unit': 'סייר 31',
    'incident': '7140',
    'lines': [L('dispatch', 'סייר 31, כאן מוקד אלון. דיירת ברחוב האלה 9 מדווחת על גבר שמסתובב בין רכבים חונים ומנסה לפתוח דלתות. המדווחת במקום. אשר קבלה.')],
    'initialFacts': ['d-report'],
    'basicExtraFacts': ['d-desc'],
    'followUps': [
        {'id': 'f-desc', 'label': 'לשאול: מה התיאור, ומה בדיוק נראה?', 'when': NOT({'fact': 'd-desc'}),
         'lines': [me('מוקד, מה התיאור ומה בדיוק ראתה?'), L('dispatch', 'גבר כבן 30, קפוצ׳ון כהה ותיק גב. לדבריה ראתה אותו מושך ידיות של רכבים.')],
         'effects': {'reveal': ['d-desc']}, 'report': 'בירור תיאור ומה נצפה'},
        {'id': 'f-caller', 'label': 'לשאול: איפה המדווחת, ואפשר לדבר איתה?',
         'lines': [me('איפה המדווחת? אפשר לדבר איתה כשנגיע?'), L('dispatch', 'היא מחכה ליד הקיוסק, בקצה הרחוב.')],
         'effects': {'set': {'askedCaller': True}}, 'report': 'תיאום מפגש עם המדווחת'},
    ],
    'goLabel': 'אישור קבלה ויציאה לרחוב האלה',
}
sc['transition'] = {'kind': 'car', 'text': 'נסיעה של כמה דקות. הרחוב שקט, רוב החלונות כבר חשוכים. ליד הקיוסק דולק אור.', 'travelMinutes': 4,
                    'ambience': ['engine-wipers', 'radio-chatter']}
sc['scene'] = {
    'background': 'img/kiosk-street',
    'alt': 'רחוב מגורים שקט בלילה: קיוסק מואר משמאל, שורת רכבים חונים מתחת לעץ פיקוס, ובניינים עם מרפסות וחלונות מוארים.',
    'fallbackColor': '#1d2230', 'ambience': ['traffic'], 'lights': 'steady', 'weather': 'none',
    'bgByShift': {'evening': 'night', 'night': 'night'},
    'props': [
        {'id': 'car', 'kind': 'car-silver', 'x': 80, 'y': 99, 'scale': 0.85},
        {'id': 'patrol', 'kind': 'patrol', 'x': 6, 'y': 99, 'scale': 0.75},
        {'id': 'sg-kiosk', 'kind': 'sign', 'x': 18, 'y': 30, 'text': 'קיוסק האלה', 'sign': 'shop', 'scale': 0.9},
    ],
    'painted': True,
}
sc['arrivalLines'] = [
    nar('רחוב האלה. ליד הקיוסק עומדת אישה בקרדיגן ומצביעה. ליד רכב כסוף חונה עומד גבר בקפוצ׳ון כהה, תיק על הכתף, ומסתכל עליכם.'),
    mi('הנה הוא! זה הוא, תבדקו אותו!'),
]
sc['arrivalFacts'] = []

ofer_choices = [
    {'id': 'o-intro', 'label': 'להציג את עצמך, להסביר את העילה – דיווח על ניסיון לפתוח רכבים – ולבקש תעודה מזהה',
     'when': NOT(flag('asked')),
     'lines': [me('ערב טוב, אני מצוות הסיור. קיבלנו דיווח שמישהו כאן ניסה לפתוח דלתות של רכבים, ולכן אני מבקש ממך להזדהות. יש לך תעודה מזהה?'),
               of('(נאנח) אין לי תעודה עליי. ולמה דווקא אני? כי אני עם קפוצ׳ון?')],
     'effects': {'set': {'asked': True, 'noCard': True}, 'reveal': [], 'attitude': {'ofer': 1}},
     'branches': [{'when': ch('m-ask'),
                   'lines': [me('ערב טוב, אני מצוות הסיור. דיירת ראתה אותך מושך ידיות של רכבים כאן ברחוב, ולכן אני מבקש ממך להזדהות. זה בירור – עוד לא האשמה. יש לך תעודה מזהה?'),
                             of('אין לי תעודה עליי. אבל אני לא מנסה לגנוב כלום, אם זה מה שאתה חושב.')],
                   'effects': {'set': {'asked': True, 'noCard': True, 'oferCalm': True}, 'attitude': {'ofer': 1}}}],
     'report': 'דרישת הזדהות עם הצגה עצמית והסבר העילה'},
    {'id': 'o-demand', 'label': 'לדרוש: „תעודת זהות. עכשיו.”', 'when': NOT(flag('asked')),
     'lines': [me('תעודת זהות. עכשיו.'), of('על מה? מי אתה בכלל? אני לא חייב לתת לך כלום!')],
     'effects': {'set': {'asked': True, 'noCard': True, 'oferAngry': True}, 'attitude': {'ofer': -2}, 'note': 'דרישה בלי הצגה עצמית והסבר עוררה סירוב'}},
    {'id': 'o-looks', 'label': 'לומר לעופר שהוא נראה חשוד ולכן צריך לבדוק אותו', 'when': NOT(flag('asked')),
     'lines': [me('אתה נראה חשוד, אז אני צריך לבדוק אותך. תעודה.'), of('נראה חשוד? בגלל איך שאני נראה? אני לא נותן לך כלום.')],
     'effects': {'set': {'asked': True, 'noCard': True, 'oferAngry': True, 'profiled': True}, 'attitude': {'ofer': -2}, 'note': 'דרישת הזדהות על בסיס מראה – בלי עילה'}},
    {'id': 'o-explain', 'label': 'להסביר בשקט: יש עילה – חשד לעבירה מהדיווח, ההזדהות מחייבת, וסירוב עלול להוביל לעיכוב',
     'when': ALL(flag('oferAngry'), NOT(flag('identified'))),
     'lines': [me('אני מבין שזה לא נעים. פניתי אליך בגלל דיווח שמישהו כאן ניסה לפתוח רכבים – לא בגלל איך שאתה נראה. כשיש חשד כזה, אתה חייב למסור לי שם ומספר זהות. אם תסרב, אצטרך לעכב אותך לבירור. אני מעדיף שנסיים את זה כאן בשתי דקות.'),
               of('…טוב. אין לי תעודה עליי, אבל אני אגיד לך את הפרטים.')],
     'effects': {'set': {'oferAngry': False, 'oferCalm': True}, 'attitude': {'ofer': 1}}, 'report': 'הסבר העילה והחובה להזדהות לאחר סירוב'},
    {'id': 'o-details', 'label': 'אין תעודה: לבקש שם מלא, מספר זהות וכתובת – כדי לאמת במערכת',
     'when': ALL(flag('asked'), NOT(flag('identified'))),
     'lines': [me('אין בעיה שאין תעודה. תן לי שם מלא, מספר זהות וכתובת, ואני בודק.'), of('עופר נחום. גר ברחוב הברוש 4. הנה המספר.')],
     'effects': {'set': {'identified': True}, 'reveal': ['o-details']},
     'branches': [{'when': flag('oferAngry'),
                   'lines': [me('תן לי שם מלא, מספר זהות וכתובת.'), of('אני לא מוסר לך כלום עד שתגיד לי למה.')],
                   'effects': {'set': {'refused': True}, 'note': 'סירוב למסור פרטים – לפני שהוסברה העילה'}}],
     'once': False, 'report': 'קבלת פרטים מזהים בהיעדר תעודה'},
    {'id': 'o-nocard-detain', 'label': 'לעכב את עופר כי אין עליו תעודה מזהה', 'when': ALL(flag('noCard'), NOT(flag('identified'))),
     'lines': [me('אין לך תעודה? אז אתה מעוכב.'), of('מעוכב? כי שכחתי ארנק בבית?! תשאל אותי את הפרטים!')],
     'effects': {'set': {'wrongDetain': True, 'oferAngry': True}, 'attitude': {'ofer': -2}, 'note': 'עיכוב רק בגלל היעדר תעודה – בלי לבקש פרטים'}},
    {'id': 'o-check', 'label': 'לבדוק את הפרטים של עופר במערכת דרך המשל״ט – בצד, בלי שהמעורבים ישמעו',
     'when': ALL(flag('identified'), NOT(flag('checked_ofer'))),
     'lines': [nar('התרחקת כמה צעדים, כך שאף אחד מהמעורבים לא ישמע את התשובה.'), me('{{toCenter}}, תבדקי לי פרטים של עופר נחום.'), L('dispatch', '{{ofer_record}}')],
     'effects': {'set': {'checked_ofer': True}, 'minutes': 2}, 'report': 'אימות הפרטים במערכת דרך המשל״ט'},
    {'id': 'o-car', 'label': 'לשמוע את עופר ולבקש שיראה שהרכב הכסוף באמת שלו', 'when': flag('identified'),
     'lines': [of('זה האוטו שלי! השלט לא עובד, אז ניסיתי את הידית. בדקתי גם אם השארתי את הפנס של השכן דולק.'),
               nar('עופר לוחץ על השלט כמה פעמים, ואז פותח את הדלת עם המפתח. בתא הכפפות – רישיון רכב על שמו.')],
     'effects': {'reveal': ['c-ofer', 'o-car-own'], 'set': {'carChecked': True, 'oferCalm': True}},
     'branches': [{'when': var('tried'),
                   'lines': [of('זה… זה האוטו של חבר. הוא ביקש שאביא לו משהו ממנו.'), me('יש לך מפתח?'), of('לא, הוא… אמר שזה פתוח.')],
                   'effects': {'reveal': ['o-car-not'], 'set': {'carChecked': True}}}],
     'report': 'בדיקת הטענה על הרכב'},
    {'id': 'o-give-name', 'label': 'למסור לעופר את שמך ומספר השוטר שלך', 'when': ALL(flag('ev:name'), NOT(flag('nameRefused'))),
     'lines': [me('בטח. שמי רשום כאן על המדים, ואני גם אומר לך: זה מספר השוטר שלי. אם תרצה, תוכל להגיש עליי פנייה.'), of('אוקיי. תודה.')],
     'effects': {'set': {'officerNamed': True}, 'attitude': {'ofer': 1}}, 'report': 'הזדהות השוטר לבקשת הנבדק'},
    {'id': 'o-refuse-name', 'label': 'לסרב: „זה לא עניינך מי אני”', 'when': ALL(flag('ev:name'), NOT(flag('officerNamed')), NOT(flag('nameRefused'))),
     'lines': [me('זה לא עניינך מי אני.'), of('אתה דורש ממני פרטים ולא מוכן להגיד מי אתה?')],
     'effects': {'set': {'nameRefused': True, 'oferAngry': True}, 'attitude': {'ofer': -1}, 'note': 'השוטר סירב להזדהות כשהתבקש'}},
    {'id': 'o-close', 'label': 'לסיים את הבדיקה: להסביר שהכול תקין, להודות על שיתוף הפעולה ולאפשר לו ללכת',
     'when': ALL(flag('checked_ofer'), var('own'), NOT(flag('released'))),
     'lines': [me('בדקתי – הכול תקין, הרכב שלך. תודה על הסבלנות ועל שיתוף הפעולה. אני מצטער על אי הנעימות, הבדיקה נבעה מהדיווח.'), of('בסדר. אני מבין שהיא דאגה.')],
     'effects': {'set': {'released': True, 'closed': True, 'oferCalm': True}, 'attitude': {'ofer': 1}}, 'report': 'סיום הבדיקה ושחרור בהסבר'},
    {'id': 'o-detain', 'label': 'להודיע לעופר שהוא מעוכב: יש נגדו צו מעצר, וחשד לניסיון גניבה מרכב – ולהסביר מה יקרה',
     'when': ALL(flag('checked_ofer'), var('tried'), NOT(flag('detained'))),
     'lines': [me('עופר, הבדיקה העלתה שיש נגדך צו מעצר מבית משפט. בנוסף, ראו אותך מנסה לפתוח כמה רכבים, ואין לך מפתח לרכב הזה. אתה מעוכב. ניידת תעביר אותך לתחנה.'),
               of('(מסתכל לצדדים) …אוקיי. אני לא עושה בעיות.')],
     'effects': {'set': {'detained': True, 'detainedProper': True}},
     'branches': [{'when': NOT(flag('carChecked')),
                   'lines': [me('עופר, יש נגדך צו מעצר מבית משפט. אתה מעוכב, ניידת תעביר אותך לתחנה.'), of('…אוקיי.')],
                   'effects': {'set': {'detained': True, 'detainedProper': True}}}],
     'report': 'עיכוב על בסיס צו וחשד, בהסבר'},
]

sc['hotspots'] = [
    {'id': 'h-miriam', 'label': 'מרים – המדווחת', 'kind': 'character', 'character': 'miriam', 'x': 15, 'y': 46,
     'description': 'מרים גולן, דיירת ברחוב. מחזיקה טלפון.',
     'choices': [
         {'id': 'm-ask', 'label': 'לשאול את מרים מה בדיוק ראתה – מה הוא עשה, ולא איך הוא נראה',
          'lines': [me('ערב טוב, אני מצוות הסיור. ספרי לי בדיוק מה ראית – מה הוא עשה?'), mi('{{saw}}.')],
          'effects': {'reveal': ['c-miriam-saw'], 'set': {'heardCaller': True}}, 'report': 'גביית עדות המדווחת על המעשים'},
         {'id': 'm-equal', 'label': 'להבהיר למרים שבודקים לפי מה שאדם עשה, לא לפי איך שהוא נראה – ולהודות על הדיווח',
          'when': flag('ev:looks'),
          'lines': [me('תודה שהתקשרת, זה בדיוק מה שצריך. אבל אני בודק לפי מה שראית אותו עושה, לא לפי איך שהוא נראה או מאיפה הוא. ככה בודקים כל אחד.'), mi('…כן, צודק. פשוט נבהלתי. היו פה פריצות לרכבים.')],
          'effects': {'set': {'miriamCalm': True}, 'attitude': {'miriam': 1}}, 'report': 'הבהרה למדווחת: בודקים מעשים, לא מראה'},
         {'id': 'm-tell', 'label': 'לספר למרים מה עלה במערכת על עופר', 'when': flag('checked_ofer'),
          'lines': [me('בדקתי אותו במערכת, ויצא ש…'), mi('נו? מה יצא?'), nar('עצרת באמצע. מידע מהמערכת על אדם לא מוסרים לשכנים.')],
          'effects': {'set': {'privacyBreach': True}, 'note': 'כמעט נמסר מידע מהמערכת לגורם לא מוסמך'}},
         {'id': 'm-update', 'label': 'לעדכן את מרים שהבדיקה הסתיימה – בלי לחשוף פרטים אישיים', 'when': flag('closed'),
          'lines': [me('בדקנו את הדיווח שלך וטיפלנו בו. פרטים על אנשים אני לא יכול למסור, אבל תודה שהתקשרת – ואם תראי משהו, תתקשרי שוב.'), mi('תודה רבה.')],
          'effects': {'set': {'callerUpdated': True, 'miriamCalm': True}}, 'report': 'עדכון המדווחת בלי חשיפת פרטים'},
     ]},
    {'id': 'h-ofer', 'label': 'עופר – ליד הרכב הכסוף', 'kind': 'character', 'character': 'ofer', 'x': 60, 'y': 46,
     'description': 'גבר כבן 30, קפוצ׳ון כהה ותיק גב, עומד ליד רכב כסוף.', 'choices': ofer_choices},
    {'id': 'h-yuval', 'label': 'יובל – נער עם בירות', 'kind': 'character', 'character': 'yuval', 'x': 36, 'y': 48, 'when': flag('ev:teen'),
     'description': 'נער צעיר יוצא מהקיוסק עם שקית בירות.',
     'choices': [
         {'id': 'y-age', 'label': 'לגשת ליובל ברוגע, להציג את עצמך ולבקש הזדהות כדי לברר את גילו',
          'lines': [me('היי, אני מצוות הסיור. אני רואה שיש לך בירות, ואני צריך לברר בן כמה אתה. יש לך תעודה, או שתגיד לי את הפרטים?'), yu('(מגמגם) יובל שגיא… אני בן 16.')],
          'effects': {'reveal': ['o-yuval-age'], 'set': {'minor': True, 'yuvalCalm': True}}, 'report': 'בירור גיל – חשד לעבירה התלויה בגיל'},
         {'id': 'y-grab', 'label': 'לקחת לו את השקית בלי לומר מילה, ולצעוק עליו מול כולם', 'when': NOT(flag('alcoholTaken')),
          'lines': [me('תביא את זה! מה אתה חושב שאתה עושה?!'), yu('(מסמיק) …סליחה.')],
          'effects': {'set': {'yuvalShamed': True, 'alcoholTaken': True}, 'attitude': {'yuval': -2}, 'note': 'הבירות נלקחו בצעקות ובלי הסבר'}},
         {'id': 'y-alcohol', 'label': 'להסביר ליובל שקטין לא מחזיק אלכוהול במקום ציבורי, ולקחת את הבירות', 'when': ALL(flag('minor'), NOT(flag('alcoholTaken'))),
          'lines': [me('יובל, בגיל 16 אסור לך להחזיק אלכוהול ברחוב, ולכן אני לוקח את הבירות. זה לא עונש – זה בשביל הבטיחות שלך.'), yu('טוב… בסדר.')],
          'effects': {'set': {'alcoholTaken': True}}, 'report': 'לקיחת אלכוהול מקטין בהסבר'},
         {'id': 'y-kiosk', 'label': 'לשאול את יובל מאיפה הבירות, והאם ביקשו ממנו תעודה', 'when': flag('minor'),
          'lines': [me('מאיפה הבירות? ביקשו ממך תעודה?'), yu('מהקיוסק פה. לא ביקשו כלום.')],
          'effects': {'reveal': ['c-kiosk'], 'set': {'kioskSold': True}}, 'report': 'בירור מקור האלכוהול'},
         {'id': 'y-parent', 'label': 'להתקשר להורה של יובל ולהסביר את המצב', 'when': flag('minor'),
          'lines': [me('יובל, אני מתקשר לאחד ההורים שלך. מה המספר?'), nar('אבא של יובל עונה. הוא מודה, ואומר שיגיע לאסוף אותו תוך חמש דקות.')],
          'effects': {'set': {'parent': True}}, 'report': 'יידוע הורה של קטין'},
     ]},
    {'id': 'h-doc', 'label': 'פנקס ותיעוד', 'kind': 'item', 'x': 90, 'y': 22, 'description': 'תיעוד הבדיקה.',
     'choices': [{'id': 'z-doc', 'label': 'לתעד: עילת הדרישה, הפרטים שנמסרו, תוצאת הבדיקה ומה נעשה',
                  'when': flag('identified'),
                  'lines': [nar('רשמת: שעה, עילת הדרישה (דיווח על ניסיון לפתוח רכבים), איך זוהה, תוצאת הבדיקה במערכת ומה הוחלט.')],
                  'effects': {'set': {'documented': True}}, 'report': 'תיעוד הבדיקה'}]},
]

sc['custody'] = [{'char': 'ofer', 'hotspot': 'h-ofer', 'offence': 'ניסיון גניבה מרכב', 'arrestOk': ALL(var('tried'), flag('checked_ofer'))}]

sc['events'] = [
    {'id': 'looks', 'title': 'התפתחות: „הוא לא מפה”', 'when': ANY(ch('m-ask'), {'countChosen': {'ids': OFER_IDS, 'gte': 2}}),
     'lines': [mi('ותבדקו אותו טוב. הוא בכלל לא נראה מהשכונה, רואים עליו.'), nar('עופר שומע, ומסתכל עליכם בכעס.')],
     'effects': {'reveal': ['c-miriam-looks'], 'note': 'המדווחת ביקשה לבדוק את האדם בגלל המראה שלו'}, 'sfx': 'alert'},
    {'id': 'name', 'title': 'התפתחות: „ומי אתה בכלל?”', 'when': flag('asked'),
     'lines': [of('רגע. אתה רוצה את הפרטים שלי – אז מה השם שלך? מה מספר השוטר שלך?')],
     'effects': {'note': 'הנבדק ביקש מהשוטר להזדהות'}},
    {'id': 'teen', 'title': 'התפתחות: נער יוצא מהקיוסק', 'when': {'countChosen': {'ids': OFER_IDS, 'gte': 4}},
     'lines': [nar('מהקיוסק יוצא נער צעיר עם שקית, ובתוכה כמה בקבוקי בירה. כשהוא רואה את הניידת, הוא מאט.')],
     'effects': {'note': 'נער צעיר יצא מהקיוסק עם בירות'}, 'sfx': 'alert'},
]

sc['update'] = {
    'categories': {'location': 'מקום', 'situation': 'מצב נוכחי', 'status': 'מצב המעורבים', 'verified': 'מה אומת', 'missing': 'מה עדיין חסר', 'assistance': 'סיוע נדרש', 'judgement': 'קביעה'},
    'elements': [
        {'id': 'u-loc', 'category': 'location', 'text': 'נמצא ברחוב האלה 9, ליד הקיוסק'},
        {'id': 'u-checking', 'category': 'situation', 'text': 'בודק אדם לפי דיווח על ניסיון לפתוח רכבים'},
        {'id': 'u-looks', 'category': 'judgement', 'text': 'האדם נראה חשוד ולא מהשכונה'},
        {'id': 'u-identified', 'category': 'status', 'text': 'האדם זוהה לפי פרטים, ללא תעודה', 'when': flag('identified')},
        {'id': 'u-clear', 'category': 'verified', 'text': 'הרכב שלו והפרטים תקינים – אין עבירה, שוחרר', 'when': ALL(flag('released'), var('own'))},
        {'id': 'u-warrant', 'category': 'status', 'text': 'מעוכב – צו מעצר פעיל וחשד לניסיון גניבה מרכב, מועבר לתחנה', 'when': ALL(flag('detained'), var('tried'))},
        {'id': 'u-minor', 'category': 'status', 'text': 'קטין בן 16 עם אלכוהול – הבירות נלקחו, הורה בדרך', 'when': ALL(flag('alcoholTaken'), flag('parent'))},
        {'id': 'u-kiosk', 'category': 'assistance', 'text': 'הקיוסק ברחוב מכר אלכוהול לקטין – מבקש שיועבר לטיפול', 'when': flag('kioskSold')},
    ],
    'responses': [
        {'when': {'inUpdate': 'u-warrant'}, 'lines': [L('dispatch', 'מוקד: רשמתי. תעבירו אותו לתחנה, החוקר התורן מעודכן בצו.')], 'effects': {'set': {'warrantReported': True}}},
        {'when': {'inUpdate': 'u-kiosk'}, 'lines': [L('dispatch', 'מוקד: רשמתי, יועבר לטיפול.')], 'effects': {'set': {'kioskReported': True}}},
        {'when': {'inUpdate': 'u-looks'}, 'lines': [L('dispatch', 'מוקד: מה הוא עשה בפועל? תעדכן לפי מעשים.')]},
    ],
}
sc['pressure'] = old.get('pressure', [])
sc['finish'] = {'label': 'סיום הטיפול במקום', 'confirm': 'לסיים את הטיפול ולעבור לתחקיר? אפשר לשלוח עדכון אחרון למשל״ט לפני הסיום.'}
good_core = [ch('m-ask'), ch('o-intro'), NOT(flag('profiled')), NOT(flag('wrongDetain')), flag('checked_ofer'), NOT(flag('privacyBreach'))]
sc['endings'] = [
    {'id': 'e-good', 'kind': 'good', 'title': 'בדיקה הוגנת, שנשענת על עילה',
     'text': 'ההזדהות נדרשה בגלל מעשה ולא בגלל מראה, הפרטים אומתו בלי עיכוב מיותר, וההחלטה התאימה לממצאים.',
     'when': ALL(*good_core,
                 ANY(ALL(var('own'), flag('released')), ALL(var('tried'), flag('detainedProper'), flag('warrantReported'))),
                 ANY(NOT(flag('ev:teen')), ALL(flag('alcoholTaken'), flag('parent'), NOT(flag('yuvalShamed')))))},
    {'id': 'e-partial', 'kind': 'partial', 'title': 'הבדיקה הסתיימה – לא הכול נעשה נכון',
     'text': 'הבדיקה הסתיימה, אבל משהו חסר: עילה מוסברת, אימות במערכת, יחס שוויוני, שמירה על פרטיות או טיפול בנער.',
     'when': ANY(flag('released'), flag('detained'))},
    {'id': 'e-retry', 'kind': 'retry', 'title': 'הזדמנות לתיקון: הבדיקה לא הסתיימה',
     'text': 'הצוות עזב בלי לסיים את הבדיקה: לא ברור מי האדם, ולא הוחלט אם לשחרר או לעכב.', 'when': {'always': True}},
]
sc['hints'] = [
    {'when': ALL({'stage': ['scene']}, NOT(ch('m-ask'))), 'text': 'מה בדיוק המדווחת ראתה? מעשה – לא מראה.'},
    {'when': ALL({'stage': ['scene']}, NOT(flag('asked'))), 'text': 'לפני דרישת הזדהות: מי אתה, למה פנית, ומה אתה מבקש.'},
    {'when': ALL(flag('noCard'), NOT(flag('identified'))), 'text': 'אין תעודה? זה לא סוף הבדיקה – בקש פרטים ואמת אותם.'},
    {'when': ALL(flag('identified'), NOT(flag('checked_ofer'))), 'text': 'יש פרטים. עכשיו לאמת – דרך המשל״ט, בצד.'},
    {'when': ALL(flag('ev:teen'), NOT(flag('minor'))), 'text': 'נער עם בירות בלילה. מה צריך לברר?'},
    {'when': {'always': True}, 'text': 'ארבע עילות לדרישת הזדהות: חשד לעבירה, עבירה התלויה בגיל, הגשת עזרה, ואדם שהמשטרה מחפשת.'},
]
sc['challenges'] = [
    'שחק עם זרע אחר – אולי לעופר יש צו. האם ההחלטה שלך נשענת על הבדיקה?',
    'נסה לדרוש הזדהות בלי להסביר – ותראה איך הסירוב משנה את האירוע.',
    'נסח עדכון למשל״ט: מה אומת ומה הוחלט – בלי „נראה חשוד”.',
]
sc['report'] = {'reason': 'התקבלה משימה מהמשל״ט: דיווח על גבר שמנסה לפתוח רכבים ברחוב האלה 9.',
                'checklist': [{'label': 'עדות המדווחת', 'when': {'fact': 'c-miriam-saw'}}, {'label': 'פרטים מזהים', 'when': {'fact': 'o-details'}},
                              {'label': 'בדיקת הרכב', 'when': ANY({'fact': 'o-car-own'}, {'fact': 'o-car-not'})}, {'label': 'גיל הנער', 'when': {'fact': 'o-yuval-age'}}]}

imgs = ['img/kiosk-street-day.webp', 'img/kiosk-street-night.webp']
for c in sc['characters']:
    c['sprite'] = f"img/chars/{c['id']}"
    c['spriteMoods'] = ['calm', 'tense', 'upset']
    imgs += [f"img/chars/{c['id']}-{m}.webp" for m in c['spriteMoods']]
imgs += ['img/props/car-silver.webp', 'img/props/patrol.webp', 'img/drive/interior.webp', 'img/drive/road-day.webp', 'img/drive/road-night.webp']
sc['media'] = {'images': imgs,
               'audio': ['audio/radio-chatter.mp3', 'audio/traffic.mp3', 'audio/engine-wipers.mp3', 'audio/radio-chirp.mp3', 'audio/alert.mp3'],
               'voice': {}, 'voiceLines': old.get('media', {}).get('voiceLines', {}),
               'narrationMissing': 'קריינות: קולות מסונתזים מקומית ב־BlueTTS (קוד MIT; קולות מ־LibriTTS-R, CC BY 4.0). שורות עם אות קריאה של התחנה מוקראות בקול הדפדפן אם הופעל.'}

open(P, 'w').write(json.dumps(sc, ensure_ascii=False, indent=1) + '\n')

# קטלוג
ip = os.path.join(ROOT, 'public/scenarios/index.json')
idx = json.load(open(ip))
entry = {k: sc[k] for k in ['id', 'version', 'title', 'category', 'summary', 'estimatedMinutes', 'difficultyLabel', 'skills', 'shifts']}
entry['file'] = 'id-check.json'
idx['scenarios'] = [e for e in idx['scenarios'] if e['id'] != 'id-check'] + [entry]
open(ip, 'w').write(json.dumps(idx, ensure_ascii=False, indent=1) + '\n')
print('ok', len(json.dumps(sc)))
