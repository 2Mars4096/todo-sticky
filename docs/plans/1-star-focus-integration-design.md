# 1: Star Focus Integration Design

**Status:** completed
**Goal:** Lock the Star Focus product and UX design for Sticky Todo before implementation resumes.

## Tasks

- [x] 1. Confirm the repository purpose, stack, and primary workflows.
- [x] 2. Create the tracking scaffold and fill in the first-pass docs.
- [x] 3. Lock the three-column information architecture:
  left goals, center todo list, right Star Focus Mission Control.
- [x] 4. Lock the Mission Control interaction model with the fewest possible user steps.
- [x] 5. Lock how real-time focus-session cinematics map to launch, ascent, atmosphere heating, staging, and orbit.
- [x] 6. Lock how completed sessions update persistent vehicles and starmap state.
- [x] 7. Split approved design work into follow-up numbered implementation plans.

## Decisions

- Primary instruction file: `AGENTS.md`
- Tracking docs root: `docs/`
- Plan numbering: hierarchical and created just in time
- Star Focus should be additive to the sticky todo workflow, not a separate game shell.
- The right sidebar is the likely home for Star Focus, mirroring the long-term goals sidebar on the left.
- The right sidebar should ultimately center around a starmap / tracking-station experience, not just progress counters.
- The product shell is now locked as three columns:
  left goals, center sticky todo list, right Star Focus Mission Control.
- Star Focus v1 stays embedded in the right sidebar; there is no dedicated expanded tracking-station overlay in the first implementation pass.
- The collapsed Star Focus rail uses compact mission/status chips, not a mini-starmap.
- Star Focus v1 is frontend-only: task data remains markdown-backed, while mission/session state lives in a dedicated local browser store with no Rust or markdown sync changes in the first pass.
- The v1 launch loop is:
  choose a task, hand it to Mission Control, inherit defaults, launch session, focus, receive a persistent mission reward.
- Completed focus sessions update Star Focus mission history and vehicle/starmap state, but do not automatically mark tasks done.
- Abandoned or canceled sessions remain ephemeral and should not create persistent vehicles.
- The v1 cinematic system is ratio-driven and 2D:
  lightweight DOM/SVG/CSS motion, no WebGL, no full physics simulation, no separate game scene.
- Session phases map to timer progress in this order:
  ignition, ascent, heating/max-q, staging, orbital insertion.

## Notes

- Mission launch flow should stay minimal: select a task, inherit defaults, launch, focus, receive visual payoff.
- The right sidebar should support four clear states:
  empty, task-selected, active-session, and mission-complete summary.
- The first implementation slice should add a static/styled Mission Control shell and local state before chasing animation polish or deeper persistence.
- The expected first implementation plan is [1-1-star-focus-mission-control-shell](1-1-star-focus-mission-control-shell.md).
