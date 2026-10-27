import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { sound } from '../audio/soundEngine';

const STEPS = ['3', '2', '1', 'START!'] as const;
const STEP_MS = 850;
const START_MS = 650;

interface CountdownOverlayProps {
  onDone: () => void;
}

/** 3 -> 2 -> 1 -> START! with a beep per step. */
export function CountdownOverlay({ onDone }: CountdownOverlayProps) {
  const [index, setIndex] = useState(0);
  const onDoneRef = useRef(onDone);
  useLayoutEffect(() => {
    onDoneRef.current = onDone;
  });

  const soundedStep = useRef(-1);

  useEffect(() => {
    const step = STEPS[index];
    if (soundedStep.current !== index) {
      soundedStep.current = index;
      sound.play(step === 'START!' ? 'go' : 'countdown');
    }
    const timer = window.setTimeout(
      () => {
        if (index < STEPS.length - 1) setIndex(index + 1);
        else onDoneRef.current();
      },
      step === 'START!' ? START_MS : STEP_MS,
    );
    return () => window.clearTimeout(timer);
  }, [index]);

  const step = STEPS[index] ?? 'START!';
  return (
    <div className="countdown-overlay" role="status" aria-live="assertive">
      <span key={step} className={`countdown-step ${step === 'START!' ? 'is-start' : ''}`}>
        {step}
      </span>
    </div>
  );
}
