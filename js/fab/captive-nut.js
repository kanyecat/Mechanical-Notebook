(function () {
  const { TAU, COL } = MM;
  const NUT = { 3: [5.5, 2.4, 3.2], 4: [7, 3.2, 4.3], 5: [8, 4, 5.3], 6: [10, 5, 6.4], 8: [13, 6.5, 8.4] };   // across flats, thickness, close-fit clearance hole (ISO 273)
  const CL = 0.3;                                                   // extra room round the nut, mm
  const cl = (x, a, b) => Math.max(a, Math.min(b, x));
  MM.register({
    slug: 'captive-nut', view: { w: 700, h: 440 }, thumb: 0.45,
    params: [{ key: 'd', label: 'Bolt size', min: 3, max: 8, step: 1, value: 4, options: [[3, 'M3'], [4, 'M4'], [5, 'M5'], [6, 'M6'], [8, 'M8']] }],
    draw(g, a, p) {
      const u = MM.cycle(a), [af, m, hole] = NUT[p.d], s = 9, u1 = cl(u * 2, 0, 1), u2 = cl(u * 2 - 1, 0, 1), cx = 250, y0 = 150;
      const pw = (af + CL) * s, ph = (m + CL) * s, hw = hole * s, tp = 190;   // pocket width, pocket height, hole width, plate height
      const nutW = af * s * 1.1547, nutH = m * s;               // seen from the side the nut is across-corners wide
      // plate in section: a bolt hole, and a slot from the right edge for the nut
      const py = y0 + 70;                                          // top of the pocket
      g.rect(80, y0, cx - hw / 2 - 80, tp); g.rect(cx + hw / 2, y0, 470 - cx - hw / 2, py - y0);
      g.rect(cx + hw / 2, py + ph, 470 - cx - hw / 2, y0 + tp - py - ph);
      g.rect(80, y0, 0, 0);
      g.text('plate', 110, y0 + tp + 22, { size: 11, color: COL.faint });
      // the nut slides in from the right
      const nx = cx - nutW / 2 + (1 - u1) * 190;
      g.poly([[nx, py + 1.5], [nx + nutW, py + 1.5], [nx + nutW, py + ph - 1.5], [nx, py + ph - 1.5]], { fill: MM.tint('red', 0.35), color: COL.red, hatch: { spacing: 5, cx: nx + nutW / 2, cy: py + ph / 2 } });
      g.circle(nx + nutW / 2, py + ph / 2, 0.01);
      // the bolt comes down from above and screws into the nut
      const bw = p.d * s, by = y0 - 130 + u2 * 130 + 0, turn = u2 * 8 * Math.PI;
      g.rect(cx - bw / 2, by - 40 - 20, bw, 60, { fill: MM.tint('white', 0.96), sp: 6 });           // shank above the plate
      g.poly([[cx - bw * 0.9, by - 60], [cx + bw * 0.9, by - 60], [cx + bw * 0.9, by - 84], [cx - bw * 0.9, by - 84]], { fill: COL.white, hatch: { spacing: 5, cx, cy: by - 72 } });   // head
      g.rect(cx - bw / 2, by + 0, bw, tp + 60 - 40, { fill: MM.tint('white', 0.96), sp: 6 });
      // thread lines turning
      for (let k = 0; k < 14; k++) { const yy = by + 6 + k * 12 + ((turn / (2 * Math.PI)) * 12) % 12; if (yy < by + tp + 40 && yy > by) g.line(cx - bw / 2, yy + 4, cx + bw / 2, yy - 4, { w: 0.9, color: COL.faint }); }
      g.text('M' + p.d, cx + bw + 14, by - 70, { size: 12, weight: 700 });
      // top view of the pocket
      const tx = 580, ty = 210, hx = (r, ang) => [tx + r * Math.cos(ang), ty + r * Math.sin(ang)];
      g.text('TOP VIEW', tx, ty - 90, { size: 10, align: 'center', color: COL.faint });
      g.poly([[tx - pw / 2, ty - 62], [tx + pw / 2, ty - 62], [tx + pw / 2, ty + 60], [tx - pw / 2, ty + 60]], { fill: COL.white, hatch: { spacing: 6, cx: tx, cy: ty }, close: false });
      g.poly([[tx - pw / 2, ty + 62], [tx - pw / 2, ty - 62]], { close: false });
      const R = af * s / 2 * 1.1547, pts = []; for (let k = 0; k < 6; k++) pts.push(hx(R, Math.PI / 6 + k * Math.PI / 3));
      g.poly(pts, { fill: MM.tint('red', 0.35), color: COL.red });
      g.circle(tx, ty, hw / 2, { fill: COL.paper });
      g.dim(tx - pw / 2, ty + 80, tx + pw / 2, ty + 80, (af + CL).toFixed(1) + ' mm', 0, { ty: 16 });
      g.text('pocket ' + (af + CL).toFixed(1) + ' × ' + (m + CL).toFixed(1) + ' mm', 350, 410, { size: 12, align: 'center', weight: 700, color: COL.red });
    },
    readout(a, p) { const [af, m, h] = NUT[p.d]; return { big: 'M' + p.d, small: 'nut ' + af + ' mm across flats, ' + m + ' mm thick. Pocket ' + (af + CL).toFixed(1) + ' × ' + (m + CL).toFixed(1) + ' mm' }; },
    panels: [{
      id: 'sizes', title: 'Nut and pocket sizes', live: true,
      intro: 'Standard ISO metric nuts, with the pocket sized as the nut plus 0.3 mm of room. These are starting points. Cut or print a test piece, as every machine and material differs.',
      html: p => `<div class="tablewrap"><table class="btable"><thead><tr><th>Bolt</th><th>Nut across flats</th><th>Nut thickness</th><th>Bolt hole (close fit)</th><th>Pocket width</th><th>Pocket height</th></tr></thead><tbody>${Object.keys(NUT).map(k => { const [af, m, h] = NUT[k]; return `<tr${+k === +p.d ? ' style="font-weight:700"' : ''}><td>M${k}</td><td>${af} mm</td><td>${m} mm</td><td>${h} mm</td><td>${(af + CL).toFixed(1)} mm</td><td>${(m + CL).toFixed(1)} mm</td></tr>`; }).join('')}</tbody></table></div>
        <ul class="rules"><li><b>Laser cutting:</b> cut the pocket as a slot open to an edge, so the nut slides in sideways. Draw the pocket a little smaller by the kerf if the nut feels loose.</li>
        <li><b>3D printing:</b> print a hexagonal pocket with the flats about 0.2 to 0.4 mm larger than the nut across flats, and pause the print to drop the nut in if the pocket is closed over.</li>
        <li><b>Hold the nut:</b> leave at least a sheet or two layers of material on the side the bolt pulls toward, so the nut cannot pull through.</li></ul>`
    }]
  });
})();
