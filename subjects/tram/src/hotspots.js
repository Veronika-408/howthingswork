// Tram plate geometry, in pixels of the 1672 x 941 painting (see the plane's hotspots.js for the format).
// The tram faces left, as it is drawn in the city.
window.PLATE = {
  w: 1672,
  h: 941,
  art: { x: 0, y: 100, w: 1672, h: 720 },
  introBox: { x: 1268, y: 40, w: 380 },
  intro: "A modern city tram is a long electric train that runs in the street. Its floor is low enough to walk straight in, and it bends in the middle to get around corners. Its skin is cut away here to show how it works."
};

window.HOTSPOTS = {
  wire: {
    polys: [[[40,  111],  [1630,  366],  [1630,  394],  [40,  139]]],
    frame: [600.0, 120, 1300.0, 330],
    anchor: [980.0, 222],
    label: { x: 1062, y: 40, w: 170, from: "bottom" }
  },
  pantograph: {
    polys: [[[430,  150],  [582,  150],  [586,  196],  [560,  240],  [556,  357],  [428,  360],  [424,  330],  [470,  240]]],
    anchor: [512.0, 196],
    label: { x: 102, y: 40, w: 170, from: "bottom" }
  },
  roof: {
    polys: [[[245,  378],  [430,  358],  [560,  357],  [900,  347],  [1580,  372],  [1584,  408],  [245,  418]]],
    frame: [560.0, 340, 1100.0, 420],
    anchor: [960.0, 372],
    label: { x: 682, y: 40, w: 170, from: "bottom" }
  },
  cab: {
    polys: [[[150,  600],  [200,  450],  [262,  406],  [346,  406],  [346,  600],  [230,  604]]],
    anchor: [295.0, 540],
    label: { x: 12, y: 830, w: 160, from: "top" }
  },
  "front-bogie": {
    polys: [[[160,  606],  [470,  600],  [476,  700],  [420,  716],  [300,  720],  [200,  712],  [150,  660]]],
    anchor: [340.0, 676],
    label: { x: 180, y: 830, w: 150, from: "top" }
  },
  saloon: {
    polys: [[[350,  432],  [702,  432],  [702,  610],  [350,  618]]],
    anchor: [640.0, 520],
    label: { x: 302, y: 40, w: 170, from: "bottom" }
  },
  doors: {
    polys: [[[924,  440],  [1020,  440],  [1020,  606],  [924,  610]],  [[1290,  430],  [1346,  430],  [1346,  578],  [1290,  582]]],
    frame: [900.0, 420, 1360.0, 620],
    anchor: [972.0, 520],
    label: { x: 872, y: 40, w: 170, from: "bottom" }
  },
  joint: {
    polys: [[[798,  384],  [846,  384],  [850,  626],  [790,  628],  [798,  600]],  [[1100,  390],  [1170,  390],  [1170,  562],  [1100,  566]]],
    frame: [760.0, 370, 1200.0, 640],
    anchor: [822.0, 470],
    label: { x: 492, y: 40, w: 170, from: "bottom" }
  },
  bogie: {
    polys: [[[720,  592],  [906,  586],  [906,  666],  [860,  682],  [730,  692]],  [[1056,  560],  [1240,  552],  [1240,  612],  [1200,  636],  [1060,  640]]],
    frame: [700.0, 540, 1260.0, 700],
    anchor: [790.0, 648],
    label: { x: 640, y: 830, w: 150, from: "top" }
  },
  rails: {
    polys: [[[20,  718],  [640,  654],  [1100,  622],  [1290,  606],  [1290,  652],  [640,  732],  [20,  800]]],
    frame: [100.0, 620, 900.0, 800],
    anchor: [520.0, 700],
    label: { x: 900, y: 830, w: 160, from: "top" }
  },
  points: {
    polys: [[[1300,  622],  [1500,  562],  [1640,  560],  [1640,  640],  [1560,  700],  [1450,  692],  [1300,  662]]],
    anchor: [1450.0, 640],
    label: { x: 1440, y: 830, w: 170, from: "top" }
  },
  stop: {
    polys: [[[5,  345],  [232,  345],  [232,  420],  [178,  520],  [160,  610],  [5,  612]]],
    anchor: [90.0, 470],
    label: { x: 24, y: 210, w: 140, from: "bottom" }
  }
};

window.ORDER = ["pantograph", "wire", "roof", "cab", "front-bogie", "saloon", "doors", "joint", "bogie", "rails", "points", "stop"];
