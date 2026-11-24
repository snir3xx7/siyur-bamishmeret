/** מייצא את רשימת המחוזות והתחנות (לכלי הקריינות) */
import { DISTRICTS } from '../src/config/stations';
process.stdout.write(JSON.stringify(DISTRICTS));
