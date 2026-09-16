# Breakout

Browser arcade game. PixiJS + TypeScript + Vite.

Brick layouts evolve across themed ages. Powerups, ball splits, combo chains, dynamic difficulty, and a 16:9 canvas.

<img width="1729" height="966" alt="Screenshot 2026-04-26 230456" src="https://github.com/user-attachments/assets/3817b93a-7e99-45e9-a044-68b595db3f4f" />


## Play

[drbaph.is-a.dev/breakout](https://drbaph.is-a.dev/breakout)

## Dev

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output in `dist/`.

## Tech

- PixiJS v8
- TypeScript
- Vite

## Controls and scoring

Move with the mouse, touch, arrow keys, or A/D. Click, tap, or press Space to launch.
Press P or Escape to pause. Switching tabs automatically pauses your run.
The objective timer starts when you launch, so take your time lining up a serve.

Centre paddle hits earn perfect-hit bonuses and build combos. Catch falling powerups
and earn an extra life every 50,000 points (up to five lives). Your best score is
saved locally; the game-over screen shows your age, peak combo, and perfect hits.

## Regression checks

With Node 22.6 or newer, run `npm test` for combo timing, keyboard movement, and
safe score storage checks. Run `npm run build` for TypeScript and production output.
