/**
 * מצלמת גוף – בדיקה לתחקיר (לא חלק מהציון). עקרונות מנוהל מצלמות גוף (בלמ"ס, הותר לפי חוק חופש המידע):
 * מפעילים עם תחילת מפגש שבו מפעילים סמכות; בכניסה לבית מודיעים לשוהים שהמצלמה מתעדת;
 * בסיום – מודיעים בקול על סיום הצילום ומכבים.
 */
import type { Choice, GameState, Hotspot, Scenario } from './types';

export const CAM_ANNOUNCE = 'cam-announce';

/** בתרחישים עם כניסה לבית: נקודה „מצלמת הגוף” עם הודעה לנוכחים */
export function addCamAnnounce(sc: Scenario, hotspots: Hotspot[]): Hotspot[] {
  if (!sc.privateHome) return hotspots;
  const choice: Choice = {
    id: CAM_ANNOUNCE,
    label: 'להודיע לנוכחים בבית: „שימו לב, מצלמת הגוף שלי מתעדת את האירוע”',
    lines: [{ speaker: 'player', text: 'שימו לב, מצלמת הגוף שלי מתעדת את האירוע.' }],
    effects: { minutes: 0 },
  };
  return [...hotspots, { id: 'h-cam', label: 'מצלמת הגוף', kind: 'area', x: 8, y: 30, description: 'מצלמת הגוף על החזה. בכניסה לבית – מודיעים לנוכחים שהיא מתעדת.', choices: [choice] }];
}

/** האם המצלמה פעלה בתור מסוים */
function onAt(st: GameState, turn: number): boolean {
  let on = false;
  for (const e of st.cam?.log ?? []) if (e.turn <= turn) on = e.on;
  return on;
}

export function bodycamReport(st: GameState, sc: Scenario): { label: string; ok: boolean; detail: string }[] {
  const log = st.cam?.log ?? [];
  const out: { label: string; ok: boolean; detail: string }[] = [];
  const first = st.cam?.firstContact;
  const firstOn = log.find((e) => e.on);
  out.push({
    label: 'הפעלה בתחילת המפגש',
    ok: !!firstOn && (first === undefined || firstOn.turn <= first),
    detail: !firstOn
      ? 'מצלמת הגוף לא הופעלה. מפעילים אותה עם תחילת מפגש שבו מפעילים סמכות.'
      : first !== undefined && firstOn.turn > first
        ? 'המצלמה הופעלה רק אחרי שכבר התחלת לדבר עם המעורבים. מפעילים עם תחילת המפגש – עוד לפני הפנייה הראשונה.'
        : 'הפעלת את המצלמה לפני הפנייה הראשונה למעורבים.',
  });
  if (sc.privateHome) {
    const at = st.chosen[CAM_ANNOUNCE];
    const ok = at !== undefined && onAt(st, at - 1);
    out.push({
      label: 'הודעה על צילום בבית',
      ok,
      detail: ok ? 'הודעת לשוהים בבית שהמצלמה מתעדת.' : at === undefined ? 'בכניסה לבית (רשות היחיד) חובה להודיע לשוהים שמצלמת הגוף מתעדת – אלא אם יש דחיפות או סכנה.' : 'הודעת על צילום כשהמצלמה עוד לא פעלה.',
    });
  }
  if (firstOn) {
    const last = log[log.length - 1];
    const ended = !st.cam?.on && last && !last.on;
    out.push({
      label: 'סיום הצילום',
      ok: !!ended,
      detail: ended ? 'בסיום הודעת בקול על סיום הצילום וכיבית את המצלמה.' : 'בסיום האירוע מודיעים בקול „אני מסיים את הצילום” ומכבים – כדי שהתיעוד יהיה רציף ומוסבר.',
    });
  }
  return out;
}
