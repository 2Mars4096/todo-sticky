---
name: Sticky Todo
description: A calm working note with progressive goal and focus tools.
colors:
  note: "#FFF8DC"
  note-deep: "#F5EDBE"
  ruled-border: "#E8D9A0"
  goal-surface: "#F1E2A0"
  goal-surface-deep: "#E7D186"
  mission-surface: "#3E321B"
  mission-surface-deep: "#2B2112"
  ink: "#3D3520"
  ink-secondary: "#7A6F50"
  ink-muted: "#756747"
  accent: "#C4A44A"
  accent-deep: "#A8882E"
  focus-ring: "#856519"
  success: "#78956A"
  danger: "#B85F52"
typography:
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 650
    lineHeight: 1.2
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "10px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "7px 12px"
  input:
    backgroundColor: "{colors.note}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
  task-row:
    backgroundColor: "{colors.note}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "7px 12px"
---

# Design System: Sticky Todo

## 1. Overview

**Creative North Star: "The Working Note"**

Sticky Todo should feel like the one note already open beside the work: warm, compact, and immediately writable. The note surface carries daily work; goal and mission surfaces are distinct tools revealed progressively. Density is welcome when it keeps actions close, but the center task column must never be squeezed into an unusable strip.

The product rejects dashboard sprawl, space-game decoration that overpowers the task list, hidden hover-only actions, and routine modal flows.

**Key Characteristics:**

- Warm paper-toned working surface
- Compact but readable controls
- Structural responsive behavior instead of compressed columns
- Cinematic detail reserved for intentional focus mode

## 2. Colors

The palette is a restrained family of warm paper neutrals, graphite-brown ink, and a mustard accent, with the mission surface providing one earned dark contrast.

### Primary

- **Task Amber** (`#C4A44A`): primary task and focus selections and active controls. A deeper amber-brown (`#856519`) makes keyboard focus visible on paper.

### Secondary

- **Mission Umber** (`#3E321B`): Focus side panel and expanded Tracking Station.
- **Goal Straw** (`#F1E2A0`): long-term goals and manually reset Routines.

### Neutral

- **Working Paper** (`#FFF8DC`): main task canvas and inputs.
- **Pressed Paper** (`#F5EDBE`): header and secondary surface.
- **Ruled Edge** (`#E8D9A0`): dividers and low-emphasis borders.
- **Graphite Brown** (`#3D3520`): primary text.
- **Soft Graphite** (`#7A6F50`): supporting labels.

**The Paper First Rule.** Warm neutrals carry the working surface. Saturated accents signal state or action, never decoration.

## 3. Typography

**Display Font:** System UI sans
**Body Font:** System UI sans

**Character:** Native, compact, and quiet. Weight and spacing establish hierarchy without introducing a decorative display face.

### Hierarchy

- **Title** (650, 14px, 1.2): date and panel titles. Root task titles use 14px at weight 550 with a 1.5 line height.
- **Body** (400, 13px, 1.45): steps and capture fields. Outcome text and labeled task actions use 12px.
- **Label** (11px): supporting status, dates, and field labels. Uppercase tracking is reserved for short categorical labels and Focus telemetry.

**The One-Glance Rule.** A user should distinguish date, task, state, and action without reading explanatory prose.

## 4. Elevation

The working note is tonally layered and mostly flat. Ambient shadow belongs to the outer frameless window and elevated overlays; routine task rows use background and border changes instead.

### Shadow Vocabulary

- **Window lift** (`0 6px 26px rgba(0,0,0,0.14)`): the frameless app shell against the desktop.
- **Overlay lift** (`0 8px 32px rgba(0,0,0,0.20)`): settings and Tracking Station.

**The Flat Working Surface Rule.** Task capture and editing remain visually attached to the note; shadows never turn every row into a card.

## 5. Components

### Buttons

- **Shape:** gently rounded (`6px`) for actions; compact circular controls suit close, date navigation, and Focus camera actions.
- **Primary:** Task Amber with Graphite Brown, 7px by 12px padding.
- **Hover / Focus:** stronger amber tint plus a visible 2px focus ring; state transitions stay within 150 to 200ms.
- **Secondary / Ghost:** paper tint or transparent background with a ruled border.
- **Targets:** task checkboxes have a 24px click target and a visible square matching the title font size (14px tasks, 13px steps); common task actions are at least 28px tall and capture controls are 32px. Preserve reachable hit areas as labels wrap.

### Chips

- **Style:** compact pill with a quiet surface tint and categorical label.
- **State:** selected chips receive stronger fill and non-color emphasis through weight or a check mark.

### Cards / Containers

- **Corner Style:** 6px to 10px.
- **Background:** paper-tone shifts for task tools; dark tonal shifts for mission telemetry.
- **Shadow Strategy:** flat by default, ambient only when elevated.
- **Border:** 1px low-contrast ruled edge.
- **Internal Padding:** 8px to 12px.

### Inputs / Fields

- **Style:** paper-tinted fill, 1px ruled border, 6px radius.
- **Focus:** clear amber border and focus ring.
- **Error / Disabled:** text plus icon or label, never color alone.

### Navigation

- At compact widths, named **Goals** and **Focus** entries replace idle rail columns. An active focus countdown remains beside Focus. Goals opens over the task surface; Focus opens its dialog. Escape or the backdrop dismisses these surfaces. Wider windows can use side panels.
- Keep the date header compact and the top capture field visible. The footer wraps without overlapping controls; the provider quick switch appears only in wider layouts.
- Settings groups **Tasks & storage**, **AI assistance**, **Integrations**, and **Updates**. Connection details and optional machine settings appear on demand. First launch starts with capture and an optional AI setup prompt.

### Task hierarchy and editing

- Lead with the task title, then saved Outcome, Due, and status information. Selected tasks expose **Focus / Add step / Suggest steps with AI / Move / Delete**; Delete is directly available beside the other actions. Essential actions are available through selection and keyboard focus.
- Step groups collapse to a count and next-step summary. **Earlier tasks** is a separate, remembered disclosure for unfinished work from past dates. **Earlier steps (N)** within each task reveals read-only historical steps.
- Selection does not request AI. **Suggest outcome** is explicit inside an empty editor; its labeled suggestion becomes an editable draft through **Use suggestion** or Tab. Enter or leaving the editor commits; Escape cancels. Choosing a due date or clearing it stays a draft until **Save date** or Enter.
- **Complete / Revise / Stop** reviews an Outcome. Completion, partial progress, and stopping have distinct labels; a focus session never substitutes for this review.

### Planning and recovery

- **Plan** shows the selected date, available time, and optional configured machines before generation. Show proposed blocks chronologically and disclose unscheduled tasks. **Apply plan / Discard** makes commitment explicit; applying replaces only unfinished generated blocks for that planning date.
- Deletion and applied plans expose **Undo** near the working list. A failed write keeps the local edits and a persistent **Changes not saved / Retry save** notice; transient success feedback must not imply those edits reached storage.
- Settings, Focus, and planning dialogs contain keyboard focus and restore it to the invoking control or a stable task title on close.

### Star Focus

- The named compact entry shows an active timer; wider side tools retain their focus status. Cinematic orbital visuals remain inside expanded Mission Control or Tracking Station.
- The expanded surface is titled Focus Mode and frames each completed session as one named Solar Route leg from Earth through the Moon, Venus, Mars, Saturn, and home again.
- At compact widths, task and timer controls precede the orbital scene. **Start focus / Pause / Resume / Finish session** use functional labels. Completion says **Session saved**, then offers **Back to tasks** for outcome review. Logged duration is labeled planned.
- Wider windows pair one dominant map with one control column; travel log and retention controls stay secondary. Graphics construction, shader, or context failures reveal a projected SVG map while keeping session controls usable. **Try 3D again** retries rendering.
- Respect reduced motion with static decorative WebGL rendering and redraws for user or session changes. Release the renderer, observers, and animation work when the view closes.

## 6. Do's and Don'ts

### Do:

- **Do** expose task capture near the top of the default surface.
- **Do** keep essential task actions available to keyboard and touch users, not only pointer hover.
- **Do** switch compact side panels to overlays before the center column becomes cramped.
- **Do** provide generous invisible hit areas and visible corner cues for resizing the frameless window.

### Don't:

- **Don't** create dashboard sprawl that makes a small sticky-note window feel like a control center.
- **Don't** allow a crushed center task column caused by permanently expanded side panels.
- **Don't** let space-game decoration overpower the productivity workflow.
- **Don't** rely on hover-only or cryptic controls for the shortest path to a key action.
- **Don't** use modal-first flows for routine task capture or editing.

Settings uses one navigation row (Storage, AI, Integrations, Updates) and a stable viewport-bounded dialog height. Longer sections scroll internally while the header and Save/Cancel controls stay in place.
