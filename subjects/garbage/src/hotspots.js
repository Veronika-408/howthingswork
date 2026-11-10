// Garbage truck plate geometry, in pixels of the 1672 x 941 painting (see subjects/tram/src/hotspots.js).
// The truck faces right, as it is drawn on the map: cab on the right, the loading end on the left.
window.PLATE = {
  w: 1672,
  h: 941,
  art: { x: 0, y: 140, w: 1672, h: 740 },
  introBox: { x: 622, y: 14, w: 400 },
  intro: "A garbage truck collects the rubbish from every street. Workers tip the bins into the back, and a strong blade squashes it all inside the big box. Its skin is cut away here to show how it works."
};

window.HOTSPOTS = {
  lifter: {
    polys: [[[165, 300], [235, 262], [300, 285], [392, 372], [345, 452], [345, 560], [300, 565], [235, 470], [170, 420]]],
    frame: [165.0, 262, 392, 470],
    anchor: [272.0, 330],
    label: { x: 186, y: 30, w: 140, from: "bottom" }
  },
  lights: {
    polys: [[[298, 165], [338, 165], [338, 222], [298, 222]], [[378, 195], [432, 195], [432, 242], [378, 242]], [[1410, 145], [1540, 145], [1540, 198], [1410, 198]]],
    frame: [280.0, 150, 450.0, 250],
    anchor: [318.0, 190],
    label: { x: 334, y: 30, w: 130, from: "bottom" }
  },
  packer: {
    polys: [[[500, 190], [640, 172], [665, 232], [662, 620], [560, 632], [500, 565], [492, 300]]],
    frame: [495.0, 180, 665, 460],
    anchor: [580.0, 420],
    label: { x: 472, y: 30, w: 140, from: "bottom" }
  },
  body: {
    polys: [[[670, 200], [1045, 200], [1045, 522], [670, 526]]],
    anchor: [860.0, 360],
    label: { x: 1036, y: 30, w: 140, from: "bottom" }
  },
  ejector: {
    polys: [[[1046, 205], [1290, 205], [1290, 520], [1046, 520]]],
    anchor: [1075.0, 300],
    label: { x: 1186, y: 30, w: 140, from: "bottom" }
  },
  cab: {
    polys: [[[1292, 195], [1600, 188], [1652, 262], [1652, 450], [1292, 450]]],
    anchor: [1420.0, 330],
    label: { x: 1340, y: 30, w: 150, from: "bottom" }
  },
  crew: {
    polys: [[[60, 455], [196, 455], [192, 782], [60, 782]], [[395, 465], [532, 465], [532, 562], [490, 562], [482, 785], [395, 785]]],
    frame: [40.0, 440, 550.0, 800],
    anchor: [440.0, 600],
    label: { x: 20, y: 876, w: 140, from: "top" }
  },
  bins: {
    polys: [[[10, 600], [62, 600], [62, 755], [10, 755]], [[180, 592], [298, 592], [298, 772], [180, 772]]],
    frame: [0.0, 580, 310.0, 780],
    anchor: [240.0, 680],
    label: { x: 172, y: 876, w: 130, from: "top" }
  },
  hopper: {
    polys: [[[392, 300], [482, 262], [500, 420], [492, 462], [392, 462], [392, 560], [350, 562], [346, 452], [392, 380]]],
    frame: [345.0, 265, 500, 465],
    anchor: [440.0, 470],
    label: { x: 316, y: 876, w: 140, from: "top" }
  },
  wheels: {
    polys: [[[575, 590], [745, 590], [745, 765], [575, 765]], [[1330, 585], [1490, 585], [1490, 745], [1330, 745]]],
    frame: [560.0, 570, 760.0, 780],
    anchor: [660.0, 680],
    label: { x: 600, y: 876, w: 140, from: "top" }
  },
  fuel: {
    polys: [[[985, 580], [1120, 580], [1120, 686], [985, 686]]],
    anchor: [1050.0, 632],
    label: { x: 890, y: 876, w: 140, from: "top" }
  },
  hydraulics: {
    polys: [[[1120, 580], [1215, 580], [1272, 600], [1276, 662], [1215, 692], [1120, 692]]],
    anchor: [1180.0, 640],
    label: { x: 1060, y: 876, w: 150, from: "top" }
  },
  engine: {
    polys: [[[1286, 452], [1600, 452], [1600, 632], [1500, 642], [1460, 590], [1320, 590], [1286, 610]]],
    anchor: [1450.0, 520],
    label: { x: 1420, y: 876, w: 150, from: "top" }
  }
};

window.ORDER = ["cab", "engine", "wheels", "fuel", "hydraulics", "body", "ejector", "packer", "hopper", "lifter", "lights", "crew", "bins"];
