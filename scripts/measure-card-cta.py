#!/usr/bin/env python3
"""Measures the compact customize CTA beside the price, from the screenshot.

`uiautomator dump` is unusable here: Maestro holds the device accessibility
service and the dump is SIGKILLed, so the view tree cannot be read. The CTA has
a flat fill (`colors.mustard`), so it can be found exactly instead of eyeballed.

Isolating the chip from the price — same colour, same row, 60dp away — took four
wrong turns that are worth recording, because each looked correct until it was
measured against real pixels:
  - "one run per row, two of them": a price line also gives one run per row.
  - "one long run on every row of the band": false *for the chip itself* — the
    centred label splits its fill on every row it crosses.
  - "long solid run per column": the same hole in the other axis; only the ~15px
    slivers beside the label survive, too narrow to identify the chip.
  - "cluster rows by run origin": a card row holds two chips, so a row's first
    run starts at the left chip and its last run ends at the right chip; rows
    from different elements get mixed.
What holds is the plain definition of a filled control: a rectangle of solid
colour. Detect it directly — take a row whose mustard run is chip-wide, extend
up and down while that exact span stays solid, and keep the blocks that survive
at chip size. Text can never satisfy that, because glyph gaps change the run
edge from row to row; the hero CTA is excluded by the width window.

Checks, per card:
  - compact filled chip, the height and width the style asks for
  - price on the same row, to the left of the chip
  - right-aligned: only the 8dp footer gutter between chip and card edge
  - the label is centred inside the chip

Usage: measure-card-cta.py <screenshot.png> <density_px_per_dp> [ctaHex]
"""
import sys

from PIL import Image

TOL = 8
MIN_WIDTH_DP = 60.0
MAX_WIDTH_DP = 120.0   # the hero CTA measures ~149dp and is excluded
MIN_HEIGHT_DP = 20.0
MAX_HEIGHT_DP = 42.0
EDGE_TOL = 20          # px the run edge may move and still be the same rectangle;
                       # the chip's 6dp corner radius insets the first and last
                       # rows by ~15px, so a tighter bound finds nothing
CANVAS = (0x0D, 0x0E, 0x11)
ON_MUSTARD = (0x24, 0x17, 0x00)
GAP_MAX = 60          # rows the label may interrupt the chip's fill. Measured,
                      # not guessed: the 11px label breaks the fill for 36 rows.
                      # Safe because the next card starts ~330px lower, so a
                      # 23dp bridge cannot jump to another element.


def close(px, ref, tol=TOL):
    return all(abs(px[i] - ref[i]) <= tol for i in range(3))


def runs_on_row(px, y, w, target, min_len=1):
    out = []
    start = None
    for x in range(w):
        hit = close(px[x, y], target)
        if hit and start is None:
            start = x
        elif not hit and start is not None:
            out.append((start, x - 1))
            start = None
    if start is not None:
        out.append((start, w - 1))
    return [r for r in out if r[1] - r[0] + 1 >= min_len]


def main():
    path = sys.argv[1]
    density = float(sys.argv[2])
    cta_hex = sys.argv[3] if len(sys.argv) > 3 else "feb300"
    cta = tuple(int(cta_hex[i : i + 2], 16) for i in (0, 2, 4))
    lo = int(MIN_WIDTH_DP * density)
    hi = int(MAX_WIDTH_DP * density)

    img = Image.open(path).convert("RGB")
    w, h = img.size
    px = img.load()
    print(f"image {w}x{h}, density {density}px/dp, CTA fill #{cta_hex}, "
          f"chip window {lo}-{hi}px wide, "
          f"{MIN_HEIGHT_DP * density:.0f}-{MAX_HEIGHT_DP * density:.0f}px tall, "
          f"EDGE_TOL={EDGE_TOL} GAP_MAX={GAP_MAX}")

    # One pixel pass, cached per row: the block search below queries rows
    # repeatedly, and rescanning the image per query turns this into minutes.
    row_runs = []
    for y in range(h):
        row_runs.append(runs_on_row(px, y, w, cta))

    seeds = []
    for y, runs in enumerate(row_runs):
        for a, b in runs:
            if lo <= b - a + 1 <= hi:
                seeds.append((y, a, b))

    # A filled control is a rectangle of solid colour: rows inside it carry a
    # run that starts at the chip's left edge and spans most of its width. Rows
    # crossing the label do not — the glyphs cut the fill into short fragments —
    # so the row set is bridged across them. The price cannot join: its run is
    # just as long but starts ~200px further left.
    def chip_rows(a, b, tol, frac, gap):
        width = b - a + 1
        y = 0
        rows = []
        while y < h:
            match = [r for r in row_runs[y]
                     if abs(r[0] - a) <= tol and r[1] - r[0] + 1 >= width * frac]
            if match:
                rows.append(y)
                y += 1
            elif rows and y - rows[-1] > gap:
                break
            else:
                y += 1
        return rows

    blocks = set()
    for y, a, b in seeds:
        rows = chip_rows(a, b, EDGE_TOL, 0.6, GAP_MAX)
        if rows:
            blocks.add((rows[0], rows[-1], a, b))

    # The rounded corners make every row a slightly different span, so the same
    # chip produces one block per row edge. Keep the widest span per block.
    widest = {}
    for (top, bottom, a, b) in blocks:
        key = (top, bottom)
        if key not in widest or (b - a) > (widest[key][1] - widest[key][0]):
            widest[key] = (a, b)

    chips = []
    for (top, bottom), (a, b) in sorted(widest.items()):
        bh = bottom - top + 1
        keep = MIN_HEIGHT_DP * density <= bh <= MAX_HEIGHT_DP * density
        print(f"  block x=[{a},{b}] y=[{top},{bottom}] "
              f"{(b - a + 1) / density:.1f}x{bh / density:.1f}dp "
              f"{'KEEP' if keep else 'drop'}")
        if keep:
            chips.append((top, bottom, a, b))

    print(f"solid mustard rectangles at chip size: {len(chips)}")
    for top, bottom, a, b in chips:
        print(f"  x=[{a},{b}] y=[{top},{bottom}] "
              f"{(b - a + 1) / density:.1f}x{(bottom - top + 1) / density:.1f}dp")
    if len(chips) < 2:
        print("FAIL: fewer than two chips — not a two-column grid")
        return 1

    # Pair the two chips of one card row: side by side and vertically overlapping.
    # They are NOT necessarily on the same baseline — a product name that wraps to
    # two lines pushes its own footer lower while the sibling's stays up, because
    # each card lays its own content out from the top.
    chips.sort(key=lambda c: c[2])
    pairs = []
    for i, c1 in enumerate(chips):
        for c2 in chips[i + 1:]:
            if c2[2] <= c1[3]:
                continue
            overlap = min(c1[1], c2[1]) - max(c1[0], c2[0]) + 1
            shorter = min(c1[1] - c1[0] + 1, c2[1] - c2[0] + 1)
            if overlap >= max(10, shorter * 0.3):
                pairs.append((c1, c2))
                break
    if not pairs:
        print("FAIL: no side-by-side chip pair with vertical overlap")
        return 1

    ok = True
    for n, (c1, c2) in enumerate(pairs[:2]):
        print(f"\nchip row {n}: left y=[{c1[0]},{c1[1]}] right y=[{c2[0]},{c2[1]}] "
              f"(baselines differ by {abs((c1[0] + c1[1]) - (c2[0] + c2[1])) // 2}px "
              f"because the product names wrap differently)")
        for k, (y1, y2, x1, x2) in enumerate([c1, c2]):
            dark = [
                (x, yy)
                for yy in range(y1, y2 + 1)
                for x in range(x1, x2 + 1)
                if close(px[x, yy], ON_MUSTARD, 26)
            ]
            if dark:
                tx1 = min(t[0] for t in dark)
                tx2 = max(t[0] for t in dark)
                lg, rg = tx1 - x1, x2 - tx2
                centred = abs(lg - rg) <= 4
                print(f"  chip{k} x=[{x1},{x2}] "
                      f"{(x2 - x1 + 1) / density:.1f}x{(y2 - y1 + 1) / density:.1f}dp | "
                      f"label leftGap={lg}px rightGap={rg}px "
                      f"-> {'centred' if centred else 'NOT centred'}")
                if not centred:
                    ok = False
            else:
                print(f"  chip{k} x=[{x1},{x2}] | no label pixels found")
                ok = False

            mid = (y1 + y2) // 2
            edge = None
            for x in range(x2 + 1, w):
                if close(px[x, mid], CANVAS):
                    edge = x - x2 - 1
                    break
            if edge is None:
                print("    !! never reached the canvas to the right")
                ok = False
            else:
                good = 18 <= edge <= 32
                print(f"    right edge -> canvas: {edge}px = {edge / density:.1f}dp "
                      f"(8dp gutter + 1dp border) -> {'ok' if good else 'NOT flush'}")
                if not good:
                    ok = False

            left = [x for x in range(0, x1) if close(px[x, mid], cta)]
            print(f"    price pixels left of the chip on the same row: "
                  f"{'yes' if left else 'NO'} ({len(left)}px)")
            if not left:
                ok = False

        if abs((c2[3] - c2[2]) - (c1[3] - c1[2])) <= 12:
            print(f"  both chips are the same width "
                  f"({(c1[3] - c1[2] + 1) / density:.1f}dp / "
                  f"{(c2[3] - c2[2] + 1) / density:.1f}dp) — label-stable")
        else:
            print(f"  note: chip widths differ by "
                  f"{abs((c2[3] - c2[2]) - (c1[3] - c1[2]))}px — label-dependent")

    print("\nRESULT:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())