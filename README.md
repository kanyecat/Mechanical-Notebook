# Moving Parts

How machines move, and the math behind them. A free, open-source collection of animated mechanisms with
live calculators, practice problems and design challenges, plus generators that turn a design into files
you can laser-cut, CNC or 3D print.

Plain HTML, CSS and JavaScript. No dependencies, no build step needed to view.

## Run it

```
node serve.js        # or: yarn dev  →  http://localhost:5173
```

`serve.js` runs `build.js` first, which writes `index.html` and `pages/<slug>.html` for every file in `js/mechanisms/`.

## What's inside

| Folder | What it holds |
|---|---|
| `js/mechanisms/` | One file per animated mechanism (drawing, sliders, motion graph) |
| `js/math/` | The calculator, practice problems and challenges for each mechanism |
| `js/catalog.js` | Names, numbers, notes and categories |
| `js/engine.js`, `js/learn.js` | Shared drawing engine and the "Do the math" panel |
| `generators/`, `js/gen/` | Gear, linkage and cam generators with SVG / DXF / STL export |
| `test/` | `node test/harness.js` checks every mechanism for errors and NaNs |

## Generators

- **Gears** – involute spur gears (any module, 14.5° / 20° / 25° pressure angle, profile shift, backlash),
  meshing with a second spur gear, an internal ring gear or a rack. Shows ratio, centre distance, contact ratio
  and undercut warnings.
- **Cams** – disc cams built from a motion program of rise / dwell / fall steps (cycloidal, 3-4-5 polynomial,
  simple harmonic or constant velocity) for roller, knife-edge, flat-faced or swing-arm followers. Shows lift, speed,
  acceleration and jerk, pressure angle, undercut and cusp checks, and a live motion chart.
- **Linkages** – four-bar (with any coupler point traced) and slider-crank. Shows Grashof type, transmission
  angle, swing, stroke and time ratio. Links come out as plates with pivot holes.

Exports, all in millimetres:
- **SVG** – outlines, one group per part, 0.1 mm stroke (laser cutters).
- **DXF** – AutoCAD R12, one layer per part, holes as true circles (CAD, CNC, laser).
- **STL** – each part extruded by its thickness, checked to be watertight (3D printing).

Designs live in the page address, so "Copy share link" reproduces a design exactly. "Save" downloads a JSON file
that "Open…" loads again.

Known simplifications: gear roots are a plain arc (no trochoid fillet), and internal gears don't take profile shift.

## Add a mechanism

1. Add its metadata to `js/catalog.js`.
2. Create `js/mechanisms/<slug>.js` calling `MM.register({ slug, view, params, draw, graph })`.
3. Optionally create `js/math/<slug>.js` calling `MM.addMath(slug, { inputs, outputs, problems, challenges })`.
4. Run `node build.js` and `node test/harness.js <slug>`.

## Licence

MIT – see `LICENSE`. Inspired by *507 Mechanical Movements* (Henry T. Brown, 1868).
