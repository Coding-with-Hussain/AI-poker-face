/**
 * Your own media: videos, memes and sound effects dropped into the project's
 * media/ folder. Vite finds the files at build/dev time (import.meta.glob), so
 * nothing has to be registered by hand and everything is served locally.
 *
 *   media/videos/<any>.mp4|webm         -> video challenges (with sound)
 *   media/memes/<any>.png|jpg|gif|webp  -> meme challenges
 *   media/memes/<same name>.mp3|wav     -> optional sound played with that meme
 *   media/sounds/<event>/<any>.mp3|wav  -> replaces the built-in sound for <event>
 *   media/captions.json                 -> optional captions, e.g. { "memes/cat.gif": "Me in the exam" }
 */
import { isSoundName, SOUND_NAMES, type SoundName } from '../audio/soundNames';
import type { Challenge } from './challenges';

export type UserSounds = Partial<Record<SoundName, string[]>>;

export interface UserMedia {
  challenges: Challenge[];
  sounds: UserSounds;
  counts: { videos: number; memes: number; sounds: number };
  /** Files that were found but could not be used, with the reason. */
  skipped: string[];
}

export interface MediaFiles {
  /** Glob results: absolute project path (e.g. "/media/videos/a.mp4") -> served URL. */
  videos: Record<string, string>;
  memes: Record<string, string>;
  memeSounds: Record<string, string>;
  sounds: Record<string, string>;
  captions: unknown;
}

const VIDEO_EXT = new Set(['mp4', 'webm', 'ogv', 'm4v', 'mov']);
const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp']);
const AUDIO_EXT = new Set(['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'opus', 'flac', 'webm']);

const MEDIA_ROOT = '/media/';

function extension(path: string): string {
  const dot = path.lastIndexOf('.');
  return dot === -1 ? '' : path.slice(dot + 1).toLowerCase();
}

/** "media/memes/sub/cat.gif" -> "memes/sub/cat.gif" */
function relativePath(path: string): string {
  const index = path.indexOf(MEDIA_ROOT);
  return index === -1 ? path.replace(/^\/+/, '') : path.slice(index + MEDIA_ROOT.length);
}

function fileName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function baseName(path: string): string {
  const name = fileName(path);
  const dot = name.lastIndexOf('.');
  return (dot === -1 ? name : name.slice(0, dot)).toLowerCase();
}

/** "when_the-prof  says.gif" -> "When the prof says" */
export function captionFromFileName(path: string): string {
  const name = fileName(path);
  const stem = name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name;
  const words = stem.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return words.length > 0 ? words.charAt(0).toUpperCase() + words.slice(1) : '';
}

function readCaptions(raw: unknown): Map<string, string> {
  const captions = new Map<string, string>();
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return captions;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string') captions.set(key.replace(/^\/+/, '').replace(/^media\//, '').toLowerCase(), value.trim());
  }
  return captions;
}

function captionFor(path: string, captions: Map<string, string>): string {
  const rel = relativePath(path).toLowerCase();
  return captions.get(rel) ?? captions.get(fileName(path).toLowerCase()) ?? captionFromFileName(path);
}

/** Which event a file in media/sounds belongs to: its folder, or a "strike-boing.mp3" style prefix. */
function soundEventFor(path: string): SoundName | null {
  const parts = relativePath(path).split('/');
  // parts[0] is "sounds"
  if (parts.length >= 3) {
    const folder = (parts[1] ?? '').toLowerCase();
    return isSoundName(folder) ? folder : null;
  }
  const prefix = (baseName(path).split(/[-_ .]/)[0] ?? '').toLowerCase();
  return isSoundName(prefix) ? prefix : null;
}

const byPath = (a: [string, string], b: [string, string]) => a[0].localeCompare(b[0]);

/** Turns the discovered files into challenges and sound pools. Pure, for testing. */
export function buildUserMedia(files: MediaFiles): UserMedia {
  const captions = readCaptions(files.captions);
  const skipped: string[] = [];
  const challenges: Challenge[] = [];

  for (const [path, url] of Object.entries(files.videos).sort(byPath)) {
    if (!VIDEO_EXT.has(extension(path))) {
      skipped.push(`${relativePath(path)}: not a supported video type`);
      continue;
    }
    challenges.push({
      id: `user:${relativePath(path)}`,
      category: 'video',
      intensity: 2,
      text: captionFor(path, captions),
      media: { kind: 'video', src: url },
    });
  }

  const memeSounds = new Map<string, string>();
  const memeSoundPaths = new Map<string, string>();
  for (const [path, url] of Object.entries(files.memeSounds)) {
    if (AUDIO_EXT.has(extension(path))) {
      memeSounds.set(baseName(path), url);
      memeSoundPaths.set(baseName(path), path);
    }
  }
  const usedMemeSounds = new Set<string>();
  for (const [path, url] of Object.entries(files.memes).sort(byPath)) {
    if (!IMAGE_EXT.has(extension(path))) {
      skipped.push(`${relativePath(path)}: not a supported image type`);
      continue;
    }
    const sound = memeSounds.get(baseName(path));
    if (sound) usedMemeSounds.add(baseName(path));
    challenges.push({
      id: `user:${relativePath(path)}`,
      category: 'meme',
      intensity: 2,
      text: captionFor(path, captions),
      media: sound ? { kind: 'image', src: url, sound } : { kind: 'image', src: url },
    });
  }
  for (const [name, path] of memeSoundPaths) {
    if (!usedMemeSounds.has(name)) skipped.push(`${relativePath(path)}: no meme image with the same name`);
  }

  const sounds: UserSounds = {};
  let soundCount = 0;
  for (const [path, url] of Object.entries(files.sounds).sort(byPath)) {
    if (!AUDIO_EXT.has(extension(path))) continue;
    const event = soundEventFor(path);
    if (!event) {
      skipped.push(`${relativePath(path)}: put it in a folder named ${SOUND_NAMES.join(', ')}`);
      continue;
    }
    (sounds[event] ??= []).push(url);
    soundCount += 1;
  }

  return {
    challenges,
    sounds,
    counts: {
      videos: challenges.filter((c) => c.category === 'video').length,
      memes: challenges.filter((c) => c.category === 'meme').length,
      sounds: soundCount,
    },
    skipped,
  };
}

// Literal patterns are required by Vite; upper-case variants cover Windows-style names like CAT.JPG.
const discovered: MediaFiles = {
  videos: import.meta.glob('/media/videos/**/*.{mp4,MP4,webm,WEBM,ogv,OGV,m4v,M4V,mov,MOV}', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
  memes: import.meta.glob('/media/memes/**/*.{png,PNG,jpg,JPG,jpeg,JPEG,gif,GIF,webp,WEBP,avif,AVIF,svg,SVG,bmp,BMP}', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
  memeSounds: import.meta.glob('/media/memes/**/*.{mp3,MP3,wav,WAV,ogg,OGG,oga,OGA,m4a,M4A,aac,AAC,opus,OPUS,flac,FLAC}', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
  sounds: import.meta.glob('/media/sounds/**/*.{mp3,MP3,wav,WAV,ogg,OGG,oga,OGA,m4a,M4A,aac,AAC,opus,OPUS,flac,FLAC,webm,WEBM}', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
  captions: Object.values(import.meta.glob('/media/captions.json', { eager: true, import: 'default' }))[0],
};

export const USER_MEDIA: UserMedia = buildUserMedia(discovered);

if (USER_MEDIA.skipped.length > 0) {
  console.warn('[AI Poker Face] Some files in media/ were skipped:\n  ' + USER_MEDIA.skipped.join('\n  '));
}

// While `npm run dev` runs, adding or removing media files reloads the page so
// every screen and the sound engine pick up the new files consistently.
if (import.meta.hot) {
  import.meta.hot.accept(() => window.location.reload());
}
