import { useState } from 'react';
import { evalCond } from '../engine/conditions';
import { lightsOf, moodOf, visibleHotspots } from '../engine/game';
import type { GameState, LightsMode, Mood, Scenario } from '../engine/types';
import { Car, Patrol, Person, Prop } from './Figures';

const MOOD_TEXT: Record<Mood, [string, string]> = {
  calm: ['נראה רגוע', 'נראית רגועה'],
  tense: ['נראה מתוח, ידיים שלובות', 'נראית מתוחה, ידיים שלובות'],
  upset: ['נסער, מדבר בקול ומצביע', 'נסערת, מדברת בקול ומצביעה'],
  hurt: ['נראה כואב, אוחז במקום הפגיעה', 'נראית כואבת, אוחזת במקום הפגיעה'],
};
export function moodLabel(mood: Mood, gender: 'f' | 'm' = 'm') {
  return MOOD_TEXT[mood][gender === 'f' ? 1 : 0];
}

export const LIGHTS_LABEL: Record<LightsMode, string> = {
  off: 'אורות ניידת כבויים',
  steady: 'אורות ניידת פעילים – אור קבוע',
  reflect: 'אורות ניידת פעילים – השתקפות על הכביש',
};

export function bgUrl(base: string, shift: string) {
  return `${import.meta.env.BASE_URL}${base}-${shift === 'night' ? 'night' : 'day'}.webp`;
}

interface Props {
  sc: Scenario;
  st: GameState;
  selected: string | null;
  onSelect: (hotspotId: string) => void;
  animate: boolean;
  lightsAnim: boolean;
  showLabels: boolean;
}

export function SceneView({ sc, st, selected, onSelect, animate, lightsAnim, showLabels }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const shift = st.config.shift;
  const scene = sc.scene;
  const lights = lightsOf(sc, st);
  const ctx = { sc, st };
  const hotspots = visibleHotspots(sc, st);
  const props = (scene.props ?? []).filter((p) => evalCond(ctx, p.when));
  const chars = sc.characters.filter((c) => evalCond(ctx, c.when));
  const patrol = props.find((p) => p.kind === 'patrol');
  const speakers = new Set(st.lastLines.map((l) => l.speaker));
  const radioIn = speakers.has('dispatch');
  const focus = hotspots.find((h) => h.id === selected);
  const event = st.lastEvent ? sc.events?.find((e) => e.id === st.lastEvent) : undefined;

  return (
    <div className={`scene ${animate ? 'anim-ok' : ''}`} role="group" aria-label={`זירת האירוע: ${sc.location.name}`}>
      {/* „מצלמה”: התקרבות עדינה לנקודה שנבחרה (רק כשתנועה מותרת) */}
      <div
        className={`cam ${animate && focus ? 'focused' : ''}`}
        style={focus ? { transformOrigin: `${focus.x}% ${focus.y}%` } : undefined}
        data-testid="scene-cam"
      >
      {!imgFailed ? (
        <img className="bg" src={bgUrl(scene.background, shift)} alt="" onError={() => setImgFailed(true)} />
      ) : (
        <div className="bg-fallback" style={{ background: scene.fallbackColor }}>
          <p>
            התמונה לא נטענה. תיאור הזירה: {scene.alt}
          </p>
        </div>
      )}
      <p className="sr-only">{scene.alt}</p>

      {/* תאורת ניידת – השתקפות מקומית על האספלט בלבד, ללא הבזק מסך */}
      {lights !== 'off' && scene.reflect && (
        <div
          className={`lights-reflect ${lights} ${lightsAnim && lights === 'reflect' ? 'anim' : ''}`}
          style={{ left: `${scene.reflect.x}%`, top: `${scene.reflect.y}%`, width: `${scene.reflect.w}%`, height: `${scene.reflect.h}%` }}
        >
          <div className="r" />
          <div className="b" />
        </div>
      )}

      {props
        .filter((p) => p.kind !== 'patrol')
        .map((p) => (
          <div key={p.id} className="actor" style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${(p.kind.startsWith('car') ? 24 : p.kind.includes('glow') ? 14 : 4) * (p.scale ?? 1)}%`, transform: `translate(-50%, -100%) ${p.flip ? 'scaleX(-1)' : ''}` }}>
            {p.kind === 'car-red' ? <Car color="#b3262e" dent="side" /> : p.kind === 'car-silver' ? <Car color="#b8bec6" dent="front" /> : <Prop kind={p.kind} />}
          </div>
        ))}

      {chars.map((c) => {
        const mood = moodOf(sc, st, c.id);
        const h = (c.look.height ?? 1) * (c.scale ?? 1);
        return (
          <div
            key={c.id}
            className={`actor person ${speakers.has(c.id) ? 'speaking' : ''}`}
            style={{ left: `${c.x}%`, top: `${c.y}%`, width: `${8.2 * h}%` }}
            data-mood={mood}
            data-testid={`char-${c.id}`}
          >
            {speakers.has(c.id) && <span className="talk" aria-hidden="true">…</span>}
            {/* מפתח לפי מצב: שינוי מצב רוח מפעיל תגובה קצרה של הדמות */}
            <div className="mood-wrap" key={mood}>
              <Person look={c.look} mood={mood} />
            </div>
          </div>
        );
      })}

      {patrol && (
        <div className="actor" style={{ left: `${patrol.x}%`, top: `${patrol.y}%`, width: `${25 * (patrol.scale ?? 1)}%` }}>
          <Patrol lights={lights} />
        </div>
      )}

      <div className={`tint ${shift}`} />
      {scene.weather === 'rain' && <div className={`rain ${animate ? 'anim' : ''}`} />}

      {hotspots.map((h, i) => (
        <button
          key={h.id}
          type="button"
          className="marker"
          style={{ left: `${h.x}%`, top: `${h.y}%` }}
          aria-pressed={selected === h.id}
          aria-label={`${i + 1}. ${h.label}`}
          tabIndex={-1}
          onClick={() => onSelect(h.id)}
        >
          {i + 1}
          {showLabels && <span className="lbl">{h.label.split(' – ')[0]}</span>}
        </button>
      ))}
      </div>

      <div className={`radio-led ${radioIn ? 'rx' : ''}`} data-testid="radio-led" aria-hidden="true">
        <span className="led" />
        {radioIn ? 'הודעת מוקד' : 'קשר'}
      </div>

      {event && (
        <div className="event-banner" role="status" data-testid="event-banner">
          ⚠ התפתחות בזירה
        </div>
      )}

      {lights !== 'off' && (
        <div className="lights-label" role="status">
          <span className="dot" style={{ background: 'var(--red)' }} />
          <span className="dot" style={{ background: 'var(--blue)' }} />
          {LIGHTS_LABEL[lights]}
        </div>
      )}

    </div>
  );
}
