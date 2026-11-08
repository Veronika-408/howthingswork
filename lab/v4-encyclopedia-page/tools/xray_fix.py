#!/usr/bin/env python3
"""The see-through raincoat of the x-ray woman was painted over magenta, so where nothing of her body is behind it
the coat shows pink. Cut her out, turn those pink pixels into a thin translucent yellow film, and drop the
neighbours' sleeves at the edges.   /usr/bin/python3 tools/xray_fix.py <src.png> <name>"""
import sys
import numpy as np
from scipy import ndimage as ndi
sys.path.insert(0, __file__.rsplit("/", 1)[0])
import cut as C

PROTECT = [(0, 0, 1024, 268), (392, 285, 662, 535), (250, 755, 340, 905), (688, 755, 795, 885)]
FILM, A_FILM = np.array([248, 224, 118], np.float32), 0.38


def fix(rgb, a, fg):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    # how pink: blue close to (or above) green in a bright pixel means magenta behind the film
    pinkish = np.clip((b - g + 58) / 30, 0, 1) * np.clip((r - 190) / 20, 0, 1) * np.clip((b - 85) / 20, 0, 1) * (a > 0.5)
    for x0, y0, x1, y1 in PROTECT:           # naturally pink: the brain, face, lungs, hands
        pinkish[y0:y1, x0:x1] = 0
    pink = ndi.gaussian_filter(pinkish.astype(np.float32), 1.0)
    fg = fg * (1 - pink[..., None]) + FILM * pink[..., None]
    a = a * (1 - pink) + A_FILM * pink * np.minimum(a * 2, 1)
    # the hair: curls with magenta between them; pull the leftover pink out of their edges, and thin the pinkest
    hd = fg[:268]
    sp = np.clip(np.minimum(hd[..., 0], hd[..., 2]) - hd[..., 1] + 5, 0, None)
    sp[40:268, 430:610] *= (a[40:268, 430:610] < 0.97)     # the brain and the face are pink on purpose
    hd[..., 0] -= sp; hd[..., 2] -= sp
    a[:268] *= 1 - np.clip(sp / 60, 0, 1) * 0.7
    a[:, :255] = 0
    a[:, 770:] = 0
    blue = (fg[..., 2] > fg[..., 0] + 12)
    blue[:, :735] = False
    a[blue] = 0                                    # the boy's blue sleeve at her hand
    return a, fg


if __name__ == "__main__":
    C.cut(sys.argv[1], sys.argv[2], shadow="none", fix=fix)
