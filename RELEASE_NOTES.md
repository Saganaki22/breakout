# v0.1.2 — Better control, fairer combos, more replay value

- Fix keyboard steering fighting the mouse position; support uppercase A/D.
- Fix combo decay depending on simulation frequency (120 points/sec instead of 16).
- Freeze objective and gameplay timers until launch.
- Prevent held pause keys from rapidly toggling pause; add Escape and automatic pause on focus loss.
- Capture touch drags and clear held keys when leaving the game.
- Fix discarded pause-screen text objects leaking GPU resources.
- Add local best scores, richer run summaries, and extra lives every 50,000 points (five-life cap).
- Add control instructions, contextual launch hints, and accurate disabled controls.
- Update dependency lockfile to resolve all reported audit vulnerabilities.
- Add regression tests and GitHub Actions build checks; include .nojekyll in the Pages build.

Validation: TypeScript, production build, four regression tests, dependency audit, and browser launch/gameplay/pause smoke checks.
