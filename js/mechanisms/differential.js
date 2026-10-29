(function () {
  const { TAU, COL } = MM, CY = 215, T = 1.5;
  // speed of each wheel ÷ case speed, for each case: [left, right, label]
  const MODES = [[1, 1, 'Driving straight'], [1 - T / 2 / 12, 1 + T / 2 / 12, 'Gentle left turn (12 m radius)'], [1 - T / 2 / 4, 1 + T / 2 / 4, 'Tight left turn (4 m radius)'], [0, 2, 'Right wheel on ice, left wheel stuck']];
  // a part turning about the left-right axle, seen from above: stripes run round it and slide up or down as it turns
  function drum(g, x, y, w, h, rot, n, fill) {
    g.rect(x, y - h / 2, w, h, { fill: fill || COL.white, hatch: false });
    for (let i = 0; i < n; i++) { const ph = rot + i * TAU / n; if (Math.sin(ph) <= 0) continue; const yy = y - h / 2 * Math.cos(ph); g.line(x + 1.5, yy, x + w - 1.5, yy, { w: 1.2, color: MM.tint('ink', 0.35 + 0.5 * Math.sin(ph)) }); }
  }
  // a spider gear turning about the up-down cross pin: stripes slide left or right
  function vdrum(g, x, y, w, h, rot, n) {
    g.rect(x - w / 2, y - h / 2, w, h, { fill: MM.tint('white', .95), hatch: false });
    for (let i = 0; i < n; i++) { const ph = rot + i * TAU / n; if (Math.sin(ph) <= 0) continue; const xx = x - w / 2 * Math.cos(ph); g.line(xx, y - h / 2 + 1.5, xx, y + h / 2 - 1.5, { w: 1.2, color: MM.tint('ink', 0.35 + 0.5 * Math.sin(ph)) }); }
  }
  MM.register({
    slug: 'differential', view: { w: 700, h: 430 }, thumb: 0.2,
    params: [{ key: 'mode', label: 'Situation', min: 0, max: 3, step: 1, value: 2, options: [[0, 'Straight'], [1, 'Gentle turn'], [2, 'Tight turn'], [3, 'On ice']] }],
    draw(g, a, p) {
      const md = MODES[p.mode | 0], wl = md[0] * a, wr = md[1] * a, wc = a, spin = (md[1] - md[0]) / 2 * a * (16 / 10);
      // axles and wheels
      g.line(110, CY, 590, CY, { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
      g.rect(110, CY - 6, 170, 12, { fill: COL.white, hatch: false }); g.rect(420, CY - 6, 170, 12, { fill: COL.white, hatch: false });
      drum(g, 40, CY, 70, 150, wl, 18); drum(g, 590, CY, 70, 150, wr, 18);
      // case (carrier) with the ring gear, turning about the axle
      g.rect(250, CY - 105, 200, 210, { fill: MM.tint('white', .5), hatch: false });
      drum(g, 250, CY - 92, 200, 26, wc, 12, MM.tint('white', .9)); drum(g, 250, CY + 92, 200, 26, wc, 12, MM.tint('white', .9));
      drum(g, 450, CY, 26, 220, wc, 30, MM.tint('white', .95));
      g.text('ring gear', 463, CY - 124, { size: 11, align: 'center', color: COL.faint });
      // drive pinion and shaft from the engine
      g.rect(470, CY + 70, 26, 26, { fill: COL.white, hatch: false });
      g.rect(476, CY + 96, 14, 110, { fill: COL.white, hatch: false });
      g.text('from engine', 520, CY + 196, { size: 11, color: COL.faint });
      // side gears (on the axles) and spider gears (on the cross pin)
      drum(g, 282, CY, 30, 112, wl, 14); drum(g, 388, CY, 30, 112, wr, 14);
      g.line(350, CY - 78, 350, CY + 78, { w: 4 });
      vdrum(g, 350, CY - 48, 64, 26, spin, 10); vdrum(g, 350, CY + 48, 64, 26, -spin, 10);
      g.text('spider gears', 350, CY - 120, { size: 11, align: 'center', color: COL.faint });
      g.text('side gear', 297, CY + 78, { size: 10, align: 'center', color: COL.faint }); g.text('side gear', 403, CY + 78, { size: 10, align: 'center', color: COL.faint });
      g.text('left wheel', 75, CY - 92, { size: 11, align: 'center', color: COL.faint }); g.text('right wheel', 625, CY - 92, { size: 11, align: 'center', color: COL.faint });
      g.text(md[2].toUpperCase(), 350, 26, { size: 13, weight: 700, align: 'center' });
      g.text('left ' + md[0].toFixed(2) + '×   case 1.00×   right ' + md[1].toFixed(2) + '×', 350, 410, { size: 12, align: 'center' });
    },
    graph: {
      title: 'Turns made (per turn of the case)', min: -0.1, max: 2.1, ticks: [{ v: 0, label: '0' }, { v: 1, label: '1' }, { v: 2, label: '2' }],
      series: [
        { name: 'left', color: COL.blue, f: (t, p) => MODES[p.mode | 0][0] * t / TAU },
        { name: 'case', color: COL.ink, dash: [5, 4], f: t => t / TAU },
        { name: 'right', color: COL.red, f: (t, p) => MODES[p.mode | 0][1] * t / TAU }
      ],
      readout(a, p) { const md = MODES[p.mode | 0]; return { big: ((md[0] + md[1]) / 2).toFixed(2) + '×', small: 'average of the two wheels = case speed (left ' + md[0].toFixed(2) + ', right ' + md[1].toFixed(2) + ')' }; }
    }
  });
})();
