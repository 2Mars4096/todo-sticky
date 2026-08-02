# 1-31: Star Focus 3D Atmosphere And Shadow Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Make the true 3D Tracking Station scene feel deeper and less synthetic by giving the planets fresnel-style atmosphere glow, shadow-enabled lighting, and stronger ring occlusion cues.

## Tasks
- [x] 1. Replace the flat outer atmosphere layer with a fresnel-style glow shell in the true 3D renderer.
- [x] 2. Enable stable shadow cues for the 3D scene and retune the main light around them.
- [x] 3. Improve Saturn ring depth with alpha-tested occlusion and view-angle-based brightness.
- [x] 4. Re-run frontend verification and record the new 3D lighting boundary in the tracking docs.

## Decisions
- Use lightweight shader materials only for the atmosphere shell instead of moving the full planet stack onto custom shaders.
- Keep the new shadows restrained and local to the overlay renderer so the sidebar/fallback path stays unchanged.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`
