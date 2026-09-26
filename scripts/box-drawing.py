"""Draws the diagram glyphs Geist Mono lacks.

Geist Mono has ─ │ ┌ └ ├ ▲ ▼ but not ┐ ┘ ┤ ┬ ┴ ┼ ► ◄, so a diagram in a post
took those from whatever system font the browser picked, at another width and
stroke, and its lines stopped meeting. Geist's own box glyphs are overlapping
rectangles cut from two bars, so the missing six are cut from the same bars
with the same weight variation; the pointers are ▲'s extent laid on the ─
bar's centre line, so a line runs into the tip.

Reads app/fonts/GeistMono-subset.woff2 (already instanced to the site's
400-700 axis, so the result varies over the same range) and writes
app/fonts/GeistMono-box.woff2, plus GeistMono-box.json: the codepoints, which
framework/assets/fonts.ts serves the face for, and the hash of the subset they
were cut from, which the build checks. Rerun whenever the build says so:

    uv run --with fonttools --with brotli scripts/box-drawing.py
"""

import hashlib
import json
from pathlib import Path

from fontTools import subset
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables.TupleVariation import TupleVariation
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'app/fonts/GeistMono-subset.woff2'
TARGET = ROOT / 'app/fonts/GeistMono-box.woff2'
SIDECAR = TARGET.with_suffix('.json')

# Each glyph as bars. `h` is ─ (full width), `left` is ─ stopping at the far
# edge of │ -- the mirror of the arm Geist's ┌ draws -- and `v`, `down`, `up`
# are │ whole, below the ─ bar's top, and above its bottom, which is how ┌ and
# └ cut it.
GLYPHS = {
    0x2510: ('down', 'left'),  # ┐
    0x2518: ('up', 'left'),  # ┘
    0x2524: ('v', 'left'),  # ┤
    0x252C: ('h', 'down'),  # ┬
    0x2534: ('h', 'up'),  # ┴
    0x253C: ('h', 'v'),  # ┼
}

# Pointers, not triangles: as long as ▲ is wide and two thirds as tall, which
# is a pointer's shape in the fonts diagrams fell back to. They do not vary.
POINTERS = {0x25BA: 'right', 0x25C4: 'left'}  # ► ◄


def bounds(font, glyph):
    glyf = font['glyf']
    coords = glyf[glyph].getCoordinates(glyf)[0]
    xs = [x for x, _ in coords]
    ys = [y for _, y in coords]
    return min(xs), min(ys), max(xs), max(ys)


def bars(font, horizontal, vertical):
    """The five bars as (x0, y0, x1, y1) rectangles, at this font's weight."""
    left, h0, right, h1 = bounds(font, horizontal)
    v0, bottom, v1, top = bounds(font, vertical)
    return {
        'h': (left, h0, right, h1),
        'left': (left, h0, v1, h1),
        'v': (v0, bottom, v1, top),
        'down': (v0, bottom, v1, h1),
        'up': (v0, h0, v1, top),
    }


def corners(rect):
    """Geist's own order: clockwise from the top left."""
    x0, y0, x1, y1 = rect
    return [(x0, y1), (x1, y1), (x1, y0), (x0, y0)]


def pointer(font, triangle, horizontal, direction):
    """The pointer's three corners, clockwise."""
    x0, _, x1, _ = bounds(font, triangle)
    _, h0, _, h1 = bounds(font, horizontal)
    middle = (h0 + h1) / 2
    half = round((x1 - x0) / 3)
    if direction == 'right':
        return [(x0, middle + half), (x1, middle), (x0, middle - half)]
    return [(x1, middle - half), (x0, middle), (x1, middle + half)]


def add(font, codepoint, glyph, variations):
    name = f'uni{codepoint:04X}'
    glyph.recalcBounds(font['glyf'])
    font.setGlyphOrder([*font.getGlyphOrder(), name])
    font['glyf'][name] = glyph
    font['hmtx'][name] = (600, glyph.xMin)
    font['gvar'].variations[name] = variations
    for table in font['cmap'].tables:
        if table.isUnicode():
            table.cmap[codepoint] = name


def main():
    # Keep the source's timestamp, so a rerun on the same inputs writes the
    # same bytes and the hashed URL only moves when a glyph does.
    font = TTFont(SOURCE, recalcTimestamp=False)
    gvar = font['gvar']
    axis = font['fvar'].axes[0]
    assert axis.axisTag == 'wght'
    cmap = font.getBestCmap()
    horizontal, vertical = cmap[0x2500], cmap[0x2502]  # ─ │

    # ─ carries one variation, peaking at the heaviest weight. The drawn
    # glyphs reuse its region, so they interpolate exactly as ─ and │ do.
    reference = gvar.variations[horizontal]
    assert len(reference) == 1, 'expected a single wght variation on ─'
    region = reference[0].axes

    assert font['hmtx'][horizontal][0] == 600, 'expected a 600-unit cell'

    light = bars(font, horizontal, vertical)
    heaviest = instantiateVariableFont(font, {'wght': axis.maxValue})
    heavy = bars(heaviest, horizontal, vertical)

    for codepoint, recipe in GLYPHS.items():
        pen = TTGlyphPen(None)
        start, end = [], []
        for bar in recipe:
            first, *rest = corners(light[bar])
            pen.moveTo(first)
            for point in rest:
                pen.lineTo(point)
            pen.closePath()
            start += corners(light[bar])
            end += corners(heavy[bar])
        # Four phantom points close the delta list; the advance never varies.
        deltas = [(x1 - x0, y1 - y0) for (x0, y0), (x1, y1) in zip(start, end)]
        variation = TupleVariation(region, deltas + [(0, 0)] * 4)
        add(font, codepoint, pen.glyph(), [variation])

    triangle = cmap[0x25B2]  # ▲
    assert not gvar.variations.get(triangle), 'expected ▲ not to vary'
    for codepoint, direction in POINTERS.items():
        first, *rest = pointer(font, triangle, horizontal, direction)
        pen = TTGlyphPen(None)
        pen.moveTo(first)
        for point in rest:
            pen.lineTo(point)
        pen.closePath()
        add(font, codepoint, pen.glyph(), [])

    options = subset.Options()
    options.layout_features = []
    options.name_IDs = ['*']
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    codepoints = sorted([*GLYPHS, *POINTERS])
    subsetter.populate(unicodes=codepoints)
    subsetter.subset(font)
    # Loaded from a .woff2, so it saves as one.
    font.save(TARGET)

    # The same 8-hex sha256 prefix fonts.ts hashes files with.
    source = hashlib.sha256(SOURCE.read_bytes()).hexdigest()[:8]
    sidecar = {'codepoints': codepoints, 'from': source}
    SIDECAR.write_text(json.dumps(sidecar, indent=2) + '\n')
    print(f'{TARGET.relative_to(ROOT)}: {TARGET.stat().st_size} bytes')


if __name__ == '__main__':
    main()
