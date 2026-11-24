import { describe, expect, it } from 'vitest';
import { voiceKey } from '../../src/audio/voiceKey';

describe('מפתח קריינות לשורה', () => {
  it('זהה למימוש בכלי ההפקה (FNV-1a על UTF-8)', () => {
    // ערכים שחושבו ב־scripts/voice-blue.py
    expect(voiceKey('dispatch', 'מוקד: קיבלתי, רשמתי.')).toBe('80fc5f75');
    expect(voiceKey('a', 'b')).toBe('294c7dd6');
    expect(voiceKey('a', 'b')).toBe(voiceKey('a', 'b'));
    expect(voiceKey('a', 'b')).not.toBe(voiceKey('b', 'b'));
  });
});
