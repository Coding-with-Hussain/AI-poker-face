/** Game moments that play a sound. Also the folder names under media/sounds/. */
export const SOUND_NAMES = ['click', 'countdown', 'go', 'warning', 'strike', 'challenge', 'win', 'lose', 'save'] as const;

export type SoundName = (typeof SOUND_NAMES)[number];

export function isSoundName(value: string): value is SoundName {
  return (SOUND_NAMES as readonly string[]).includes(value);
}
