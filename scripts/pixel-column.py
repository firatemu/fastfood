#!/usr/bin/env python3
"""Prints the colour transitions down a column of the screenshot.

Used to find out what is actually painted where a style says something should
be, instead of trusting a colour search that may be matching the wrong element.
"""
import sys

from PIL import Image

path = sys.argv[1]
x = int(sys.argv[2])
y0 = int(sys.argv[3])
y1 = int(sys.argv[4])

img = Image.open(path).convert("RGB")
px = img.load()
prev = None
for y in range(y0, min(y1, img.size[1])):
    c = px[x, y]
    if c != prev:
        print(f"y={y:5d}  #{c[0]:02x}{c[1]:02x}{c[2]:02x}")
        prev = c