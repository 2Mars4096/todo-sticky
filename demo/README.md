# README recordings

These clips show the 2.1.12 production frontend with fictional picnic, postcard, library, garden and drawing-club tasks. The recorder uses disposable browser contexts and the synthetic native bridge from `tests/helpers/browser-fixture.cjs`. No installed-app state, task archive, credentials or live AI is accessed. AI responses are deterministic examples; this is an interface demonstration, not a native integration test.

| Clip | Scenario |
| --- | --- |
| `demo.gif` / `demo.mp4` | Capture, sample AI breakdown, move to tomorrow, date navigation |
| `planning.gif` | Available hours, proposal, apply and Undo |
| `outcomes.gif` | Manual outcome, staged due date, persistent metadata |
| `focus.gif` | Star Focus start, pause, resume and finish |
| `goals-settings.gif` | Compact goals/routines and Settings navigation |

## Re-record

Requires Node, Playwright with an installed headless Chromium browser and its video encoder, and `ffmpeg` on PATH. Prefer the Playwright headless shell: full Chrome on this Mac cropped the recorded footer even when screenshots were correct. No dependency or credential is added to the application.

```sh
npm run build:frontend
npm run preview -- --host 127.0.0.1 --port 4173
# In another terminal, with Playwright available:
TODO_TEST_URL=http://127.0.0.1:4173 node scripts/record-demos.cjs
```

The recorder accepts the same `PLAYWRIGHT_MODULE`, `CHROME_EXECUTABLE` and browser environment overrides as the browser test fixture. Set `PLAYWRIGHT_BROWSERS_PATH` if the browser/video encoder cache is elsewhere. Use `DEMO_SCENARIO=focus` (or another clip basename) to regenerate only one clip. Dates follow the local day in Asia/Hong_Kong.

Capture is 600 × 720; GIF export is 10 fps with a generated palette and infinite looping. MP4 copies use H.264 at 15 fps. Intermediate WebM files and inspection screenshots go to ignored `output/playwright/readme/`. Review the GIFs after recording, especially menus, text and Focus rendering. The script fails on uncaught page errors.

Do not use the legacy `seed-demo` command for these recordings: it writes Markdown into a configured knowledge base. This recorder needs only the browser fixture.
