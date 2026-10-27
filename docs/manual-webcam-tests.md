# Manual webcam test checklist

Automated tests (`npm run test`) cover the game logic and the laugh-estimation algorithm with
synthetic data. The checks below need a **real person in front of a real webcam** and should be
run on the exhibition laptop before the event. Open the diagnostics panel with `Shift`+`D`.

## Setup

- [ ] `start-game.bat` (or `npm run dev`) starts and opens <http://localhost:5173>.
- [ ] With the Wi-Fi switched off, reload the page: the game still loads and plays.
- [ ] Camera check shows *Local AI ready (CPU · WebAssembly)*, *Camera ready.*, *Face detected.*
- [ ] Diagnostics show **Inference delegate: CPU** and an inference FPS of roughly 10–15.
- [ ] Covering the camera shows *No face detected.* and disables **Continue**.
- [ ] Blocking camera permission (address bar → camera → Block, then reload) shows *Camera access denied.*
- [ ] Opening the Windows Camera app first, then the game, shows *Camera is busy* (on most webcams).

## Calibration

- [ ] A relaxed face calibrates straight into the 3-2-1 countdown.
- [ ] Smiling broadly during calibration shows *Was that a smile?* with Recalibrate / Continue anyway.
- [ ] Looking away during calibration pauses the progress ring.

## Detection (Normal difficulty, sensitivity 5)

| Action (hold ~2 s) | Expected meter | Strike? |
| --- | --- | --- |
| Neutral face | Calm | No |
| Talking / reading a joke aloud | Calm | No |
| Yawning | Calm | No |
| Small polite smile | Calm or Suspicious Smile | No |
| Big grin | High Risk → Laugh-Like Event Detected | Yes, once |
| Open-mouthed laugh for 5 s | Laugh-Like Event Detected | Yes, **only once** |
| Laugh, relax fully for 3 s, laugh again | Two separate events | Two strikes |

- [ ] Smoothed score in diagnostics rises and falls with the expression.
- [ ] Turning away for more than 1.5 s pauses the timer; facing the camera resumes it.
- [ ] Lower and raise *Detection sensitivity* and confirm the behaviour changes as expected.
- [ ] Try someone with glasses, someone with a beard, and dim lighting; note any false strikes.

## Game flow

- [ ] Surviving 30 s with no strikes gives *Poker Face Legend* and 130 points.
- [ ] Three strikes end the round early with no survival bonus.
- [ ] `Space` pauses (timer frozen), `Space` resumes; `M` mutes.
- [ ] Unplugging a USB webcam mid-round pauses with *Webcam disconnected*; replug → **Restart camera** → **Resume**.
- [ ] **Play again**, **Next player** and **Home** all work; on **Home** the webcam light turns off.
- [ ] A qualifying score can be saved with a nickname and appears in the Top 10 leaderboard after a reload.
- [ ] *Camera on · Stop* in the top bar turns the webcam light off immediately.
