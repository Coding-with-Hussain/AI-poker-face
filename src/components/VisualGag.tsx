/**
 * Original visual gags drawn with inline SVG and animated with CSS
 * (see styles/gags.css). No images or external assets are used.
 */
import type { ReactNode } from 'react';
import type { VisualGagId } from '../content/challenges';

const INK = '#1a1530';

function ProfessorDuck() {
  return (
    <>
      <rect x="128" y="18" width="98" height="70" rx="6" fill="#123147" stroke="#7a5a32" strokeWidth="5" />
      <path d="M140 34 h34 M140 44 h22" stroke="#cfeff6" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <path d="M160 74 q0 -20 22 -20 q22 0 22 20 v6 h-44z" fill="#f4c27a" stroke="#c98d3f" strokeWidth="2.5" />
      <g className="gag-bob">
        <ellipse cx="70" cy="114" rx="42" ry="28" fill="#ffd84d" />
        <path d="M50 110 q18 -14 36 4 q-16 14 -36 -4z" fill="#f2bf1c" />
        <circle cx="88" cy="74" r="22" fill="#ffd84d" />
        <path d="M106 74 l20 4 l-20 7z" fill="#ff9f1c" />
        <ellipse className="gag-blink" cx="94" cy="68" rx="3.5" ry="3.8" fill={INK} />
        <path d="M62 54 l27 -12 l27 12 l-27 12z" fill="#22264a" />
        <rect x="77" y="54" width="24" height="9" fill="#22264a" />
        <path d="M89 54 l15 6 v13" stroke="#ffd84d" strokeWidth="2.5" fill="none" />
        <g className="gag-point">
          <line x1="104" y1="104" x2="160" y2="62" stroke="#8b5a2b" strokeWidth="4.5" strokeLinecap="round" />
        </g>
      </g>
      <path d="M54 142 h16 M78 142 h16" stroke="#ff9f1c" strokeWidth="5" strokeLinecap="round" />
    </>
  );
}

function WobblyJelly() {
  return (
    <>
      <ellipse cx="120" cy="146" rx="74" ry="9" fill="#cdd6ff" opacity="0.3" />
      <g className="gag-wobble">
        <path d="M66 144 q-8 -76 54 -84 q62 8 54 84z" fill="#ff5fa2" opacity="0.93" />
        <path d="M86 104 q2 -24 20 -32" stroke="#ffd3e8" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.65" />
        <path d="M98 100 l12 5 l-12 5" stroke="#3b0a24" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M142 100 l-12 5 l12 5" stroke="#3b0a24" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="96" cy="120" r="6" fill="#ff9cc7" />
        <circle cx="144" cy="120" r="6" fill="#ff9cc7" />
        <path className="gag-twitch" d="M108 124 h24" stroke="#3b0a24" strokeWidth="3.2" strokeLinecap="round" />
      </g>
    </>
  );
}

function DancingBanana() {
  return (
    <>
      <g className="gag-notes" fill="#b18cff" stroke="#b18cff">
        <circle cx="42" cy="64" r="6" stroke="none" />
        <path d="M48 64 v-28 l12 5" strokeWidth="3" fill="none" />
        <circle cx="196" cy="48" r="6" stroke="none" />
        <path d="M202 48 v-26 l12 5" strokeWidth="3" fill="none" />
      </g>
      <g className="gag-dance">
        <path d="M96 36 q-32 62 10 104 q32 18 62 -4 q-42 -10 -52 -52 q-6 -24 -8 -48z" fill="#ffe14d" stroke="#d4a017" strokeWidth="3" />
        <path d="M96 36 l-4 -12" stroke="#6b4f1d" strokeWidth="5" strokeLinecap="round" />
        <rect x="92" y="72" width="17" height="9" rx="3" fill="#111" />
        <rect x="113" y="76" width="17" height="9" rx="3" fill="#111" />
        <path d="M108 77 l6 2" stroke="#111" strokeWidth="2.5" />
        <path d="M104 98 q11 9 22 2" stroke="#6b4f1d" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path className="gag-arm-l" d="M94 104 l-24 -20" stroke="#d4a017" strokeWidth="4.5" strokeLinecap="round" />
        <path className="gag-arm-r" d="M142 108 l26 -22" stroke="#d4a017" strokeWidth="4.5" strokeLinecap="round" />
      </g>
    </>
  );
}

function KeyboardCat() {
  const keys: ReactNode[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 12; col += 1) {
      keys.push(<rect key={`${row}-${col}`} x={38 + col * 14} y={118 + row * 10} width="11" height="7" rx="1.5" fill="#3d4683" />);
    }
  }
  return (
    <>
      <rect x="20" y="8" width="200" height="26" rx="6" fill="#0b1026" stroke="#2c3570" />
      <text className="gag-typing" x="30" y="27" fill="#2ee6ff" fontFamily="Consolas, ui-monospace, monospace" fontSize="15">
        jjjjjjjjjjjjjjjjjjjjjjj
      </text>
      <rect x="28" y="112" width="184" height="40" rx="6" fill="#262d5c" />
      {keys}
      <path d="M90 56 l6 -26 l20 18z" fill="#f2a65a" />
      <path d="M150 56 l-6 -26 l-20 18z" fill="#f2a65a" />
      <circle cx="120" cy="76" r="34" fill="#f2a65a" />
      <path d="M100 52 q20 -8 40 0" stroke="#d9823a" strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse className="gag-blink" cx="107" cy="74" rx="5" ry="5.5" fill={INK} />
      <ellipse className="gag-blink" cx="133" cy="74" rx="5" ry="5.5" fill={INK} />
      <path d="M116 86 l4 4 l4 -4z" fill="#ff7aa2" />
      <path d="M120 90 q-6 6 -12 2 M120 90 q6 6 12 2" stroke={INK} fill="none" strokeWidth="2" strokeLinecap="round" />
      <path d="M86 84 h-18 M86 90 l-16 4 M154 84 h18 M154 90 l16 4" stroke="#fff3e0" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse className="gag-paw-l" cx="96" cy="114" rx="14" ry="8" fill="#f7b979" />
      <ellipse className="gag-paw-r" cx="144" cy="114" rx="14" ry="8" fill="#f7b979" />
    </>
  );
}

function arc(r: number): string {
  const d = r * Math.SQRT1_2;
  return `M ${120 - d} ${118 - d} A ${r} ${r} 0 0 1 ${120 + d} ${118 - d}`;
}

function SadWifi() {
  return (
    <>
      <path d={arc(94)} stroke="#2a3366" strokeWidth="12" fill="none" strokeLinecap="round" />
      <path className="gag-flicker" d={arc(64)} stroke="#2ee6ff" strokeWidth="12" fill="none" strokeLinecap="round" />
      <path d={arc(36)} stroke="#2ee6ff" strokeWidth="12" fill="none" strokeLinecap="round" />
      <circle cx="120" cy="128" r="20" fill="#2ee6ff" />
      <circle cx="113" cy="124" r="2.6" fill={INK} />
      <circle cx="127" cy="124" r="2.6" fill={INK} />
      <path d="M113 136 q7 -6 14 0" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M108 120 l7 -3 M132 120 l-7 -3" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path className="gag-tear" d="M110 130 q-4 7 0 10 q4 -3 0 -10z" fill="#bff6ff" />
    </>
  );
}

function SlidingPenguin() {
  return (
    <>
      <rect x="0" y="128" width="240" height="32" fill="#bfefff" opacity="0.22" />
      <path d="M0 128 h240" stroke="#bfefff" strokeWidth="2" opacity="0.5" />
      <g transform="translate(0 112)">
        <g className="gag-slide">
          <path d="M-64 -4 h-26 M-60 6 h-34 M-66 14 h-20" stroke="#bfefff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
          <ellipse cx="0" cy="0" rx="44" ry="18" fill="#1d2235" />
          <ellipse cx="0" cy="7" rx="34" ry="10" fill="#f4f7ff" />
          <circle cx="40" cy="-8" r="16" fill="#1d2235" />
          <circle cx="45" cy="-11" r="5" fill="#fff" />
          <circle cx="47" cy="-11" r="2.4" fill={INK} />
          <path d="M54 -6 l14 3 l-14 4z" fill="#ff9f1c" />
          <path d="M-20 -14 q-10 -10 -22 -6" stroke="#1d2235" strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M-44 4 l-12 -6 M-44 8 l-12 6" stroke="#ff9f1c" strokeWidth="5" strokeLinecap="round" />
        </g>
      </g>
    </>
  );
}

function ToastHat() {
  return (
    <>
      <ellipse cx="120" cy="150" rx="46" ry="6" fill="#000" opacity="0.25" />
      <g className="gag-bounce">
        <path d="M78 66 q0 -30 42 -30 q42 0 42 30 q0 8 -8 12 v62 h-68 v-62 q-8 -4 -8 -12z" fill="#e3a058" stroke="#b5702b" strokeWidth="4" />
        <path d="M90 70 q0 -20 30 -20 q30 0 30 20 v62 h-60z" fill="#f7d39a" />
        <ellipse className="gag-blink" cx="108" cy="92" rx="3.5" ry="4" fill={INK} />
        <ellipse className="gag-blink" cx="132" cy="92" rx="3.5" ry="4" fill={INK} />
        <path d="M112 104 q8 6 16 0" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <g className="gag-hat">
          <rect x="104" y="30" width="32" height="5" rx="2" fill="#1b1e33" />
          <rect x="110" y="12" width="20" height="20" rx="2" fill="#1b1e33" />
          <rect x="110" y="26" width="20" height="4" fill="#b18cff" />
        </g>
      </g>
    </>
  );
}

function EggMustache() {
  return (
    <>
      <path d="M120 18 c-36 0 -56 56 -56 84 c0 32 26 46 56 46 c30 0 56 -14 56 -46 c0 -28 -20 -84 -56 -84z" fill="#fff8ec" stroke="#e6d8bd" strokeWidth="3" />
      <ellipse className="gag-blink" cx="104" cy="80" rx="4" ry="4.5" fill={INK} />
      <ellipse cx="138" cy="80" rx="4" ry="4.5" fill={INK} />
      <circle cx="138" cy="80" r="11" fill="none" stroke="#d4a017" strokeWidth="3" />
      <path d="M149 82 q12 20 4 44" stroke="#d4a017" strokeWidth="1.6" fill="none" />
      <path d="M96 68 q8 -6 16 -2 M130 66 q8 -4 16 2" stroke="#7a5a3a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <g className="gag-stache">
        <path
          d="M120 100 c-8 -10 -22 -10 -30 -2 c-6 6 -16 6 -20 -2 c2 14 18 20 30 14 c8 -4 14 -6 20 -4 c6 -2 12 0 20 4 c12 6 28 0 30 -14 c-4 8 -14 8 -20 2 c-8 -8 -22 -8 -30 2z"
          fill="#4a2c1a"
        />
      </g>
    </>
  );
}

function PokerBlob() {
  return (
    <>
      <ellipse cx="120" cy="150" rx="58" ry="7" fill="#000" opacity="0.25" />
      <path className="gag-blob" d="M60 112 c-10 -42 20 -82 60 -82 c44 0 70 38 62 78 c-6 30 -30 40 -62 40 c-34 0 -54 -10 -60 -36z" fill="#7c5cff" />
      <rect x="90" y="74" width="18" height="6" rx="3" fill="#f4f1ff" />
      <rect x="132" y="74" width="18" height="6" rx="3" fill="#f4f1ff" />
      <path className="gag-mouth-flat" d="M104 108 h32" stroke="#f4f1ff" strokeWidth="4" strokeLinecap="round" />
      <path className="gag-mouth-smile" d="M102 104 q18 16 36 0" stroke="#f4f1ff" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path className="gag-sweat" d="M170 58 q7 11 0 16 q-7 -5 0 -16z" fill="#7ef0ff" />
    </>
  );
}

const SCENES: Record<VisualGagId, () => ReactNode> = {
  'professor-duck': ProfessorDuck,
  'wobbly-jelly': WobblyJelly,
  'dancing-banana': DancingBanana,
  'keyboard-cat': KeyboardCat,
  'sad-wifi': SadWifi,
  'sliding-penguin': SlidingPenguin,
  'toast-hat': ToastHat,
  'egg-mustache': EggMustache,
  'poker-blob': PokerBlob,
};

export function VisualGag({ id }: { id: VisualGagId }) {
  const Scene = SCENES[id];
  return (
    <div className={`visual-gag gag-${id}`} aria-hidden="true">
      <svg viewBox="0 0 240 160" preserveAspectRatio="xMidYMid meet">
        <Scene />
      </svg>
    </div>
  );
}
