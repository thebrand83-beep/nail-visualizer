"""Regenerate catalog-fallback.js from catalog.json (run from the app folder)."""
import json
cat = json.load(open('catalog.json', encoding='utf-8'))
open('catalog-fallback.js', 'w', encoding='utf-8').write(
    '/* Inline copy of catalog.json — used only when fetch() is unavailable (e.g. opened from file://).\n'
    '   Regenerate after editing catalog.json:  python3 tools/make_fallback.py */\n'
    'window.CATALOG_FALLBACK = ' + json.dumps(cat, ensure_ascii=False) + ';\n')
print('catalog-fallback.js:', len(cat['shades']), 'shades')
