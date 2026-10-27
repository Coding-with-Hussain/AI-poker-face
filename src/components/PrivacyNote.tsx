import { ShieldCheck } from 'lucide-react';

export const PRIVACY_STATEMENT = 'Your camera is processed locally on this device. Video is not uploaded or recorded.';

export function PrivacyNote({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`privacy-note ${compact ? 'compact' : ''}`}>
      <ShieldCheck size={compact ? 16 : 20} aria-hidden="true" />
      <div>
        <strong>{PRIVACY_STATEMENT}</strong>
        {!compact && (
          <span>
            The webcam is only used to estimate facial cues during play. No sign-up, no face identification, and nothing
            about your face is saved. Use the camera button at the top to switch it off at any time.
          </span>
        )}
      </div>
    </div>
  );
}
