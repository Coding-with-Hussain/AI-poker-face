import { useEffect, useRef, useState } from 'react';

interface ScoreDisplayProps {
  score: number;
  label?: string;
}

/** Score with a floating delta badge whenever it changes. */
export function ScoreDisplay({ score, label = 'Score' }: ScoreDisplayProps) {
  const previous = useRef(score);
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(null);

  useEffect(() => {
    const change = score - previous.current;
    previous.current = score;
    if (change === 0) return undefined;
    setDelta({ value: change, key: performance.now() });
    const timer = window.setTimeout(() => setDelta(null), 1400);
    return () => window.clearTimeout(timer);
  }, [score]);

  return (
    <div className="hud-stat score-display">
      <span className="hud-label">{label}</span>
      <span className="hud-value tabular" key={score}>
        {score}
      </span>
      {delta && (
        <span key={delta.key} className={`score-delta ${delta.value < 0 ? 'negative' : 'positive'}`}>
          {delta.value > 0 ? `+${delta.value}` : delta.value}
        </span>
      )}
    </div>
  );
}
