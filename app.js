/* =====================================================================
   Nail Polish Visualizer — app.js  (photo-based, fully offline)
   A real hand photo (hand-photo.js) with polish rendered on top of each
   nail as SVG layers: color, blend-mode texture from the photo,
   curvature shading, specular highlights, glitter particles, etc.
   ===================================================================== */

/* ---------------------------------------------------------------------
   0) SHADE CATALOG — brand shades live in catalog.json (fetched at runtime,
      cached by the service worker). catalog-fallback.js holds an inline copy
      used when fetch() is unavailable (file://). Entry:
      { id, brand, line, name, hex, finish: glossy|matte|glitter|chrome, holo? }
   --------------------------------------------------------------------- */
let CATALOG = (window.CATALOG_FALLBACK && window.CATALOG_FALLBACK.shades) || [];
let CATALOG_META = window.CATALOG_FALLBACK || { finishes: {} };

/* ---------------------------------------------------------------------
   1) BASIC PALETTE — used by the French base / tip pickers.  { id, he, en, hex }
   --------------------------------------------------------------------- */
const COLORS = [
  { id: 'red',      he: 'אדום קלאסי', en: 'Classic Red', hex: '#b5122a' },
  { id: 'nude',     he: 'ניוד',        en: 'Nude',        hex: '#d6a88f' },
  { id: 'blush',    he: 'ורוד עדין',   en: 'Blush Pink',  hex: '#efb0bd' },
  { id: 'burgundy', he: 'בורדו',       en: 'Burgundy',    hex: '#5e1129' },
  { id: 'coral',    he: 'קורל',        en: 'Coral',       hex: '#f0614f' },
  { id: 'fuchsia',  he: 'פוקסיה',      en: 'Fuchsia',     hex: '#cf1c69' },
  { id: 'lilac',    he: 'לילך',        en: 'Lilac',       hex: '#b99ad3' },
  { id: 'navy',     he: 'כחול נייבי',  en: 'Navy',        hex: '#1b2452' },
  { id: 'sky',      he: 'תכלת',        en: 'Sky Blue',    hex: '#8cc0e8' },
  { id: 'mint',     he: 'מנטה',        en: 'Mint',        hex: '#9fdcc2' },
  { id: 'emerald',  he: 'ירוק אמרלד',  en: 'Emerald',     hex: '#0e604a' },
  { id: 'mocha',    he: 'מוקה',        en: 'Mocha',       hex: '#6f4434' },
  { id: 'black',    he: 'שחור',        en: 'Black',       hex: '#151314' },
  { id: 'white',    he: 'לבן',         en: 'White',       hex: '#f6f3ee' },
];

/* ---------------------------------------------------------------------
   2) GLITTER COLORS (used when Finish = Glitter).
      palette: flake tones from dark → bright. holo: rainbow flakes.
   --------------------------------------------------------------------- */
const GLITTERS = [
  { id: 'silver',    he: 'כסף',         en: 'Silver',      palette: ['#6d7178', '#a9adb4', '#d9dce1', '#ffffff'] },
  { id: 'gold',      he: 'זהב',         en: 'Gold',        palette: ['#7a5a14', '#c49a2c', '#f0d270', '#fff6d0'] },
  { id: 'rosegold',  he: 'רוז גולד',    en: 'Rose Gold',   palette: ['#8a4f45', '#c98a7c', '#f1c2b3', '#fff0ea'] },
  { id: 'champagne', he: 'שמפניה',      en: 'Champagne',   palette: ['#8c7a5c', '#cdb98f', '#efe2bf', '#fffaf0'] },
  { id: 'pink',      he: 'ורוד',        en: 'Pink',        palette: ['#9b2a5c', '#e2649c', '#ffa9cf', '#fff0f7'] },
  { id: 'red',       he: 'אדום',        en: 'Red',         palette: ['#6e0a14', '#c21b2c', '#ff5a64', '#ffd9db'] },
  { id: 'blue',      he: 'כחול',        en: 'Blue',        palette: ['#14306e', '#2f62c8', '#7fb0ff', '#e3eeff'] },
  { id: 'purple',    he: 'סגול',        en: 'Purple',      palette: ['#3d1a6b', '#7a45c4', '#bb92ff', '#f1e6ff'] },
  { id: 'holo',      he: 'הולוגרפי',    en: 'Holographic', holo: true, palette: ['#888', '#bbb', '#eee', '#fff'] },
  { id: 'black',     he: 'שחור',        en: 'Black',       palette: ['#050505', '#1c1c1f', '#45464c', '#b8bac2'] },
];

/* ---------------------------------------------------------------------
   3) DESIGNS — the "pattern" of the polish.
      base:    'color' | '#hex' | null (no base coat = natural nail)
      baseOp:  base opacity (sheer looks < 1, real nail shows through)
      tip:     null | 'color' | '#hex'   French tip color
      ombre:   null | 'color' | '#hex'   gradient cuticle → tip
      chrome:  metallic mirror gradient from the color
      usesColor: does the color picker affect it
   --------------------------------------------------------------------- */
const DESIGNS = [
  { id: 'natural', he: 'טבעי (ללא לק)', en: 'Natural / none', base: null,      usesColor: false },
  { id: 'solid',   he: 'צבע מלא',       en: 'Solid',         base: 'color',   baseOp: 1,    usesColor: true },
  // French designs take their base & tip from FRENCH_BASES / FRENCH_TIPS below (two pickers in the panel)
  { id: 'french',  he: "פרנץ'",         en: 'French tip',    base: 'french', tip: 'french', usesColor: false, defTip: 'white' },
  { id: 'frenchc', he: "פרנץ' צבעוני",  en: 'Color French',  base: 'french', tip: 'french', usesColor: false, defTip: 'c:fuchsia' },
  { id: 'ombre',   he: 'אומברה',        en: 'Ombré',         base: '#f2d2c6', baseOp: 0.85, ombre: 'color', usesColor: true },
  { id: 'boomer',  he: 'בייבי בומר',    en: 'Baby Boomer',   base: '#f3cbc3', baseOp: 0.8,  ombre: '#fffdf9', usesColor: false },
  { id: 'chrome',  he: 'כרום',          en: 'Chrome',        base: 'color',   baseOp: 1,    chrome: true,   usesColor: true },
];

/* ---------------------------------------------------------------------
   3b) FRENCH BASE & TIP options (French / Color French designs).
       Bases: { id, he, en, hex, op (opacity; sheer < 1), sheer (adapts to skin tone) }
       + every COLORS entry as an opaque base ('c:<id>').
       Tips: white + every COLORS entry ('c:<id>') + every GLITTERS entry ('g:<id>').
   --------------------------------------------------------------------- */
const FRENCH_BASES = [
  { id: 'sheer', he: 'ורוד שקוף', en: 'Sheer pink',  hex: '#f2a7b0', op: 0.38, sheer: true },
  { id: 'milky', he: 'לבן חלבי',  en: 'Milky white', hex: '#f6ece8', op: 0.7,  sheer: false },
  { id: 'nude',  he: 'ניוד',      en: 'Nude',        hex: '#e2b49f', op: 0.62, sheer: true },
  { id: 'clear', he: 'שקוף',      en: 'Clear',       hex: '#ffffff', op: 0.06, sheer: false },
  ...COLORS.filter((c) => c.id !== 'white').map((c) => ({ id: 'c:' + c.id, he: c.he, en: c.en, hex: c.hex, op: 0.95, sheer: false })),
];
const FRENCH_TIPS = [
  { id: 'white', he: 'לבן', en: 'White', hex: '#fbfaf6' },
  ...COLORS.filter((c) => c.id !== 'white').map((c) => ({ id: 'c:' + c.id, he: c.he, en: c.en, hex: c.hex })),
  ...GLITTERS.map((g) => ({ id: 'g:' + g.id, he: 'נצנצים ' + g.he, en: g.en + ' glitter', hex: g.palette[1], glitter: g })),
];

/* ---------------------------------------------------------------------
   4) FINISHES & POLISH TYPES — light behaviour of the top coat.
      gloss: specular strength · tex: how much real nail texture shows
      shade: edge curvature darkening · matte: velvet grain · glitter
   --------------------------------------------------------------------- */
const FINISHES = [
  { id: 'glossy',  he: 'מבריק',  en: 'Glossy',  gloss: 1,    tex: 0.4, shade: 1,   matte: false, glitter: false },
  { id: 'matte',   he: 'מט',     en: 'Matte',   gloss: 0.22, tex: 0.3,  shade: 0.85, matte: true,  glitter: false },
  { id: 'glitter', he: 'נצנצים', en: 'Glitter', gloss: 0.75, tex: 0.3,  shade: 0.9, matte: false, glitter: true },
];
const TYPES = [
  { id: 'regular', he: 'לק רגיל', en: 'Regular polish', glossK: 0.75, sharp: false, depth: 0.85 },
  { id: 'gel',     he: "לק ג'ל",  en: 'Gel polish',     glossK: 1.15, sharp: true,  depth: 1.15 },
];

/* 5) Shapes, lengths (ext = free edge beyond fingertip, × nail width), skin tones */
const SHAPES = [
  { id: 'round',  he: 'עגול',  en: 'Round' },
  { id: 'square', he: 'מרובע', en: 'Square' },
  { id: 'almond', he: 'שקד',   en: 'Almond' },
  { id: 'coffin', he: 'בלרינה', en: 'Ballerina / Coffin' },   // tapered sides, flat tip — best medium/long
  { id: 'stiletto', he: 'סטילטו', en: 'Stiletto' },            // long taper to a sharp point
];
/* free-edge bonus length per shape (× nail width) so pointed shapes always have room to form */
const SHAPE_BONUS = { round: 0, square: 0, almond: 0.18, coffin: 0.14, stiletto: 0.42 };
/* French smile-line depth: slider 0 (micro) … 100 (deep), with labeled presets */
const FRENCH_DEPTHS = [
  { id: 'thin',   he: 'דק',     en: 'Thin / micro', v: 8 },
  { id: 'medium', he: 'בינוני', en: 'Classic',      v: 50 },
  { id: 'deep',   he: 'עמוק',   en: 'Deep',         v: 92 },
];
/* Length slider 0…100 = free edge 0…1.0 × that finger's nail width; presets: */
const LENGTHS = [
  { id: 'short',  he: 'קצר',    en: 'Short',  v: 4 },
  { id: 'medium', he: 'בינוני', en: 'Medium', v: 32 },
  { id: 'long',   he: 'ארוך',   en: 'Long',   v: 65 },
];
/* Width slider 80…120 % of the measured nail width. The nail-bed part only follows within
   98–104 % (so it always hugs the real nail plate, no gaps); the free edge takes the full value. */
const WIDTH_RANGE = [80, 120];
// target: average skin color to tint the photo to (null = original photo)
const SKINS = [
  { id: 'photo', he: 'מקורי', en: 'Original', hex: '#dbac99', target: null },
  { id: 'fair',  he: 'בהיר מאוד', en: 'Porcelain', hex: '#f2d6c8', target: [222, 190, 176] },
  { id: 'olive', he: 'זית',   en: 'Olive',    hex: '#b8875a', target: [176, 132, 92] },
  { id: 'tan',   he: 'שזוף',  en: 'Tan',      hex: '#9c6a48', target: [150, 104, 74] },
  { id: 'deep',  he: 'כהה',   en: 'Deep',     hex: '#6b4430', target: [104, 68, 48] },
];
const PHOTO_SKIN_AVG = [219, 172, 153];

/* 6) Nail plates on the photo (image px), measured on a rotated grid over each bare nail (qa/localgrid.py):
      cx,cy = cuticle centre, a = finger/nail axis (deg clockwise from up), w = plate width (+ a little tuck
      under the side folds), bed = cuticle → end of nail bed, tilt = cuticle slant from finger roll
      (negative = right corner higher). */
const NAILS = [
  { id: 'thumb',  cx: 987.8, cy: 758.6, a: 22.0, w: 56, bed: 110, tilt: 7 },
  { id: 'index',  cx: 793.9, cy: 197.5, a: 12.9, w: 72, bed: 86, tilt: -8 },
  { id: 'middle', cx: 643.3, cy: 129.6, a: 17.0, w: 76, bed: 88, tilt: -10 },
  { id: 'ring',   cx: 480.7, cy: 213.6, a: 27.2, w: 63, bed: 71, tilt: -11, lean: -4.4 },
  { id: 'pinky',  cx: 269.5, cy: 368.1, a: 27.4, w: 45, bed: 67, tilt: -11 },
];
const PHOTO = { w: 1118, h: 1440, y: 0 };            // photo placement in SVG units
const VIEW_FULL = '-60 -120 1238 1580', VIEW_ZOOM = '30 -40 1090 1010';

/* Default selection */
const state = { frDepth: 50, frBase: 'sheer', frTip: 'white', design: 'solid', finish: 'glossy', type: 'gel',
  color: 'opi-big-apple-red', glitter: 'gold', catTab: 'all', catBrand: '', catQuery: '',
  shape: 'almond', len: 32, wid: 100, skin: 'photo', zoom: window.matchMedia('(max-width: 900px)').matches };

/* ===================================================================== */
const NS = 'http://www.w3.org/2000/svg';
const $ = (s) => document.querySelector(s);
const byId = (arr, id) => arr.find((o) => o.id === id);
function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function toRgb(h) { h = h.replace('#', ''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function toHex(r) { return '#' + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function mix(a, b, t) { const A = toRgb(a), B = toRgb(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); }
const lighten = (c, t) => mix(c, '#ffffff', t), darken = (c, t) => mix(c, '#000000', t);
const lum = (c) => { const [r, g, b] = toRgb(c); return (0.3 * r + 0.59 * g + 0.11 * b) / 255; };
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const f2 = (v) => +v.toFixed(2);

/* ---------------------------------------------------------------------
   Build SVG
   --------------------------------------------------------------------- */
const svg = $('#hand');
const R = { nails: [], stops: {} };

function grad(tag, id, attrs, stops, defs) {
  const g = el(tag, Object.assign({ id }, attrs), defs);
  return stops.map(([o, c, op]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': op == null ? 1 : op }, g));
}

function buildSvg() {
  const defs = el('defs', {}, svg);
  el('image', { id: 'photo', href: window.HAND_PHOTO, x: 0, y: PHOTO.y, width: PHOTO.w, height: PHOTO.h, preserveAspectRatio: 'none' }, defs);

  // skin tone + soft drop shadow for the hand
  const sf = el('filter', { id: 'skinF', x: '-5%', y: '-5%', width: '110%', height: '110%', 'color-interpolation-filters': 'sRGB' }, defs);
  R.skinMatrix = el('feColorMatrix', { type: 'matrix', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0', result: 'tone' }, sf);
  el('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: 20, result: 'blur' }, sf);
  el('feOffset', { dx: 8, dy: 22, result: 'off' }, sf);
  el('feFlood', { 'flood-color': '#7a4a55', 'flood-opacity': 0.14 }, sf);
  el('feComposite', { in2: 'off', operator: 'in', result: 'shadow' }, sf);
  const m = el('feMerge', {}, sf); el('feMergeNode', { in: 'shadow' }, m); el('feMergeNode', { in: 'tone' }, m);

  // high-pass texture of the real nail (fine detail & photo highlights), centered at mid-gray
  const tf = el('filter', { id: 'texF', x: '-10%', y: '-10%', width: '120%', height: '120%', 'color-interpolation-filters': 'sRGB' }, defs);
  el('feColorMatrix', { type: 'matrix', values: '.3 .59 .11 0 0  .3 .59 .11 0 0  .3 .59 .11 0 0  0 0 0 1 0', result: 'g' }, tf);
  el('feGaussianBlur', { in: 'g', stdDeviation: 8, result: 'gb' }, tf);
  el('feComposite', { in: 'g', in2: 'gb', operator: 'arithmetic', k2: 2, k3: -2, k4: 0.5 }, tf);
  // matte grain
  const nf = el('filter', { id: 'noise', x: 0, y: 0, width: 1, height: 1 }, defs);
  el('feTurbulence', { type: 'fractalNoise', baseFrequency: 1.0, numOctaves: 2, seed: 4, result: 'n' }, nf);
  el('feColorMatrix', { in: 'n', type: 'matrix', values: '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -0.55', result: 'g' }, nf);
  el('feComposite', { in: 'g', in2: 'SourceAlpha', operator: 'in' }, nf);
  el('filter', { id: 'feather', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs).appendChild(el('feGaussianBlur', { stdDeviation: 1.1 }));
  el('filter', { id: 'blur2', x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs).appendChild(el('feGaussianBlur', { stdDeviation: 3.6 }));
  el('filter', { id: 'blur4', x: '-60%', y: '-60%', width: '220%', height: '220%' }, defs).appendChild(el('feGaussianBlur', { stdDeviation: 8 }));
  el('filter', { id: 'blur1', x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs).appendChild(el('feGaussianBlur', { stdDeviation: 1.8 }));

  // shading gradients (objectBoundingBox → follow each nail's local frame)
  R.stops.edge = grad('linearGradient', 'edgeShade', { x1: 0, y1: 0, x2: 1, y2: 0 },
    [[0, '#000', 0.55], [0.16, '#000', 0.16], [0.42, '#000', 0], [0.7, '#000', 0.04], [0.88, '#000', 0.22], [1, '#000', 0.6]], defs);
  R.stops.cut = grad('linearGradient', 'cutShade', { x1: 0, y1: 1, x2: 0, y2: 0 }, [[0, '#000', 0.4], [0.14, '#000', 0.08], [0.3, '#000', 0]], defs);
  grad('linearGradient', 'tipLight', { x1: 0, y1: 1, x2: 0, y2: 0 }, [[0.55, '#fff', 0], [1, '#fff', 0.18]], defs);
  grad('linearGradient', 'streak', { x1: 0, y1: 1, x2: 0, y2: 0 }, [[0, '#fff', 0], [0.25, '#fff', 0.9], [0.7, '#fff', 0.75], [1, '#fff', 0]], defs);
  grad('linearGradient', 'streakX', { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, '#fff', 0], [0.5, '#fff', 1], [1, '#fff', 0]], defs);
  // C-curve volume: soft highlight ridge running along the nail axis (slightly toward the light, upper-left)
  grad('linearGradient', 'ridge', { x1: 0, y1: 0, x2: 1, y2: 0 },
    [[0, '#fff', 0], [0.3, '#fff', 0], [0.44, '#fff', 0.5], [0.5, '#fff', 0.34], [0.62, '#fff', 0], [1, '#fff', 0]], defs);
  el('filter', { id: 'fold', x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs).appendChild(el('feGaussianBlur', { stdDeviation: 2.2 }));
  el('filter', { id: 'cutSoft', x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs).appendChild(el('feGaussianBlur', { stdDeviation: 1.5 }));
  R.stops.chrome = grad('linearGradient', 'chromeGrad', { x1: 0, y1: 0, x2: 1, y2: 0.6 },
    [[0, '#000'], [0.3, '#000'], [0.55, '#000'], [0.78, '#000'], [1, '#000']], defs);
  R.stops.ombre = grad('linearGradient', 'ombreGrad', { x1: 0, y1: 1, x2: 0, y2: 0 },
    [[0.15, '#000', 0], [0.55, '#000', 0.7], [0.92, '#000', 1]], defs);

  // hand photo
  el('use', { href: '#photo', filter: 'url(#skinF)' }, svg);

  NAILS.forEach((n, i) => buildNail(n, i, defs));
}

/* nail outline in local frame: origin = cuticle centre, tip toward -y.
   Built from anatomy: a curved proximal fold (cuticle, slanted by finger roll), side walls that hug the
   finger edge, then the chosen free-edge shape. Everything scales with each finger's own plate size. */
function nailGeom(n) {
  const ws = state.wid / 100, hp = n.w / 2;
  const h = hp * Math.min(1.04, Math.max(0.98, ws));      // nail-bed half width (hugs the plate)
  const ht = hp * ws;                                      // free-edge half width
  const bed = n.bed, yB = -bed, shape = state.shape;
  let ext = n.w * (0.015 + state.len / 100 + (SHAPE_BONUS[shape] || 0));
  if (n.id === 'thumb') ext *= 0.7;
  const yT = yB - ext;
  const cdep = n.w * 0.09, tilt = n.tilt || 0;
  const yl = -cdep - tilt, yr = -cdep + tilt, cx0 = h * 0.9;
  const s0 = -bed * 0.45, s = yB + bed * 0.3, k = s - yT;
  // the free edge follows the finger's own direction (lean = finger axis − plate axis, in degrees)
  const tl = Math.tan((n.lean || 0) * Math.PI / 180);
  const P = (x, y) => `${f2(y < s ? x + (y - s) * tl : x)},${f2(y)}`;
  // cuticle arc (left corner → lowest point → right corner)
  // one smooth arc that dips 'cdep' below the corners; slants with the finger roll
  const D = cdep * 1.34;
  const cut = `M${P(-cx0, yl)} C${P(-cx0 * 0.9, yl + D)} ${P(cx0 * 0.9, yr + D)} ${P(cx0, yr)}`;   // rounded proximal corners
  const rWall = `C${P(cx0 + (h - cx0) * 0.9, yr - bed * 0.12)} ${P(h, s0 + bed * 0.12)} ${P(h, s0)}`;
  const lWall = `C${P(-h, s0 + bed * 0.12)} ${P(-cx0 - (h - cx0) * 0.9, yl - bed * 0.12)} ${P(-cx0, yl)}`;
  let tip;
  if (shape === 'square') {
    const r = ht * 0.22;
    tip = `L${P(h, s)} C${P(h, s - k * 0.4)} ${P(ht, yT + r + k * 0.25)} ${P(ht, yT + r)} Q${P(ht, yT)} ${P(ht - r, yT)} L${P(-ht + r, yT)} Q${P(-ht, yT)} ${P(-ht, yT + r)} C${P(-ht, yT + r + k * 0.25)} ${P(-h, s - k * 0.4)} ${P(-h, s)} L${P(-h, s0)}`;
  } else if (shape === 'round') {
    const y0 = Math.min(s0, yT + ht), q = y0 - yT;
    tip = `L${P(h, y0)} C${P(h, y0 - q * 0.56)} ${P(ht * 0.56, yT)} ${P(0, yT)} C${P(-ht * 0.56, yT)} ${P(-h, y0 - q * 0.56)} ${P(-h, y0)} L${P(-h, s0)}`;
  } else if (shape === 'coffin') {
    const tw = ht * (ext > n.w * 0.3 ? 0.56 : 0.7), r = ht * 0.13;
    tip = `L${P(h, s)} C${P(h, s - k * 0.3)} ${P(tw + (ht - tw) * 0.18, yT + k * 0.22)} ${P(tw, yT + r)} Q${P(tw, yT)} ${P(tw - r, yT)} L${P(-tw + r, yT)} Q${P(-tw, yT)} ${P(-tw, yT + r)} C${P(-tw - (ht - tw) * 0.18, yT + k * 0.22)} ${P(-h, s - k * 0.3)} ${P(-h, s)} L${P(-h, s0)}`;
  } else if (shape === 'stiletto') {
    tip = `L${P(h, s)} C${P(h, s - k * 0.34)} ${P(ht * 0.14, yT + k * 0.1)} ${P(0, yT)} C${P(-ht * 0.14, yT + k * 0.1)} ${P(-h, s - k * 0.34)} ${P(-h, s)} L${P(-h, s0)}`;
  } else {   // almond
    tip = `L${P(h, s)} C${P(h, s - k * 0.5)} ${P(ht * 0.45, yT)} ${P(0, yT)} C${P(-ht * 0.45, yT)} ${P(-h, s - k * 0.5)} ${P(-h, s)} L${P(-h, s0)}`;
  }
  const d = `${cut} ${rWall} ${tip} ${lWall} Z`;
  // open path along side walls + cuticle (for the skin-fold shadow), stops at the fingertip
  const fold = `M${P(-h, s0 - bed * 0.25)} L${P(-h, s0)} ${lWall} ${cut.replace(/^M\S+ /, '')} ${rWall} L${P(h, s0 - bed * 0.25)}`;
  return { d, cut, fold, h, ht, yB, yT, yc: (yl + yr) / 2, ext, bed };
}

function buildNail(n, i, defs) {
  const N = { n, i, L: {} };
  R.nails[i] = N;
  const g = el('g', { transform: `translate(${n.cx},${n.cy}) rotate(${n.a})` }, svg);
  // soft-edged mask = nail shape
  const mk = el('mask', { id: 'nm' + i, maskUnits: 'userSpaceOnUse', x: -120, y: -320, width: 240, height: 400 }, defs);
  N.maskPath = el('path', { fill: '#fff', filter: 'url(#feather)' }, mk);
  // the polish thins out right at the cuticle instead of ending in a hard edge
  N.maskCut = el('path', { fill: 'none', stroke: '#000', 'stroke-width': 2.6, 'stroke-opacity': 0.6, filter: 'url(#cutSoft)' }, mk);
  // skin-fold shadow along the side walls + cuticle: the nail sits *under* the skin, not on top of it
  N.fold = el('path', { class: 'lyr', fill: 'none', stroke: '#6a3a33', 'stroke-width': 3.4, 'stroke-linecap': 'round', filter: 'url(#fold)' }, g);
  // shadow under the free edge (only beyond the fingertip)
  const cp = el('clipPath', { id: 'beyond' + i }, defs);
  N.beyondRect = el('rect', { x: -100, width: 200 }, cp);
  N.shadow = el('path', { class: 'lyr', fill: '#3a1d1d', filter: 'url(#blur2)', transform: 'translate(1.5,3)', 'clip-path': `url(#beyond${i})` }, g);
  const ng = el('g', { mask: `url(#nm${i})` }, g);
  const L = N.L;
  L.natural = el('path', { class: 'lyr tc' }, ng);           // natural free edge (no polish)
  L.base = el('path', { class: 'lyr tc' }, ng);
  L.ombre = el('path', { class: 'lyr', fill: 'url(#ombreGrad)' }, ng);
  L.chrome = el('path', { class: 'lyr', fill: 'url(#chromeGrad)' }, ng);
  L.tip = el('path', { class: 'lyr tc' }, ng);
  // clip used when only the French tip is glitter
  N.tipClip = el('path', {}, el('clipPath', { id: 'tclip' + i }, defs));
  // flakes are clipped to the hard nail outline so none sparkle in the feathered halo outside the nail
  N.clipPath = el('path', {}, el('clipPath', { id: 'nc' + i }, defs));
  L.glitter = el('g', { class: 'lyr' }, el('g', { 'clip-path': `url(#nc${i})` }, ng));
  buildGlitter(N, L.glitter);
  // real nail texture from the photo, blended in
  const tg = el('g', { class: 'lyr', style: 'mix-blend-mode:soft-light' }, ng);
  el('use', { href: '#photo', filter: 'url(#texF)', transform: `rotate(${-n.a}) translate(${-n.cx},${-n.cy})` }, tg);
  L.tex = tg;
  L.cut = el('path', { class: 'lyr', fill: 'url(#cutShade)' }, ng);
  L.shade = el('path', { class: 'lyr', fill: 'url(#edgeShade)' }, ng);
  L.tipLight = el('path', { class: 'lyr', fill: 'url(#tipLight)' }, ng);
  L.ridge = el('path', { class: 'lyr', fill: 'url(#ridge)', filter: 'url(#blur1)', style: 'mix-blend-mode:screen' }, ng);
  L.matte = el('path', { class: 'lyr', fill: '#fff', filter: 'url(#noise)' }, ng);
  L.haze = el('path', { class: 'lyr', fill: '#fff' }, ng);      // matte top coat lifts blacks
  L.gloss = el('g', { class: 'lyr', style: 'mix-blend-mode:screen' }, ng);
  N.gSheen = el('path', { fill: 'url(#tipLight)' }, L.gloss);
  N.gStreak = el('path', { fill: 'url(#streak)', filter: 'url(#blur2)' }, L.gloss);
  N.gCore = el('path', { fill: 'url(#streak)', filter: 'url(#feather)' }, L.gloss);
  N.gWin = el('path', { fill: 'url(#streak)', filter: 'url(#blur2)' }, L.gloss);
  L.glints = el('g', { class: 'lyr' }, el('g', { 'clip-path': `url(#nc${i})` }, ng));
  buildGlints(N, L.glints);
  // hairline where polish meets the cuticle
  N.edge = el('path', { class: 'lyr', fill: 'none', stroke: '#3b1414', 'stroke-width': 1.6, filter: 'url(#feather)' }, g);
}

/* glitter: many tiny faceted flakes, deterministic layout */
function buildGlitter(N, parent) {
  const n = N.n, h = n.w / 2 * 1.2, span = n.bed + n.w * 1.65, top = -span;
  N.flakes = [];
  const groups = [el('g', { class: 'shim a' }, parent), el('g', { class: 'shim b' }, parent), el('g', {}, parent)];
  const GS = 1.3; // flake scale relative to the photo's nail size
  const count = Math.round(2 * h * span / (3.6 * GS * GS));
  for (let k = 0; k < count; k++) {
    const x = (rnd() * 2 - 1) * h, y = top + rnd() * (span + 4);
    const big = rnd() < 0.07, r = (big ? 1.6 + rnd() * 1.1 : 0.55 + rnd() * 0.9) * GS;
    const rot = rnd() * 60, pts = [];
    for (let j = 0; j < 6; j++) { const t = (rot + j * 60) * Math.PI / 180; pts.push(f2(x + r * Math.cos(t)) + ',' + f2(y + r * Math.sin(t))); }
    const tone = rnd(), hue = rnd() * 360;
    const t = tone < 0.28 ? 0 : tone < 0.6 ? 1 : tone < 0.86 ? 2 : 3;
    const p = el('polygon', { points: pts.join(' ') }, groups[t === 3 ? (k % 2) : t === 2 && k % 3 === 0 ? 1 : 2]);
    N.flakes.push({ p, t, hue });
  }
}
function buildGlints(N, parent) {
  const n = N.n, h = n.w / 2;
  for (let k = 0; k < 3; k++) {
    const x = (rnd() * 1.4 - 0.7) * h, y = -n.bed * (0.25 + rnd() * 0.6), s = 4 + rnd() * 3.5;
    const star = `M${x},${y - s} Q${x + s * 0.12},${y - s * 0.12} ${x + s},${y} Q${x + s * 0.12},${y + s * 0.12} ${x},${y + s} Q${x - s * 0.12},${y + s * 0.12} ${x - s},${y} Q${x - s * 0.12},${y - s * 0.12} ${x},${y - s} Z`;
    el('path', { d: star, fill: '#fff', class: 'glint', opacity: k === 0 ? 0.85 : 0, style: `animation-delay:${(rnd() * 3).toFixed(2)}s` }, parent);
  }
}

function layoutNails() {
  const design = byId(DESIGNS, state.design);
  R.nails.forEach((N) => {
    const G = nailGeom(N.n), { d, yB, yT, yc } = G, w = N.n.w, L = N.L, h = Math.max(G.h, G.ht);
    N.maskPath.setAttribute('d', d); N.maskCut.setAttribute('d', G.cut); N.fold.setAttribute('d', G.fold);
    ['base', 'ombre', 'chrome', 'cut', 'shade', 'tipLight', 'ridge', 'matte', 'haze', 'shadow'].forEach((k) => (L[k] || N[k]).setAttribute('d', d));
    N.gSheen.setAttribute('d', d); N.clipPath.setAttribute('d', d);
    N.beyondRect.setAttribute('y', yT - 20); N.beyondRect.setAttribute('height', Math.max(0, yB - (yT - 20) - 2));
    N.edge.setAttribute('d', G.cut);
    // natural free edge (beyond the fingertip)
    const nat = `M${-h - 4},${yT - 4} L${h + 4},${yT - 4} L${h + 4},${yB + 1} C${h * 0.5},${yB - w * 0.1} ${-h * 0.5},${yB - w * 0.1} ${-h - 4},${yB + 1} Z`;
    L.natural.setAttribute('d', nat);
    // French smile line
    // depth slider: 0 = micro line at the very edge, 50 = classic (just below fingertip), 100 = deep into the nail bed
    const v = state.frDepth / 100, ext = yB - yT;
    const band = v <= 0.5 ? w * 0.25 + (ext + w * 0.1 - w * 0.25) * (v / 0.5) : ext + w * 0.1 + (G.bed * 0.42 - w * 0.1) * ((v - 0.5) / 0.5);
    const dep = w * (0.3 - 0.04 * Math.min(1, v * 2));               // how far the smile wings drop at the sides
    let yS = yT + band;
    if (yS + dep > yc - 4) yS = yc - 4 - dep;                        // never past the cuticle
    L.tip.setAttribute('d', `M${-h - 4},${yT - 4} L${h + 4},${yT - 4} L${h + 4},${yS + dep} C${h * 0.5},${yS - dep * 0.2} ${-h * 0.5},${yS - dep * 0.2} ${-h - 4},${yS + dep} Z`);
    N.tipClip.setAttribute('d', L.tip.getAttribute('d'));
    // highlights: light comes from the upper-left in the photo
    const top = yT + w * 0.32, bot = yc - 3, len = bot - top;
    // a lens-shaped reflection that bends with the nail's curvature
    const lens = (x, wd, y1, y2, bend) => `M${f2(x)},${f2(y2)} C${f2(x - wd)},${f2(y2 - (y2 - y1) * 0.35)} ${f2(x - wd + bend)},${f2(y1 + (y2 - y1) * 0.3)} ${f2(x + bend)},${f2(y1)} ` +
      `C${f2(x + wd + bend)},${f2(y1 + (y2 - y1) * 0.3)} ${f2(x + wd)},${f2(y2 - (y2 - y1) * 0.35)} ${f2(x)},${f2(y2)} Z`;
    N.gStreak.setAttribute('d', lens(-h * 0.42, w * 0.13, top, bot, h * 0.12));
    N.gCore.setAttribute('d', lens(-h * 0.4, w * 0.045, top + len * 0.1, bot - len * 0.12, h * 0.12));
    N.gWin.setAttribute('d', lens(h * 0.5, w * 0.05, top + len * 0.25, bot - len * 0.2, -h * 0.05));
  });
}
function shadeById(id) { return CATALOG.find((c) => c.id === id) || CATALOG[0] || { id: 'x', brand: '', name: '', hex: '#b5122a', finish: 'glossy' }; }
/* glitter flakes: an explicit glitter colour (GLITTERS) or, for 'cat', a palette derived from the catalog shade */
function glitterPalette(C) {
  if (state.glitter !== 'cat') return byId(GLITTERS, state.glitter) || GLITTERS[0];
  const x = C.hex;
  // sparkly flakes: tinted silver → light tints → white (no dark specks that read as dirt)
  return { id: 'cat', holo: !!C.holo, he: '', en: '', palette: [mix(x, '#9aa0aa', 0.55), lighten(x, 0.35), lighten(x, 0.68), '#ffffff'] };
}
function lengthName() { return LENGTHS.reduce((a, b) => (Math.abs(b.v - state.len) < Math.abs(a.v - state.len) ? b : a)); }
/* selecting a catalog shade applies its colour AND its finish */
function applyShade(c) {
  state.color = c.id;
  if (c.finish === 'chrome') { state.design = 'chrome'; state.finish = 'glossy'; }
  else {
    if (!byId(DESIGNS, state.design).usesColor || state.design === 'chrome') state.design = 'solid';
    state.finish = c.finish;
    if (c.finish === 'glitter') state.glitter = 'cat';
  }
  render();
}
function depthName() {   // nearest preset for the slider value
  return FRENCH_DEPTHS.reduce((a, b) => (Math.abs(b.v - state.frDepth) < Math.abs(a.v - state.frDepth) ? b : a));
}
function setA(e, a) { for (const k in a) e.setAttribute(k, typeof a[k] === 'number' ? f2(a[k]) : a[k]); }

/* ---------------------------------------------------------------------
   Apply state → SVG
   --------------------------------------------------------------------- */
function render() {
  const D = byId(DESIGNS, state.design), F = byId(FINISHES, state.finish), T = byId(TYPES, state.type);
  const C = shadeById(state.color), GL = glitterPalette(C), S = byId(SKINS, state.skin);
  const natural = !D.base;
  const res = (v) => (v === 'color' ? C.hex : v);
  const isFr = D.tip === 'french';
  const FB = isFr ? byId(FRENCH_BASES, state.frBase) || FRENCH_BASES[0] : null;
  const FT = isFr ? byId(FRENCH_TIPS, state.frTip) || FRENCH_TIPS[0] : null;
  const tipGl = FT && FT.glitter;          // glitter only on the French tip
  const bOp = isFr ? FB.op : D.baseOp;

  // skin tone
  if (S.target) {
    const k = S.target.map((t, i) => t / PHOTO_SKIN_AVG[i]);
    R.skinMatrix.setAttribute('values', `${k[0]} 0 0 0 0  0 ${k[1]} 0 0 0  0 0 ${k[2]} 0 0  0 0 0 1 0`);
  } else R.skinMatrix.setAttribute('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0');

  const col = C.hex;
  R.stops.chrome.forEach((x, i) => (x.style.stopColor = [darken(col, 0.55), lighten(col, 0.85), col, lighten(col, 0.45), darken(col, 0.6)][i]));
  if (D.ombre) R.stops.ombre.forEach((x) => (x.style.stopColor = res(D.ombre)));
  let baseHex = natural ? '#000' : isFr ? FB.hex : res(D.base);
  // sheer/nude bases adapt to the chosen skin tone so they don't look chalky on darker skin
  if (S.target && !natural && D.base !== 'color' && (!isFr || FB.sheer)) baseHex = mix(baseHex, lighten(toHex(S.target), 0.2), 0.45);
  const dark = lum(natural ? '#ffffff' : (D.chrome || D.base === 'color' ? col : baseHex));
  // side/cuticle shading uses a deep tint of the polish itself (not grey), so pale shades stay clean
  const shadeCol = mix(darken(D.chrome || D.base === 'color' ? col : baseHex, 0.6), '#3a2024', 0.35);
  [...R.stops.edge, ...R.stops.cut].forEach((x) => (x.style.stopColor = shadeCol));

  // glitter flake colors
  const GLx = tipGl || GL;   // which glitter palette the flakes use
  if (F.glitter || tipGl) {
    R.nails.forEach((N) => N.flakes.forEach((fl) => {
      fl.p.style.fill = GLx.holo ? `hsl(${fl.hue.toFixed(0)},${fl.t === 3 ? 90 : 58}%,${[56, 68, 80, 93][fl.t]}%)` : GLx.palette[fl.t];
    }));
  }
  const gloss = natural ? 0 : F.gloss * T.glossK;
  const op = {
    natural: 0,   // natural = the real nails of the photo, untouched
    base: natural ? 0 : bOp,
    ombre: D.ombre ? 1 : 0, chrome: D.chrome ? 1 : 0, tip: D.tip ? 1 : 0,
    glitter: !natural && (F.glitter || tipGl) ? 1 : 0,
    tex: natural ? 0 : (bOp < 1 && !F.glitter ? 0.5 : F.tex),
    cut: natural ? 0 : 0.6 * F.shade,
    shade: natural ? 0 : Math.min(1, F.shade * T.depth * (bOp < 1 ? 0.4 : 0.55 + 0.35 * dark)),
    tipLight: natural ? 0 : F.matte ? 0.3 : 0.5,
    ridge: natural ? 0 : F.matte ? 0.22 : F.glitter ? 0.3 : D.chrome ? 0.35 : 0.55 + 0.25 * (1 - dark),
    matte: !natural && F.matte ? 0.12 : 0,
    haze: !natural && F.matte ? 0.02 + (1 - dark) * 0.03 : 0,
    gloss: Math.min(1, gloss),
    glints: !natural && (F.glitter || tipGl) ? 1 : 0,
    shadow: 0,
    edge: natural ? 0 : 0.25,
  };
  R.nails.forEach((N) => {
    const L = N.L;
    L.base.style.fill = F.glitter && D.base === 'color' ? mix(col, GL.holo ? '#8a8f99' : GL.palette[1], 0.35) : baseHex;
    L.natural.style.fill = '#fbf4ec';
    if (isFr) L.tip.style.fill = tipGl ? (tipGl.holo ? '#cfd0d8' : mix(FT.hex, tipGl.palette[0], 0.3)) : FT.hex;
    else if (D.tip) L.tip.style.fill = res(D.tip);
    // glitter tip: flakes clipped to the tip area (unless the whole nail is glitter)
    const clip = tipGl && !F.glitter ? `url(#tclip${N.i})` : null;
    [L.glitter, L.glints].forEach((e) => (clip ? e.setAttribute('clip-path', clip) : e.removeAttribute('clip-path')));
    for (const k in L) L[k].style.opacity = op[k];
    N.shadow.style.opacity = op.shadow; N.edge.style.opacity = op.edge;
    N.fold.style.opacity = natural ? 0 : 0.16 + 0.14 * (1 - dark);
    N.gCore.style.opacity = F.matte ? 0 : T.sharp ? 0.95 : 0.3;
    N.gStreak.style.opacity = F.matte ? 1 : T.sharp ? 0.55 : 0.7;
    N.gStreak.setAttribute('filter', F.matte ? 'url(#blur4)' : 'url(#blur2)');
    N.gWin.style.opacity = F.matte ? 0 : T.sharp ? 0.35 : 0.15;
  });
  layoutNails();
  svg.setAttribute('viewBox', state.zoom ? VIEW_ZOOM : VIEW_FULL);
  svg.classList.toggle('zoomed', state.zoom);
  fitSvg();

  // labels
  const Sh = byId(SHAPES, state.shape), Ln = lengthName();
  const shadeName = `${C.brand} ${C.name}`;
  let he, en;
  if (natural) { he = 'ציפורן טבעית'; en = 'Natural nails'; }
  else {
    he = [T.he, D.id === 'solid' ? null : D.he, F.he, D.usesColor ? shadeName : null, isFr ? 'בסיס ' + FB.he : null, isFr ? 'קצה ' + FT.he + ' (' + depthName().he + ')' : null, F.glitter && GL.he ? 'נצנצים ' + GL.he : null].filter(Boolean).join(' · ');
    en = [T.en, D.id === 'solid' ? null : D.en, F.en, D.usesColor ? shadeName : null, isFr ? FB.en + ' base' : null, isFr ? FT.en + ' tip (' + depthName().en + ')' : null, F.glitter && GL.en ? GL.en + ' glitter' : null].filter(Boolean).join(' · ');
  }
  const wTxt = state.wid === 100 ? '' : ` · ${state.wid}%`;
  $('#selHe').textContent = natural ? he : `${he} · ${Sh.he} ${Ln.he}`;
  $('#selEn').textContent = natural ? en : `${en} · ${Ln.en} ${Sh.en}${wTxt}`;
  $('#catHint').textContent = D.usesColor ? '' : 'בחירת גוון תעביר לצבע מלא · picking a shade switches to Solid';
  $('#glitterGroup').classList.toggle('hidden', !F.glitter);
  $('#frBaseGroup').classList.toggle('hidden', !isFr);
  $('#frTipGroup').classList.toggle('hidden', !isFr);
  $('#frDepthGroup').classList.toggle('hidden', !isFr);
  $('#frDepth').value = state.frDepth;
  document.querySelectorAll('[data-depth]').forEach((b) => b.classList.toggle('active', depthName().id === b.dataset.depth));
  ['finishGroup', 'typeGroup'].forEach((id) => $('#' + id).classList.toggle('disabled', natural));
  document.querySelectorAll('[data-k]').forEach((b) => b.classList.toggle('active', String(state[b.dataset.k]) === b.dataset.v));
  document.querySelectorAll('.cat-sw').forEach((b) => { const on = b.dataset.id === state.color && D.usesColor; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); });
  $('#lenR').value = state.len; $('#widR').value = state.wid;
  $('#lenOut').textContent = Math.round(state.len) + '%'; $('#widOut').textContent = state.wid + '%';
  document.querySelectorAll('[data-len]').forEach((b) => b.classList.toggle('active', lengthName().id === b.dataset.len && Math.abs(lengthName().v - state.len) < 6));
}

/* ---------------------------------------------------------------------
   Panel UI (generated from the data tables)
   --------------------------------------------------------------------- */
function buildPanel() {
  const mk = (html, k, v, cls, parent, title) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = cls; b.dataset.k = k; b.dataset.v = v; b.innerHTML = html;
    if (title) b.title = title;
    b.addEventListener('click', () => {
      state[k] = typeof state[k] === 'boolean' ? v === 'true' : v;
      if (k === 'color' && !byId(DESIGNS, state.design).usesColor) state.design = 'solid';
      if ((k === 'finish' || k === 'type') && state.design === 'natural') state.design = 'solid';
      if (k === 'glitter') { state.finish = 'glitter'; if (state.design === 'natural' || state.design === 'chrome') state.design = 'solid'; }
      if (k === 'finish' && v === 'glitter' && state.glitter === 'cat' && shadeById(state.color).finish !== 'glitter') state.glitter = 'gold';
      if (k === 'design') { const D = byId(DESIGNS, v); if (D.defTip) state.frTip = D.defTip; }
      if ((k === 'frBase' || k === 'frTip') && byId(DESIGNS, state.design).tip !== 'french') state.design = 'french';
      render();
    });
    parent.appendChild(b); return b;
  };
  const label = (o) => `<span class="t">${o.he}</span><span class="en">${o.en}</span>`;
  DESIGNS.forEach((o) => mk(label(o), 'design', o.id, 'chip', $('#designs')));
  FINISHES.forEach((o) => mk(`<span class="fin fin-${o.id}"></span>` + label(o), 'finish', o.id, 'chip big', $('#finishes')));
  TYPES.forEach((o) => mk(label(o), 'type', o.id, 'chip', $('#types')));
  GLITTERS.forEach((g) => {
    const bg = g.holo ? 'conic-gradient(from 30deg,#ff9ad5,#ffe48a,#9dffb0,#8ad8ff,#c49bff,#ff9ad5)'
      : `radial-gradient(circle at 30% 30%, ${g.palette[3]} 0 12%, transparent 13%), radial-gradient(circle at 70% 60%, ${g.palette[2]} 0 10%, transparent 11%), radial-gradient(circle at 45% 75%, ${g.palette[3]} 0 7%, transparent 8%), linear-gradient(135deg, ${g.palette[2]}, ${g.palette[1]} 45%, ${g.palette[0]})`;
    mk(`<span class="dot glit" style="background:${bg}"></span><span class="nm">${g.he}</span>`, 'glitter', g.id, 'sw', $('#glitters'), `${g.he} · ${g.en}`);
  });
  const glitBg = (g) => g.holo ? 'conic-gradient(from 30deg,#ff9ad5,#ffe48a,#9dffb0,#8ad8ff,#c49bff,#ff9ad5)'
    : `radial-gradient(circle at 30% 30%, ${g.palette[3]} 0 12%, transparent 13%), radial-gradient(circle at 70% 60%, ${g.palette[2]} 0 10%, transparent 11%), linear-gradient(135deg, ${g.palette[2]}, ${g.palette[1]} 45%, ${g.palette[0]})`;
  const sheerBg = (b) => b.op < 1 ? `linear-gradient(135deg, rgba(255,255,255,.9), ${b.hex}), repeating-conic-gradient(#f3e9ea 0 25%, #fff 0 50%) 0 0/8px 8px` : b.hex;
  FRENCH_BASES.forEach((b) => mk(`<span class="dot" style="background:${sheerBg(b)}"></span><span class="nm">${b.he}</span>`, 'frBase', b.id, 'sw', $('#frBases'), `${b.he} · ${b.en}`));
  FRENCH_TIPS.forEach((t) => mk(`<span class="dot${t.glitter ? ' glit' : ''}" style="background:${t.glitter ? glitBg(t.glitter) : t.hex}"></span><span class="nm">${t.he}</span>`, 'frTip', t.id, 'sw', $('#frTips'), `${t.he} · ${t.en}`));
  const toFr = () => { if (byId(DESIGNS, state.design).tip !== 'french') state.design = 'french'; };
  $('#frDepth').addEventListener('input', (e) => { state.frDepth = +e.target.value; toFr(); render(); });
  FRENCH_DEPTHS.forEach((o) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.depth = o.id;
    b.innerHTML = `<span>${o.he}</span><span class="en">${o.en}</span>`;
    b.addEventListener('click', () => { state.frDepth = o.v; toFr(); render(); });
    $('#frDepthPresets').appendChild(b);
  });
  SHAPES.forEach((o) => mk(`<span>${o.he}</span><span class="en">${o.en}</span>`, 'shape', o.id, '', $('#shapes')));
  // continuous length / width sliders (relative to each finger's own nail) + length presets
  $('#lenR').addEventListener('input', (e) => { state.len = +e.target.value; render(); });
  $('#widR').addEventListener('input', (e) => { state.wid = +e.target.value; render(); });
  $('#widReset').addEventListener('click', () => { state.wid = 100; render(); });
  LENGTHS.forEach((o) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.len = o.id;
    b.innerHTML = `<span>${o.he}</span><span class="en">${o.en}</span>`;
    b.addEventListener('click', () => { state.len = o.v; render(); });
    $('#lenPresets').appendChild(b);
  });
  SKINS.forEach((s) => mk(`<span class="dot" style="background:${s.hex}"></span><span class="nm">${s.he}</span>`, 'skin', s.id, 'sw', $('#skins'), `${s.he} · ${s.en}`));
  mk('<span>כל היד</span><span class="en">Full hand</span>', 'zoom', 'false', '', $('#zooms'));
  mk('<span>זום לציפורניים</span><span class="en">Zoom nails</span>', 'zoom', 'true', '', $('#zooms'));
  $('#removeBtn').addEventListener('click', () => { state.design = 'natural'; render(); });
  $('#saveBtn').addEventListener('click', savePng);
}

/* ---------------------------------------------------------------------
   Shade catalog UI: finish tabs, brand filter, search, grid grouped by finish
   --------------------------------------------------------------------- */
const FIN_ORDER = ['glossy', 'matte', 'glitter', 'chrome'];
const esc = (t) => String(t).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const finName = (f) => (CATALOG_META.finishes && CATALOG_META.finishes[f]) || { he: f, en: f };
function swatchBg(c) {
  const x = c.hex;
  if (c.finish === 'chrome') return `linear-gradient(135deg, ${darken(x, 0.45)} 0%, ${lighten(x, 0.85)} 32%, ${x} 52%, ${lighten(x, 0.5)} 70%, ${darken(x, 0.5)} 100%)`;
  if (c.finish === 'glitter') return c.holo ? `radial-gradient(circle at 30% 30%, #fff 0 8%, transparent 9%), radial-gradient(circle at 68% 62%, #fff 0 6%, transparent 7%), conic-gradient(from 30deg, #ffc2e6, #fff2b0, #c5ffd2, #bfe9ff, #dcc8ff, #ffc2e6)`
    : `radial-gradient(circle at 28% 30%, ${lighten(x, 0.9)} 0 9%, transparent 10%), radial-gradient(circle at 70% 58%, ${lighten(x, 0.7)} 0 7%, transparent 8%), radial-gradient(circle at 44% 76%, #fff 0 5%, transparent 6%), linear-gradient(135deg, ${lighten(x, 0.4)}, ${x} 50%, ${darken(x, 0.35)})`;
  if (c.finish === 'matte') return x;
  return `radial-gradient(circle at 32% 26%, rgba(255,255,255,.75) 0 10%, rgba(255,255,255,0) 30%), ${x}`;
}
function buildCatalog() {
  const tabs = $('#catTabs'), brandSel = $('#catBrand');
  tabs.innerHTML = ''; brandSel.innerHTML = '';
  [['all', { he: 'הכל', en: 'All' }], ...FIN_ORDER.map((f) => [f, finName(f)])].forEach(([id, nm]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cat-tab'; b.dataset.tab = id; b.setAttribute('role', 'tab');
    b.innerHTML = `<span class="he">${nm.he}<span class="cnt"></span></span><span class="en">${nm.en}</span>`;
    b.addEventListener('click', () => { state.catTab = id; renderCatalog(); });
    tabs.appendChild(b);
  });
  const brands = [...new Set(CATALOG.map((c) => c.brand))].sort();
  brandSel.add(new Option('כל המותגים · All', ''));
  brands.forEach((b) => brandSel.add(new Option(b, b)));
  brandSel.value = state.catBrand;
  brandSel.onchange = () => { state.catBrand = brandSel.value; renderCatalog(); };
  $('#catSearch').oninput = (e) => { state.catQuery = e.target.value; renderCatalog(); };
  $('#catNote').textContent = CATALOG_META.approximate === false ? '' :
    'גוונים משוערים להמחשה בלבד · Approximate on-screen colours (names from brand ranges, not official colour data)';
  renderCatalog();
}
function renderCatalog() {
  const q = state.catQuery.trim().toLowerCase();
  const pass = (c) => (!state.catBrand || c.brand === state.catBrand) &&
    (!q || `${c.brand} ${c.line} ${c.name} ${finName(c.finish).he} ${finName(c.finish).en}`.toLowerCase().includes(q));
  const list = CATALOG.filter(pass);
  document.querySelectorAll('.cat-tab').forEach((t) => {
    const n = t.dataset.tab === 'all' ? list.length : list.filter((c) => c.finish === t.dataset.tab).length;
    t.querySelector('.cnt').textContent = n;
    t.classList.toggle('active', t.dataset.tab === state.catTab);
    t.setAttribute('aria-selected', t.dataset.tab === state.catTab);
  });
  const grid = $('#catGrid'); grid.innerHTML = '';
  const fins = state.catTab === 'all' ? FIN_ORDER : [state.catTab];
  let shown = 0;
  fins.forEach((f) => {
    const items = list.filter((c) => c.finish === f);
    if (!items.length) return;
    if (state.catTab === 'all') {
      const hd = document.createElement('div'); hd.className = 'cat-sec';
      hd.innerHTML = `${finName(f).he} <span class="en">${finName(f).en} · ${items.length}</span>`;
      grid.appendChild(hd);
    }
    items.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cat-sw'; b.dataset.id = c.id; b.dataset.finish = c.finish; b.title = `${c.brand} ${c.line} — ${c.name} (${finName(c.finish).en})`;
      b.innerHTML = `<span class="dot fin-${c.finish}" style="background:${swatchBg(c)}"></span><span class="nm">${esc(c.name)}</span><span class="br">${esc(c.brand)}</span>`;
      b.addEventListener('click', () => applyShade(c));
      grid.appendChild(b); shown++;
    });
  });
  if (!shown) grid.innerHTML = '<p class="cat-empty">לא נמצאו גוונים · No shades found</p>';
  const D = byId(DESIGNS, state.design);
  document.querySelectorAll('.cat-sw').forEach((b) => { const on = b.dataset.id === state.color && D.usesColor; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); });
}
/* catalog.json (network / SW cache) → fall back to the inline copy */
async function loadCatalog() {
  try {
    if (!location.protocol.startsWith('http')) throw new Error('no fetch on file://');
    const r = await fetch('catalog.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    if (Array.isArray(j.shades) && j.shades.length) { CATALOG = j.shades; CATALOG_META = j; }
  } catch (e) { /* keep inline fallback */ }
}

/* ---------------------------------------------------------------------
   Save as PNG (SVG → canvas, offline; photo is an embedded data URL)
   --------------------------------------------------------------------- */
function savePng() {
  const vb = svg.viewBox.baseVal, scale = 1.2;
  const clone = svg.cloneNode(true);
  clone.querySelectorAll('.glint').forEach((g) => g.removeAttribute('class'));
  clone.setAttribute('width', vb.width * scale); clone.setAttribute('height', vb.height * scale);
  const img = new Image();
  img.onload = () => {
    const pad = 140, W = Math.round(vb.width * scale), H = Math.round(vb.height * scale) + pad;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const bg = x.createRadialGradient(W / 2, H * 0.4, 50, W / 2, H * 0.4, Math.max(W, H));
    bg.addColorStop(0, '#fffdfc'); bg.addColorStop(1, '#f1e2e8');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.drawImage(img, 0, 0);
    x.textAlign = 'center'; x.direction = 'rtl'; x.fillStyle = '#6b4a56';
    x.font = '600 34px Assistant, Rubik, Heebo, "IBM Plex Sans Hebrew", Arial, sans-serif';
    x.fillText($('#selHe').textContent, W / 2, H - 78, W - 60);
    x.direction = 'ltr'; x.fillStyle = '#a3929a'; x.font = '22px system-ui, Arial, sans-serif';
    x.fillText($('#selEn').textContent, W / 2, H - 40, W - 60);
    const fname = `nail-look-${state.design}-${state.finish}-${state.color}.png`;
    // Android app wrapper: hand the PNG to native code (saves to Pictures/)
    if (window.AndroidBridge) { window.AndroidBridge.savePng(cv.toDataURL('image/png').split(',')[1], fname); return; }
    cv.toBlob((blob) => {
      // phones/tablets (incl. iPad home-screen app): use the share sheet → "Save Image"
      const file = new File([blob], fname, { type: 'image/png' });
      if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'מדמה לק' }).catch(() => {});
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    }, 'image/png');
  };
  img.onerror = () => alert('Export failed in this browser');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
}

/* size the SVG box to exactly the viewBox aspect so nothing outside the view shows */
function fitSvg() {
  const wrap = svg.parentElement, vb = svg.viewBox.baseVal;
  const W = wrap.clientWidth, H = wrap.clientHeight || W * vb.height / vb.width;
  const k = Math.min(W / vb.width, H / vb.height);
  svg.style.width = Math.floor(vb.width * k) + 'px';
  svg.style.height = Math.floor(vb.height * k) + 'px';
}
window.addEventListener('resize', fitSvg);

buildSvg();
buildPanel();
buildCatalog();
render();
loadCatalog().then(() => { buildCatalog(); render(); });
