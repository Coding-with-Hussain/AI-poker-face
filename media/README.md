# Your media: funny videos, memes and sound effects

Drop your own files into these folders. The game finds them by itself, with no
code changes and no internet. Everything stays on this computer.

```
media/
├─ videos/            funny videos  → shown as challenges, played with sound
├─ memes/             meme images   → shown as challenges (GIFs animate)
├─ sounds/
│  ├─ strike/         plays when a laugh is detected (−20)
│  ├─ warning/        plays at "High Risk"
│  ├─ win/            plays when the player survives the round
│  ├─ lose/           plays when the player is knocked out
│  ├─ countdown/      plays on 3, 2, 1
│  ├─ go/             plays on START!
│  ├─ challenge/      plays when a new built-in joke appears
│  ├─ click/          plays on PLAY NOW
│  └─ save/           plays when a score is saved
└─ captions.json      optional captions (see captions.example.json)
```

Create a sound folder only for the moments you want to change. The others keep
the built-in sounds. Put several files in one folder and the game picks one at
random each time.

## Supported files

| Kind | Formats | Tips |
| --- | --- | --- |
| Videos | `.mp4` (H.264 + AAC), `.webm` | Short clips work best (5–20 s). A video stays on screen until it ends, up to 20 s. iPhone `.mov` files are often HEVC and may not play in Chrome/Edge; convert them to MP4. |
| Memes | `.png`, `.jpg`, `.gif`, `.webp`, `.avif`, `.svg` | Animated GIFs play automatically. |
| Meme sound | `.mp3`, `.wav`, `.ogg`, `.m4a` | Give it the **same name** as the meme, e.g. `memes/cat.gif` + `memes/cat.mp3`, and it plays when that meme appears. |
| Sound effects | `.mp3`, `.wav`, `.ogg`, `.m4a`, `.webm` | Keep them short (under 3 s), except `win` / `lose`. |

You can also name a sound file after its moment instead of using a folder,
for example `sounds/strike-boing.mp3` or `sounds/win.wav`.

## Captions

The file name becomes the caption: `when-the-prof-says_open-book.gif` shows as
"When the prof says open book". To write your own captions, copy
`captions.example.json` to `captions.json` and edit it:

```json
{
  "memes/cat-on-keyboard.gif": "Me finishing the assignment at 3 AM",
  "videos/dog-fail.mp4": "Wait for it…",
  "memes/no-caption.png": ""
}
```

An empty caption hides the text.

## Seeing your changes

- While `npm run dev` / `start-game.bat` is running, adding or removing files
  reloads the game automatically.
- For a production build, run `npm run build` again after changing the files.
- In the game, open **Settings → Your media** to see what was found. You can play
  **Mixed** (your media about half the time), **Only my media**, or **Built-in
  only**, and switch your sound effects on or off.

## Please note

- Only use media you are allowed to show at your event.
- The game's sound toggle also mutes your videos and sound effects.
- GitHub rejects files larger than 100 MB. Keep big videos out of git, or compress them.
