import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ERROR_COPY, type VisionError } from '../vision/visionErrors';

interface ErrorPanelProps {
  error: VisionError;
  onRetry?: () => void;
  retryLabel?: string;
}

/** Player-facing error with recovery steps; technical details stay in the console. */
export function ErrorPanel({ error, onRetry, retryLabel = 'Try again' }: ErrorPanelProps) {
  const copy = ERROR_COPY[error.kind];
  return (
    <div className="error-panel" role="alert">
      <div className="error-panel-head">
        <AlertTriangle size={22} />
        <h3>{copy.title}</h3>
      </div>
      <p>{copy.message}</p>
      <ul>
        {copy.recovery.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>
      {onRetry && (
        <button type="button" className="secondary-button" onClick={onRetry}>
          <RefreshCw size={16} /> {retryLabel}
        </button>
      )}
    </div>
  );
}
