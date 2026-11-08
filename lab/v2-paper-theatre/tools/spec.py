"""The paper theatre, space by space: which painted layers it is stacked from (back to front), how deep each sits
(d: 0 is the main layer, negative behind it, positive in front), where children are drawn inside it, and the
outlines of its parts. tools/build.py turns this into art/layers/*.webp and data.js."""

VARIANT = {"id": "v2-paper-theatre", "name": "Paper theatre",
           "approach": "Every space is a little tunnel book: 4-7 painted cut-paper layers stacked back to front with paper edges, shadows and parallax; children are drawn inside their parents from their own layers."}


def hex2rgb(h):
    h = h.lstrip("#"); return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def R(x, y, w, h):
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]


def circle(cx, cy, r, n=28):
    import math
    return [[round(cx + r * math.cos(2 * math.pi * i / n), 1), round(cy + r * math.sin(2 * math.pi * i / n), 1)] for i in range(n)]


FRAME = {"kind": "frame", "d": 1.25}

# ---------------------------------------------------------------- the jumbo jet
PLANE_LENS = {"cx": 205, "cy": 175, "r": 92, "ax": 252, "ay": 366, "ar": 26}
SPACES = {}
SPACES["plane"] = {
    "parent": "city", "w": 1672, "h": 941, "paper": "#f3ede1",
    "spot": None,                                     # filled in below, once the city is laid out
    "layers": [
        {"src": "plane-back.png", "mode": "full", "role": "back", "d": -1, "id": "back"},
        {"src": "plane-farwing.png", "d": -.45, "id": "farwing"},
        {"src": "plane-fuselage.png", "d": 0, "id": "fuselage"},
        {"kind": "child", "child": "pilots", "d": 0, "inset": PLANE_LENS},
        {"src": "plane-nearwing.png", "d": .35, "id": "nearwing"},
        {"src": "plane-ground.png", "d": .7, "id": "ground", "min_area": 120, "hole_area": 6000},
        FRAME,
    ],
    "parts": [
        {"id": "cockpit", "child": "pilots", "layer": "fuselage",
         "polys": [[[128, 372], [160, 350], [200, 334], [302, 328], [306, 404], [200, 406], [140, 396]], circle(PLANE_LENS["cx"], PLANE_LENS["cy"], PLANE_LENS["r"] + 6)],
         "plus": [PLANE_LENS["cx"], PLANE_LENS["cy"] + PLANE_LENS["r"] + 4]},
        {"id": "cabin", "layer": "fuselage",
         "polys": [[[308, 326], [600, 322], [626, 346], [626, 402], [308, 402]], [[150, 408], [1440, 408], [1440, 504], [150, 504]]]},
        {"id": "hold", "layer": "fuselage", "polys": [[[330, 512], [1320, 512], [1300, 572], [560, 590], [330, 590]]]},
        {"id": "tail", "layer": "fuselage",
         "polys": [[[1290, 358], [1560, 112], [1636, 116], [1600, 360], [1604, 402], [1662, 428], [1662, 462], [1440, 462], [1440, 368]]]},
        {"id": "gear", "layer": "fuselage", "polys": [R(172, 600, 66, 106), [[575, 628], [940, 628], [940, 726], [575, 726]]]},
        {"id": "wing", "layer": "nearwing", "from": "nearwing", "minus": [R(730, 700, 530, 160)], "top": 1},
        {"id": "engine", "layer": "nearwing", "from": "nearwing", "within": [R(730, 700, 530, 160)], "top": 2},
    ],
}

# ---------------------------------------------------------------- the flight deck (and the cockpit you fly from)
DRIVE_CROP = (0, 70, 1100, 830)                       # the captain's half of the flight deck: x, y, w, h in pilots coords
SPACES["pilots"] = {
    "parent": "plane", "w": 1672, "h": 941, "paper": "#f1eadc",
    "spot": {"axis": [[PLANE_LENS["cx"] - 60, PLANE_LENS["cy"]], [PLANE_LENS["cx"] + 60, PLANE_LENS["cy"]]],
             "plateAxis": [[836 - 60 / .152, 470], [836 + 60 / .152, 470]]},
    "layers": [
        {"src": "pilots-view.png", "mode": "full", "role": "back", "d": -1, "id": "view"},
        {"src": "pilots-shell.png", "d": 0, "id": "shell", "margin": 0, "shadow": [4, 7, 8, .3]},
        # edit test 2: the captain's coffee cup, painted by one edit of the shell, then cut out as its own piece and
        # slid to the ledge left of the captain's head (where the edit put it, the captain's head hid it)
        {"src": "pilots-shell-cup.png", "name": "pilots-cup", "diffFrom": "pilots-shell.png", "within": [R(280, 290, 100, 135)],
         "move": [-207, 25], "d": .05, "id": "cup", "margin": 2, "min_area": 40, "shadow": [3, 5, 4, .3]},
        {"src": "pilots-controls.png", "d": .12, "id": "controls", "min_area": 300},
        {"kind": "child", "child": "drive", "d": .12, "anchor": [463, 600]},
        {"src": "pilots-crew.png", "d": .42, "id": "crew"},
        FRAME,
    ],
    "parts": [
        {"id": "captain", "layer": "crew", "from": "crew", "within": [R(0, 250, 836, 691)], "top": 1},
        {"id": "firstofficer", "layer": "crew", "from": "crew", "within": [R(836, 250, 836, 691)], "top": 1},
        {"id": "yoke", "child": "drive", "layer": "controls", "polys": [R(372, 535, 184, 128), R(1105, 530, 190, 132)], "plus": [463, 668]},
        {"id": "throttle", "layer": "controls", "polys": [R(728, 612, 222, 150)]},
        {"id": "screens", "layer": "shell", "polys": [R(418, 452, 838, 120)]},
        {"id": "windows", "layer": "shell", "polys": [[[80, 168], [700, 168], [770, 205], [780, 362], [560, 368], [300, 400], [120, 420], [70, 300]],
                                                       [[880, 205], [950, 168], [1600, 168], [1600, 300], [1550, 420], [1370, 400], [1110, 368], [890, 362]]]},
        {"id": "overhead", "layer": "shell", "polys": [[[380, 0], [1290, 0], [1240, 150], [1000, 190], [670, 190], [430, 150]]]},
        {"id": "pedals", "layer": "shell", "polys": [R(552, 630, 135, 135), R(995, 630, 125, 135)]},
    ],
}

# ---------------------------------------------------------------- a person at the bus stop
HUMAN_LENS = {"cx": 1515, "cy": 560, "r": 118, "ax": 1043, "ay": 505, "ar": 22}
SPACES["human"] = {
    "parent": "city", "w": 1672, "h": 941, "paper": "#f5eedf",
    "spot": None,
    "layers": [
        {"src": "human-back.png", "mode": "full", "role": "back", "d": -1, "id": "back"},
        {"src": "human-family.png", "d": -.3, "id": "family"},
        {"src": "human-body.png", "d": 0, "id": "body", "vis": "own"},
        {"src": "human-clothed.png", "d": 0, "id": "clothed", "vis": "mini"},
        {"kind": "child", "child": "skin", "d": .45, "inset": HUMAN_LENS, "id": "skinlens"},
        FRAME,
    ],
    "parts": [
        {"id": "brain", "layer": "body", "polys": [[[777, 18], [815, 10], [857, 20], [860, 50], [818, 62], [778, 52]]]},
        {"id": "lungs", "layer": "body", "polys": [[[745, 195], [800, 185], [850, 190], [905, 200], [912, 300], [870, 315], [790, 315], [742, 300]]]},
        {"id": "heart", "layer": "body", "polys": [[[805, 215], [850, 210], [862, 245], [835, 282], [805, 258]]]},
        {"id": "stomach", "layer": "body", "polys": [[[830, 300], [880, 298], [895, 330], [870, 356], [832, 350]]]},
        {"id": "bones", "layer": "body", "polys": [[[900, 185], [935, 185], [1000, 330], [1062, 470], [1066, 552], [1020, 552], [985, 470], [940, 350], [905, 260]],
                                                  [[843, 450], [906, 450], [916, 600], [910, 842], [860, 842], [850, 600]]]},
        {"id": "muscles", "layer": "body", "polys": [[[716, 185], [680, 190], [640, 300], [600, 420], [563, 470], [573, 548], [615, 522], [650, 440], [690, 350], [722, 270]],
                                                    [[724, 440], [806, 440], [811, 600], [801, 842], [740, 842], [724, 600]]]},
        {"id": "skin", "child": "skin", "layer": "skinlens", "polys": [circle(HUMAN_LENS["cx"], HUMAN_LENS["cy"], HUMAN_LENS["r"] + 6)],
         "plus": [HUMAN_LENS["cx"], HUMAN_LENS["cy"] + HUMAN_LENS["r"] + 6]},
    ],
}

# ---------------------------------------------------------------- you fly: the captain's half of the same flight deck
ox, oy, dw, dh = DRIVE_CROP
SPACES["drive"] = {
    "parent": "pilots", "kind": "drive", "w": dw, "h": dh, "paper": "#ebe4d5",
    "spot": {"axis": [[ox, oy], [ox + 100, oy]], "plateAxis": [[0, 0], [100, 0]]},
    "layers": [],
    "driveSpec": {
        "crop": [ox, oy],
        "sky": {"src": "drive-sky.png", "trim": [26, 34, 26, 30], "scale": .82, "pxPerDeg": 26},
        "clouds": {"src": "drive-clouds.png", "scale": .55},
        "shellFrom": "pilots-shell.webp", "cupFrom": "pilots-cup.webp",
        "yoke": {"src": "pilots-controls.png", "keep": [R(366, 528, 196, 136)], "pivot": [463, 598], "travel": 26},
        "static": {"src": "pilots-controls.png", "keep": [R(420, 655, 90, 210), R(720, 690, 240, 170)]},
        "levers": {"src": "pilots-controls.png", "keep": [R(722, 606, 236, 86)], "travel": 34},
        "horizon": [550, 240], "ppd": 9,
        "flapTab": {"x": 985, "y0": 600, "y1": 668, "r": 10, "color": "#e9e1cf"},
        "gearTab": {"x": 1062, "y0": 470, "y1": 530, "r": 11, "color": "#d9d4c8"},
    },
    "parts": [
        {"id": "yoke", "polys": [R(368, 462, 192, 134)]},
        {"id": "throttle", "polys": [R(726, 536, 228, 154)]},
        {"id": "flaps", "polys": [R(962, 580, 46, 108)]},
        {"id": "gear", "polys": [R(1038, 448, 48, 104)]},
    ],
}

# ---------------------------------------------------------------- the town (grey pencil; what opens is in colour)
SHORE = [[0, 274], [185, 277], [292, 280], [300, 249], [505, 243], [515, 226], [600, 212], [640, 212], [640, 520], [0, 520]]
PLANE_AT = (290, 255, .22)                            # where the jet's main wheels stand on the apron, and its scale
FAMILY_AT = (1180, 858, .133)                         # where the family's feet stand at the bus stop, and their scale
SPACES["city"] = {
    "w": 1672, "h": 940, "paper": "#f4f1ea", "maxZoom": 3.2,
    "layers": [
        {"src": "city-back.png", "mode": "full", "role": "back", "d": -1, "id": "back"},
        {"grey": True, "src": "city-farbank.png", "name": "city-apron", "erase": [SHORE], "d": -.62, "id": "apron"},
        {"kind": "child", "child": "plane", "d": -.62, "id": "planeslot"},
        {"grey": True, "src": "city-farbank.png", "name": "city-shore", "keep": [SHORE], "d": -.55, "id": "shore"},
        {"grey": True, "src": "city-river.png", "d": -.3, "id": "river"},
        {"grey": True, "src": "city-town.png", "d": 0, "id": "town", "shadow": [6, 10, 9, .38]},
        {"grey": True, "src": "city-front-five.png", "name": "city-front", "d": .4, "id": "front", "shadow": [7, 12, 10, .4]},
        {"kind": "child", "child": "human", "d": .4, "id": "familyslot"},
        FRAME,
    ],
    "parts": [
        {"id": "plane", "child": "plane", "layer": "planeslot", "fromChild": "plane"},
        {"id": "people", "child": "human", "layer": "familyslot", "fromChild": "human", "pad": 6},
        {"id": "river", "layer": "river", "polys": [[[0, 392], [280, 352], [560, 307], [640, 284], [760, 302], [985, 302], [1150, 244], [1300, 238], [1388, 252],
                                                     [1340, 332], [1200, 342], [1050, 362], [900, 374], [700, 382], [560, 412], [400, 452], [200, 466], [0, 466]]]},
        {"id": "bridge", "layer": "river", "polys": [[[632, 226], [990, 88], [1000, 72], [1022, 72], [1030, 90], [1390, 296], [1392, 322], [1040, 282], [1036, 342],
                                                      [982, 342], [982, 272], [800, 256], [800, 306], [758, 306], [756, 252], [632, 248]]]},
    ],
}
def at(x, y, s, px, py):
    """spot axes that put the child's point (px, py) at the parent's (x, y), scaled by s"""
    return {"axis": [[x - 50, y], [x + 50, y]], "plateAxis": [[px - 50 / s, py], [px + 50 / s, py]]}
SPACES["plane"]["spot"] = at(*PLANE_AT, 836, 705)
SPACES["human"]["spot"] = at(*FAMILY_AT, 760, 905)


def ellipse(cx, cy, rx, ry, n=36, rev=False):
    import math
    pts = [[round(cx + rx * math.cos(2 * math.pi * i / n), 1), round(cy + ry * math.sin(2 * math.pi * i / n), 1)] for i in range(n)]
    return pts[::-1] if rev else pts


# ---------------------------------------------------------------- skin, very close
SKIN_LENS = {"cx": 905, "cy": 96, "r": 88, "ax": 905, "ay": 262, "ar": 20}
SPACES["skin"] = {
    "parent": "human", "w": 1672, "h": 941, "paper": "#f6efe0",
    "spot": {"axis": [[HUMAN_LENS["cx"] - 60, HUMAN_LENS["cy"]], [HUMAN_LENS["cx"] + 60, HUMAN_LENS["cy"]]],
             "plateAxis": [[836 - 60 / .3, 470], [836 + 60 / .3, 470]]},
    "layers": [
        {"src": "skin-fat.png", "d": -.5, "id": "fat"},
        {"src": "skin-dermis.png", "d": -.25, "id": "dermis"},
        {"src": "skin-epidermis.png", "d": 0, "id": "epidermis", "min_area": 150},
        {"src": "skin-parts.png", "d": .25, "id": "parts", "min_area": 150, "hole_area": 200},
        {"kind": "child", "child": "cell", "d": .5, "inset": SKIN_LENS, "id": "celllens"},
        FRAME,
    ],
    "parts": [
        {"id": "fat", "layer": "fat", "polys": [[[0, 812], [400, 805], [800, 800], [1200, 800], [1672, 795], [1672, 941], [0, 941]]]},
        {"id": "surface", "layer": "epidermis", "polys": [[[0, 165], [1672, 160], [1672, 330], [1400, 345], [1000, 330], [700, 345], [300, 330], [0, 340]]]},
        {"id": "vessels", "layer": "parts", "polys": [[[0, 762], [400, 752], [700, 742], [1000, 722], [1300, 732], [1672, 742], [1672, 802], [1300, 792], [1000, 782], [700, 802], [400, 812], [0, 802]],
                                                      [[50, 372], [320, 372], [210, 560], [190, 705], [120, 705], [95, 560]],
                                                      [[782, 470], [960, 470], [885, 600], [865, 722], [822, 722], [802, 600]]]},
        {"id": "nerves", "layer": "parts", "polys": [[[690, 352], [870, 352], [870, 442], [790, 500], [702, 640], [642, 760], [602, 760], [682, 600], [760, 470], [700, 420]],
                                                     [[1450, 410], [1562, 410], [1562, 540], [1452, 720], [1382, 800], [1352, 800], [1422, 650], [1472, 540]]]},
        {"id": "hair", "layer": "parts", "polys": [[[548, 10], [505, 60], [455, 180], [430, 330], [360, 420], [290, 560], [290, 700], [340, 760], [350, 832], [387, 832], [400, 760],
                                                    [470, 720], [482, 640], [470, 560], [520, 522], [567, 522], [702, 330], [682, 326], [562, 420], [482, 330], [487, 180], [532, 60]]]},
        {"id": "sweat", "layer": "parts", "polys": [[[1230, 118], [1372, 118], [1372, 182], [1272, 182], [1266, 300], [1252, 420], [1242, 540], [1302, 560], [1302, 712],
                                                     [1100, 712], [1100, 560], [1210, 530], [1225, 420], [1230, 182]]]},
        {"id": "cell", "child": "cell", "layer": "celllens", "polys": [circle(SKIN_LENS["cx"], SKIN_LENS["cy"], SKIN_LENS["r"] + 6)],
         "plus": [SKIN_LENS["cx"] + SKIN_LENS["r"] + 4, SKIN_LENS["cy"] + 40]},
    ],
}

# ---------------------------------------------------------------- inside a cell
LYSO_AT = (330, 500, 50 / 535)                       # the lysosome drawn in the cell: where its middle sits, and its scale
SPACES["cell"] = {
    "parent": "skin", "w": 1672, "h": 941, "paper": "#f5eedf",
    "spot": {"axis": [[SKIN_LENS["cx"] - 50, SKIN_LENS["cy"]], [SKIN_LENS["cx"] + 50, SKIN_LENS["cy"]]],
             "plateAxis": [[850 - 50 / .118, 470], [850 + 50 / .118, 470]]},
    "layers": [
        {"src": "cell-bowl.png", "mode": "full", "role": "back", "d": -.3, "id": "bowl"},
        {"src": "cell-core.png", "d": -.1, "id": "core"},
        {"src": "cell-organelles.png", "d": .1, "id": "organelles", "min_area": 200, "erase": [circle(330, 500, 60)]},
        {"kind": "child", "child": "lysosome", "d": .1, "id": "lysoslot"},
        {"src": "cell-rim.png", "d": .25, "id": "rim"},
        FRAME,
    ],
    "parts": [
        {"id": "cytoplasm", "layer": "bowl", "polys": [ellipse(860, 440, 650, 340)]},
        {"id": "membrane", "layer": "rim", "polys": [ellipse(850, 480, 752, 452), ellipse(860, 440, 668, 352, rev=True)]},
        {"id": "nucleus", "layer": "core", "polys": [ellipse(832, 392, 225, 198)]},
        {"id": "er", "layer": "core", "polys": [[[620, 168], [762, 160], [762, 200], [600, 240], [520, 330], [500, 450], [560, 560], [700, 622], [882, 642], [882, 722],
                                                 [700, 722], [520, 682], [400, 562], [350, 400], [400, 262], [500, 202]]]},
        {"id": "golgi", "layer": "organelles", "polys": [[[900, 520], [1050, 430], [1250, 410], [1340, 450], [1340, 620], [1200, 690], [1020, 690], [900, 640]]]},
        {"id": "mitochondria", "layer": "organelles", "polys": [ellipse(495, 185, 120, 70), ellipse(1180, 250, 110, 75), ellipse(530, 670, 125, 72)]},
        {"id": "lysosome", "child": "lysosome", "layer": "lysoslot", "polys": [circle(330, 500, 62)], "plus": [330, 575]},
    ],
}

# ---------------------------------------------------------------- the recycling bubble
SPACES["lysosome"] = {
    "parent": "cell", "w": 1672, "h": 941, "paper": "#f6eedc",
    "spot": {"axis": [[LYSO_AT[0] - 50, LYSO_AT[1]], [LYSO_AT[0] + 50, LYSO_AT[1]]],
             "plateAxis": [[845 - 50 / LYSO_AT[2], 483], [845 + 50 / LYSO_AT[2], 483]]},
    "layers": [
        {"src": "lysosome-back.png", "mode": "full", "role": "back", "d": -1, "id": "back"},
        {"src": "lysosome-inside.png", "d": -.3, "id": "inside"},
        {"src": "lysosome-contents.png", "d": 0, "id": "contents", "min_area": 60, "hole_area": 120},
        {"src": "lysosome-rim.png", "d": .25, "id": "rim", "hole_area": 60},
        {"src": "lysosome-outside.png", "d": .5, "id": "outside", "min_area": 30, "hole_area": 60},
        FRAME,
    ],
    "parts": [
        {"id": "enzymes", "layer": "inside", "polys": [ellipse(845, 483, 470, 385)]},
        {"id": "membrane", "layer": "rim", "polys": [ellipse(845, 483, 548, 458), ellipse(845, 483, 500, 410, rev=True)]},
        {"id": "pump", "layer": "rim", "polys": [circle(510, 118, 44), circle(310, 428, 44), circle(1262, 388, 44), circle(770, 858, 44)]},
        {"id": "old", "layer": "contents", "polys": [[[380, 330], [470, 262], [620, 268], [720, 330], [770, 430], [760, 500], [640, 540], [470, 530], [380, 460]]]},
        {"id": "germ", "layer": "contents", "polys": [[[960, 560], [1060, 498], [1200, 498], [1212, 560], [1100, 650], [990, 662], [820, 682], [810, 620]]]},
        {"id": "delivery", "layer": "outside", "polys": [circle(1180, 130, 52), circle(1300, 90, 62), circle(1440, 70, 58)]},
        {"id": "recycle", "layer": "outside", "polys": [[[170, 690], [420, 680], [420, 760], [300, 830], [170, 830]], [[1200, 690], [1450, 690], [1450, 810], [1300, 820], [1200, 760]]]},
    ],
}
