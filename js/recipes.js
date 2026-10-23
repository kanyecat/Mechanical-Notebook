/* Ready-made chains for the Combine page. Read by build.js (node) and by combine.js (browser).
   Each stage is { s: mechanism slug, p: settings that differ from the defaults }. */
const RECIPES = [
  { id: 'geared-piston', title: 'Gear reduction into a piston', blurb: 'A fast motor slowed 3 to 1, then turned into a back-and-forth stroke.',
    words: 'reduction piston slow down stroke engine pump gears crank',
    stages: [{ s: 'spur-gears', p: { n1: 10, n2: 30 } }, { s: 'slider-crank', p: {} }] },
  { id: 'indexed-feed', title: 'Stepped linear feed', blurb: 'A Geneva wheel steps a gear pair, which pushes a rack forward one jump at a time.',
    words: 'indexing feed step linear rack advance conveyor intermittent',
    stages: [{ s: 'geneva-drive', p: {} }, { s: 'spur-gears', p: { n1: 12, n2: 24 } }, { s: 'rack-pinion', p: { n: 14 } }] },
  { id: 'worm-cam', title: 'Worm-driven cam', blurb: 'A worm slows the motor right down, so the cam makes one slow, deliberate cycle.',
    words: 'worm cam slow cycle follower timer',
    stages: [{ s: 'worm-gear', p: { n: 12, starts: 1 } }, { s: 'cam-follower', p: {} }] },
  { id: 'belt-quick-return', title: 'Belt drive into a quick-return ram', blurb: 'A belt reduction feeds a shaper-style ram that cuts slowly and returns fast.',
    words: 'belt shaper quick return ram cutting stroke',
    stages: [{ s: 'belt-pulleys', p: { r2: 100 } }, { s: 'quick-return', p: {} }] },
  { id: 'planetary-yoke', title: 'Planetary gearbox into a Scotch yoke', blurb: 'A compact planetary reduction drives a pure sine-wave slider.',
    words: 'planetary gearbox scotch yoke sine slider compact',
    stages: [{ s: 'planetary-gears', p: { mode: 0 } }, { s: 'scotch-yoke', p: {} }] },
  { id: 'compound', title: 'Compound gear reduction', blurb: 'Three gear pairs in a row. Watch the ratios multiply: 3, then 3, then 2.',
    words: 'compound gear train reduction ratio multiply gearbox stages',
    stages: [{ s: 'spur-gears', p: { n1: 12, n2: 36 } }, { s: 'spur-gears', p: { n1: 12, n2: 36 } }, { s: 'spur-gears', p: { n1: 12, n2: 24 } }] },
  { id: 'chain-indexer', title: 'Chain drive into an indexer', blurb: 'A chain halves the speed, then a Geneva wheel turns it into exact steps.',
    words: 'chain sprocket geneva indexing stop go table',
    stages: [{ s: 'roller-chain', p: { n1: 14, n2: 28 } }, { s: 'geneva-drive', p: {} }] },
  { id: 'geared-walker', title: 'Geared walking leg', blurb: 'A 2 to 1 reduction slows the motor so the Jansen leg takes unhurried steps.',
    words: 'jansen walking leg strandbeest robot geared slow',
    stages: [{ s: 'spur-gears', p: { n1: 10, n2: 20 } }, { s: 'jansen-linkage', p: {} }] }
];
if (typeof module !== 'undefined') module.exports = RECIPES;
