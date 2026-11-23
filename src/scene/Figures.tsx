import type { FigureLook, LightsMode, Mood } from '../engine/types';

/** דמות מצוירת בשכבות SVG. שפת הגוף משתנה לפי מצב: רגוע, מתוח, נסער, כואב. */
export function Person({ look, mood }: { look: FigureLook; mood: Mood }) {
  const { skin, hair, hairStyle, top, bottom, accessory } = look;
  const dark = '#00000040';
  const tilt = mood === 'hurt' ? -7 : mood === 'upset' ? 3 : 0;

  const brows = {
    calm: 'M38 33 l8 0 M54 33 l8 0',
    tense: 'M38 32 l8 2 M54 34 l8 -2',
    upset: 'M37 30 l9 5 M54 35 l9 -5',
    hurt: 'M38 35 l8 -3 M54 32 l8 3',
  }[mood];
  const mouth = {
    calm: <path d="M44 51 q6 4 12 0" stroke="#5a2b22" strokeWidth="2" fill="none" />,
    tense: <path d="M44 52 l12 0" stroke="#5a2b22" strokeWidth="2.4" />,
    upset: <ellipse cx="50" cy="52" rx="5" ry="4" fill="#5a2b22" />,
    hurt: <path d="M43 54 q3 -4 7 -1 q4 3 7 -1" stroke="#5a2b22" strokeWidth="2" fill="none" />,
  }[mood];

  const hand = (x: number, y: number) => <circle cx={x} cy={y} r="6" fill={skin} />;
  let arms: JSX.Element;
  if (mood === 'tense') {
    arms = (
      <g>
        <path d="M30 78 Q22 105 40 108 L66 104" stroke={top} strokeWidth="12" fill="none" strokeLinecap="round" />
        <path d="M70 78 Q78 102 60 110 L36 106" stroke={top} strokeWidth="12" fill="none" strokeLinecap="round" />
        <path d="M70 78 Q78 102 60 110 L36 106" stroke={dark} strokeWidth="1" fill="none" />
        {hand(66, 104)}
        {hand(36, 106)}
      </g>
    );
  } else if (mood === 'upset') {
    arms = (
      <g>
        <path d="M30 78 L22 136" stroke={top} strokeWidth="12" strokeLinecap="round" />
        {hand(22, 140)}
        <path d="M70 78 L94 52" stroke={top} strokeWidth="12" strokeLinecap="round" />
        {hand(97, 48)}
        <path d="M97 48 l8 -6" stroke={skin} strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  } else if (mood === 'hurt') {
    arms = (
      <g>
        <path d="M70 78 L77 136" stroke={top} strokeWidth="12" strokeLinecap="round" />
        {hand(78, 140)}
        <path d="M30 78 Q26 92 42 84 L48 70" stroke={top} strokeWidth="12" fill="none" strokeLinecap="round" />
        {hand(49, 66)}
      </g>
    );
  } else {
    arms = (
      <g>
        <path d="M30 78 L24 136" stroke={top} strokeWidth="12" strokeLinecap="round" />
        <path d="M70 78 L76 136" stroke={top} strokeWidth="12" strokeLinecap="round" />
        {hand(24, 140)}
        {hand(76, 140)}
      </g>
    );
  }

  return (
    <svg viewBox="0 0 110 225" aria-hidden="true">
      <ellipse cx="50" cy="221" rx="30" ry="4" fill="#0006" />
      <g className="breathe">
        {hairStyle === 'long' && <rect x="29" y="30" width="42" height="56" rx="16" fill={hair} />}
        {/* רגליים */}
        <rect x="35" y="140" width="13" height="76" rx="5" fill={bottom} />
        <rect x="52" y="140" width="13" height="76" rx="5" fill={bottom} />
        <rect x="31" y="212" width="19" height="9" rx="4" fill="#1b1b1b" />
        <rect x="50" y="212" width="19" height="9" rx="4" fill="#1b1b1b" />
        {/* גוף */}
        <path d="M28 82 Q28 70 40 68 L60 68 Q72 70 72 82 L70 146 L30 146 Z" fill={top} />
        <path d="M30 140 L70 140 L70 146 L30 146 Z" fill={dark} />
        {accessory === 'apron' && <rect x="36" y="96" width="28" height="48" rx="4" fill="#e7e2d4" />}
        {accessory === 'bag' && <rect x="66" y="110" width="16" height="22" rx="3" fill="#6b4a2b" />}
        <rect x="45" y="58" width="10" height="12" fill={skin} />
        <g transform={`rotate(${tilt} 50 60)`}>
          <circle cx="50" cy="42" r="19" fill={skin} />
          {hairStyle === 'short' && <path d="M31 40 Q31 20 50 20 Q69 20 69 40 Q62 28 50 29 Q38 28 31 40 Z" fill={hair} />}
          {hairStyle === 'long' && <path d="M31 44 Q30 20 50 20 Q70 20 69 44 Q64 27 50 28 Q36 27 31 44 Z" fill={hair} />}
          {hairStyle === 'bun' && (
            <>
              <circle cx="50" cy="18" r="8" fill={hair} />
              <path d="M31 40 Q31 22 50 22 Q69 22 69 40 Q60 30 50 30 Q40 30 31 40 Z" fill={hair} />
            </>
          )}
          {hairStyle === 'cap' && (
            <>
              <path d="M30 36 Q30 18 50 18 Q70 18 70 36 Z" fill="#33475b" />
              <path d="M66 34 L84 36 L68 38 Z" fill="#2a3a4a" />
            </>
          )}
          <circle cx="43" cy="42" r="2.2" fill="#1b1b1b" />
          <circle cx="57" cy="42" r="2.2" fill="#1b1b1b" />
          <path d={brows} stroke="#2a1d16" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          {mouth}
        </g>
        {arms}
        {accessory === 'phone' && mood !== 'hurt' && <rect x="72" y="128" width="9" height="15" rx="2" fill="#111" stroke="#666" />}
        {accessory === 'umbrella' && (
          <g>
            <line x1="24" y1="140" x2="40" y2="4" stroke="#333" strokeWidth="3" />
            <path d="M-8 18 Q40 -30 88 6 Z" fill="#1f4f7a" />
            <path d="M-8 18 Q8 10 20 14 Q32 6 44 11 Q58 4 72 9 Q80 6 88 6" stroke="#163a5a" strokeWidth="2" fill="none" />
          </g>
        )}
      </g>
    </svg>
  );
}

/** רכב פרטי במבט צד. dent = סימון נזק */
export function Car({ color, dent }: { color: string; dent?: 'front' | 'side' }) {
  return (
    <svg viewBox="0 0 260 110" aria-hidden="true">
      <ellipse cx="130" cy="104" rx="120" ry="7" fill="#0007" />
      <path d="M12 78 Q10 58 30 54 L70 50 Q92 22 120 20 L170 20 Q196 22 214 48 L242 54 Q254 58 252 78 L250 88 L14 88 Z" fill={color} />
      <path d="M84 50 Q100 28 120 27 L144 27 L144 50 Z" fill="#8fb1c9" opacity=".85" />
      <path d="M150 27 L170 27 Q190 28 204 48 L150 50 Z" fill="#8fb1c9" opacity=".85" />
      <path d="M14 70 L250 70" stroke="#00000030" strokeWidth="2" />
      <rect x="236" y="58" width="14" height="8" rx="3" fill="#ffe9a8" />
      <rect x="12" y="60" width="10" height="8" rx="3" fill="#c22" />
      <rect x="110" y="58" width="16" height="4" rx="2" fill="#00000055" />
      <rect x="172" y="58" width="16" height="4" rx="2" fill="#00000055" />
      {dent === 'front' && <path d="M226 64 l10 6 l-6 6 l10 4" stroke="#222" strokeWidth="2" fill="none" />}
      {dent === 'side' && <path d="M150 56 q10 10 20 0 q6 12 18 4" stroke="#222" strokeWidth="2.5" fill="none" />}
      {[64, 198].map((x) => (
        <g key={x}>
          <circle cx={x} cy="88" r="19" fill="#1a1a1a" />
          <circle cx={x} cy="88" r="9" fill="#9aa0a6" />
        </g>
      ))}
    </svg>
  );
}

/** ניידת סיור מקורית (ללא סמלים של גוף אמיתי). lights קובע את מצב הפנסים בסרגל */
export function Patrol({ lights }: { lights: LightsMode }) {
  const on = lights !== 'off';
  return (
    <svg viewBox="0 0 270 125" aria-hidden="true">
      <defs>
        <radialGradient id="pr">
          <stop offset="0" stopColor="#ff4a50" stopOpacity=".9" />
          <stop offset="1" stopColor="#ff4a50" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pb">
          <stop offset="0" stopColor="#4a86ff" stopOpacity=".9" />
          <stop offset="1" stopColor="#4a86ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="135" cy="119" rx="124" ry="7" fill="#0007" />
      {on && (
        <>
          <circle cx="112" cy="22" r="34" fill="url(#pr)" />
          <circle cx="154" cy="22" r="34" fill="url(#pb)" />
        </>
      )}
      <rect x="100" y="16" width="64" height="12" rx="4" fill="#222" />
      <rect x="103" y="18" width="28" height="8" rx="3" fill={on ? '#ff5258' : '#6a2a2c'} />
      <rect x="133" y="18" width="28" height="8" rx="3" fill={on ? '#5b93ff' : '#2a3a6a'} />
      <path d="M12 92 Q10 70 30 66 L72 62 Q94 32 124 30 L176 30 Q202 32 220 60 L250 66 Q262 70 260 92 L258 102 L14 102 Z" fill="#f2f4f6" />
      <path d="M86 62 Q102 38 124 37 L148 37 L148 62 Z" fill="#6f8ea6" />
      <path d="M154 37 L176 37 Q196 38 210 60 L154 62 Z" fill="#6f8ea6" />
      <rect x="14" y="74" width="246" height="12" fill="#1f4f9a" />
      <rect x="14" y="86" width="246" height="4" fill="#e8c15a" />
      <text x="150" y="70" fontFamily="Arial Hebrew, Arial" fontSize="15" fontWeight="700" fill="#1f4f9a" textAnchor="middle" direction="rtl">
        סיור
      </text>
      <path d="M112 64 l7 -4 l7 4 v6 q0 5 -7 7 q-7 -2 -7 -7 z" fill="#1f4f9a" stroke="#e8c15a" strokeWidth="1.2" />
      <rect x="244" y="70" width="14" height="8" rx="3" fill="#ffe9a8" />
      {[66, 206].map((x) => (
        <g key={x}>
          <circle cx={x} cy="102" r="19" fill="#1a1a1a" />
          <circle cx={x} cy="102" r="9" fill="#b0b6bc" />
        </g>
      ))}
    </svg>
  );
}

export function Prop({ kind }: { kind: string }) {
  if (kind === 'door-glow' || kind === 'glow-dim')
    return (
      <svg viewBox="0 0 200 300" aria-hidden="true" style={{ mixBlendMode: 'screen' }}>
        <defs>
          <radialGradient id={`dg-${kind}`} cx="50%" cy="55%" r="50%">
            <stop offset="0" stopColor="#ffc46b" stopOpacity={kind === 'door-glow' ? 0.55 : 0.18} />
            <stop offset="1" stopColor="#ff9a2e" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="100" cy="160" rx="100" ry="140" fill={`url(#dg-${kind})`} />
        <rect x="55" y="288" width="90" height="8" rx="3" fill="#ffd18a" opacity={kind === 'door-glow' ? 0.95 : 0.35} />
      </svg>
    );
  if (kind === 'cone')
    return (
      <svg viewBox="0 0 40 50" aria-hidden="true">
        <path d="M8 46 L20 4 L32 46 Z" fill="#ff7a1a" />
        <path d="M13 30 L27 30 L29 36 L11 36 Z" fill="#fff" />
        <rect x="2" y="44" width="36" height="5" rx="2" fill="#333" />
      </svg>
    );
  if (kind === 'speaker')
    return (
      <svg viewBox="0 0 60 90" aria-hidden="true">
        <rect x="4" y="4" width="52" height="82" rx="6" fill="#222" stroke="#555" />
        <circle cx="30" cy="30" r="12" fill="#444" />
        <circle cx="30" cy="62" r="18" fill="#444" />
        <circle cx="30" cy="62" r="7" fill="#111" />
      </svg>
    );
  if (kind === 'lock')
    return (
      <svg viewBox="0 0 40 50" aria-hidden="true">
        <path d="M10 22 V14 a10 10 0 0 1 20 0 V22" stroke="#c9c9c9" strokeWidth="5" fill="none" />
        <rect x="5" y="22" width="30" height="24" rx="4" fill="#d4a017" stroke="#8a6a0a" />
        <circle cx="20" cy="33" r="3.5" fill="#5a4505" />
      </svg>
    );
  return null;
}
