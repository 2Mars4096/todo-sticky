# Staged independent-app layout

Product owns desktop/, web/, phone/ and plugin/. phone/ is Flutter; Android and iOS are separately validated targets. Existing source and scripts are preserved; legacy path symlinks keep established commands working during transition. Shared sign-in/data/quota are defined in the Diane independent-apps-v1 contract, not yet enabled by this move. No standalone UI redesign is included.
