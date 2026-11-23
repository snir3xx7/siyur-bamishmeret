import { useEffect, useRef, useState } from 'react';
import type { Shift } from '../engine/types';

const DURATION = 7000;

interface Props {
  kind: 'car' | 'street';
  shift: Shift;
  rain: boolean;
  text: string;
  animate: boolean;
  /** true = פעיל (סופר זמן ויעבור אוטומטית); false = תצוגה סטטית בשלב קבלת המשימה */
  running: boolean;
  paused?: boolean;
  onDone?: (skipped: boolean) => void;
}

const SKY: Record<Shift, [string, string]> = {
  morning: ['#9fc3e0', '#e6eef3'],
  evening: ['#4b3a6b', '#e99a5c'],
  night: ['#070b14', '#1d2740'],
};

/** קטע מעבר קצר מתוך הניידת או ממבט חיצוני. ניתן לדלג; שעון התרחיש עצור בזמן המעבר. */
export function Transition({ kind, shift, rain, text, animate, running, paused, onDone }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const done = useRef(false);
  const skipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!running) return;
    skipRef.current?.focus();
  }, [running]);

  useEffect(() => {
    if (!running || paused) return;
    const id = setInterval(() => setElapsed((e) => e + 100), 100);
    return () => clearInterval(id);
  }, [running, paused]);

  useEffect(() => {
    if (running && elapsed >= DURATION && !done.current) {
      done.current = true;
      onDone?.(false);
    }
  }, [elapsed, running, onDone]);

  const [s1, s2] = SKY[shift];
  const night = shift === 'night';
  const lit = night ? '#ffd98a' : shift === 'evening' ? '#ffc977' : '#6f8aa1';

  const street = (
    <g className="street-scroll">
      {Array.from({ length: 16 }, (_, i) => {
        const x = -800 + i * 110;
        const h = 120 + ((i * 37) % 90);
        return (
          <g key={i}>
            <rect x={x} y={300 - h} width="100" height={h} fill={night ? '#3c3a3f' : '#cbbfa9'} />
            {Array.from({ length: Math.floor(h / 34) }, (_, r) =>
              [0, 1, 2].map((c) => <rect key={`${r}-${c}`} x={x + 10 + c * 30} y={300 - h + 12 + r * 34} width="18" height="16" fill={(i + r + c) % 3 === 0 ? lit : night ? '#1c2533' : '#8aa0b3'} />),
            )}
          </g>
        );
      })}
    </g>
  );

  return (
    <div className={`transition ${animate ? 'anim-ok' : ''}`} role="region" aria-label="מעבר לזירה">
      {kind === 'car' ? (
        <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="tsky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={s1} />
              <stop offset="1" stopColor={s2} />
            </linearGradient>
            <clipPath id="ws">
              <path d="M90 60 Q400 20 710 60 L760 300 L40 300 Z" />
            </clipPath>
          </defs>
          <g clipPath="url(#ws)">
            <rect width="800" height="300" fill="url(#tsky)" />
            {street}
            <rect y="270" width="800" height="40" fill={night ? '#15181e' : '#4b5058'} />
            {night && (
              <g className="lamp-pass">
                <circle cx="0" cy="150" r="60" fill="#ffe2a0" opacity=".18" />
                <circle cx="0" cy="150" r="10" fill="#ffe9b8" />
              </g>
            )}
            {rain && <rect width="800" height="300" fill="url(#tsky)" opacity=".12" />}
          </g>
          {rain && (
            <g fill="#dfe9f5" opacity=".55">
              {Array.from({ length: 60 }, (_, i) => (
                <ellipse key={i} cx={(i * 131) % 760 + 30} cy={(i * 57) % 230 + 60} rx="2" ry="3" />
              ))}
            </g>
          )}
          {/* מגבים */}
          <g className="wiper" style={{ transformOrigin: '250px 305px' }}>
            <line x1="250" y1="305" x2="470" y2="250" stroke="#111" strokeWidth="6" strokeLinecap="round" />
          </g>
          <g className="wiper" style={{ transformOrigin: '520px 305px', animationDelay: '.1s' }}>
            <line x1="520" y1="305" x2="740" y2="250" stroke="#111" strokeWidth="6" strokeLinecap="round" />
          </g>
          {/* לוח מחוונים */}
          <path d="M0 290 Q400 250 800 290 L800 450 L0 450 Z" fill="#1b1e22" />
          <rect x="300" y="330" width="200" height="60" rx="8" fill="#0d1a17" stroke="#2b5c53" />
          <text x="400" y="368" fontFamily="Menlo, monospace" fontSize="20" fill="#8fe0d3" textAnchor="middle">
            סייר · קשר פתוח
          </text>
          <circle cx="160" cy="420" r="120" fill="none" stroke="#2a2d31" strokeWidth="26" />
          <rect x="560" y="330" width="120" height="40" rx="6" fill="#222" />
          <circle cx="585" cy="350" r="6" fill="#ff5258" />
          <circle cx="610" cy="350" r="6" fill="#5b93ff" />
        </svg>
      ) : (
        <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="tsky2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={s1} />
              <stop offset="1" stopColor={s2} />
            </linearGradient>
          </defs>
          <rect width="800" height="450" fill="url(#tsky2)" />
          <g transform="translate(0 60)">{street}</g>
          <rect y="360" width="800" height="90" fill={night ? '#15181e' : '#55595f'} />
          <g transform="translate(300 300)">
            <path d="M12 72 Q10 50 30 46 L72 42 Q94 12 124 10 L176 10 Q202 12 220 40 L250 46 Q262 50 260 72 L258 82 L14 82 Z" fill="#f2f4f6" />
            <rect x="14" y="54" width="246" height="10" fill="#1f4f9a" />
            <rect x="100" y="0" width="64" height="10" rx="4" fill="#222" />
            <circle cx="66" cy="82" r="18" fill="#1a1a1a" />
            <circle cx="206" cy="82" r="18" fill="#1a1a1a" />
          </g>
        </svg>
      )}
      {running && <div className="progress" style={{ width: `${Math.min(100, (elapsed / DURATION) * 100)}%` }} aria-hidden="true" />}
      <p className="caption">{text}</p>
      {running && (
        <button
          ref={skipRef}
          type="button"
          className="btn small skip"
          onClick={() => {
            if (done.current) return;
            done.current = true;
            onDone?.(true);
          }}
        >
          דילוג על המעבר ⏭
        </button>
      )}
    </div>
  );
}
