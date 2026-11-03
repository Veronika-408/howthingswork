// Plate geometry in pixels of art/plate.png (1672 x 941).
window.PLATE = {
  "w": 1672,
  "h": 941,
  "art": {
    "x": 0,
    "y": 0,
    "w": 1672,
    "h": 941
  },
  "introBox": {
    "x": 1500,
    "y": 20,
    "w": 160
  },
  "intro": "If you could cut a tiny slice of your skin and look at it from the side, this is what you'd see: layers, like a cake, each with its own job."
};
window.HOTSPOTS = {
  "surface": {
    "polys": [
      [
        [
          160,
          140
        ],
        [
          1480,
          100
        ],
        [
          1490,
          160
        ],
        [
          160,
          200
        ]
      ]
    ],
    "anchor": [
      1000,
      135
    ],
    "label": {
      "x": 980,
      "y": 8,
      "w": 160,
      "from": "bottom"
    }
  },
  "cell": {
    "polys": [
      [
        [
          740,
          180
        ],
        [
          860,
          176
        ],
        [
          865,
          240
        ],
        [
          740,
          245
        ]
      ]
    ],
    "anchor": [
      800,
      210
    ],
    "label": {
      "x": 780,
      "y": 8,
      "w": 150,
      "from": "bottom"
    }
  },
  "hair": {
    "polys": [
      [
        [
          540,
          10
        ],
        [
          700,
          0
        ],
        [
          610,
          150
        ],
        [
          480,
          700
        ],
        [
          320,
          700
        ],
        [
          350,
          600
        ],
        [
          500,
          150
        ]
      ]
    ],
    "frame": [
      300,
      0,
      710,
      710
    ],
    "anchor": [
      500,
      300
    ],
    "label": {
      "x": 20,
      "y": 120,
      "w": 140,
      "from": "right"
    }
  },
  "sweat": {
    "polys": [
      [
        [
          1150,
          60
        ],
        [
          1230,
          60
        ],
        [
          1230,
          150
        ],
        [
          1200,
          420
        ],
        [
          1210,
          640
        ],
        [
          1030,
          640
        ],
        [
          1030,
          470
        ],
        [
          1150,
          420
        ],
        [
          1160,
          150
        ]
      ]
    ],
    "frame": [
      1020,
      50,
      1240,
      650
    ],
    "anchor": [
      1205,
      280
    ],
    "label": {
      "x": 1500,
      "y": 250,
      "w": 150,
      "from": "left"
    }
  },
  "blood": {
    "polys": [
      [
        [
          140,
          700
        ],
        [
          1400,
          650
        ],
        [
          1400,
          720
        ],
        [
          140,
          780
        ]
      ]
    ],
    "anchor": [
      150,
      740
    ],
    "label": {
      "x": 10,
      "y": 600,
      "w": 130,
      "from": "bottom"
    }
  },
  "nerves": {
    "polys": [
      [
        [
          1270,
          390
        ],
        [
          1370,
          390
        ],
        [
          1370,
          480
        ],
        [
          1270,
          480
        ]
      ]
    ],
    "anchor": [
      1365,
      430
    ],
    "label": {
      "x": 1500,
      "y": 420,
      "w": 150,
      "from": "left"
    }
  },
  "fat": {
    "polys": [
      [
        [
          140,
          760
        ],
        [
          1480,
          700
        ],
        [
          1480,
          900
        ],
        [
          140,
          910
        ]
      ]
    ],
    "anchor": [
      1470,
      800
    ],
    "label": {
      "x": 1500,
      "y": 780,
      "w": 150,
      "from": "left"
    }
  }
};
window.ORDER = ["surface", "cell", "hair", "sweat", "blood", "nerves", "fat"];
