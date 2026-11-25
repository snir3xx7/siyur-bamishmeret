/**
 * מפת סריקה אחרי איכון בחירום: רחובות סביב המקום ופוליגון האיכון (רדיוס של כשלושה רחובות).
 * מפה סכמטית בדויה – לא מפה אמיתית.
 */
export function LocateMap({ center, streets }: { center: string; streets: string[] }) {
  const [a, b, c, d] = [...streets, '', '', '', ''];
  // פוליגון לא סימטרי – כמו תא איכון אמיתי
  const poly = '78,46 214,30 290,92 274,170 150,192 46,140';
  return (
    <figure className="locate-map" data-testid="locate-map" aria-label={`פוליגון איכון סביב ${center}: ${streets.join(', ')}`}>
      <svg viewBox="0 0 330 220" role="img">
        <rect x="0" y="0" width="330" height="220" rx="10" className="lm-ground" />
        {/* רחובות */}
        <path d="M0 70 H330" className="lm-street" />
        <path d="M0 150 H330" className="lm-street" />
        <path d="M110 0 V220" className="lm-street" />
        <path d="M230 0 V220" className="lm-street" />
        <path d="M0 210 L330 10" className="lm-street lm-avenue" />
        <text x="320" y="64" className="lm-name" textAnchor="start">{a}</text>
        <text x="320" y="144" className="lm-name" textAnchor="start">{b}</text>
        <text x="104" y="16" className="lm-name" textAnchor="start">{c}</text>
        <text x="224" y="212" className="lm-name" textAnchor="start">{d}</text>
        {/* הגן */}
        <rect x="128" y="86" width="86" height="50" rx="8" className="lm-park" />
        <text x="171" y="115" className="lm-park-name" textAnchor="middle">{center}</text>
        {/* פוליגון האיכון */}
        <polygon points={poly} className="lm-poly" />
        <circle cx="171" cy="111" r="5" className="lm-dot" />
      </svg>
      <figcaption>
        <b>📍 פוליגון איכון</b> – רדיוס של כשלושה רחובות. סורקים בשיטתיות מבפנים החוצה, ומעדכנים את המשל״ט בכל אזור שנסרק.
      </figcaption>
    </figure>
  );
}
