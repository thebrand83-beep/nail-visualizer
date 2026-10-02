/* =====================================================================
   Nail Polish Visualizer — app.js  (photo-based, fully offline)
   A real hand photo (hand-photo.js) with polish rendered on top of each
   nail as SVG layers: color, blend-mode texture from the photo,
   curvature shading, specular highlights, glitter particles, etc.
   ===================================================================== */

/* ---------------------------------------------------------------------
   1) POLISH COLORS — add / edit here.  { id, he, en, hex }
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
];
/* French smile-line depth: slider 0 (micro) … 100 (deep), with labeled presets */
const FRENCH_DEPTHS = [
  { id: 'thin',   he: 'דק',     en: 'Thin / micro', v: 8 },
  { id: 'medium', he: 'בינוני', en: 'Classic',      v: 50 },
  { id: 'deep',   he: 'עמוק',   en: 'Deep',         v: 92 },
];
const LENGTHS = [
  { id: 'short',  he: 'קצר',    en: 'Short',  ext: 0.04 },
  { id: 'medium', he: 'בינוני', en: 'Medium', ext: 0.32 },
  { id: 'long',   he: 'ארוך',   en: 'Long',   ext: 0.65 },
];
// target: average skin color to tint the photo to (null = original photo)
const SKINS = [
  { id: 'photo', he: 'מקורי', en: 'Original', hex: '#dbac99', target: null },
  { id: 'fair',  he: 'בהיר מאוד', en: 'Porcelain', hex: '#f2d6c8', target: [222, 190, 176] },
  { id: 'olive', he: 'זית',   en: 'Olive',    hex: '#b8875a', target: [176, 132, 92] },
  { id: 'tan',   he: 'שזוף',  en: 'Tan',      hex: '#9c6a48', target: [150, 104, 74] },
  { id: 'deep',  he: 'כהה',   en: 'Deep',     hex: '#6b4430', target: [104, 68, 48] },
];
const PHOTO_SKIN_AVG = [219, 172, 153];

/* 6) Nail positions on the photo (image px; measured automatically from the photo's nail mask). cx,cy = cuticle center,
      a = axis angle (deg, 0 = pointing up), w = nail width, bed = cuticle→fingertip */
const NAILS = [
  { id: 'thumb', cx: 984.0, cy: 752.0, a: 27.0, w: 63.0, bed: 119.0 },
  { id: 'index', cx: 798.6, cy: 203.7, a: 12.9, w: 83.0, bed: 93.0 },
  { id: 'middle', cx: 649.5, cy: 136.7, a: 17.0, w: 81.0, bed: 88.0 },
  { id: 'ring', cx: 491.9, cy: 213.7, a: 27.2, w: 70.0, bed: 65.5 },
  { id: 'pinky', cx: 283.5, cy: 373.5, a: 24.9, w: 47.0, bed: 60.5 },
];
const PHOTO = { w: 1118, h: 1440, y: 0 };            // photo placement in SVG units
const VIEW_FULL = '-60 -120 1238 1580', VIEW_ZOOM = '30 -40 1090 1010';

/* Default selection */
const state = { frDepth: 50, frBase: 'sheer', frTip: 'white', design: 'solid', finish: 'glossy', type: 'gel', color: 'red', glitter: 'gold',
  shape: 'almond', length: 'medium', skin: 'photo', zoom: window.matchMedia('(max-width: 900px)').matches };

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
  grad('linearGradient', 'edgeShade', { x1: 0, y1: 0, x2: 1, y2: 0 },
    [[0, '#000', 0.55], [0.16, '#000', 0.16], [0.42, '#000', 0], [0.7, '#000', 0.04], [0.88, '#000', 0.22], [1, '#000', 0.6]], defs);
  grad('linearGradient', 'cutShade', { x1: 0, y1: 1, x2: 0, y2: 0 }, [[0, '#000', 0.4], [0.14, '#000', 0.08], [0.3, '#000', 0]], defs);
  grad('linearGradient', 'tipLight', { x1: 0, y1: 1, x2: 0, y2: 0 }, [[0.55, '#fff', 0], [1, '#fff', 0.18]], defs);
  grad('linearGradient', 'streak', { x1: 0, y1: 1, x2: 0, y2: 0 }, [[0, '#fff', 0], [0.25, '#fff', 0.9], [0.7, '#fff', 0.75], [1, '#fff', 0]], defs);
  grad('linearGradient', 'streakX', { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, '#fff', 0], [0.5, '#fff', 1], [1, '#fff', 0]], defs);
  R.stops.chrome = grad('linearGradient', 'chromeGrad', { x1: 0, y1: 0, x2: 1, y2: 0.6 },
    [[0, '#000'], [0.3, '#000'], [0.55, '#000'], [0.78, '#000'], [1, '#000']], defs);
  R.stops.ombre = grad('linearGradient', 'ombreGrad', { x1: 0, y1: 1, x2: 0, y2: 0 },
    [[0.15, '#000', 0], [0.55, '#000', 0.7], [0.92, '#000', 1]], defs);

  // hand photo
  el('use', { href: '#photo', filter: 'url(#skinF)' }, svg);

  NAILS.forEach((n, i) => buildNail(n, i, defs));
}

/* nail outline in local frame: origin = cuticle center, tip toward -y */
function nailGeom(n) {
  const h = n.w / 2, bed = n.bed, yB = -bed;
  const len = byId(LENGTHS, state.length), shape = state.shape;
  let ext = n.w * len.ext + (shape === 'almond' ? n.w * 0.2 : shape === 'coffin' ? n.w * 0.14 : 0);
  if (n.id === 'thumb') ext *= 0.6;
  const yT = yB - ext, yc = -bed * 0.22;            // yc = cuticle corner height
  let d = `M${-h * 0.9},${yc} C${-h * 0.5},${bed * 0.05} ${h * 0.5},${bed * 0.05} ${h * 0.9},${yc} `;
  if (shape === 'square') {
    const r = h * 0.28;
    d += `C${h * 1.02},${yc - bed * 0.35} ${h},${yT + bed * 0.4} ${h},${yT + r} Q${h},${yT} ${h - r},${yT} L${-h + r},${yT} Q${-h},${yT} ${-h},${yT + r} C${-h},${yT + bed * 0.4} ${-h * 1.02},${yc - bed * 0.35} ${-h * 0.9},${yc} Z`;
  } else if (shape === 'round') {
    d += `C${h * 1.02},${yc - bed * 0.35} ${h},${yT + h * 1.5} ${h},${yT + h * 0.95} C${h},${yT + h * 0.35} ${h * 0.55},${yT} 0,${yT} C${-h * 0.55},${yT} ${-h},${yT + h * 0.35} ${-h},${yT + h * 0.95} C${-h},${yT + h * 1.5} ${-h * 1.02},${yc - bed * 0.35} ${-h * 0.9},${yc} Z`;
  } else if (shape === 'coffin') {
    // ballerina: straight sides along the bed, then a gentle taper to a narrow flat tip with soft corners
    const s = yB + bed * 0.35, k = s - yT, tw = h * (ext > n.w * 0.3 ? 0.56 : 0.72), r = h * 0.13;
    d += `C${h * 1.02},${yc - bed * 0.3} ${h},${s + bed * 0.15} ${h},${s} C${h},${s - k * 0.3} ${tw + (h - tw) * 0.18},${yT + k * 0.22} ${tw},${yT + r} ` +
      `Q${tw},${yT} ${tw - r},${yT} L${-tw + r},${yT} Q${-tw},${yT} ${-tw},${yT + r} ` +
      `C${-tw - (h - tw) * 0.18},${yT + k * 0.22} ${-h},${s - k * 0.3} ${-h},${s} C${-h},${s + bed * 0.15} ${-h * 1.02},${yc - bed * 0.3} ${-h * 0.9},${yc} Z`;
  } else {
    const s = yB + bed * 0.3, k = s - yT;
    d += `C${h * 1.02},${yc - bed * 0.3} ${h},${s + bed * 0.15} ${h},${s} C${h},${s - k * 0.5} ${h * 0.45},${yT} 0,${yT} C${-h * 0.45},${yT} ${-h},${s - k * 0.5} ${-h},${s} C${-h},${s + bed * 0.15} ${-h * 1.02},${yc - bed * 0.3} ${-h * 0.9},${yc} Z`;
  }
  return { d, h, yB, yT, yc, ext, bed };
}

function buildNail(n, i, defs) {
  const N = { n, i, L: {} };
  R.nails[i] = N;
  const g = el('g', { transform: `translate(${n.cx},${n.cy}) rotate(${n.a})` }, svg);
  // soft-edged mask = nail shape
  const mk = el('mask', { id: 'nm' + i, maskUnits: 'userSpaceOnUse', x: -100, y: -220, width: 200, height: 300 }, defs);
  N.maskPath = el('path', { fill: '#fff', filter: 'url(#feather)' }, mk);
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
  L.glitter = el('g', { class: 'lyr' }, ng);
  buildGlitter(N, L.glitter);
  // real nail texture from the photo, blended in
  const tg = el('g', { class: 'lyr', style: 'mix-blend-mode:soft-light' }, ng);
  el('use', { href: '#photo', filter: 'url(#texF)', transform: `rotate(${-n.a}) translate(${-n.cx},${-n.cy})` }, tg);
  L.tex = tg;
  L.cut = el('path', { class: 'lyr', fill: 'url(#cutShade)' }, ng);
  L.shade = el('path', { class: 'lyr', fill: 'url(#edgeShade)' }, ng);
  L.tipLight = el('path', { class: 'lyr', fill: 'url(#tipLight)' }, ng);
  L.matte = el('path', { class: 'lyr', fill: '#fff', filter: 'url(#noise)' }, ng);
  L.haze = el('path', { class: 'lyr', fill: '#fff' }, ng);      // matte top coat lifts blacks
  L.gloss = el('g', { class: 'lyr', style: 'mix-blend-mode:screen' }, ng);
  N.gSheen = el('path', { fill: 'url(#tipLight)' }, L.gloss);
  N.gStreak = el('path', { fill: 'url(#streak)', filter: 'url(#blur2)' }, L.gloss);
  N.gCore = el('path', { fill: 'url(#streak)', filter: 'url(#feather)' }, L.gloss);
  N.gWin = el('path', { fill: 'url(#streak)', filter: 'url(#blur2)' }, L.gloss);
  L.glints = el('g', { class: 'lyr' }, ng);
  buildGlints(N, L.glints);
  // hairline where polish meets the cuticle
  N.edge = el('path', { class: 'lyr', fill: 'none', stroke: '#3b1414', 'stroke-width': 1.6, filter: 'url(#feather)' }, g);
}

/* glitter: many tiny faceted flakes, deterministic layout */
function buildGlitter(N, parent) {
  const n = N.n, h = n.w / 2, top = -n.bed - n.w * 0.9;
  N.flakes = [];
  const groups = [el('g', { class: 'shim a' }, parent), el('g', { class: 'shim b' }, parent), el('g', {}, parent)];
  const GS = 1.3; // flake scale relative to the photo's nail size
  const count = Math.round(n.w * (n.bed + n.w * 0.9) / (3.2 * GS * GS));
  for (let k = 0; k < count; k++) {
    const x = (rnd() * 2 - 1) * h * 1.05, y = top + rnd() * (n.bed + n.w * 0.9 + 4);
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
    const G = nailGeom(N.n), { d, h, yB, yT, yc } = G, w = N.n.w, L = N.L;
    N.maskPath.setAttribute('d', d);
    ['base', 'ombre', 'chrome', 'cut', 'shade', 'tipLight', 'matte', 'haze', 'shadow'].forEach((k) => (L[k] || N[k]).setAttribute('d', d));
    N.gSheen.setAttribute('d', d);
    N.beyondRect.setAttribute('y', yT - 20); N.beyondRect.setAttribute('height', Math.max(0, yB - (yT - 20) - 2));
    N.edge.setAttribute('d', `M${-h * 0.9},${yc} C${-h * 0.5},${G.bed * 0.05} ${h * 0.5},${G.bed * 0.05} ${h * 0.9},${yc}`);
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
function depthName() {   // nearest preset for the slider value
  return FRENCH_DEPTHS.reduce((a, b) => (Math.abs(b.v - state.frDepth) < Math.abs(a.v - state.frDepth) ? b : a));
}
function setA(e, a) { for (const k in a) e.setAttribute(k, typeof a[k] === 'number' ? f2(a[k]) : a[k]); }

/* ---------------------------------------------------------------------
   Apply state → SVG
   --------------------------------------------------------------------- */
function render() {
  const D = byId(DESIGNS, state.design), F = byId(FINISHES, state.finish), T = byId(TYPES, state.type);
  const C = byId(COLORS, state.color), GL = byId(GLITTERS, state.glitter), S = byId(SKINS, state.skin);
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

  // glitter flake colors
  const GLx = tipGl || GL;   // which glitter palette the flakes use
  if (F.glitter || tipGl) {
    R.nails.forEach((N) => N.flakes.forEach((fl) => {
      fl.p.style.fill = GLx.holo ? `hsl(${fl.hue.toFixed(0)},${fl.t === 3 ? 100 : 85}%,${[45, 62, 76, 92][fl.t]}%)` : GLx.palette[fl.t];
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
    matte: !natural && F.matte ? 0.12 : 0,
    haze: !natural && F.matte ? 0.02 + (1 - dark) * 0.03 : 0,
    gloss: Math.min(1, gloss),
    glints: !natural && (F.glitter || tipGl) ? 1 : 0,
    shadow: natural || state.length === 'short' ? 0 : 0,
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
  const Sh = byId(SHAPES, state.shape), Ln = byId(LENGTHS, state.length);
  let he, en;
  if (natural) { he = 'ציפורן טבעית'; en = 'Natural nails'; }
  else {
    he = [T.he, D.id === 'solid' ? null : D.he, F.he, D.usesColor ? C.he : null, isFr ? 'בסיס ' + FB.he : null, isFr ? 'קצה ' + FT.he + ' (' + depthName().he + ')' : null, F.glitter ? 'נצנצים ' + GL.he : null].filter(Boolean).join(' · ');
    en = [T.en, D.id === 'solid' ? null : D.en, F.en, D.usesColor ? C.en : null, isFr ? FB.en + ' base' : null, isFr ? FT.en + ' tip (' + depthName().en + ')' : null, F.glitter ? GL.en + ' glitter' : null].filter(Boolean).join(' · ');
  }
  $('#selHe').textContent = he;
  $('#selEn').textContent = `${en}  —  ${Ln.en} ${Sh.en} / ${Sh.he} ${Ln.he}`;
  $('#colors').classList.toggle('disabled', !D.usesColor);
  $('#colorHint').textContent = D.usesColor ? '' : 'לא בשימוש בעיצוב זה · not used by this design';
  $('#glitterGroup').classList.toggle('hidden', !F.glitter);
  $('#frBaseGroup').classList.toggle('hidden', !isFr);
  $('#colors').closest('.group').classList.toggle('hidden', isFr);   // French uses its own base/tip pickers
  $('#frTipGroup').classList.toggle('hidden', !isFr);
  $('#frDepthGroup').classList.toggle('hidden', !isFr);
  $('#frDepth').value = state.frDepth;
  document.querySelectorAll('[data-depth]').forEach((b) => b.classList.toggle('active', depthName().id === b.dataset.depth));
  ['finishGroup', 'typeGroup'].forEach((id) => $('#' + id).classList.toggle('disabled', natural));
  document.querySelectorAll('[data-k]').forEach((b) => b.classList.toggle('active', String(state[b.dataset.k]) === b.dataset.v));
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
      if (k === 'glitter') state.finish = 'glitter';
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
  COLORS.forEach((c) => mk(`<span class="dot" style="background:${c.hex}"></span><span class="nm">${c.he}</span>`, 'color', c.id, 'sw', $('#colors'), `${c.he} · ${c.en}`));
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
  LENGTHS.forEach((o) => mk(`<span>${o.he}</span><span class="en">${o.en}</span>`, 'length', o.id, '', $('#lengths')));
  SKINS.forEach((s) => mk(`<span class="dot" style="background:${s.hex}"></span><span class="nm">${s.he}</span>`, 'skin', s.id, 'sw', $('#skins'), `${s.he} · ${s.en}`));
  mk('<span>כל היד</span><span class="en">Full hand</span>', 'zoom', 'false', '', $('#zooms'));
  mk('<span>זום לציפורניים</span><span class="en">Zoom nails</span>', 'zoom', 'true', '', $('#zooms'));
  $('#removeBtn').addEventListener('click', () => { state.design = 'natural'; render(); });
  $('#saveBtn').addEventListener('click', savePng);
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
    x.fillText($('#selHe').textContent, W / 2, H - 78);
    x.direction = 'ltr'; x.fillStyle = '#a3929a'; x.font = '22px system-ui, Arial, sans-serif';
    x.fillText($('#selEn').textContent, W / 2, H - 40);
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
render();
