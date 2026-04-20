# 1-18: Star Focus Orbital Map Materials Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Make the shared orbital map feel more premium and astronomical by improving planetary materials, atmospheric depth, and overlay-first scene polish.

## Tasks
- [x] 1. Add richer material detail to the shared celestial bodies so they read as planets instead of flat circles.
- [x] 2. Add deeper-space atmosphere through restrained nebula and vignette layers without reintroducing clutter.
- [x] 3. Bias the richer texture treatment toward Tracking Station while keeping the sidebar restrained.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

## Decisions
- The next realism gain comes from better materials and atmosphere, not from adding more objects or controls.
- Planet texture details stay lightweight and stylized; they should suggest real surfaces without trying to become a literal simulator.
- Overlay-first polish remains the rule: Tracking Station can carry the richer finish while the sidebar stays secondary.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.
