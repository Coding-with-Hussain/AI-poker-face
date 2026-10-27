import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { CameraOff, Cpu, Loader2, ScanFace, UserX } from 'lucide-react';
import { useVisionStatus } from '../hooks/useCamera';
import { useFaceDetected } from '../hooks/useFaceTracking';
import { getActiveEstimate } from '../vision/laughMonitor';
import { clearOverlay, drawFaceOverlay } from '../vision/overlayRenderer';
import { visionService } from '../vision/visionService';

interface CameraPreviewProps {
  showOverlay: boolean;
  /** Show the "CPU AI ACTIVE" and face status chips. */
  showStatus?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * Shows the shared webcam <video> (mirrored like a selfie camera) with an
 * optional landmark overlay. The video element itself belongs to the vision
 * service; this component only borrows it while mounted.
 */
export function CameraPreview({ showOverlay, showStatus = true, className = '', children }: CameraPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const status = useVisionStatus();
  const faceDetected = useFaceDetected();

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    visionService.adoptVideo(host);
    return () => visionService.releaseVideo(host);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    if (!showOverlay) {
      clearOverlay(canvas);
      return undefined;
    }
    const video = visionService.getVideoElement();
    return visionService.subscribeFrames((frame) => {
      drawFaceOverlay(canvas, video, frame?.landmarks ?? null, getActiveEstimate()?.state ?? 'no-face');
    });
  }, [showOverlay]);

  const cameraReady = status.camera === 'ready';
  const tracking = status.tracking === 'running';

  return (
    <div className={`camera-preview ${className}`} data-face={faceDetected ? 'yes' : 'no'}>
      <div ref={hostRef} className="camera-host" />
      <canvas ref={canvasRef} className="camera-overlay" aria-hidden="true" />

      {!cameraReady && (
        <div className="camera-placeholder">
          {status.camera === 'requesting' ? <Loader2 className="spin" size={40} /> : <CameraOff size={40} />}
          <span>
            {status.camera === 'requesting'
              ? 'Requesting camera access...'
              : status.camera === 'error'
                ? 'Camera unavailable'
                : 'Camera is off'}
          </span>
        </div>
      )}

      {showStatus && cameraReady && (
        <div className="camera-chips">
          {tracking ? (
            <span className="chip chip-cyan" title={`Inference delegate: ${status.modelInfo?.delegate ?? 'CPU'}`}>
              <Cpu size={14} /> {status.modelInfo?.delegate ?? 'CPU'} AI ACTIVE
            </span>
          ) : (
            <span className="chip chip-muted">
              <Loader2 size={14} className="spin" /> AI starting
            </span>
          )}
          {tracking && (
            <span className={`chip ${faceDetected ? 'chip-green' : 'chip-amber'}`}>
              {faceDetected ? <ScanFace size={14} /> : <UserX size={14} />}
              {faceDetected ? 'Face detected' : 'No face detected'}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
