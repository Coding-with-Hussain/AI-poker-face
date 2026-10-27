import { useEffect, useMemo, useRef } from 'react';
import { CATEGORY_LABELS, type Challenge, type ChallengeMedia } from '../content/challenges';
import { VisualGag } from './VisualGag';

interface ChallengeCardProps {
  challenge: Challenge;
  number: number;
  punchlineRevealed: boolean;
  /** Freezes your videos while the round is paused or over. */
  paused: boolean;
  soundEnabled: boolean;
  onMediaDuration?: (challengeId: string, ms: number) => void;
  onMediaError?: (challengeId: string) => void;
}

/** Splits an emoji string into user-perceived characters (keeps ZWJ/VS16 intact). */
function graphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  return [text];
}

interface MediaViewProps {
  id: string;
  caption: string;
  media: ChallengeMedia;
  paused: boolean;
  soundEnabled: boolean;
  onDuration?: (challengeId: string, ms: number) => void;
  onError?: (challengeId: string) => void;
}

const VIDEO_VOLUME = 0.9;

/** Your own meme image or video. Videos play with sound unless the game is muted. */
function MediaView({ id, caption, media, paused, soundEnabled, onDuration, onError }: MediaViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = !soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) {
      video.pause();
      return;
    }
    video.volume = VIDEO_VOLUME;
    video.play().catch(() => {
      // The browser refused sound without a recent click: play muted instead.
      video.muted = true;
      video.play().catch((error: unknown) => console.warn(`[AI Poker Face] Video could not play: ${media.src}`, error));
    });
  }, [paused, media.src]);

  const failed = () => {
    console.warn(`[AI Poker Face] Skipping media that could not be loaded: ${media.src}`);
    onError?.(id);
  };

  return (
    <div className="challenge-media-wrap">
      {media.kind === 'image' ? (
        <img className="challenge-media" src={media.src} alt={caption || 'Meme'} onError={failed} />
      ) : (
        <video
          ref={videoRef}
          className="challenge-media is-video"
          src={media.src}
          playsInline
          loop
          preload="auto"
          aria-label={caption || 'Video'}
          onLoadedMetadata={(e) => onDuration?.(id, e.currentTarget.duration * 1000)}
          onError={failed}
        />
      )}
    </div>
  );
}

export function ChallengeCard({ challenge, number, punchlineRevealed, paused, soundEnabled, onMediaDuration, onMediaError }: ChallengeCardProps) {
  const emoji = useMemo(() => (challenge.emoji ? graphemes(challenge.emoji) : null), [challenge.emoji]);
  const style = challenge.style ?? (challenge.category === 'punchline' ? 'slide' : 'pop');
  const hasVisual = Boolean(challenge.visual || emoji || challenge.media);

  return (
    <article className={`challenge-card category-${challenge.category}`} aria-live="polite">
      <header className="challenge-meta">
        <span className="chip chip-violet">{CATEGORY_LABELS[challenge.category]}</span>
        <span className="challenge-number tabular">#{number}</span>
      </header>
      {/* Keyed per appearance so a repeated video restarts from the beginning. */}
      <div key={`${number}-${challenge.id}`} className={`challenge-body enter-${style} ${challenge.media ? 'has-media' : ''}`}>
        {emoji && (
          <div className="challenge-emoji" aria-hidden="true">
            {emoji.map((e, i) => (
              <span key={`${e}-${i}`} style={{ animationDelay: `${i * 0.12}s` }}>
                {e}
              </span>
            ))}
          </div>
        )}
        {challenge.visual && <VisualGag id={challenge.visual} />}
        {challenge.media && (
          <MediaView
            id={challenge.id}
            caption={challenge.text}
            media={challenge.media}
            paused={paused}
            soundEnabled={soundEnabled}
            onDuration={onMediaDuration}
            onError={onMediaError}
          />
        )}
        {challenge.text && <p className={`challenge-text ${hasVisual ? 'is-caption' : ''}`}>{challenge.text}</p>}
        {challenge.punchline && (
          <p className={`challenge-punchline ${punchlineRevealed ? 'revealed' : ''}`}>
            {punchlineRevealed ? challenge.punchline : <span className="dots">• • •</span>}
          </p>
        )}
      </div>
    </article>
  );
}
