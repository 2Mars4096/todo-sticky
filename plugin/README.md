# Product-owned Diane plugin

This repository owns the embedded UI. Diane consumes a pinned package release. Host services enter through `@diane/plugin-sdk/*`; standalone app UI is unchanged. Package with `npm pack ./plugin --ignore-scripts`.

0.1.4: Footer controls are direct peers (Import & backup, Scheduling machines, AI settings). Machine saves require changed drafts. Active Todo quietly requests scoped preparation after saved task changes and every60s; the host owns preparation/results and explicit Send execution.
