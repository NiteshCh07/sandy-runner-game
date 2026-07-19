# Sandy Runner 🐾

A Chrome-dino-style endless runner starring Sandy the dog, built with React + Vite.

Jump over obstacles, rack up points, and try to beat your best score — the game speeds up the longer you survive, and the sky shifts from day to dusk and back as you go.

## How to play

- **Space** / **Arrow Up** / **tap** / **click** — jump (also starts and restarts the game)
- **R** — restart after a game over
- Your best score is saved locally in the browser, so it persists between sessions.

## Features

- Smooth `requestAnimationFrame`-driven physics
- Randomized obstacle heights and spacing, with difficulty that ramps up as your score climbs
- Procedural sound effects (jump, milestones, crash) via the Web Audio API — no audio files required
- Persisted high score, start screen, and a "new best" callout on game over
- Parallax clouds, a scrolling ground, and a day/dusk sky cycle for a bit of atmosphere

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build     # production build
npm run preview   # preview the production build locally
npm run deploy     # build and publish to GitHub Pages
```

Built with [Vite](https://vite.dev) and [React](https://react.dev).
