// Weather plate geometry, in pixels of the 1672 x 941 painting (see the plane's hotspots.js for the format).
// The life of a cloud runs left to right, as the clouds sit in the sky over the map.
window.PLATE = {
  w: 1672,
  h: 941,
  art: { x: 0, y: 30, w: 1672, h: 860 },
  introBox: { x: 236, y: 12, w: 360 },
  intro: "Weather is what the sky is doing: sunshine, wind, clouds, rain and snow. Follow the water from the lake up into the clouds and back down again."
};

window.HOTSPOTS = {
  "sun": {
    polys: [[[85, 95], [205, 95], [225, 155], [205, 215], [85, 215], [65, 155]]],
    anchor: [150, 140],
    label: { x: 14, y: 6, w: 190, from: "bottom" }
  },
  "vapour": {
    polys: [[[60, 428], [190, 428], [185, 560], [170, 700], [90, 700], [70, 560]]],
    frame: [50, 420, 240, 700],
    anchor: [125, 560],
    label: { x: 12, y: 888, w: 170, from: "top" }
  },
  "newcloud": {
    polys: [[[28, 420], [40, 360], [90, 318], [150, 305], [205, 330], [240, 385], [235, 425]]],
    anchor: [120, 365],
    label: { x: 8, y: 262, w: 170, from: "bottom" }
  },
  "raincloud": {
    polys: [[[212, 458], [245, 330], [330, 250], [450, 198], [590, 165], [680, 215], [725, 300], [745, 420], [700, 500], [300, 498]]],
    frame: [400, 205, 870, 480],
    anchor: [560, 240],
    label: { x: 640, y: 6, w: 180, from: "bottom" }
  },
  "rain": {
    polys: [[[330, 505], [760, 505], [790, 600], [700, 640], [640, 700], [620, 760], [565, 760], [520, 655], [400, 640]]],
    frame: [340, 500, 800, 770],
    anchor: [598, 705],
    label: { x: 388, y: 888, w: 170, from: "top" }
  },
  "rainbow": {
    polys: [[[160, 645], [180, 585], [225, 535], [285, 502], [345, 492], [385, 505], [380, 540], [330, 532], [275, 550], [232, 592], [208, 645]]],
    anchor: [228, 580],
    label: { x: 200, y: 888, w: 170, from: "top" }
  },
  "thundercloud": {
    polys: [[[750, 420], [730, 300], [712, 190], [628, 112], [650, 86], [780, 60], [900, 45], [1150, 40], [1400, 60], [1620, 100], [1500, 145], [1300, 190], [1262, 330], [1292, 420], [1180, 470], [1000, 470], [800, 500]]],
    frame: [930, 70, 1430, 480],
    anchor: [1060, 190],
    label: { x: 1010, y: 2, w: 300, from: "bottom" }
  },
  "lightning": {
    polys: [[[918, 440], [1078, 440], [1078, 515], [1012, 560], [988, 560], [918, 515]]],
    anchor: [1012, 500],
    label: { x: 790, y: 888, w: 190, from: "top" }
  },
  "rod": {
    polys: [[[966, 542], [1028, 542], [1028, 644], [966, 644]]],
    anchor: [996, 590],
    label: { x: 990, y: 888, w: 180, from: "top" }
  },
  "snowcloud": {
    polys: [[[1250, 372], [1268, 270], [1340, 218], [1500, 205], [1610, 240], [1658, 330], [1645, 372]]],
    frame: [1250, 200, 1660, 470],
    anchor: [1440, 300],
    label: { x: 1470, y: 150, w: 190, from: "bottom" }
  },
  "snowflakes": {
    polys: [[[1268, 376], [1642, 376], [1642, 462], [1268, 462]]],
    frame: [1270, 370, 1640, 470],
    anchor: [1555, 415],
    label: { x: 1460, y: 888, w: 190, from: "top" }
  },
  "river": {
    polys: [[[520, 815], [660, 795], [760, 768], [850, 725], [930, 738], [905, 800], [800, 852], [700, 880], [560, 872]]],
    frame: [480, 700, 960, 890],
    anchor: [700, 862],
    label: { x: 578, y: 888, w: 190, from: "top" }
  }
};

window.ORDER = ["sun", "vapour", "newcloud", "raincloud", "rain", "rainbow", "thundercloud", "lightning", "rod", "snowcloud", "snowflakes", "river"];
