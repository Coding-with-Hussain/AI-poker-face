/**
 * Local challenge library. All content is original and family-friendly.
 *
 * To add a challenge, append an entry with a unique id. `intensity` controls
 * which difficulties can draw it (1 = gentle, 2 = regular, 3 = hard-hitting).
 * Visual gags reference CSS/SVG scenes defined in components/VisualGag.tsx.
 */
import type { ChallengeIntensity } from '../game/gameTypes';

export type ChallengeCategory =
  | 'one-liner'
  | 'absurd-question'
  | 'punchline'
  | 'hypothetical'
  | 'campus-life'
  | 'emoji'
  | 'visual-gag'
  | 'video'
  | 'meme';

export type ChallengeStyle = 'pop' | 'slide' | 'wobble' | 'zoom' | 'drop';

export type VisualGagId =
  | 'professor-duck'
  | 'wobbly-jelly'
  | 'dancing-banana'
  | 'keyboard-cat'
  | 'sad-wifi'
  | 'sliding-penguin'
  | 'toast-hat'
  | 'egg-mustache'
  | 'poker-blob';

export interface Challenge {
  id: string;
  category: ChallengeCategory;
  intensity: ChallengeIntensity;
  /** Main text (setup for punchlines, caption for visual gags). */
  text: string;
  /** Revealed after a short delay for two-part jokes. */
  punchline?: string;
  /** Large emoji line for emoji challenges. */
  emoji?: string;
  visual?: VisualGagId;
  style?: ChallengeStyle;
  /** Your own media from the media/ folder (see content/userMedia.ts). */
  media?: ChallengeMedia;
}

export interface ChallengeMedia {
  kind: 'video' | 'image';
  /** Local URL served by Vite. */
  src: string;
  /** Optional sound played when an image meme appears. */
  sound?: string;
}

export const CATEGORY_LABELS: Record<ChallengeCategory, string> = {
  'one-liner': 'One-liner',
  'absurd-question': 'Absurd question',
  punchline: 'Wait for it…',
  hypothetical: 'Imagine this',
  'campus-life': 'Campus life',
  emoji: 'Emoji challenge',
  'visual-gag': 'Visual gag',
  video: 'Video',
  meme: 'Meme',
};

export const CHALLENGES: readonly Challenge[] = [
  // ---- One-liners ----
  { id: 'ol-01', category: 'one-liner', intensity: 1, style: 'pop', text: 'My plants are thriving. They have learned to survive purely on my guilt.' },
  { id: 'ol-02', category: 'one-liner', intensity: 2, style: 'slide', text: 'I asked the AI to tell me a secret. It whispered: "I am watching your left eyebrow."' },
  { id: 'ol-03', category: 'one-liner', intensity: 2, style: 'pop', text: "I'm not saying my cooking is bad, but the smoke alarm now cheers when I walk into the kitchen." },
  { id: 'ol-04', category: 'one-liner', intensity: 1, style: 'slide', text: 'My Wi-Fi is like a cat. It only shows up when I no longer need it.' },
  { id: 'ol-05', category: 'one-liner', intensity: 2, style: 'wobble', text: 'I bought a book about procrastination. I will read the back cover of it next week.' },
  { id: 'ol-06', category: 'one-liner', intensity: 1, style: 'pop', text: 'My sleep schedule is less of a schedule and more of a rumour.' },
  { id: 'ol-07', category: 'one-liner', intensity: 3, style: 'zoom', text: 'I tried a standing desk. Now I just sit on top of it and feel very tall.' },
  { id: 'ol-08', category: 'one-liner', intensity: 2, style: 'slide', text: 'The lift and I have a deal: it pretends to be fast, and I pretend to be patient.' },
  { id: 'ol-09', category: 'one-liner', intensity: 3, style: 'wobble', text: "My umbrella only opens when it's sunny. It's not broken — it's an optimist." },
  { id: 'ol-10', category: 'one-liner', intensity: 3, style: 'drop', text: 'My smartwatch says I am stressed. My smartwatch has never seen a group project.' },

  // ---- Absurd questions ----
  { id: 'aq-01', category: 'absurd-question', intensity: 1, style: 'pop', text: 'If a pigeon wore a tiny business suit, would it get promoted faster than you?' },
  { id: 'aq-02', category: 'absurd-question', intensity: 2, style: 'zoom', text: 'If you clap while wearing oven gloves, is it still applause or just a muffled opinion?' },
  { id: 'aq-03', category: 'absurd-question', intensity: 1, style: 'slide', text: 'What does a sloth do in an emergency? Asking for a very relaxed friend.' },
  { id: 'aq-04', category: 'absurd-question', intensity: 3, style: 'wobble', text: 'If your shadow quit its job, would it give two weeks of notice or just leave at noon?' },
  { id: 'aq-05', category: 'absurd-question', intensity: 2, style: 'pop', text: 'Would a penguin in a tuxedo be overdressed, or is it everyone else who is underdressed?' },
  { id: 'aq-06', category: 'absurd-question', intensity: 3, style: 'drop', text: 'If a snail took the lift, would it press "close door" just to feel fast?' },
  { id: 'aq-07', category: 'absurd-question', intensity: 2, style: 'zoom', text: 'If a ghost gets a paper cut, does it need a plaster or just a transparency report?' },
  { id: 'aq-08', category: 'absurd-question', intensity: 1, style: 'pop', text: 'Do fish ever wonder why the sky is so dry?' },
  { id: 'aq-09', category: 'absurd-question', intensity: 3, style: 'slide', text: 'If a duck wrote a CV, would "excellent at floating under pressure" count as a skill?' },

  // ---- Two-part punchlines ----
  { id: 'pl-01', category: 'punchline', intensity: 1, text: 'Why did the robot go on holiday?', punchline: 'It needed to recharge its personality.' },
  { id: 'pl-02', category: 'punchline', intensity: 2, text: 'What did the AI say after watching you for ten seconds?', punchline: '"Nice poker face. Shame about the dimples."' },
  { id: 'pl-03', category: 'punchline', intensity: 1, text: 'Why was the maths textbook so calm?', punchline: 'It had finally accepted all of its problems.' },
  { id: 'pl-04', category: 'punchline', intensity: 2, text: 'Why did the keyboard book a therapy session?', punchline: 'People kept pushing its buttons.' },
  { id: 'pl-05', category: 'punchline', intensity: 2, text: 'Why did the Wi-Fi router join a gym?', punchline: 'It wanted stronger bars.' },
  { id: 'pl-06', category: 'punchline', intensity: 3, text: 'Why do ducks make terrible exam candidates?', punchline: 'They keep quacking under pressure.' },
  { id: 'pl-07', category: 'punchline', intensity: 3, text: 'What did the webcam say to the player?', punchline: '"Smile!" … Actually, no. Please don\'t.' },
  { id: 'pl-08', category: 'punchline', intensity: 1, text: 'Why did the alarm clock get grounded?', punchline: 'It kept going off without permission.' },
  { id: 'pl-09', category: 'punchline', intensity: 2, text: "What is a ghost's favourite university society?", punchline: 'The Boo-k Club. Attendance is mostly transparent.' },
  { id: 'pl-10', category: 'punchline', intensity: 3, text: 'Why did the sock go to the lost and found?', punchline: 'To find itself. It had been hiding in the dryer all along.' },

  // ---- Hypotheticals ----
  { id: 'hy-01', category: 'hypothetical', intensity: 2, style: 'slide', text: 'Imagine your cat replies to your texts with "k" — and it is still the most supportive message you got all week.' },
  { id: 'hy-02', category: 'hypothetical', intensity: 3, style: 'pop', text: 'Imagine a duck walks into your exam hall, sits down, and finishes before you. With a better grade.' },
  { id: 'hy-03', category: 'hypothetical', intensity: 1, style: 'zoom', text: 'Picture a giraffe trying to hide behind a lamppost. It is convinced it is winning.' },
  { id: 'hy-04', category: 'hypothetical', intensity: 2, style: 'wobble', text: 'What if every time you sneezed, a tiny orchestra played a dramatic chord?' },
  { id: 'hy-05', category: 'hypothetical', intensity: 1, style: 'slide', text: 'Imagine your fridge sends a notification: "We need to talk about the yoghurt."' },
  { id: 'hy-06', category: 'hypothetical', intensity: 3, style: 'drop', text: 'Imagine a squirrel giving a TED talk called "Nuts: A Long-Term Investment Strategy."' },
  { id: 'hy-07', category: 'hypothetical', intensity: 3, style: 'pop', text: 'What if your GPS lost its confidence? "Turn left… or right? You decide. I believe in you."' },
  { id: 'hy-08', category: 'hypothetical', intensity: 2, style: 'zoom', text: 'Imagine a horse taking a selfie and complaining that its face looks a bit long.' },

  // ---- Campus life ----
  { id: 'cl-01', category: 'campus-life', intensity: 2, style: 'slide', text: 'The group chat goes silent for two weeks. The night before the deadline: "so… what is the topic again?"' },
  { id: 'cl-02', category: 'campus-life', intensity: 1, style: 'pop', text: 'Lecturer: "This will not be on the exam." Your brain: deleted. The exam: 👀' },
  { id: 'cl-03', category: 'campus-life', intensity: 2, style: 'wobble', text: 'Library rule: whisper. Your stomach during silent study: a full live concert.' },
  { id: 'cl-04', category: 'campus-life', intensity: 3, style: 'zoom', text: 'Opening the assignment brief two hours before the deadline: "Oh, it is a 20-page report. Cool. Cool cool cool."' },
  { id: 'cl-05', category: 'campus-life', intensity: 2, style: 'drop', text: 'The canteen calls it "mystery curry day". Nobody has solved the mystery. Nobody wants to.' },
  { id: 'cl-06', category: 'campus-life', intensity: 1, style: 'pop', text: 'Attendance: 100%. Understanding: loading… 3%.' },
  { id: 'cl-07', category: 'campus-life', intensity: 2, style: 'slide', text: 'Professor: "Any questions?" The entire lecture hall instantly turns into furniture.' },
  { id: 'cl-08', category: 'campus-life', intensity: 3, style: 'wobble', text: 'The printer works perfectly every day of the year — except the five minutes before submission.' },
  { id: 'cl-09', category: 'campus-life', intensity: 3, style: 'pop', text: '"I will start revising at 9." It is 9:01. "Well, now I have to wait until 10."' },
  { id: 'cl-10', category: 'campus-life', intensity: 1, style: 'zoom', text: 'Campus Wi-Fi: full bars, zero internet, maximum confidence.' },

  // ---- Emoji challenges ----
  { id: 'em-01', category: 'emoji', intensity: 1, emoji: '🐧🕶️🎷', text: 'The coolest exam invigilator on campus.' },
  { id: 'em-02', category: 'emoji', intensity: 2, emoji: '🦆🎓📊', text: 'A duck presenting its final-year project. The Q&A is just quacking.' },
  { id: 'em-03', category: 'emoji', intensity: 1, emoji: '🐌💨', text: 'The fastest snail alive, breaking the speed limit at 0.03 km/h.' },
  { id: 'em-04', category: 'emoji', intensity: 2, emoji: '🥔🛋️📺', text: 'The original couch potato. Now in 4K.' },
  { id: 'em-05', category: 'emoji', intensity: 2, emoji: '🤖☕😴', text: 'The AI is on a coffee break. (It is still watching you.)' },
  { id: 'em-06', category: 'emoji', intensity: 3, emoji: '🐸👑🗳️', text: 'The frog has been elected class rep. First policy: more puddles.' },
  { id: 'em-07', category: 'emoji', intensity: 3, emoji: '🦒🧣🧣🧣🧣', text: 'How a giraffe gets ready for winter.' },
  { id: 'em-08', category: 'emoji', intensity: 2, emoji: '🐙🎹🎶', text: 'Octopus pianist: plays eight notes at once, still asks for an encore.' },
  { id: 'em-09', category: 'emoji', intensity: 1, emoji: '🍕📐🤓', text: 'Your maths teacher explaining fractions using the last slice of pizza.' },
  { id: 'em-10', category: 'emoji', intensity: 3, emoji: '🦖🛼', text: 'A T-rex on roller skates. It cannot reach the brakes.' },

  // ---- Visual gags (CSS/SVG) ----
  { id: 'vg-01', category: 'visual-gag', intensity: 1, visual: 'professor-duck', text: 'Professor Duck will now present: "Why Bread Is A Fundamental Right."' },
  { id: 'vg-02', category: 'visual-gag', intensity: 2, visual: 'wobbly-jelly', text: 'This jelly has been holding in a laugh for three hours. Respect.' },
  { id: 'vg-03', category: 'visual-gag', intensity: 2, visual: 'dancing-banana', text: 'The banana has entered the dance floor. Security is concerned.' },
  { id: 'vg-04', category: 'visual-gag', intensity: 3, visual: 'keyboard-cat', text: 'Breaking news: cat finishes your essay. It is 4,000 words of "jjjjjjjjj".' },
  { id: 'vg-05', category: 'visual-gag', intensity: 1, visual: 'sad-wifi', text: 'Wi-Fi with one bar, trying its very best. Please be kind.' },
  { id: 'vg-06', category: 'visual-gag', intensity: 2, visual: 'sliding-penguin', text: 'A penguin rehearsing its entrance for the graduation ceremony.' },
  { id: 'vg-07', category: 'visual-gag', intensity: 3, visual: 'toast-hat', text: 'This toast is wearing a tiny hat. That is it. That is the joke.' },
  { id: 'vg-08', category: 'visual-gag', intensity: 3, visual: 'egg-mustache', text: 'Sir Eggbert Moustachio, the most distinguished egg in the fridge.' },
  { id: 'vg-09', category: 'visual-gag', intensity: 2, visual: 'poker-blob', text: 'This blob is also playing AI Poker Face. It is not going well.' },
];
