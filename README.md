# Mechanical Notebook

How machines move, and the math behind them. A free, open-source collection of animated mechanisms with
live calculators, practice problems and design challenges, plus generators that turn a design into files
you can laser-cut, CNC or 3D print.

Plain HTML, CSS and JavaScript. No dependencies, no build step needed to view.

## Run it

```
node serve.js        # or: yarn dev  →  http://localhost:5173
```

`serve.js` runs `build.js` first, which writes `index.html`, `about.html`, the room pages (`mechanisms.html`, `elements.html`, `generators.html`, `fabrication.html`), `pages/<slug>.html` for every file in
`js/mechanisms/`, `elements/<slug>.html` for every file in `js/elements/` and `fabrication/<slug>.html` for every file in `js/fab/`. The top menu and footer live in `build.js`.

## What's inside

| Folder | What it holds |
|---|---|
| `js/mechanisms/` | One file per animated mechanism (drawing, sliders, motion graph) |
| `js/elements/` | One file per mechanical element (bearings, fasteners, springs...) |
| `js/fab/` | One file per fabrication technique (tab and slot, snap fit, kerf...), each with a drawing, sliders and a rules-of-thumb table |
| `js/fab-tricks.js` | The "ways to make it better" cards (strengthening tab and slot, press-fit fixes for each shape, and so on) with their small drawings |
| `js/fab-catalog.js` | Names, categories, processes, How it works, Application and Fun fact text for every technique |
| `js/math/` | The calculator, practice problems and challenges for each mechanism |
| `js/catalog.js` | Names, How it works, Application and Fun fact text for every page |
| `js/glossary.js` | Plain-language definitions shown when you hover an underlined term |
| `js/theme.js` | Blueprint / paper theme switch shared by every page |
| `js/site.js` | Top menu (mobile menu and Generators drop-down) |
| `js/analytics.js` | Google Analytics 4 visit counting. Paste your Measurement ID into `GA_ID` to turn it on |
| `js/engine.js`, `js/learn.js` | Shared drawing engine and the "Do the math" panel |
| `generators/`, `js/gen/` | Gear, linkage, cam, pulley and chain generators with SVG / DXF / STL export |
| `test/` | `node test/harness.js` checks every mechanism for errors and NaNs |

## Generators

- **Gears** – involute spur gears (any module, 14.5° / 20° / 25° pressure angle, profile shift, backlash),
  meshing with a second spur gear, an internal ring gear or a rack. Shows ratio, centre distance, contact ratio
  and undercut warnings.
  Bevel pairs (any shaft angle, Tredgold teeth, exported as a stack of stepped layers or one tapered part) and worm
  drives (1–4 starts, left or right hand, exported as keyed layers each turned a step, or one twisted STL) are in the
  Setup section.
- **Cams** – disc cams built from a motion program of rise / dwell / fall steps (cycloidal, 3-4-5 polynomial,
  simple harmonic or constant velocity) for roller, knife-edge, flat-faced or swing-arm followers. Shows lift, speed,
  acceleration and jerk, pressure angle, undercut and cusp checks, and a live motion chart.
- **Linkages** – four-bar (with any coupler point traced) and slider-crank. Shows Grashof type, transmission
  angle, swing, stroke and time ratio. Links come out as plates with pivot holes.

- **Pulleys** – belt drives with pulleys placed anywhere (horizontal, vertical, diagonal), back-side idlers,
  pulleys sharing a shaft for multi-stage drives, and loads hung from any pulley's drum. Shows every pulley's speed,
  belt length and speed, wrap angles, belt slip (Euler–Eytelwein) and the motor torque needed. A second mode
  designs block-and-tackle lifting systems: mechanical advantage, effort with sheave friction, rope pulled and beam load.
- **Chains** – roller and plate chains (ANSI 25–60, ISO 06B–12B, or custom dimensions) over any number of
  sprockets, with several chains, back-side idlers, shared shafts, strands, and attachment plates (tabs with holes).
  Sprocket designs: solid, drilled, teardrop, spoked and swirl, with hub, rim, corner radius and keyway. Shows chain
  length, link count, speeds, wrap and torque, and a parts list with quantities.

Gear and link designs: tooth styles (standard, stub, tall, soft, straight), helical / herringbone gears, gear body
holes (drilled, teardrop, skeleton, swirl), and link shapes (bar, taper, bone, hammer, curved, curved bone, slot).

Exports, all in millimetres. A **Nested** layout packs the parts close together to save sheet material (kerf gap and
sheet width are adjustable). **Labels** add a legend (ID, name, size, thickness) above the drawing and can etch a
P1, P2… ID on every part, using a built-in single-stroke font on their own blue layers.
- **SVG** – outlines, one group per part, 0.1 mm stroke (laser cutters).
- **DXF** – AutoCAD R12, one layer per part, holes as true circles (CAD, CNC, laser).
- **STL** – each part extruded by its thickness, checked to be watertight (3D printing).

Designs live in the page address, so "Copy share link" reproduces a design exactly. "Save" downloads a JSON file
that "Open…" loads again.

Known simplifications: gear roots are a plain arc (no trochoid fillet), and internal gears don't take profile shift.

## Search, goals and build guides

- **Search** (press `/` or Ctrl/⌘+K, or use the search icon) finds mechanisms, elements, generators, glossary terms and goals. The index is `js/searchdata.js`, written by `build.js`; edit keywords in `js/search.js` (`EXTRA`) and the goals in `js/goals.js`.
- **What do you want to do?** on the home page comes from `js/goals.js`. Each goal lists mechanism, element and generator picks; generator picks can carry settings that preset the generator.
- **Build guide** (button in each generator) is `js/gen/guide.js`: cut list, hardware, assembly steps, fit checks and a print view for the current design.

## Check my design

In each generator, the Export menu has **Check my design before exporting** (on by default, remembered) and a **Check my design now** button. `js/gen/check.js` builds the list: the design rules per generator (`RULES`, matched to the warnings in each generator's `info()`), then checks on the actual shapes (clean outlines, part and hole sizes, material around holes, overlaps, sheet or print-bed size). Each line gets a ✓ or ✗. To add a rule, add a line to `RULES` for that generator.

## Combine mechanisms

`combine.html` chains mechanisms: the output angle of one stage becomes the input angle of the next. `js/combine.js` has a table (`PASS`) of the mechanisms that hand rotation on (gears, belt, chain, worm, planetary, Geneva, Hooke's joint) and how to compute their output shaft angle, and a table of what to plot when a mechanism is the last stage. To make a new mechanism usable as a middle stage, add it to `PASS`. The ready-made examples are in `js/recipes.js`; they also appear on the home page, in search and in the goals. The chain is stored in the URL hash, so links can be shared.

The home page is five room cards (Mechanisms, Elements, Generators, Combine, Fabrication). Each room has its own page with its own filters: Mechanisms, Elements and Fabrication filter by group, and Fabrication also filters by process (laser cutting, CNC, 3D printing). The room list is in `build.js` (`ROOMS`) and the filter bars are built by `MM.landing()` in `js/engine.js`.

## Add a fabrication technique

1. Add an entry to `js/fab-catalog.js` (slug, number, name, category, process list, one-line function, notes, applications, fun fact).
2. Create `js/fab/<slug>.js` calling `MM.register({ slug, view, params, draw, readout, panels })`. `MM.cycle(a)` gives a 0 to 1 and back animation, and `g.dim(...)` draws dimension lines.
3. Optionally add a list of "ways to make it better" cards for it in `js/fab-tricks.js` (title, text, the process `p` and material `m` it sits under, tag badges, and a small 3D drawing built with the helpers at the top of that file). They appear under the animation, grouped by process then material, with filter buttons.
4. Run `node build.js`. The page, room card, filter, search entry and footer link appear on their own.

## Add a mechanism or element

1. Add its text to `MM_CATALOG` (mechanisms) or `MM_ELEMENTS` (elements) in `js/catalog.js`.
2. Create `js/mechanisms/<slug>.js` or `js/elements/<slug>.js` calling `MM.register({ slug, view, params, draw, graph })`.
3. Optionally create `js/math/<slug>.js` calling `MM.addMath(slug, { inputs, outputs, problems, challenges })`.
4. Run `node build.js` and `node test/harness.js <slug>`.

## Licence

MIT – see `LICENSE`. Inspired by *507 Mechanical Movements* (Henry T. Brown, 1868).
