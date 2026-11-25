import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('כיסוי הקלטות מלא', () => {
  it('לכל שורה יש הקלטה – כל תרחיש, גרסה, מצב קשר, שוטר ושוטרת', () => {
    const out = execSync('npx vite-node scripts/voice-audit.ts', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    expect(out).toContain('✓ לכל שורה יש הקלטה');
  }, 120000);
});
