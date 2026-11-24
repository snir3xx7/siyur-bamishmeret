/**
 * סכימת התרחישים ומצב המשחק.
 * תיעוד מלא של הסכימה: docs/SCENARIO_SCHEMA.md
 */

export type Shift = 'morning' | 'evening' | 'night';
export type Difficulty = 'basic' | 'standard' | 'advanced';
export type Mode = 'learning' | 'practice';
export type Domain = 'info' | 'assessment' | 'communication' | 'dispatch' | 'documentation';
export type Stage = 'dispatch' | 'transition' | 'scene' | 'ended';
export type LightsMode = 'off' | 'steady' | 'reflect';
export type Mood = 'calm' | 'tense' | 'upset' | 'hurt';

/** תנאי. כל אובייקט מכיל מפתח אחד מהרשימה. */
export type Cond =
  | { fact: string }
  | { verified: string }
  | { flag: string; eq?: string | number | boolean }
  | { chosen: string }
  | { countChosen: { ids: string[]; gte: number } }
  | { before: [string, string] }
  | { attitudeGte: [string, number] }
  | { attitudeLte: [string, number] }
  | { difficulty: Difficulty[] }
  | { shift: Shift[] }
  | { variant: string[] }
  | { sent: string }
  | { updatesGte: number }
  | { minutesGte: number }
  | { update: UpdateCond }
  | { inUpdate: string }
  | { all: Cond[] }
  | { any: Cond[] }
  | { not: Cond }
  | { stage: Stage[] }
  | { always: true };

export interface UpdateCond {
  /** מספר העדכון (1 = הראשון), 'last' או 'any' */
  n: number | 'last' | 'any';
  has?: string[];
  hasCat?: string[];
  lacks?: string[];
}

export interface Effects {
  reveal?: string[];
  verify?: string[];
  set?: Record<string, string | number | boolean>;
  attitude?: Record<string, number>;
  minutes?: number;
  /** תיאור ההשלכה – נרשם ביומן ומוצג בתחקיר */
  note?: string;
  goto?: Stage;
}

export interface Line {
  speaker: string; // מזהה דמות | 'player' | 'dispatch' | 'narrator'
  text: string;
}

export interface Branch {
  when: Cond;
  lines: Line[];
  effects?: Effects;
}

export interface Choice {
  id: string;
  label: string;
  when?: Cond;
  /** ברירת מחדל: true – הבחירה זמינה פעם אחת */
  once?: boolean;
  lines?: Line[];
  effects?: Effects;
  /** הענף הראשון שתנאיו מתקיימים מחליף את lines/effects */
  branches?: Branch[];
  /** טקסט לסעיף „פעולות שבוצעו” בדוח */
  report?: string;
  /** אפקט קולי קצר (שם קובץ ב-public/audio ללא סיומת) */
  sfx?: string;
}

export interface Fact {
  id: string;
  text: string;
  kind: 'dispatch' | 'claim' | 'observation';
  /** למי שייכת הטענה (מזהה דמות) */
  source?: string;
}

export interface FigureLook {
  skin: string;
  hair: string;
  hairStyle: 'short' | 'long' | 'bald' | 'bun' | 'cap';
  top: string;
  bottom: string;
  height?: number;
  accessory?: 'umbrella' | 'phone' | 'bag' | 'apron' | 'none';
}

export interface Character {
  id: string;
  name: string;
  role: string;
  /** לניסוח דקדוקי נכון של הודעות המערכת */
  gender: 'f' | 'm';
  look: FigureLook;
  attitude: number;
  x: number;
  y: number;
  scale?: number;
  /** מתי הדמות מופיעה בזירה */
  when?: Cond;
  /** מצב גוף לפי דגלים – הראשון שמתקיים */
  moodRules?: { when: Cond; mood: Mood }[];
  /** דמות מאוירת: נתיב בסיס ל-<sprite>-<mood>.webp (אם חסר – ציור וקטורי מ-look) */
  sprite?: string;
  /** מצבים שיש להם איור; מצב חסר מוצג במצב הקרוב (hurt→tense) */
  spriteMoods?: Mood[];
}

export interface Hotspot {
  id: string;
  label: string;
  kind: 'character' | 'item' | 'radio' | 'area';
  character?: string;
  x: number;
  y: number;
  description: string;
  when?: Cond;
  choices: Choice[];
}

export interface UpdateElement {
  id: string;
  category: string;
  text: string;
  when?: Cond;
}

export interface UpdateResponse {
  when: Cond;
  lines: Line[];
  effects?: Effects;
}

export interface Ending {
  id: string;
  kind: 'good' | 'partial' | 'retry';
  title: string;
  text: string;
  when: Cond;
}

export interface ScoreTier {
  when: Cond;
  points: number;
  explain: string;
  keep?: string;
  improve?: string;
}

export interface ScoreRule {
  id: string;
  domain: Domain;
  label: string;
  max: number;
  /** true = נדרש להשגת מטרת התרגול; false = בחירה סבירה מתוך כמה */
  required: boolean;
  appliesWhen?: Cond;
  /** בחירות/עדכונים שאליהם השורה משויכת בציר ההחלטות ('update:1', 'update:last') */
  anchor?: string[];
  tiers: ScoreTier[];
  /** ניקוד כשאף שכבה לא התקיימה */
  fallback: { explain: string; improve?: string };
  alternative?: string;
}

export type PropKind = 'car-red' | 'car-silver' | 'patrol' | 'speaker' | 'lock' | 'cone' | 'door-glow' | 'glow-dim' | 'sign';

export interface ScenePropDef {
  id: string;
  kind: PropKind;
  x: number;
  y: number;
  scale?: number;
  when?: Cond;
  flip?: boolean;
  /** לשלט: הטקסט בעברית וסגנונו */
  text?: string;
  sign?: 'street' | 'stop' | 'shop' | 'plate' | 'notice';
}

export interface SceneDef {
  background: string;
  alt: string;
  fallbackColor: string;
  ambience: string[];
  /** החלפת שכבות הסביבה לפי מצב (הראשון שמתקיים) */
  ambienceRules?: { when: Cond; ambience: string[] }[];
  lights: LightsMode;
  lightsRules?: { when: Cond; mode: LightsMode }[];
  reflect?: { x: number; y: number; w: number; h: number };
  weather?: 'rain' | 'none';
  patrolCar?: { x: number; y: number; scale?: number; when?: Cond };
  props?: ScenePropDef[];
  /** רקע מאויר: לכל משמרת איזו גרסת תאורה של הרקע (day/night). ברירת מחדל: night רק בלילה */
  bgByShift?: Partial<Record<Shift, 'day' | 'night'>>;
  /** זירה מאוירת – רכבים מאוירים, ללא שכבת גוון על רקע שכבר מצויר בתאורה הנכונה */
  painted?: boolean;
}

export interface Scenario {
  id: string;
  version: number;
  title: string;
  category: string;
  summary: string;
  estimatedMinutes: number;
  difficultyLabel: string;
  skills: string[];
  shifts: Shift[];
  defaultShift: Shift;
  location: { name: string; area: string };
  objectives: string[];
  variants: { id: string; label: string; weight?: number; set?: Record<string, string | number | boolean>; vars: Record<string, string> }[];
  facts: Fact[];
  characters: Character[];
  dispatch: {
    /** שעת קבלת המשימה לפי משמרת */
    time: Partial<Record<Shift, string>>;
    unit: string;
    incident: string;
    lines: Line[];
    initialFacts: string[];
    basicExtraFacts?: string[];
    followUps: Choice[];
    goLabel: string;
  };
  transition: { kind: 'car' | 'street'; text: string; travelMinutes: number; ambience: string[] };
  scene: SceneDef;
  arrivalLines: Line[];
  /** עובדות שנצפות מיד בהגעה */
  arrivalFacts: string[];
  hotspots: Hotspot[];
  /** אירועים מתפתחים בזירה (אופציונלי) */
  events?: ScenarioEvent[];
  update: {
    elements: UpdateElement[];
    categories: Record<string, string>;
    responses: UpdateResponse[];
  };
  finish: { label: string; confirm: string };
  endings: Ending[];
  hints: { when: Cond; text: string }[];
  scoring: {
    weights?: Partial<Record<Domain, number>>;
    rules: ScoreRule[];
    timeTarget?: { minutes: number; domain: Domain; points: number };
  };
  challenges: string[];
  report: {
    reason: string;
    checklist: { label: string; when: Cond }[];
  };
  media: { images: string[]; audio: string[]; voice: Record<string, string>; narrationMissing?: string };
}

export interface CatalogEntry {
  id: string;
  file: string;
  version: number;
  title: string;
  category: string;
  summary: string;
  estimatedMinutes: number;
  difficultyLabel: string;
  skills: string[];
  shifts: Shift[];
}

export interface KnownFact {
  t: number; // דקות סימולציה
  verified: boolean;
}

export interface SentUpdate {
  n: number;
  turn: number;
  t: number;
  elements: string[];
  note: string;
}

export type LogKind = 'dispatch' | 'followup' | 'arrive' | 'choice' | 'update' | 'finish' | 'skip' | 'event';

/** אירוע מתפתח: קורה מעצמו בזירה כשהתנאי מתקיים (פעם אחת), אחרי פעולה של השחקן */
export interface ScenarioEvent {
  id: string;
  title: string;
  when: Cond;
  lines: Line[];
  effects?: Effects;
  branches?: { when: Cond; lines: Line[]; effects?: Effects }[];
  sfx?: string;
}

export interface LogEntry {
  turn: number;
  kind: LogKind;
  ref: string; // מזהה בחירה / 'update:N'
  label: string;
  t: number;
  stage: Stage;
  /** מה השחקן ידע ברגע ההחלטה */
  knownBefore: string[];
  verifiedBefore: string[];
  lines: Line[];
  revealed: string[];
  consequences: string[];
  actionIndex: number;
}

export interface GameConfig {
  scenarioId: string;
  version: number;
  seed: number;
  shift: Shift;
  difficulty: Difficulty;
  mode: Mode;
  timeLimit: boolean;
}

export interface GameState {
  config: GameConfig;
  variant: string;
  vars: Record<string, string>;
  stage: Stage;
  turn: number;
  known: Record<string, KnownFact>;
  flags: Record<string, string | number | boolean>;
  attitudes: Record<string, number>;
  chosen: Record<string, number>;
  updates: SentUpdate[];
  log: LogEntry[];
  /** דקות שנוספו מפעולות ומנסיעה */
  simMinutes: number;
  /** זמן תרגול פעיל במילישניות (נעצר בהשהיה ובמעבר) */
  activeMs: number;
  endingId?: string;
  lastLines: Line[];
  /** אירוע מתפתח שקרה בתור האחרון (להצגה ולצליל) */
  lastEvent?: string;
  /** הפעולות שהוזנו – מאפשר שחזור עד נקודת החלטה */
  actions: GameAction[];
  startedAt: string;
  finishedAt?: string;
}

/** ms = זמן התרגול הפעיל ברגע הפעולה (נשמר לשחזור מדויק של זמני היומן) */
export type GameAction = (
  | { type: 'CHOOSE'; choiceId: string; turn: number }
  | { type: 'SEND_UPDATE'; elements: string[]; note: string; turn: number }
  | { type: 'GO'; turn: number }
  | { type: 'ARRIVE'; turn: number; skipped: boolean }
  | { type: 'FINISH'; turn: number }
  | { type: 'TICK'; ms: number }
) & { at?: number };
