/** מייצא את כל התרחישים אחרי שכבת נוהל הקשר (לכלי הקריינות): npx vite-node scripts/dump-scenarios.ts > out.json */
import { readFileSync } from 'node:fs';
import { withProcedure } from '../src/engine/procedure';
const idx = JSON.parse(readFileSync('public/scenarios/index.json', 'utf8')).scenarios as { id: string; file: string }[];
const out = idx.map((e) => withProcedure(JSON.parse(readFileSync(`public/scenarios/${e.file}`, 'utf8'))));
process.stdout.write(JSON.stringify(out));
