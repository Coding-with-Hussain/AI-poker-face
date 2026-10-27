import { describe, expect, it } from 'vitest';
import { createChallengeSource } from './challengeDeck';
import type { Challenge } from './challenges';
import { buildUserMedia, captionFromFileName, type MediaFiles } from './userMedia';

const files = (partial: Partial<MediaFiles>): MediaFiles => ({ videos: {}, memes: {}, memeSounds: {}, sounds: {}, captions: undefined, ...partial });

describe('captions from file names', () => {
  it('turns file names into readable captions', () => {
    expect(captionFromFileName('/media/memes/when_the-prof  says.gif')).toBe('When the prof says');
    expect(captionFromFileName('/media/videos/dog-fail-2.mp4')).toBe('Dog fail 2');
  });
});

describe('buildUserMedia', () => {
  it('turns videos and memes into challenges with local URLs', () => {
    const media = buildUserMedia(
      files({
        videos: { '/media/videos/dog-fail.mp4': '/media/videos/dog-fail.mp4' },
        memes: { '/media/memes/CAT.JPG': '/assets/CAT-1a2b.jpg', '/media/memes/sub/frog.gif': '/assets/frog.gif' },
      }),
    );
    expect(media.counts).toEqual({ videos: 1, memes: 2, sounds: 0 });
    const video = media.challenges.find((c) => c.category === 'video');
    expect(video).toMatchObject({ id: 'user:videos/dog-fail.mp4', text: 'Dog fail', media: { kind: 'video', src: '/media/videos/dog-fail.mp4' } });
    expect(media.challenges.find((c) => c.id === 'user:memes/CAT.JPG')?.media).toEqual({ kind: 'image', src: '/assets/CAT-1a2b.jpg' });
  });

  it('uses captions.json, including empty captions, before file names', () => {
    const media = buildUserMedia(
      files({
        memes: { '/media/memes/cat.gif': 'cat.gif', '/media/memes/plain.png': 'plain.png', '/media/memes/auto-name.png': 'a.png' },
        captions: { 'memes/cat.gif': 'Me at 3 AM', 'plain.png': '', 'memes/ignored.png': 42 },
      }),
    );
    const text = Object.fromEntries(media.challenges.map((c) => [c.id, c.text]));
    expect(text['user:memes/cat.gif']).toBe('Me at 3 AM');
    expect(text['user:memes/plain.png']).toBe('');
    expect(text['user:memes/auto-name.png']).toBe('Auto name');
  });

  it('attaches a same-name sound to a meme and reports orphan sounds', () => {
    const media = buildUserMedia(
      files({
        memes: { '/media/memes/cat.gif': 'cat.gif' },
        memeSounds: { '/media/memes/cat.mp3': 'cat.mp3', '/media/memes/lonely.wav': 'lonely.wav' },
      }),
    );
    expect(media.challenges[0]?.media?.sound).toBe('cat.mp3');
    expect(media.skipped.some((s) => s.includes('lonely.wav'))).toBe(true);
  });

  it('maps sound files to game moments by folder or by name prefix', () => {
    const media = buildUserMedia(
      files({
        sounds: {
          '/media/sounds/strike/boing.mp3': 'boing.mp3',
          '/media/sounds/strike/honk.WAV': 'honk.wav',
          '/media/sounds/win.mp3': 'win.mp3',
          '/media/sounds/lose-trombone.ogg': 'lose.ogg',
          '/media/sounds/party/air-horn.mp3': 'horn.mp3',
          '/media/sounds/random.mp3': 'random.mp3',
        },
      }),
    );
    expect(media.sounds.strike).toEqual(['boing.mp3', 'honk.wav']);
    expect(media.sounds.win).toEqual(['win.mp3']);
    expect(media.sounds.lose).toEqual(['lose.ogg']);
    expect(media.counts.sounds).toBe(4);
    expect(media.skipped).toHaveLength(2);
  });

  it('ignores unsupported files', () => {
    const media = buildUserMedia(files({ videos: { '/media/videos/notes.txt': 'notes.txt' } }));
    expect(media.challenges).toHaveLength(0);
    expect(media.skipped).toHaveLength(1);
  });
});

describe('content mix', () => {
  const mine: Challenge[] = [
    { id: 'user:memes/a.gif', category: 'meme', intensity: 2, text: 'A', media: { kind: 'image', src: 'a.gif' } },
    { id: 'user:videos/b.mp4', category: 'video', intensity: 2, text: 'B', media: { kind: 'video', src: 'b.mp4' } },
  ];
  const draw = (source: { next(): Challenge }, n: number) => Array.from({ length: n }, () => source.next());
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  it('uses only built-in content when there is no media or it is switched off', () => {
    expect(draw(createChallengeSource('normal', 'mixed', [], random), 30).every((c) => !c.media)).toBe(true);
    expect(draw(createChallengeSource('normal', 'builtin', mine, random), 30).every((c) => !c.media)).toBe(true);
  });

  it('uses only your media in "mine" mode, for every difficulty', () => {
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      expect(draw(createChallengeSource(difficulty, 'mine', mine, random), 10).every((c) => c.id.startsWith('user:'))).toBe(true);
    }
  });

  it('mixes your media in roughly half the time', () => {
    const picks = draw(createChallengeSource('normal', 'mixed', mine, random), 400);
    const share = picks.filter((c) => c.media).length / picks.length;
    expect(share).toBeGreaterThan(0.4);
    expect(share).toBeLessThan(0.6);
  });
});
