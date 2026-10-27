import { useId } from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

const SPADE =
  'M0 -6 C3 -3 6 -1 6 2 C6 4.2 4.2 5.5 2.4 5 C1.6 4.8 1 4.3 0.6 3.6 L1.6 7 L-1.6 7 L-0.6 3.6 C-1 4.3 -1.6 4.8 -2.4 5 C-4.2 5.5 -6 4.2 -6 2 C-6 -1 -3 -3 0 -6 Z';

/** Original mark: a tilted playing card wearing a deadpan face, framed by AI scan brackets. */
export function Logo({ size = 56, className }: LogoProps) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} viewBox="0 0 64 64" width={size} height={size} role="img" aria-label="AI Poker Face logo">
      <defs>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b18cff" />
          <stop offset="1" stopColor="#2ee6ff" />
        </linearGradient>
        <linearGradient id={`${id}-card`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#222a5c" />
          <stop offset="1" stopColor="#0d1130" />
        </linearGradient>
      </defs>
      <g className="logo-brackets" fill="none" stroke="#2ee6ff" strokeWidth="2.4" strokeLinecap="round">
        <path d="M4 14 V6 H12" />
        <path d="M52 6 H60 V14" />
        <path d="M60 50 V58 H52" />
        <path d="M12 58 H4 V50" />
      </g>
      <g transform="rotate(-8 32 32)">
        <rect x="13" y="7" width="38" height="50" rx="7" fill={`url(#${id}-card)`} stroke={`url(#${id}-edge)`} strokeWidth="2.4" />
        <path d={SPADE} transform="translate(20 15) scale(0.62)" fill="#b18cff" />
        <path d={SPADE} transform="translate(44 49) rotate(180) scale(0.62)" fill="#b18cff" />
        <rect className="logo-eye" x="21" y="27" width="8.5" height="3.2" rx="1.6" fill="#eef1ff" />
        <rect className="logo-eye" x="34.5" y="27" width="8.5" height="3.2" rx="1.6" fill="#eef1ff" />
        <rect x="23.5" y="40" width="17" height="2.8" rx="1.4" fill="#2ee6ff" />
      </g>
    </svg>
  );
}
