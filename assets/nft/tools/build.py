#!/usr/bin/env python3
"""Build the four ClassyGit Pass SVGs.

All type is converted to outlines with HarfBuzz + fontTools so the SVGs are
self-contained and do not depend on a font being installed or fetched.

Run from the repo root:
    /tmp/opencode/venv/bin/python assets/nft/tools/build.py
"""

from __future__ import annotations

import math
import os
import tempfile
from dataclasses import dataclass

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
FONT_DIR = os.path.join(ROOT, "apps", "web", "public", "fonts")
SYS_FONT_DIR = "/usr/share/fonts/truetype/liberation"
OUT_DIR = os.path.join(ROOT, "assets", "nft", "src")

TMP = os.path.join(tempfile.gettempdir(), "classygit-nft-fonts")
os.makedirs(TMP, exist_ok=True)

# ---------------------------------------------------------------- palette

PAPER = "#F2F2F2"
INK = "#0B0B0B"
MUTED = "#5E5E5E"

MAC = {
    "accent": "#000000",
}
NES = {
    "bg": "#212529",
    "panel": "#2B3035",
    "line": "#495057",
    "dim": "#6C757D",
    "mist": "#ADB5BD",
    "paper": "#F8F9FA",
    "green": "#92CC41",
    "deep": "#3D6B2F",
    "night": "#151A14",
    "body": "#3A3F38",
}
W98 = {
    "desk": "#008080",
    "face": "#C0C0C0",
    "light": "#FFFFFF",
    "mid": "#808080",
    "dark": "#404040",
    "navy": "#000080",
    "blue": "#1084D0",
}
TUI = {
    "bg": "#0000A8",
    "white": "#FFFFFF",
    "gray": "#A8A8A8",
    "yellow": "#FFFF55",
    "cyan": "#55FFFF",
    "green": "#00A800",
}

# ---------------------------------------------------------------- type


def _decompress(src: str, stem: str) -> str:
    """HarfBuzz cannot read WOFF2 directly; decompress once to a temp TTF."""
    dst = os.path.join(TMP, stem + ".ttf")
    if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
        font = TTFont(src)
        font.flavor = None
        font.save(dst)
    return dst


@dataclass
class Run:
    text: str
    width: float


class Face:
    def __init__(self, filename: str, stem: str):
        src = os.path.join(FONT_DIR, filename)
        if not os.path.exists(src):
            src = os.path.join(SYS_FONT_DIR, filename)
        self.ttf_path = _decompress(src, stem)
        self.tt = TTFont(self.ttf_path)
        self.upem = self.tt["head"].unitsPerEm
        self.glyph_set = self.tt.getGlyphSet()
        self.order = self.tt.getGlyphOrder()
        self.font = hb.Font(hb.Face(hb.Blob.from_file_path(self.ttf_path)))
        self.cap = self.tt["OS/2"].sCapHeight / self.upem

    def layout(self, text: str, size: float, tracking: float = 0.0) -> list[tuple[int, float, float, float]]:
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(self.font, buf, {"kern": True, "liga": False})
        scale = size / self.upem
        out = []
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            out.append(
                (
                    info.codepoint,
                    pos.x_advance * scale,
                    pos.x_offset * scale,
                    pos.y_offset * scale,
                )
            )
        if tracking:
            for i in range(len(out) - 1):
                gid, adv, xo, yo = out[i]
                out[i] = (gid, adv + tracking * size, xo, yo)
        return out

    def width(self, text: str, size: float, tracking: float = 0.0) -> float:
        return sum(g[1] for g in self.layout(text, size, tracking))

    def path(self, text: str, size: float, x: float, y: float, tracking: float = 0.0) -> str:
        """Return SVG path data for a single line, baseline at y."""
        scale = size / self.upem
        chunks: list[str] = []
        cursor = x
        for gid, adv, xo, yo in self.layout(text, size, tracking):
            name = self.order[gid]
            glyph = self.glyph_set[name]
            pen = SVGPathPen(self.glyph_set)
            tpen = TransformPen(pen, (scale, 0, 0, -scale, cursor + xo, y - yo))
            glyph.draw(tpen)
            d = pen.getCommands()
            if d:
                chunks.append(d)
            cursor += adv
        return " ".join(chunks)


LIB = {
    "b": Face("LiberationSans-Bold.ttf", "lib-sans-bold"),
    "r": Face("LiberationSans-Regular.ttf", "lib-sans-regular"),
    "i": Face("LiberationSans-Italic.ttf", "lib-sans-italic"),
}
FUSION = Face("fusion-pixel-12px-zh_hans.woff2", "fusion-pixel")
PS2P = Face("press-start-2p.woff2", "press-start-2p")
# system clone with an explicit free licence; only used for tiny desktop labels
SYSTEM = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"


# ---------------------------------------------------------------- svg primitives


def n(v: float) -> str:
    if abs(v - round(v)) < 1e-6:
        return str(int(round(v)))
    return f"{v:.3f}".rstrip("0").rstrip(".")


def rect(x, y, w, h, fill="none", stroke=None, sw=1, **kw):
    attrs = [f'x="{n(x)}"', f'y="{n(y)}"', f'width="{n(w)}"', f'height="{n(h)}"', f'fill="{fill}"']
    if stroke:
        attrs += [f'stroke="{stroke}"', f'stroke-width="{n(sw)}"']
    for k, v in kw.items():
        attrs.append(f'{k.replace("_", "-")}="{v}"')
    return "<rect " + " ".join(attrs) + "/>"


def line(x1, y1, x2, y2, stroke=INK, sw=1, **kw):
    attrs = [
        f'x1="{n(x1)}"', f'y1="{n(y1)}"', f'x2="{n(x2)}"', f'y2="{n(y2)}"',
        f'stroke="{stroke}"', f'stroke-width="{n(sw)}"',
    ]
    for k, v in kw.items():
        attrs.append(f'{k.replace("_", "-")}="{v}"')
    return "<line " + " ".join(attrs) + "/>"


def circle(cx, cy, r, fill="none", stroke=None, sw=1):
    s = f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}" fill="{fill}"'
    if stroke:
        s += f' stroke="{stroke}" stroke-width="{n(sw)}"'
    return s + "/>"


def poly(points, fill, stroke=None, sw=1):
    p = " ".join(f"{n(x)},{n(y)}" for x, y in points)
    s = f'<polygon points="{p}" fill="{fill}"'
    if stroke:
        s += f' stroke="{stroke}" stroke-width="{n(sw)}"'
    return s + "/>"


def path(d, fill, **kw):
    attrs = [f'd="{d}"', f'fill="{fill}"']
    for k, v in kw.items():
        attrs.append(f'{k.replace("_", "-")}="{v}"')
    return "<path " + " ".join(attrs) + "/>"


def group(content, **kw):
    attrs = []
    for k, v in kw.items():
        attrs.append(f'{k.replace("_", "-")}="{v}"')
    return "<g " + " ".join(attrs) + ">" + content + "</g>"


def text(face: Face, s: str, size: float, x: float, y: float, fill=INK,
         anchor="start", tracking=0.0, **kw):
    w = face.width(s, size, tracking)
    if anchor == "middle":
        x -= w / 2
    elif anchor == "end":
        x -= w
    d = face.path(s, size, x, y, tracking)
    if not d:
        return "", w
    return path(d, fill, **kw), w


def fit_tracking(face: Face, s: str, size: float, target: float) -> float:
    """Tracking (em) that makes a line exactly target px wide."""
    w = face.width(s, size, 0)
    if len(s) <= 1:
        return 0
    return (target - w) / (size * (len(s) - 1))


# 5x7 bitmap alphabet, used for the TUI wordmark and the series monogram.
BITMAP = {
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    "C": ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    "G": ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
    "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    "I": ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    "J": ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
    "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    "Q": ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
    "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    "V": ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    "W": ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
    "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    "Y": ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    "Z": ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
    "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
    "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
    "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
    " ": ["00000"] * 7,
    ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
    ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
    "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
    "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
    ">": ["10000", "01000", "00100", "00010", "00100", "01000", "10000"],
    "_": ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
}


def bitmap_path(s: str, unit: float, x: float, y: float) -> tuple[str, float]:
    """Bitmaps with baseline at y (7 rows above). Returns path and advance."""
    chunks = []
    cursor = x
    for ch in s.upper():
        rows = BITMAP.get(ch, BITMAP[" "])
        for ry, row in enumerate(rows):
            for rx, bit in enumerate(row):
                if bit == "1":
                    px = cursor + rx * unit
                    py = y - (7 - ry) * unit
                    chunks.append(f"M{n(px)} {n(py)}h{n(unit)}v{n(unit)}h-{n(unit)}z")
        cursor += 6 * unit
    return " ".join(chunks), cursor - x - unit


def bitmap(s: str, unit: float, x: float, y: float, fill: str, **kw):
    d, w = bitmap_path(s, unit, x, y)
    return path(d, fill, **kw), w


# ---------------------------------------------------------------- generic marks


def series_mark(x: float, y: float, accent: str, cell: float = 6, gap: float = 2) -> str:
    out = []
    for r in range(3):
        for c in range(3):
            fill = accent if (r == 1 and c == 1) else INK
            out.append(rect(x + c * (cell + gap), y + r * (cell + gap), cell, cell, fill))
    return "".join(out)


CURSOR_MAC = [
    (0, 0), (0, 17), (4, 13), (7, 20), (10, 19), (7, 12), (13, 12),
]


def mac_cursor(x, y, s=2, fill="#000"):
    p = " ".join(f"{n(x + px * s)},{n(y + py * s)}" for px, py in CURSOR_MAC)
    return f'<polygon points="{p}" fill="{fill}"/>'


def w98_arrow(x, y, s=1.5, fill="#FFFFFF", stroke="#000000"):
    pts = [
        (0, 0), (0, 15), (4, 11), (6, 17), (9, 16), (7, 10), (12, 10),
    ]
    p = " ".join(f"{n(x + px * s)},{n(y + py * s)}" for px, py in pts)
    return (
        f'<polygon points="{p}" fill="{fill}" stroke="{stroke}" '
        f'stroke-width="{n(s)}" stroke-linejoin="miter"/>'
    )


def leader(x1: float, x2: float, y: float, color=INK, dot=2, gap=6):
    out = []
    x = x1
    while x + dot <= x2:
        out.append(rect(x, y, dot, dot, color))
        x += gap
    return "".join(out)


# ---------------------------------------------------------------- chrome


def chrome(accent: str, index: int, slug: str, overline: str, subline: str) -> list[str]:
    parts: list[str] = []

    # archival paper + printer marks
    parts.append(rect(0, 0, 1024, 1024, PAPER))
    for x, y, dx, dy in (
        (24, 24, 1, 0), (24, 24, 0, 1),
        (1000, 24, -1, 0), (1000, 24, 0, 1),
        (24, 1000, 1, 0), (24, 1000, 0, -1),
        (1000, 1000, -1, 0), (1000, 1000, 0, -1),
    ):
        parts.append(line(x, y, x + dx * 16, y + dy * 16, INK, 1))
    parts.append(rect(40, 40, 944, 944, "none", INK, 1.5))

    # header
    parts.append(series_mark(64, 66, accent))
    t, _ = text(LIB["b"], "CLASSYGIT PASS", 16, 98, 85, INK, tracking=0.20)
    parts.append(t)
    label = f"SERIES {index:02d} / 04  -  {slug}"
    t, _ = text(LIB["r"], label, 12, 960, 84, MUTED, anchor="end", tracking=0.16)
    parts.append(t)
    parts.append(line(64, 112, 960, 112, INK, 1))

    # title lockup
    t, _ = text(LIB["b"], overline, 12, 64, 154, MUTED, tracking=0.18)
    parts.append(t)
    parts.append(rect(64, 286, 9, 9, accent))
    t, _ = text(LIB["r"], subline, 16, 82, 296, "#3A3A3A")
    parts.append(t)

    # colophon
    parts.append(line(64, 850, 960, 850, INK, 1))
    t, _ = text(LIB["r"], "EST. 2026  /  2212 EDITION", 12, 64, 884, MUTED, tracking=0.12)
    parts.append(t)
    t, _ = text(LIB["r"], "CLASSYGIT.DEV", 11, 960, 884, MUTED, anchor="end", tracking=0.20)
    parts.append(t)

    parts.append(rect(64, 927, 10, 10, accent))
    t, _ = text(LIB["r"], "No.", 12, 84, 937, MUTED)
    parts.append(t)
    parts.append(line(112, 938, 190, 938, "#9A9A9A", 1))
    t, _ = text(LIB["r"], "/ 2212", 12, 198, 937, MUTED)
    parts.append(t)
    return parts


# ---------------------------------------------------------------- MAC


def mac_plate() -> str:
    W, H = 896, 500
    P = []
    dither = (
        f'<pattern id="mac-dither" width="4" height="4" patternUnits="userSpaceOnUse">'
        f'<rect width="4" height="4" fill="#FFFFFF"/>'
        f'<rect width="2" height="2" fill="#000000"/>'
        f'<rect x="2" y="2" width="2" height="2" fill="#000000"/>'
        f"</pattern>"
    )

    # desktop
    P.append(rect(0, 0, W, H, "url(#mac-dither)"))
    P.append(rect(0, 0, W, 30, "#FFFFFF"))
    P.append(line(0, 30, W, 30, "#000", 1))

    # menu bar: brand + three generic menus, no clock
    for r in range(3):
        for c in range(3):
            P.append(rect(10 + c * 5, 12 + r * 5, 3, 3, "#000"))
    t, _ = text(FUSION, "ClassyGit", 14, 28, 21, "#000")
    P.append(t)
    mx = 126
    for label in ("File", "Edit", "View"):
        t, w = text(FUSION, label, 14, mx, 21, "#000")
        P.append(t)
        mx += w + 22

    # one window, one README
    wx, wy, ww, wh = 140, 84, 616, 386
    P.append(rect(wx + 4, wy + 4, ww, wh, "#000"))
    P.append(rect(wx, wy, ww, wh, "#FFFFFF", "#000", 1))
    P.append(rect(wx, wy, ww, 24, "#FFFFFF", "#000", 1))
    sy = wy + 2
    while sy < wy + 23:
        P.append(rect(wx + 1, sy, ww - 2, 1, "#000"))
        sy += 3
    P.append(rect(wx + 7, wy + 5, 10, 10, "#FFFFFF", "#000", 1))
    P.append(line(wx + 9, wy + 9, wx + 15, wy + 9, "#000", 1))
    lw = FUSION.width("README", 12)
    P.append(rect(wx + ww / 2 - lw / 2 - 7, wy + 3, lw + 14, 18, "#FFFFFF"))
    t, _ = text(FUSION, "README", 12, wx + ww / 2, wy + 17, "#000", anchor="middle")
    P.append(t)
    P.append(rect(wx + ww - 30, wy + 5, 10, 10, "#FFFFFF", "#000", 1))
    P.append(rect(wx + ww - 17, wy + 5, 10, 10, "#FFFFFF", "#000", 1))

    # original 1-bit computer: screen, hello, smile
    mx, my, mw, mh = wx + 50, wy + 50, 220, 280
    P.append(rect(mx, my, mw, mh, "#FFFFFF", "#000", 2))
    P.append(rect(mx + 18, my + 18, mw - 36, 150, "#FFFFFF", "#000", 2))
    t, _ = text(LIB["i"], "hello.", 24, mx + mw / 2, my + 64, "#000", anchor="middle")
    P.append(t)
    P.append(rect(mx + mw / 2 - 36, my + 92, 6, 6, "#000"))
    P.append(rect(mx + mw / 2 + 30, my + 92, 6, 6, "#000"))
    P.append(path(
        f"M{mx + mw / 2 - 32} {my + 118} Q{mx + mw / 2} {my + 140} {mx + mw / 2 + 32} {my + 118}",
        "none", stroke="#000", stroke_width=4,
    ))
    P.append(rect(mx + 34, my + 212, mw - 68, 7, "#FFFFFF", "#000", 1))
    P.append(rect(mx - 10, my + mh, mw + 20, 12, "#FFFFFF", "#000", 2))
    t, _ = text(FUSION, "CLASSYGIT", 8, mx + mw / 2, my + mh + 9, "#000", anchor="middle",
                tracking=0.12)
    P.append(t)

    # generic README copy: no counts, no names, no dates
    tx = wx + 312
    t, _ = text(FUSION, "Hi, I'm", 12, tx, wy + 62, "#000")
    P.append(t)
    t, _ = text(LIB["b"], "@you", 40, tx - 2, wy + 106, "#000", tracking=-0.02)
    P.append(t)
    P.append(line(tx, wy + 122, wx + ww - 40, wy + 122, "#000", 1))
    t, _ = text(FUSION, "YOUR README", 16, tx, wy + 158, "#000")
    P.append(t)
    for i, bar_w in enumerate((250, 210, 160)):
        P.append(rect(tx, wy + 182 + i * 16, bar_w, 3, "#000"))

    # one action
    bx, by = tx, wy + 300
    P.append(rect(bx + 2, by + 2, 84, 26, "#000"))
    P.append(rect(bx, by, 84, 26, "#FFFFFF", "#000", 1))
    t, _ = text(FUSION, "OPEN", 11, bx + 42, by + 17, "#000", anchor="middle")
    P.append(t)

    # one cursor, resting on the window edge
    P.append(mac_cursor(wx + ww - 36, wy + wh - 40, 2))
    return group("".join(P), shape_rendering="crispEdges").replace(
        "<g ", f'<defs>{dither}</defs><g ', 1
    )


# ---------------------------------------------------------------- NES


def nes_plate() -> str:
    W, H = 896, 500
    P = [rect(0, 0, W, H, NES["bg"])]

    # pixel frame
    P.append(rect(8, 8, W - 16, H - 16, "none", NES["line"], 4))
    for cx, cy in ((8, 8), (W - 20, 8), (8, H - 20), (W - 20, H - 20)):
        P.append(rect(cx, cy, 12, 12, NES["green"]))

    # a few stars, no HUD
    for sx, sy in ((70, 84), (160, 62), (250, 102), (636, 70), (752, 96),
                   (824, 146), (118, 148), (700, 152)):
        P.append(rect(sx, sy, 4, 4, NES["mist"]))

    # stepped 8-bit terrain
    def ridge(base_y, x0, x1, step, height, color, offset=0):
        o = []
        x = x0
        while x < x1:
            h = height * (0.45 + 0.55 * abs(math.sin((x + offset) * 0.018)))
            h = int(h / step) * step
            o.append(rect(x, base_y - h, step + 1, h, color))
            x += step
        return "".join(o)

    P.append(ridge(452, 16, 880, 16, 150, NES["panel"]))
    P.append(ridge(452, 16, 880, 24, 96, NES["deep"]))

    # cartridge: one object, larger and quieter
    cx, cy, cw, ch = 278, 56, 340, 380
    P.append(rect(cx + 10, cy + 10, cw, ch, "#000000"))
    P.append(rect(cx, cy, cw, ch, NES["body"], NES["dim"], 3))
    P.append(rect(cx + 10, cy + 10, cw - 20, 24, NES["bg"]))
    for i in range(7):
        P.append(rect(cx + 24 + i * 44, cy + 12, 18, 20, NES["line"]))

    # label art
    lx, ly, lw, lh = cx + 24, cy + 44, cw - 48, 286
    P.append(rect(lx, ly, lw, lh, NES["night"], NES["green"], 4))
    P.append(rect(lx + 4, ly + 4, lw - 8, 152, "#0F140F"))

    for sx, sy in ((28, 24), (58, 62), (lw - 44, 32), (lw - 76, 74), (24, 96), (lw - 30, 112)):
        P.append(rect(lx + sx, ly + sy, 4, 4, NES["mist"]))

    sunx, suny, r = lx + lw / 2, ly + 68, 26
    for row in range(-3, 4):
        ww = int(math.sqrt(max(0, r * r - (row * 7) ** 2)))
        ww = int(ww / 7) * 7
        if ww:
            P.append(rect(sunx - ww, suny + row * 7, ww * 2, 7, NES["green"]))

    for mx0 in (4, lw - 96):
        P.append(rect(lx + mx0, ly + 132, 92, 24, NES["deep"]))
        P.append(rect(lx + mx0 + 10, ly + 118, 72, 14, NES["deep"]))
        P.append(rect(lx + mx0 + 26, ly + 104, 44, 14, NES["deep"]))
        P.append(rect(lx + mx0 + 40, ly + 96, 20, 8, NES["deep"]))

    base = ly + 214
    t, _ = text(PS2P, "CLASSY", 26, lx + lw / 2, base, NES["green"], anchor="middle")
    P.append(t)
    t, _ = text(PS2P, "GIT", 26, lx + lw / 2, base + 34, NES["paper"], anchor="middle")
    P.append(t)
    t, _ = text(PS2P, "PASS", 9, lx + lw / 2, base + 58, NES["mist"], anchor="middle",
                tracking=0.28)
    P.append(t)

    for ax, ay, sx, sy in ((lx + 8, ly + 8, 1, 1), (lx + lw - 8, ly + 8, -1, 1),
                           (lx + 8, ly + lh - 8, 1, -1), (lx + lw - 8, ly + lh - 8, -1, -1)):
        P.append(line(ax, ay, ax + sx * 12, ay, NES["mist"], 2))
        P.append(line(ax, ay, ax, ay + sy * 12, NES["mist"], 2))

    # cartridge grooves, no shell copy
    for i in range(3):
        P.append(rect(cx + 34, cy + 342 + i * 12, cw - 68, 4, NES["line"]))

    # a single prompt
    P.append(rect(8, 468, W - 16, 24, "#15181B"))
    P.append(line(8, 468, W - 8, 468, NES["line"], 2))
    P.append(poly([(368, 485), (368, 475), (378, 480)], NES["green"]))
    t, _ = text(PS2P, "PRESS START", 10, 390, 484, NES["green"], tracking=0.10)
    P.append(t)

    return group("".join(P), shape_rendering="crispEdges")


# ---------------------------------------------------------------- WIN98


def bevel(x, y, w, h, face=W98["face"], light=W98["light"], dark=W98["dark"], raised=True):
    """Classic 2px Win98 bevel around a filled box."""
    tl = light if raised else dark
    br = dark if raised else light
    o = [rect(x, y, w, h, face)]
    o.append(rect(x, y, w, 2, tl))
    o.append(rect(x, y, 2, h, tl))
    o.append(rect(x, y + h - 2, w, 2, br))
    o.append(rect(x + w - 2, y, 2, h, br))
    return "".join(o)


def sunken(x, y, w, h, face=W98["light"]):
    o = [rect(x, y, w, h, face)]
    o.append(rect(x, y, w, 1, W98["mid"]))
    o.append(rect(x, y, 1, h, W98["mid"]))
    o.append(rect(x, y + h - 1, w, 1, W98["light"]))
    o.append(rect(x + w - 1, y, 1, h, W98["light"]))
    return "".join(o)


def win98_plate() -> str:
    W, H = 896, 500
    P = [rect(0, 0, W, H, W98["desk"])]

    # one desktop icon
    def icon_doc(x, y):
        o = [rect(x + 3, y, 26, 32, "#FFFFFF", "#000", 1)]
        o.append(rect(x + 6, y + 3, 20, 5, W98["navy"]))
        for i in range(4):
            o.append(rect(x + 6, y + 12 + i * 4, 18, 1, "#000"))
        return "".join(o)

    P.append(icon_doc(44, 40))
    t, _ = text(LIB["r"], "My Homepage", 12, 62, 92, "#000000", anchor="middle")
    P.append(t.replace('fill="#000000"', 'fill="#000000" opacity="0.55" transform="translate(1,1)"'))
    P.append(t.replace('fill="#000000"', 'fill="#FFFFFF"'))

    # one properties window, two fields
    wx, wy, ww, wh = 178, 80, 540, 290
    P.append(rect(wx + 7, wy + 7, ww, wh, "#004F4F"))
    P.append(bevel(wx, wy, ww, wh, W98["face"]))
    P.append(rect(wx + 2, wy + 2, ww - 4, 24, "url(#w98-title)"))
    t, _ = text(LIB["b"], "ClassyGit Properties", 13, wx + 8, wy + 18, "#FFFFFF")
    P.append(t)
    for i, glyph in enumerate(("X", "[]", "_")):
        bx = wx + ww - 24 - i * 20
        P.append(bevel(bx, wy + 4, 17, 15))
        if glyph == "_":
            P.append(rect(bx + 4, wy + 12, 8, 2, "#000"))
        elif glyph == "[]":
            P.append(rect(bx + 4, wy + 7, 9, 8, "none", "#000", 1))
            P.append(rect(bx + 4, wy + 7, 9, 2, "#000"))
        else:
            P.append(line(bx + 4, wy + 8, bx + 12, wy + 15, "#000", 2))
            P.append(line(bx + 12, wy + 8, bx + 4, wy + 15, "#000", 2))

    # two tabs only
    tabs = [("General", 92), ("Theme", 78)]
    tx = wx + 8
    for i, (label, tw) in enumerate(tabs):
        ty = wy + 26
        active = i == 1
        P.append(rect(tx, ty, tw, 26, W98["face"]))
        P.append(rect(tx, ty, tw, 2, W98["light"]))
        P.append(rect(tx, ty, 2, 26, W98["light"]))
        P.append(rect(tx + tw - 2, ty, 2, 26, W98["dark"] if not active else W98["mid"]))
        if not active:
            P.append(rect(tx, ty + 24, tw, 2, W98["dark"]))
        t, _ = text(LIB["r"], label, 12, tx + tw / 2, ty + 18, "#000", anchor="middle")
        P.append(t)
        tx += tw + 3
    P.append(rect(wx + 8, wy + 52, 92, 2, W98["mid"]))
    P.append(rect(wx + 181, wy + 52, ww - 189, 2, W98["mid"]))

    bx, by = wx + 8, wy + 54
    P.append(rect(bx, by, ww - 16, wh - 62, W98["face"]))

    # app tile
    ax, ay = bx + 20, by + 20
    P.append(bevel(ax, ay, 96, 96, W98["navy"], "#4A4AB8", "#000040"))
    P.append(rect(ax + 8, ay + 8, 80, 80, W98["navy"], "#000040", 1))
    t, _ = text(FUSION, "CG", 38, ax + 48, ay + 58, "#FFFFFF", anchor="middle")
    P.append(t)
    P.append(rect(ax + 8, ay + 66, 80, 3, W98["desk"]))
    t, _ = text(LIB["b"], "ClassyGit", 12, ax + 48, ay + 116, "#000", anchor="middle")
    P.append(t)

    # divider + two static fields
    P.append(line(bx + 168, by + 18, bx + 168, by + 190, W98["mid"], 1))
    fx = bx + 186
    fields = [("System", "ClassyGit"), ("Theme", "win98")]
    for i, (k, v) in enumerate(fields):
        fy = by + 36 + i * 42
        t, _ = text(LIB["r"], k + ":", 11, fx, fy + 14, "#000")
        P.append(t)
        P.append(sunken(fx + 72, fy, 250, 22))
        t, _ = text(LIB["r"], v, 11, fx + 80, fy + 15, "#000")
        P.append(t)

    # two actions
    for i, label in enumerate(("OK", "Cancel")):
        bw, bh = 72, 23
        bxx = wx + ww - 18 - 152 + i * 80
        byy = wy + wh - 38
        P.append(bevel(bxx, byy, bw, bh))
        if label == "OK":
            P.append(rect(bxx - 1, byy - 1, bw + 2, bh + 2, "none", "#000", 1))
        t, _ = text(LIB["r"], label, 11, bxx + bw / 2, byy + 15, "#000", anchor="middle")
        P.append(t)

    # one cursor on the empty desktop
    P.append(w98_arrow(704, 412, 1.5))

    # taskbar: start button + one window, no clock
    ty = H - 40
    P.append(rect(0, ty, W, 40, W98["face"]))
    P.append(rect(0, ty, W, 2, W98["light"]))
    P.append(rect(0, ty + 2, W, 1, "#DFDFDF"))
    P.append(bevel(6, ty + 6, 92, 29, W98["face"]))
    P.append(rect(12, ty + 13, 16, 16, W98["navy"]))
    t, _ = text(FUSION, "CG", 9, 20, ty + 25, "#FFFFFF", anchor="middle")
    P.append(t)
    t, _ = text(LIB["b"], "CLASSY", 11, 34, ty + 26, "#000")
    P.append(t)
    P.append(bevel(104, ty + 6, 160, 29, W98["face"], raised=False))
    P.append(rect(112, ty + 14, 12, 12, W98["navy"]))
    t, _ = text(FUSION, "C", 8, 118, ty + 24, "#FFFFFF", anchor="middle")
    P.append(t)
    t, _ = text(LIB["r"], "ClassyGit", 11, 132, ty + 26, "#000")
    P.append(t)

    grad = (
        '<linearGradient id="w98-title" x1="0" y1="0" x2="1" y2="0">'
        f'<stop offset="0" stop-color="{W98["navy"]}"/>'
        f'<stop offset="1" stop-color="{W98["blue"]}"/>'
        "</linearGradient>"
    )
    return f"<defs>{grad}</defs>" + group("".join(P), shape_rendering="crispEdges")


# ---------------------------------------------------------------- TUI


def tui_box(x, y, w, h, title=None):
    o = []
    o.append(rect(x, y, w, h, "none", TUI["white"], 2))
    o.append(rect(x + 5, y + 5, w - 10, h - 10, "none", TUI["white"], 1))
    if title:
        tw = FUSION.width(title, 11) + 14
        o.append(rect(x + 12, y - 9, tw, 18, TUI["gray"]))
        t, _ = text(FUSION, title, 11, x + 19, y + 4, "#000")
        o.append(t)
    return "".join(o)


def tui_plate() -> str:
    W, H = 896, 500
    P = [rect(0, 0, W, H, TUI["bg"])]

    # screen frame
    P.append(rect(10, 10, W - 20, H - 20, "none", TUI["white"], 2))
    P.append(rect(17, 17, W - 34, H - 34, "none", TUI["white"], 1))

    # title bar
    P.append(rect(20, 20, W - 40, 24, TUI["gray"]))
    t, _ = text(FUSION, "CLASSYGIT.EXE", 14, 28, 37, "#000")
    P.append(t)
    P.append(rect(W - 112, 32, 10, 2, "#000"))
    P.append(rect(W - 88, 27, 11, 9, "none", "#000", 2))
    P.append(line(W - 62, 27, W - 54, 35, "#000", 2))
    P.append(line(W - 54, 27, W - 62, 35, "#000", 2))

    # three menus, not five
    mx = 28
    for label, active in (("ClassyGit", True), ("Theme", False), ("Help", False)):
        tw = FUSION.width(label, 12) + 12
        if active:
            P.append(rect(mx, 50, tw, 18, TUI["gray"]))
        t, _ = text(FUSION, label, 12, mx + 6, 64, "#000" if active else TUI["white"])
        P.append(t)
        mx += tw + 16

    # system info: three fixed facts, no counts
    P.append(tui_box(28, 88, 376, 170, "SYSTEM INFO"))
    rows = [("THEME", "tui"), ("MODE", "TEXT"), ("SOURCE", "GITHUB")]
    for i, (k, v) in enumerate(rows):
        ry = 118 + i * 34
        t, _ = text(FUSION, k, 12, 44, ry, TUI["yellow"])
        P.append(t)
        P.append(leader(160, 330, ry - 2, TUI["gray"], 2, 6))
        t, _ = text(FUSION, v, 14, 388, ry, TUI["white"], anchor="end")
        P.append(t)

    # one prompt, nothing else
    P.append(tui_box(28, 286, 376, 120))
    t, _ = text(FUSION, r"C:\CLASSYGIT>", 14, 44, 350, TUI["white"])
    P.append(t)
    P.append(rect(174, 336, 10, 16, TUI["green"]))

    # wordmark + one line
    bm, _ = bitmap("CLASSY", 10, 444, 220, TUI["yellow"])
    P.append(bm)
    bm, _ = bitmap("GIT", 10, 444, 300, TUI["yellow"])
    P.append(bm)
    P.append(rect(444, 322, 388, 2, TUI["white"]))
    t, _ = text(FUSION, "README IS THE HOMEPAGE.", 14, 444, 352, TUI["cyan"])
    P.append(t)

    # status bar: two hints and a slug
    P.append(rect(20, H - 42, W - 40, 22, TUI["gray"]))
    t, _ = text(FUSION, "F1 HELP   F10 MENU", 10, 28, H - 26, "#000")
    P.append(t)
    t, _ = text(FUSION, "TUI", 10, W - 28, H - 26, "#000", anchor="end")
    P.append(t)

    return group("".join(P), shape_rendering="crispEdges")


# ---------------------------------------------------------------- assembly


def make_card(name: str, index: int, overline: str, title: str, subline: str,
              plate: str, accent: str) -> str:
    parts = chrome(accent, index, name.upper() if name != "win98" else "WIN98", overline, subline)
    # headline: switch to the theme's display face
    y1, y2 = 208, 264
    line1, line2 = title.split("\n")
    if name == "nes":
        t, _ = text(PS2P, line1, 36, 64, y1, INK)
        parts.append(t)
        t, _ = text(PS2P, line2, 36, 64, y2, INK)
        parts.append(t)
    elif name == "tui":
        t, w = bitmap(line1, 5.5, 64, y1, INK)
        parts.append(t)
        t, _ = bitmap(line2, 5.5, 64, y2, INK)
        parts.append(t)
    else:
        t, _ = text(LIB["b"], line1, 56, 64, y1, INK, tracking=-0.02)
        parts.append(t)
        t, _ = text(LIB["b"], line2, 56, 64, y2, INK, tracking=-0.02)
        parts.append(t)

    parts.append(group(plate, transform="translate(64,320)"))
    # redraw the plate edge so every card shares the same keyline weight
    parts.append(rect(64, 320, 896, 500, "none", INK, 1.5))

    svg = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        f'<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" '
        f'viewBox="0 0 1024 1024" role="img" aria-labelledby="t d">'
        f"<title id=\"t\">ClassyGit Pass - {name.upper()} edition</title>"
        f"<desc id=\"d\">A 1024x1024 collectible card for the {name} theme of ClassyGit. "
        f"All type is outlined; no external assets.</desc>"
        + "".join(parts)
        + "</svg>"
    )
    return svg


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    cards = [
        ("mac", 1, "SYSTEM 6 / 1-BIT / 1988", "ONE BIT IS\nENOUGH.",
         "README, rendered in one bit.", mac_plate(), MAC["accent"]),
        ("nes", 2, "8-BIT / CARTRIDGE / 1985", "YOUR GITHUB.\nPRESS START.",
         "README, rendered as a cartridge.", nes_plate(), NES["green"]),
        ("win98", 3, "32-BIT / TRUE COLOR / 1998", "DOUBLE-CLICK\nYOUR GITHUB.",
         "README, rendered as a window.", win98_plate(), W98["navy"]),
        ("tui", 4, "TEXT MODE / 80x25 / 1987", "README AT\nTHE PROMPT.",
         "README, rendered at the prompt.", tui_plate(), TUI["yellow"]),
    ]
    for name, idx, overline, title, subline, plate, accent in cards:
        svg = make_card(name, idx, overline, title, subline, plate, accent)
        dst = os.path.join(OUT_DIR, name + ".svg")
        with open(dst, "w", encoding="utf-8") as fh:
            fh.write(svg)
        print(f"{dst}  {len(svg) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
