import { ArrowLeft, Camera, CameraOff, Cpu, Settings, Volume2, VolumeX } from 'lucide-react';
import type { ReactNode } from 'react';
import { useVisionStatus } from '../hooks/useCamera';
import { Logo } from './Logo';

interface GameHeaderProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onStopCamera: () => void;
  onBack?: () => void;
  backLabel?: string;
  center?: ReactNode;
}

export function GameHeader({ soundEnabled, onToggleSound, onOpenSettings, onStopCamera, onBack, backLabel = 'Back', center }: GameHeaderProps) {
  const status = useVisionStatus();
  const cameraOn = status.camera === 'ready' || status.camera === 'requesting';
  return (
    <header className="game-header">
      <div className="game-header-left">
        {onBack && (
          <button type="button" className="ghost-button" onClick={onBack}>
            <ArrowLeft size={18} /> {backLabel}
          </button>
        )}
        <div className="brand-mini">
          <Logo size={34} />
          <span className="brand-mini-text">
            AI <strong>POKER FACE</strong>
          </span>
        </div>
      </div>
      <div className="game-header-center">{center}</div>
      <div className="game-header-right">
        <span className="chip chip-cyan" title="All inference runs locally in this browser on the CPU (WebAssembly)">
          <Cpu size={14} /> Local CPU AI
        </span>
        {cameraOn ? (
          <button type="button" className="chip chip-button chip-red" onClick={onStopCamera} title="Turn the webcam off now">
            <span className="rec-dot" aria-hidden="true" />
            <Camera size={14} /> Camera on · Stop
          </button>
        ) : (
          <span className="chip chip-muted">
            <CameraOff size={14} /> Camera off
          </span>
        )}
        <button type="button" className="icon-button" onClick={onToggleSound} aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}>
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
        <button type="button" className="icon-button" onClick={onOpenSettings} aria-label="Settings">
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
}
