# 1-43: Star Focus 3D Shadow-Interaction Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Make the true 3D system feel more physically lit by improving how transparent and thin geometry participates in the shared solar shadow path.

## Tasks
- [x] 1. Add masked shadow materials for cloud shells so Earth and Venus can cast more believable alpha-shaped shadows into the scene.
- [x] 2. Extend the same masked shadow treatment to Saturn's rings and rebalance the older ring-shadow overlay so the result feels less duplicated.
- [x] 3. Tighten the main solar shadow-map settings so the local shadow interaction reads more clearly without turning harsh.
- [x] 4. Re-run frontend verification and record the new 3D shadow-interaction boundary in the tracking docs.

## Decisions
- Use alpha-tested custom depth/distance materials for transparent geometry instead of layering more fake darkening passes on top.
- Keep the older custom ring-shadow cue, but reduce its weight now that the real shadow path is stronger.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`
