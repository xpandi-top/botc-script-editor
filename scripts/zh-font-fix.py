#!/usr/bin/env python3
"""Rebuild assets/font/zh-fix.woff2, the stand-in glyphs for ZCOOL XiaoWei.

ZCOOL XiaoWei (the default Chinese UI font, served by Google Fonts) winds the
counters of a few 囗-framed characters the same way as their outlines. Browsers
fill glyphs with the nonzero rule, so those counters are painted solid and 回
shows up as ■. Only the code points in BROKEN are affected; `--check` scans every
glyph Google serves and reports them again.

The fix font holds those characters from Noto Serif SC (a Google Fonts `text=`
subset), scaled and centred so they sit like XiaoWei's own 固 (same frame shape),
on XiaoWei's advance width and line metrics. src/fonts.css exposes it as the
family "ZCOOL XiaoWei Fix" with a unicode-range of just these code points, and
the ZCOOL XiaoWei font option lists that family first.

Requires: pip install fonttools brotli skia-pathops
Usage:    python3 scripts/zh-font-fix.py            # write assets/font/zh-fix.woff2
          python3 scripts/zh-font-fix.py --check    # list broken XiaoWei glyphs
"""
import argparse
import io
import re
import sys
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

BROKEN = '回圃圄圊崮徊痼蛔'
REFERENCE = '固'  # same 囗 frame, drawn correctly by XiaoWei

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


def check():
    import pathops

    broken = []
    for font in google_fonts('family=ZCOOL+XiaoWei'):
        glyphs = font.getGlyphSet()
        for cp, name in font.getBestCmap().items():
            areas = []
            for fill in (pathops.FillType.WINDING, pathops.FillType.EVEN_ODD):
                path = pathops.Path(fillType=fill)
                glyphs[name].draw(path.getPen(glyphSet=glyphs))
                areas.append(abs(pathops.simplify(path).area))
            # A counter wound like its outline adds area under the nonzero rule.
            if areas[0] - areas[1] > 0.05 * areas[0]:
                broken.append(chr(cp))
    broken.sort()
    print('broken:', ''.join(broken))
    print('unicode-range:', unicode_range(broken))
    if set(broken) != set(BROKEN):
        print(f'BROKEN in this script is {BROKEN!r}; update it, src/fonts.css and rebuild.')
        return 1
    return 0


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
    parser.add_argument('--check', action='store_true', help='list broken ZCOOL XiaoWei glyphs')
    sys.exit(check() if parser.parse_args().check else build())
