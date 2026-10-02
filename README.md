# מדמה לק · Nail Polish Visualizer

Open `index.html` by double-click (works offline, no build step).

- `app.js` – all data tables at the top: COLORS, GLITTERS, DESIGNS, FINISHES, TYPES, SHAPES, LENGTHS, SKINS, and NAILS (nail positions on the photo). Add a shade by adding one line to COLORS.
- `hand-photo.js` – the hand image embedded as a data URL (AI-generated image; background removed, lightly smoothed, upscaled 2x). Nail positions in NAILS were measured on a grid over this image.
- `style.css` – layout (RTL, responsive) and animations (glitter glints / shimmer).

## French base & tip
French / Color French use two pickers: base (FRENCH_BASES: sheer pink, milky white, nude, clear + the palette) and tip (FRENCH_TIPS: white + palette + every glitter). Glitter tips render flakes clipped to the tip.

## Nail alignment
NAILS angles follow each finger's measured axis (PCA fit through finger-width midpoints from the DIP joint to the fingertip, see /workspace/gen/axes.py); the cuticle point sits on that axis and `bed` reaches the fingertip along it, so long/almond extensions continue straight along the finger.

## Shapes & French depth
Shapes: round, square, almond, ballerina/coffin (tapered sides, flat tip). French designs have a tip-depth slider (0 = micro, 100 = deep) with presets דק / בינוני / עמוק (FRENCH_DEPTHS in app.js).

## PWA (install on iPad / phone, works offline)
- `manifest.webmanifest`, `sw.js` (cache-first service worker, bump VERSION when files change), `icons/` (192/512, maskable, apple-touch-icon 180).
- Must be served over HTTPS (or localhost) for the service worker; opening index.html via file:// still works, just without install/offline caching.
- iPad: open the URL in Safari → Share → "Add to Home Screen" → open once while online; afterwards it runs offline.
- "Save PNG" on touch devices opens the share sheet (→ Save Image).

## Android APK
`/workspace/android-app` is a minimal WebView wrapper (no Gradle). `./build.sh` copies this folder into assets/www and produces the signed `/workspace/nail-visualizer.apk` (self-generated key `release.keystore`, alias nailviz). Save PNG writes into Pictures/NailVisualizer.
