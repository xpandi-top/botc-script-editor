#!/usr/bin/env python3
"""Check the Chinese UI fonts for glyphs that render wrong, and rebuild
assets/font/zh-fix.woff2, the stand-in glyphs for ZCOOL XiaoWei.

`--check` scans every Chinese font option (src/hooks/useFontSettings.ts) for:

- Holes painted solid. Browsers fill glyphs with the nonzero rule, so a contour
  nested inside another must wind the other way or the hole is painted over.
  ZCOOL XiaoWei does this for the code points in BROKEN (回 shows up as ■).
- Blank glyphs. A code point mapped to an empty outline prints nothing instead of
  falling back to the next font. Xingkai and Xinwei do this for accented Latin
  letters and more; their unicode-range in src/fonts.css leaves those out.

The fix font holds BROKEN from Noto Serif SC (a Google Fonts `text=` subset),
scaled and centred so they sit like XiaoWei's own 固 (same frame shape), on
XiaoWei's advance width and line metrics. src/fonts.css exposes it as the family
"ZCOOL XiaoWei Fix" with a unicode-range of just these code points, and the
ZCOOL XiaoWei font option lists that family first.

Requires: pip install fonttools brotli skia-pathops
Usage:    python3 scripts/zh-font-fix.py            # write assets/font/zh-fix.woff2
          python3 scripts/zh-font-fix.py --check    # scan every Chinese font option
"""
import argparse
import io
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'font' / 'zh-fix.woff2'
FONTS_CSS = ROOT / 'src' / 'fonts.css'

BROKEN = '回圃圄圊崮徊痼蛔'
REFERENCE = '固'  # same 囗 frame, drawn correctly by XiaoWei

# The Chinese font options: served by Google Fonts (index.html) or bundled (src/fonts.css).
GOOGLE_FONTS = ['ZCOOL XiaoWei', 'Ma Shan Zheng', 'ZCOOL QingKe HuangYou', 'Zhi Mang Xing',
                'Noto Serif SC:wght@400', 'Noto Serif SC:wght@700']
LOCAL_FONTS = {'Xingkai': 'assets/font/xingkai.ttf', 'Xinwei': 'assets/font/xinwei.ttf'}

# Google Fonts only answers with woff2 to a modern browser user agent.
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/130.0 Safari/537.36')


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(request) as response:
        return response.read()


def google_fonts(query):
    css = fetch('https://fonts.googleapis.com/css2?' + query).decode()
    return [TTFont(io.BytesIO(fetch(url)))
            for url in re.findall(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', css)]


def text_subset(family, text):
    [font] = google_fonts(f'family={family}&text={urllib.parse.quote(text)}')
    return font


def unicode_range(chars):
    return ', '.join(f'U+{ord(c):04X}' for c in sorted(chars))


def unicode_range_without(chars):
    """A unicode-range covering every code point except `chars`."""
    ranges, start = [], 0
    for cp in sorted(map(ord, chars)):
        if cp > start:
            ranges.append((start, cp - 1))
        start = cp + 1
    ranges.append((start, 0x10FFFF))
    return ', '.join(f'U+{lo:X}' if lo == hi else f'U+{lo:X}-{hi:X}' for lo, hi in ranges)


def face_ranges(family):
    """The unicode-range of a family's @font-face in src/fonts.css, as (lo, hi) pairs."""
    face = re.search(r"@font-face\s*{[^}]*font-family:\s*'%s';[^}]*}" % re.escape(family),
                     FONTS_CSS.read_text(encoding='utf-8'))
    declared = face and re.search(r'unicode-range:\s*([^;]+);', face.group(0))
    if not declared:
        return [(0, 0x10FFFF)]
    ranges = []
    for part in declared.group(1).split(','):
        lo, _, hi = part.strip()[2:].partition('-')
        ranges.append((int(lo, 16), int(hi or lo, 16)))
    return ranges


def painted_share(glyphs, name):
    """Share of a glyph's ink that is really a hole, painted because it winds wrongly."""
    import pathops

    def area(path):
        try:
            return abs(pathops.simplify(path).area)
        except pathops.PathOpsError:
            return 0.0

    def inside(inner, outer):
        ix0, iy0, ix1, iy1 = inner.bounds
        ox0, oy0, ox1, oy1 = outer.bounds
        if ix0 < ox0 or iy0 < oy0 or ix1 > ox1 or iy1 > oy1:
            return False
        try:
            outside = area(pathops.op(inner, outer, pathops.PathOp.DIFFERENCE))
        except pathops.PathOpsError:
            return False
        size = area(inner)
        return size > 0 and outside < 0.01 * size

    path = pathops.Path()
    glyphs[name].draw(path.getPen(glyphSet=glyphs))
    contours = list(path.contours)
    fixed, rewound = pathops.Path(), False
    for contour in contours:
        outer = [c for c in contours if c is not contour and inside(contour, c)]
        # Winding alternates with nesting depth, starting from the outermost contour.
        if outer and contour.clockwise == (max(outer, key=area).clockwise == (len(outer) % 2 == 1)):
            contour = pathops.Path(contour)
            contour.reverse()
            rewound = True
        fixed.addPath(contour)
    if not rewound:
        return 0.0
    ink = area(path)
    return (ink - area(fixed)) / ink if ink else 0.0


def scan(fonts):
    """Characters whose holes are painted over (share of ink) and characters drawn blank."""
    holes, blanks = {}, []
    for font in fonts:
        glyphs = font.getGlyphSet()
        for cp, name in font.getBestCmap().items():
            char = chr(cp)
            pen = BoundsPen(glyphs)
            glyphs[name].draw(pen)
            if pen.bounds is None:
                if unicodedata.category(char)[0] not in 'ZC':  # spaces and controls are blank anyway
                    blanks.append(char)
            elif (share := painted_share(glyphs, name)) > 0.1:
                holes[char] = share
    return holes, sorted(blanks)


def check():
    problems = []
    fonts = [(family, lambda f=family: google_fonts('family=' + f.replace(' ', '+')))
             for family in GOOGLE_FONTS]
    fonts += [(family, lambda p=path: [TTFont(ROOT / p)]) for family, path in LOCAL_FONTS.items()]
    for family, load in fonts:
        holes, blanks = scan(load())
        print(f'{family}: holes painted solid: {"".join(sorted(holes)) or "none"}; '
              f'blank glyphs: {"".join(blanks) or "none"}')
        if family == 'ZCOOL XiaoWei':
            if set(holes) != set(BROKEN):
                problems.append(f'ZCOOL XiaoWei: set BROKEN to {"".join(sorted(holes))!r}, '
                                f'use unicode-range {unicode_range(holes)} in src/fonts.css, rebuild')
        elif holes:
            problems.append(f'{family}: holes painted solid in {"".join(sorted(holes))}')
        family_name = family.split(':')[0]
        if blanks and family_name in LOCAL_FONTS:
            ranges = face_ranges(family_name)
            if any(lo <= ord(c) <= hi for c in blanks for lo, hi in ranges):
                problems.append(f'{family_name}: use unicode-range {unicode_range_without(blanks)} '
                                'in src/fonts.css')
        elif blanks:
            problems.append(f'{family}: blank glyphs for {"".join(blanks)}')
    for problem in problems:
        print('FIX', problem)
    return 1 if problems else 0


def bounds(font, char):
    glyphs = font.getGlyphSet()
    pen = BoundsPen(glyphs)
    glyphs[font.getBestCmap()[ord(char)]].draw(pen)
    return pen.bounds


def build():
    xiaowei = text_subset('ZCOOL+XiaoWei', REFERENCE)
    noto = text_subset('Noto+Serif+SC:wght@400', BROKEN + REFERENCE)

    # Map Noto's 固 box onto XiaoWei's 固 box.
    xx0, xy0, xx1, xy1 = bounds(xiaowei, REFERENCE)
    nx0, ny0, nx1, ny1 = bounds(noto, REFERENCE)
    scale = ((xx1 - xx0) / (nx1 - nx0) + (xy1 - xy0) / (ny1 - ny0)) / 2
    dx = (xx0 + xx1) / 2 - scale * (nx0 + nx1) / 2
    dy = (xy0 + xy1) / 2 - scale * (ny0 + ny1) / 2
    advance = xiaowei['hmtx'][xiaowei.getBestCmap()[ord(REFERENCE)]][0]

    glyphs = noto.getGlyphSet()
    glyf, hmtx = noto['glyf'], noto['hmtx']
    names = sorted({noto.getBestCmap()[ord(c)] for c in BROKEN})
    redrawn = {}
    for name in names:
        pen = TTGlyphPen(glyphs)
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, scale, dx, dy)))
        redrawn[name] = pen.glyph()
    for name, glyph in redrawn.items():
        glyf[name] = glyph
        glyph.recalcBounds(glyf)
        hmtx[name] = (advance, glyph.xMin)

    # Same line box as XiaoWei, so lines containing these glyphs keep their height.
    noto['hhea'].ascent = xiaowei['hhea'].ascent
    noto['hhea'].descent = xiaowei['hhea'].descent
    noto['hhea'].lineGap = xiaowei['hhea'].lineGap
    os2, xos2 = noto['OS/2'], xiaowei['OS/2']
    os2.sTypoAscender, os2.sTypoDescender = xos2.sTypoAscender, xos2.sTypoDescender
    os2.sTypoLineGap = xos2.sTypoLineGap
    os2.usWinAscent, os2.usWinDescent = xos2.usWinAscent, xos2.usWinDescent
    os2.fsSelection = (os2.fsSelection & ~(1 << 7)) | (xos2.fsSelection & (1 << 7))

    options = subset.Options()
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.layout_features = []
    options.notdef_outline = True
    options.drop_tables += ['BASE', 'STAT', 'vhea', 'vmtx', 'VORG', 'GSUB', 'GPOS']
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=[ord(c) for c in BROKEN])
    subsetter.subset(noto)

    # Modified font: give it its own name, keep Adobe's copyright and the OFL.
    name = noto['name']
    for name_id in (1, 3, 4, 6, 16, 17):
        name.removeNames(nameID=name_id)
    name.setName('BOTC ZH Fix', 1, 3, 1, 0x409)
    name.setName('BOTC ZH Fix Regular', 4, 3, 1, 0x409)
    name.setName('BOTCZHFix-Regular', 6, 3, 1, 0x409)
    name.setName('BOTCZHFix-Regular; Noto Serif SC glyphs rescaled for ZCOOL XiaoWei', 3, 3, 1, 0x409)
    name.setName(f'Noto Serif SC glyphs for {BROKEN}, scaled to sit with ZCOOL XiaoWei.', 10, 3, 1, 0x409)
    name.setName('This Font Software is licensed under the SIL Open Font License, Version 1.1.',
                 13, 3, 1, 0x409)
    name.setName('https://openfontlicense.org', 14, 3, 1, 0x409)

    noto.flavor = 'woff2'
    noto.save(OUT)
    print(f'wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size} bytes)')
    print(f'scale {scale:.3f}, offset ({dx:.0f}, {dy:.0f}), advance {advance}')
    print('unicode-range:', unicode_range(BROKEN))
    return 0


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--check', action='store_true', help='scan every Chinese font option')
    sys.exit(check() if parser.parse_args().check else build())
