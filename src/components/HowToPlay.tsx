import { Camera, Laugh, ScanFace, ShieldCheck, Timer, Trophy } from 'lucide-react';
import { SCORING } from '../game/gameConfig';
import { Modal } from './Modal';

export function HowToPlay({ onClose }: { onClose: () => void }) {
  const steps = [
    { icon: <Camera size={22} />, title: 'Allow the camera', text: 'The game watches your face through the webcam. Video never leaves this device.' },
    { icon: <ScanFace size={22} />, title: 'Calibrate', text: 'Relax and look at the camera for two seconds so the AI learns your neutral face.' },
    { icon: <Laugh size={22} />, title: 'Survive the jokes', text: 'Jokes, absurd questions and silly animations appear. Keep a straight face!' },
    {
      icon: <Timer size={22} />,
      title: 'Watch the meter',
      text: `The meter shows Calm → Suspicious Smile → High Risk. A sustained laugh-like expression is a strike (−${SCORING.penaltyPerStrike}).`,
    },
    { icon: <Trophy size={22} />, title: 'Win', text: `Survive the timer for +${SCORING.survivalBonus}. ${SCORING.maxStrikes} strikes and you are out.` },
  ];
  return (
    <Modal title="How to play" onClose={onClose} wide>
      <ol className="how-to-steps">
        {steps.map((step, i) => (
          <li key={step.title}>
            <span className="how-to-icon">{step.icon}</span>
            <div>
              <h3>
                {i + 1}. {step.title}
              </h3>
              <p>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="how-to-notes">
        <p>
          <strong>About the AI:</strong> a MediaPipe Face Landmarker model runs on your CPU in the browser and reports
          facial cues such as raised mouth corners, an open jaw and raised cheeks. The game combines these cues into an{' '}
          <em>AI laugh estimation</em>. It cannot read emotions and is not perfect: a big grin may count, and a silent
          giggle may slip through.
        </p>
        <p>
          <ShieldCheck size={16} /> Hiding your face pauses the timer, so it is not a strategy. Keyboard: <kbd>Space</kbd>{' '}
          pause, <kbd>M</kbd> mute, <kbd>Shift</kbd>+<kbd>D</kbd> diagnostics.
        </p>
      </div>
    </Modal>
  );
}
