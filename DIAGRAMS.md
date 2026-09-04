# Architecture diagram rules

Each demo's `architecture.html` is a standalone, self-contained page served on its
own port and surfaced as an **Architecture** tab in Instruqt. These are the rules
they follow. Keep them consistent — learners move between demos.

## Structure

- **One fixed coordinate space** (`CANVAS_W` × `CANVAS_H`), absolute node positions,
  SVG edges computed from those coordinates. Never reflow for narrow screens.
- **Scale to fit instead.** `transform: scale()` on the canvas, sized to the pane,
  with `Fit` / `+` / `−` controls. Fit-to-width is the default and follows resizes.
  This is what keeps the diagram usable in Instruqt's split pane.
- **Detail panel stacks below the canvas** until the viewport is genuinely wide
  (≥1560px). Side-by-side starves the diagram.
- Containers, outermost in: **worker process** (dashed outline) → **task queue**
  (colored band) → **nodes**.

## Nodes read as source

Each box shows the real declaration — decorator line plus `class`/`def` signature:

```
@workflow.defn                  @activity.defn
class AgentWorkflow:            async def get_ip_address() -> str:
    @workflow.run
    async def run(self, question: str) -> str:
```

- **Author the line breaks in the node data** and render `white-space: pre`. Never
  let a box reflow on its own — it will wrap differently at a different zoom.
- Elide long parameter lists (`(self, ctx, request)`) rather than widening a box
  past its column. Width is expensive; see the trade-off below.
- Boxes that aren't declarations — external services, generated activities — keep
  the kicker + name + subtitle form.

## Color has one meaning per channel

Three independent channels. Don't let them borrow each other's hues.

| channel | encodes | how |
|---|---|---|
| **edge color** | call category (child workflow, Nexus, agent tool, setup, external) | line color + the legend |
| **file dot** | which source file the box lives in | small dot on the footer row |
| **syntax color** | Python/Java tokens | text inside the code block |

- `--accent` means **one** thing: the agent tool-call category, plus selection
  affordances (active ring, focus outline). It is not for lane bands, headings, or
  code. Task-queue bands use `--lane-tq` (slate).
- **Syntax palette** is VS Code Light+/Dark+, independent of the diagram hues:
  `--syn-kw` keywords, `--syn-deco` decorators, `--syn-str` strings, bold ink for
  the declared name.
- **At most three files carry a hue** — that's the cap for colorblind separation
  across all pairs. Colored slots go to the files the demo is *about*; everything
  else is neutral. The filename text is always visible, so identity never depends
  on color.
- **Filenames are muted ink with a colored dot beside them**, never colored text.
- Every text color clears 4.5:1 on the node surface, in both themes.

Validate any categorical palette before shipping it — the `dataviz` skill has a
runnable checker. Don't eyeball colorblind separation.

## Interaction

- **Click a node** → ring it, dim the rest, keep its edges hot, fill the detail panel.
- **Click a file chip** → ring that file's nodes, dim the rest, keep only edges that
  *touch* it, so a cross-file call reads as an edge leaving the lit set. The panel
  lists what the file calls out to and what calls into it.
- **Play data flow** → step through one concrete request, narrating each hop.
- Anything that centers the view must convert canvas coordinates to scaled pixels
  (multiply by the active scale) or it centers on the wrong place when zoomed.

## Chrome costs vertical space, and the canvas needs it

Every row of controls above the diagram is a row the diagram does not get. In
Instruqt's split pane that is the difference between reading a node and squinting
at it. Two rules follow.

**No edge legend.** Edge colour still encodes call category, but a legend of
toggle chips is a whole row spent on something a learner reads once. Put the
category in the detail panel when a node or edge is selected, and let the colours
carry it on the canvas. A lane legend earns its place — lanes are the diagram's
structure and clicking one filters — an edge legend does not.

**Zoom lives in the Play row.** `−` / `%` / `+` / `Fit` / `Reset view` go on the
right of the step-player row, not in a control bar of their own. That collapses
the chrome to a single row above the canvas.

**No standfirst under the title.** An eyebrow and an `h1` are enough. The
paragraph explaining what the diagram shows belongs in the assignment, which the
learner is already reading, or in the step narration, which is where they look
once they press Play. Prose above the canvas is read once and then costs vertical
space forever.

## Themes

Support light and dark via `prefers-color-scheme` **and** `:root[data-theme=…]`,
which must win in both directions. Declare every custom property in all scopes.

## The width trade-off

Wider canvas → smaller default fit → smaller text in the lab. A 1200px canvas fits
at ~75% in a 900px pane; 1800px fits at ~50%. So prefer taller over wider: stack a
column rather than widening boxes, and elide signatures before growing the canvas.

## Shipping a change

`architecture.html` is baked into the sandbox image, so a change needs an **image
rebuild**, not `instruqt track push`. See README → Publishing. Verify in a genuinely
fresh sandbox; a pre-warmed one serves the old image.

Before committing, check programmatically: no node overlaps, every node inside its
lane and worker, nothing past the canvas bounds, no code line within a character of
its box width, and the inline script parses.
