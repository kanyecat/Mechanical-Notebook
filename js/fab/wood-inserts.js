(function () {
  const { TAU, COL } = MM;
  const TYPES = ['Screw-in insert', 'T-nut', 'Cross dowel'];
  // wood: a sectioned board with grain lines along it
  const board = (g, x, y, w, h) => { g.rect(x, y, w, h, { hatch: false }); for (let yy = y + 8; yy < y + h; yy += 9) g.line(x + 2, yy, x + w - 2, yy + Math.sin(yy * 0.3) * 2, { w: 0.7, color: COL.hatch }); };
  MM.register({
    slug: 'wood-inserts', hands: false, view: { w: 700, h: 430 }, thumb: 0.5,
    params: [{ key: 't', label: 'Type', min: 0, max: 2, step: 1, value: 0, options: TYPES.map((x, i) => [i, x]) }],
    draw(g, a, p) {
      const u = MM.cycle(a, 0.15), t = p.t | 0, cx = 260;
      const red = MM.tint('red', .45), bolt = MM.tint('white', .9);
      if (t === 0) {   // screw-in insert into the face of a board, then a bolt
        board(g, 60, 200, 400, 150); g.rect(cx - 22, 200, 44, 100, { fill: COL.paper, hatch: false });
        const y = 200 - 90 * (1 - Math.min(1, u * 1.6)), rot = u * 18;
        g.rect(cx - 26, y, 52, 100, { fill: red, hatch: false });
        for (let i = 0; i < 9; i++) { const yy = y + 6 + i * 11 + (rot % 11); if (yy < y + 98) g.line(cx - 30, yy, cx - 22, yy + 5, { w: 1.4 }), g.line(cx + 22, yy, cx + 30, yy + 5, { w: 1.4 }); }
        g.rect(cx - 12, y, 24, 90, { fill: COL.paper, hatch: false });
        const by = 40 + Math.max(0, u - 0.6) / 0.4 * 120; g.rect(cx - 11, by, 22, 110, { fill: bolt, hatch: false }); g.rect(cx - 26, by - 26, 52, 26, { fill: bolt, hatch: false });
        g.text('knife thread cuts into the wood', 470, 240, { size: 11, color: COL.faint }); g.text('machine thread inside', 470, 258, { size: 11, color: COL.faint });
      } else if (t === 1) {   // T-nut hammered in from the back, bolt from the front
        board(g, 60, 150, 400, 130); g.rect(cx - 16, 150, 32, 130, { fill: COL.paper, hatch: false });
        const y = 280 + 120 * (1 - Math.min(1, u * 1.6));
        g.rect(cx - 16, y - 120, 32, 120, { fill: red, hatch: false }); g.rect(cx - 60, y, 120, 12, { fill: red, hatch: false });
        [-40, 40].forEach(dx => g.poly([[cx + dx - 6, y], [cx + dx + 6, y], [cx + dx, y - 22]], { fill: red }));
        const by = 40 + Math.max(0, u - 0.6) / 0.4 * 140; g.rect(cx - 11, by, 22, 150, { fill: bolt, hatch: false }); g.rect(cx - 26, by - 26, 52, 26, { fill: bolt, hatch: false });
        g.text('prongs stop it turning', 340, 420, { size: 11, color: COL.faint }); g.text('hammered in from the back', 470, 300, { size: 11, color: COL.faint });
      } else {   // cross dowel: barrel nut in a hole across the rail, bolt through the side panel into it
        board(g, 60, 100, 60, 300); board(g, 120, 200, 420, 110); g.circle(400, 255, 24, { fill: COL.paper });
        const bx = 400, by = 255, rot = u * 6;
        g.circle(bx, by, 22, { fill: red }); g.circle(bx, by, 6, { fill: COL.paper }); g.line(bx - 10, by, bx + 10, by, { w: 2 });
        g.rect(60, by - 7, 330, 14, { fill: COL.paper, hatch: false });
        const tip = 140 + Math.min(1, u * 1.3) * 250; g.rect(tip - 280, by - 6, 280, 12, { fill: bolt, hatch: false }); g.rect(tip - 300, by - 18, 20, 36, { fill: bolt, hatch: false });
        g.text('barrel nut across the rail', 400, 336, { size: 11, align: 'center', color: COL.faint }); g.text('side panel', 90, 90, { size: 11, align: 'center', color: COL.faint });
      }
      g.text(TYPES[t].toUpperCase(), 560, 60, { size: 16, weight: 800, align: 'center', color: COL.red });
    },
    readout(a, p) { return { big: TYPES[p.t | 0], small: ['drill to the insert\'s core diameter; drive it straight with a bolt and locked nut', 'drill to the barrel diameter from the back; the prongs bite as you tighten', 'drill across for the barrel and through the edge for the bolt; line the slot up with the bolt'][p.t | 0] }; },
    panels: [{
      id: 'holes', title: 'Holes and good practice',
      intro: 'Hole sizes differ between makers and between hard and soft wood, so always use the figures on the pack and try one in scrap first. The sizes below are common for M6 parts.',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Type</th><th>Typical M6 hole</th><th>Best in</th><th>Watch out for</th></tr></thead><tbody>
        <tr><td>Screw-in (knife thread) insert</td><td>The insert's core diameter, about 8 mm; slightly bigger in hardwood</td><td>Faces of solid wood and plywood</td><td>Going in crooked; splitting near edges and in plywood edges</td></tr>
        <tr><td>T-nut</td><td>The barrel diameter, often 7.5 to 8 mm</td><td>Through holes where you can reach the back</td><td>Pushing out if the bolt is tightened from the prong side</td></tr>
        <tr><td>Cross dowel (barrel nut)</td><td>About 10 mm across for the barrel; 6.5 to 7 mm for the bolt</td><td>Corners of panels and rails (flat-pack)</td><td>The bolt hole missing the barrel: drill both with a jig</td></tr>
        <tr><td>Press-in or hammer-in insert</td><td>Per maker; a tight fit</td><td>Softwood, MDF, light loads</td><td>Pulling out under load</td></tr></tbody></table></div>
        <ul class="rules"><li><b>Keep clear of edges:</b> at least one and a half insert diameters, more in plywood edges, which split easily.</li>
        <li><b>Drive straight:</b> thread a bolt into the insert, lock it with a nut, and turn the bolt. A drill press (turned by hand) keeps it square.</li>
        <li><b>Glue helps:</b> a little epoxy on the outside makes inserts much stronger in soft wood, plywood edges and MDF.</li>
        <li><b>Laser-cut plywood:</b> cut the hole with the laser at the core size; the charred edge is slightly harder, so test one first.</li></ul>`
    }]
  });
})();
