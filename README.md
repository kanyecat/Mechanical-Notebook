# Mechanical Notebook

How machines move, and the math behind them. A free, open-source collection of animated mechanisms with
live calculators, practice problems and design challenges, plus generators that turn a design into files
you can laser-cut, CNC or 3D print.

Plain HTML, CSS and JavaScript. No dependencies, no build step needed to view.

## Run it

```
node serve.js        # or: yarn dev  →  http://localhost:5173
```

`serve.js` runs `build.js` first, which writes `index.html`, `about.html`, `pages/<slug>.html` for every file in
`js/mechanisms/` and `elements/<slug>.html` for every file in `js/elements/`. The top menu and footer live in `build.js`.

## What's inside

| Folder | What it holds |
|---|---|
| `js/mechanisms/` | One file per animated mechanism (drawing, sliders, motion graph) |
| `js/elements/` | One file per mechanical element (bearings, fasteners, springs...) |
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

## Add a mechanism or element

1. Add its text to `MM_CATALOG` (mechanisms) or `MM_ELEMENTS` (elements) in `js/catalog.js`.
2. Create `js/mechanisms/<slug>.js` or `js/elements/<slug>.js` calling `MM.register({ slug, view, params, draw, graph })`.
3. Optionally create `js/math/<slug>.js` calling `MM.addMath(slug, { inputs, outputs, problems, challenges })`.
4. Run `node build.js` and `node test/harness.js <slug>`.

## Licence

MIT – see `LICENSE`. Inspired by *507 Mechanical Movements* (Henry T. Brown, 1868).
