// The city: a pencil isometric map, world/art/world.png (1672 x 940). The jumbo jet and the tram are
// drawn into it in colour. Each subject's spot gives its outline, where its "+" sits, and an axis
// (left end to right end of the vehicle) that is matched to plateAxis on its encyclopedia plate,
// so the camera can fly until the drawing lies exactly on the plate before dissolving into it.
window.WORLD_DATA = {
  baseScale: .8,                      // sharper city tiles fade in once the city is shown this large
  focus: [430, 420],                  // phones open here, around the jet and the tram
  spots: {
    plane: {
      polys: [[[100, 228], [130, 190], [240, 150], [440, 115], [485, 70], [500, 72], [492, 128], [528, 140], [515, 196], [470, 214], [472, 256], [390, 265], [210, 245], [110, 245]]],
      plus: [330, 112],
      axis: [[134, 190], [522, 137]],
      plateAxis: [[12, 440], [1640, 330]]
    }
  },
  // grey machines, waiting for their own pages
  soon: [
    { id: "excavator", name: "The excavator", polys: [[[1172, 600], [1235, 553], [1300, 595], [1370, 612], [1370, 672], [1300, 672], [1175, 630]]] },
    { id: "crane", name: "The tower crane", polys: [[[1255, 390], [1330, 370], [1575, 455], [1575, 470], [1365, 420], [1365, 605], [1320, 605], [1320, 420], [1255, 410]]] },
    { id: "bell", name: "The church bell", polys: [[[858, 322], [880, 322], [905, 430], [905, 600], [846, 600], [846, 430]]] },
    { id: "boat", name: "The river boat", polys: [[[485, 425], [490, 400], [540, 385], [700, 333], [765, 355], [760, 375], [600, 410], [500, 430]]] },
    { id: "car", name: "The car", polys: [[[736, 735], [770, 726], [808, 748], [808, 774], [770, 777], [736, 762]]] },
    { id: "bus", name: "The bus", polys: [[[968, 712], [1000, 703], [1102, 748], [1102, 794], [1060, 792], [968, 752]]] },
    { id: "fire", name: "The fire engine", polys: [[[325, 792], [352, 784], [450, 818], [450, 874], [400, 878], [325, 842]]] },
    { id: "train", name: "The train", polys: [[[1028, 262], [1060, 245], [1402, 296], [1402, 324], [1050, 292], [1028, 282]]] },
    { id: "heli", name: "The helicopter", polys: [[[1460, 230], [1610, 230], [1610, 300], [1460, 300]]] },
    { id: "garbage", name: "The garbage truck", polys: [[[1326, 832], [1400, 768], [1490, 773], [1490, 836], [1420, 880], [1338, 878]]] },
    { id: "bridge", name: "The bridge", polys: [[[974, 90], [1036, 90], [1030, 335], [976, 335]]] },
    { id: "tower", name: "The TV tower", polys: [[[1486, 8], [1502, 8], [1520, 136], [1476, 136]]] }
  ],
  // pencil clouds drifting over the far side of the map
  clouds: [
    { src: "assets/world/cloud-1.webp", w: 150, h: 83, y: -6, x0: 120, speed: 4, alpha: .8 },
    { src: "assets/world/cloud-2.webp", w: 105, h: 63, y: 30, x0: 760, speed: 5.5, alpha: .75 },
    { src: "assets/world/cloud-3.webp", w: 78, h: 46, y: 8, x0: 1300, speed: 4.6, alpha: .7 }
  ],
  // traffic and boats, drawn at the map's isometric angle (no rotation); flip turns a sprite round
  sprites: [
    { src: "assets/world/car-dr.webp", w: 58, h: 47, speed: 17, phase: .1, iso: true, path: [[830, 776], [1250, 927]] },
    { src: "assets/world/car-ur.webp", w: 56, h: 40, speed: 17, phase: .6, iso: true, flip: true, path: [[1250, 909], [830, 758]] },
    { src: "assets/world/boat-dl.webp", w: 52, h: 35, speed: 9, phase: .2, iso: true, rock: 2, rockHz: .55, path: [[470, 400], [222, 392], [-70, 414]] },
    { src: "assets/world/sail.webp", w: 34, h: 45, speed: 1.2, phase: .3, iso: true, rock: 3.5, rockHz: .35, path: [[150, 396], [230, 390], [150, 396]] }
  ]
};
