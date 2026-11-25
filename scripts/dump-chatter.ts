/** מייצא את גופי ההודעות של תעבורת הקשר ברקע (לכלי הקריינות) */
import { CHATTER_BODIES } from '../src/config/stations';
process.stdout.write(JSON.stringify(CHATTER_BODIES));
