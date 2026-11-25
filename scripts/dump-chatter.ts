/** מייצא גופי הודעות משותפים לכלי הקריינות: תעבורת קשר ברקע ותשובות 401/11 לעדכונים */
import { CHATTER_BODIES } from '../src/config/stations';
import { RECIPIENT_BODIES } from '../src/engine/procedure';
const recipient = Object.entries(RECIPIENT_BODIES).flatMap(([who, b]) => Object.values(b).map((body) => ({ who, body })));
process.stdout.write(JSON.stringify([...CHATTER_BODIES, ...recipient]));
