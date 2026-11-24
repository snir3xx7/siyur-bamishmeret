/** בדיקת תקינות מהירה לתרחיש: npx tsx scripts/validate-scenario.ts <id> [walks] */
import { readFileSync } from 'node:fs';
import { validateScenario } from '../src/engine/validate';
const id = process.argv[2];
const sc = JSON.parse(readFileSync(`public/scenarios/${id}.json`, 'utf8'));
const r = validateScenario(sc, { walks: Number(process.argv[3] ?? 300) });
console.log(JSON.stringify({ errors: r.errors, warnings: r.warnings, ...r.stats }, null, 1));
