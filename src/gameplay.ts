/** Frame-rate-independent combo decay, after the grace period. */
export function decayCombo(combo: number, clock: number, dt: number, fever: boolean) {
  const rate = fever ? 7 : 16;
  const nextClock = clock - dt * (fever ? 0.58 : 1);
  const steps = Math.floor(Math.max(0, -nextClock) * rate) - Math.floor(Math.max(0, -clock) * rate);
  return { combo: Math.max(1, combo - steps), clock: nextClock };
}

export function keyboardTarget(x: number, direction: number, dt: number, min: number, max: number) {
  return Math.max(min, Math.min(max, x + direction * 1050 * dt));
}

export function readBestScore(storage: Pick<Storage, "getItem">): number {
  try {
    const score = Number(storage.getItem("breakout.best"));
    return Number.isFinite(score) && score >= 0 ? Math.floor(score) : 0;
  } catch { return 0; }
}
