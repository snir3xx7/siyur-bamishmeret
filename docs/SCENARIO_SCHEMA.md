# סכימת תרחיש

כל תרחיש הוא קובץ JSON אחד ב־`public/scenarios/<id>.json`, נפרד מהקוד. הטיפוסים המלאים מוגדרים ב־`src/engine/types.ts`. הקטלוג נבנה מ־`public/scenarios/index.json`.

## שדות עליונים

| שדה | תיאור |
|---|---|
| `id` | מזהה באותיות לטיניות קטנות ומקפים, זהה לשם הקובץ |
| `version` | מספר שלם. מעלים בכל שינוי בתוכן או בניקוד (גם באינדקס) |
| `title`, `category`, `summary` | כותרת, תחום בקטלוג ותיאור פתיחה |
| `estimatedMinutes`, `difficultyLabel`, `skills` | זמן משוער, רמת קושי ומיומנויות לתרגול – מוצגים בכרטיס |
| `shifts`, `defaultShift` | משמרות נתמכות: `morning`, `evening`, `night` |
| `location` | `{ name, area }` – מיקום בדוי |
| `objectives` | מטרות התרגול |
| `variants` | וריאציות שנבחרות לפי זרע ההגרלה (ראו למטה) |
| `facts` | העובדות שהשחקן יכול לגלות |
| `characters` | הדמויות |
| `dispatch` | קבלת המשימה במסוף הקשר |
| `transition` | קטע המעבר לזירה |
| `scene`, `arrivalLines`, `arrivalFacts` | הזירה, מה קורה בהגעה ומה נצפה מיד |
| `hotspots` | נקודות העניין ופעולותיהן |
| `events` | אירועים מתפתחים בזירה (אופציונלי, ראו למטה) |
| `update` | רכיבי העדכון למוקד ותגובות המוקד |
| `finish`, `endings` | כפתור הסיום והסיומים האפשריים |
| `hints` | רמזים למצב למידה |
| `scoring` | משקלים וכללי ניקוד |
| `challenges` | „אתגר להמשך” כשאין נקודה לשיפור |
| `report` | סיבת הגעה ורשימת בדיקה לדוח („לא תועד”) |
| `media` | רשימת נכסים להורדה לא מקוונת וקריינות |

## וריאציות וזרע

```json
"variants": [
  { "id": "dana-hurt", "label": "...", "weight": 1, "set": { "injured": "dana" }, "vars": { "injured": "דנה" } }
]
```

הזרע (1–999999) קובע וריאציה אחת. `set` מגדיר דגלים בתחילת המשחק, ו־`vars` מחליף `{{שם}}` בכל טקסט. קישור קבוע: `#/s/<id>?v=<version>&seed=<seed>`.

## עובדות

```json
{ "id": "c-dana-phone", "kind": "claim", "source": "dana", "text": "נראה לה שנהג הרכב הכסוף דיבר בטלפון" }
```

- `dispatch` – נמסר מהמוקד (מוצג כ„טרם אומת” עד שמאמתים).
- `observation` – נצפה בזירה (מאומת אוטומטית).
- `claim` – נטען על ידי דמות (`source`). בדוח מופיע תחת „דברים שנמסרו”.

## תנאים (`Cond`)

כל תנאי הוא אובייקט עם מפתח אחד:

| תנאי | משמעות |
|---|---|
| `{ "fact": "id" }` / `{ "verified": "id" }` | העובדה ידועה / אומתה |
| `{ "flag": "x" }`, `{ "flag": "x", "eq": "v" }` | דגל אמיתי / שווה לערך |
| `{ "chosen": "choiceId" }` | הבחירה בוצעה |
| `{ "countChosen": { "ids": [...], "gte": 2 } }` | לפחות N מהבחירות בוצעו |
| `{ "before": ["a", "b"] }` | a בוצעה לפני b (או ש־b לא בוצעה). מקבל גם `update:1`, `update:last`, `finish` |
| `{ "attitudeGte": ["char", 1] }`, `attitudeLte` | יחס הדמות (‎-3 עד 3) |
| `{ "difficulty": [...] }`, `{ "shift": [...] }`, `{ "variant": [...] }`, `{ "stage": [...] }` | רמת קושי, משמרת, וריאציה, שלב |
| `{ "sent": "elementId" }` | רכיב נשלח בעדכון כלשהו |
| `{ "updatesGte": 1 }` | נשלחו לפחות N עדכונים |
| `{ "minutesGte": 12 }` | עברו לפחות N דקות תרחיש מפעולות ומנסיעה (לא תלוי בזמן אמת – דטרמיניסטי) |
| `{ "update": { "n": 1, "has": [...], "hasCat": [...], "lacks": [...] } }` | בדיקת עדכון מסוים (`n`: מספר, `"last"` או `"any"`) |
| `{ "inUpdate": "elementId" }` | (בתגובות מוקד) הרכיב נמצא בעדכון הנוכחי |
| `{ "all": [...] }`, `{ "any": [...] }`, `{ "not": {...} }`, `{ "always": true }` | צירופים |

## בחירות והשפעות

```json
{
  "id": "d-version", "label": "לשוחח עם דנה בנפרד",
  "when": { "...": "..." },
  "once": true,
  "lines": [{ "speaker": "dana", "text": "..." }],
  "effects": { "reveal": ["c-dana-version"], "verify": [], "set": { "x": true }, "attitude": { "dana": -1 }, "minutes": 1, "note": "השלכה לתחקיר" },
  "branches": [{ "when": { "attitudeLte": ["dana", 0] }, "lines": [...], "effects": {...} }],
  "report": "גביית גרסת דנה בנפרד",
  "sfx": "knock"
}
```

- `speaker`: מזהה דמות, `player`, `dispatch` או `narrator`.
- הענף הראשון שתנאיו מתקיימים (לפי המצב **לפני** הבחירה) מחליף את `lines`/`effects`.
- `note` ושינויי יחס נרשמים ביומן ומוצגים בתחקיר כ„השלכה”.
- `report` – משפט לסעיף „פעולות שבוצעו” בדוח. בחירה בלי `report` לא תופיע שם.
- כל בחירה חד־פעמית כברירת מחדל; לחיצה כפולה לא משכפלת אותה.

## זירה

```json
"scene": {
  "background": "img/accident-street",
  "alt": "תיאור נגיש",
  "fallbackColor": "#28323f",
  "ambience": ["rain", "traffic"],
  "ambienceRules": [{ "when": { "flag": "hostLowered" }, "ambience": ["building-hum"] }],
  "lights": "steady",
  "lightsRules": [{ "when": { "flag": "secured" }, "mode": "reflect" }],
  "reflect": { "x": 0, "y": 64, "w": 100, "h": 36 },
  "weather": "rain",
  "props": [{ "id": "car-red", "kind": "car-red", "x": 55, "y": 78, "flip": true, "when": {...} }]
}
```

- הרקע נטען כ־`<background>-day.webp` (בוקר וערב, הערב מקבל שכבת גוון) או `-night.webp`.
- `ambience` – עד שתי שכבות; קבצים ב־`public/audio/<שם>.mp3`.
- `lights`: `off`, `steady` (אדום־כחול קבוע) או `reflect` (השתקפות על הכביש). אנימציה עדינה רק אם הופעלה בהגדרות.
- `props.kind`: `car-red`, `car-silver`, `patrol`, `cone`, `speaker`, `lock`, `door-glow`, `glow-dim`. `x`/`y` באחוזים (נקודת הבסיס התחתונה).

נקודות עניין (`hotspots`) מופיעות גם בתמונה וגם ברשימה, באותו סדר. `x`/`y` באחוזים, `description` חובה (נגישות).

## אירועים מתפתחים

משהו שקורה **מעצמו** בזירה, בלי שהשחקן בחר בו – כדי לתרגל הערכת מצב מחודשת.

```json
"events": [{
  "id": "worse", "title": "התפתחות בזירה: החמרה במצב {{injured}}",
  "when": { "countChosen": { "ids": ["s-secure", "o-feel", "..."], "gte": 4 } },
  "branches": [{ "when": { "flag": "cared" }, "lines": [...], "effects": {...} }],
  "lines": [{ "speaker": "narrator", "text": "..." }],
  "effects": { "set": { "worse": true }, "reveal": ["o-dizzy"], "note": "..." },
  "sfx": "alert"
}]
```

- נבדק אחרי כל בחירה בזירה ואחרי כל עדכון למוקד; כל אירוע קורה **פעם אחת**.
- כשהוא קורה נקבע הדגל `ev:<id>` – אפשר להשתמש בו בתנאים, ב־`appliesWhen` של כלל ניקוד ובסיומים.
- הדיאלוג שלו מוצג אחרי תגובת הבחירה, תחת הכותרת, עם באנר „התפתחות בזירה” בתמונה. ביומן, בציר ההחלטות ובדוח הוא מופיע כשורה נפרדת.
- כלל ניקוד שתלוי באירוע צריך `appliesWhen: { "flag": "ev:<id>" }` – מי שסיים לפני שהאירוע קרה לא יופחת לו ניקוד.

## עדכון למוקד

`update.elements` – רכיבים שהשחקן בוחר, כל אחד בקטגוריה (`location`, `situation`, `status`, `verified`, `missing`, `assistance`, `judgement`). רכיב זמין רק כש־`when` מתקיים – כך הניקוד לא שופט לפי מידע שעוד לא נחשף. `update.responses` – תגובות המוקד לפי `inUpdate`.

## סיומים

```json
{ "id": "e-good", "kind": "good", "title": "...", "text": "...", "when": {...} }
```

`kind`: `good`, `partial` או `retry` (הזדמנות לתיקון). הסיום הראשון שתנאיו מתקיימים נבחר; **הסיום האחרון חייב להיות `{"always": true}`**.

## ניקוד

ברירת מחדל: איסוף ואימות מידע 25, הערכת מצב ותעדוף 25, תקשורת 20, עדכון מוקד ותיאום סיוע 20, תיעוד 10. אפשר לשנות ב־`scoring.weights` (משקל 0 מסיר תחום); המשקלים מנורמלים ל־100.

```json
{
  "id": "r-disp-first", "domain": "dispatch", "label": "עדכון ראשון למוקד", "max": 10, "required": true,
  "appliesWhen": { "...": "..." },
  "anchor": ["update:1"],
  "tiers": [
    { "when": {...}, "points": 10, "explain": "...", "keep": "נקודה לשימור" },
    { "when": {...}, "points": 6, "explain": "...", "improve": "נקודה לשיפור (כולל התיקון אם היה)" }
  ],
  "fallback": { "explain": "...", "improve": "..." },
  "alternative": "בחירה נוספת סבירה"
}
```

- השכבה הראשונה שמתקיימת קובעת את הניקוד (מלא, חלקי או אפס). כמה דרכים יכולות לזכות בניקוד מלא.
- `required` – „נדרש למטרת התרגול” לעומת „בחירה סבירה מתוך כמה”. משפיע גם על סדר נקודות השיפור.
- `appliesWhen` – אם לא מתקיים, הכלל לא נכלל (לא מנכים על פעולה שהתרחיש לא אפשר). תחום בלי כללים רלוונטיים מוסר והמשקלים מנורמלים.
- `anchor` – לאיזו החלטה בציר הזמן הכלל משויך: מזהה בחירה, `update:1`, `update:last` או `sent:<elementId>`.
- מומלץ שסכום ה־`max` בכל תחום יהיה שווה למשקל התחום (הבודק מזהיר אחרת).
- `scoring.timeTarget` (אופציונלי): `{ "minutes": 10, "domain": "assessment", "points": 5 }` – משפיע רק אם החניך הפעיל „יעד זמן” בכרטיס התרחיש.

## בדיקות

`npm test` מריץ על כל תרחיש באינדקס: בדיקת הפניות, סיום ברירת מחדל, מאות הליכות אקראיות (כל מסלול מסתיים או מציע פעולה), נגישות כל הבחירות, קיום נכסי מדיה, ומסלול מלא שמגיע לציון 100 (`GOOD_PATHS` ב־`tests/unit/scenarios.test.ts`).
