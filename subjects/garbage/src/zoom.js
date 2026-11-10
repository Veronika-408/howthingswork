// Level 3 inside the garbage truck: outlines in pixels of the part's detail tile (1536 x 1024,
// garbage/art/zoom/tiles/<part>.png). "what" describes the area for the repaint prompt.
window.ZOOM = {
  cab: { subs: [
    {
      id: "wheel", name: "Steering wheel",
      polys: [[[1080, 520], [1272, 520], [1272, 700], [1080, 700]]],
      frame: [1040.0, 480, 1300, 720],
      lead: "The driver steers the big truck with a steering wheel, just like a car, only bigger.",
      facts: [
        "Oil pressure helps the driver turn it, so the heavy front wheels turn easily.",
        "A screen next to the wheel shows the picture from the camera at the back.",
        "In the narrow streets of an old town, the driver has to steer very carefully."
      ],
      what: "The driver's gloved hands on the big steering wheel of the garbage truck cab, the dashboard with a small screen and switches, the driver in an orange high-visibility jacket."
    },
    {
      id: "beacons", name: "Orange beacons",
      polys: [[[920, 105], [1162, 105], [1162, 242], [920, 242]]],
      lead: "On the cab roof sit two orange lamps. When the truck is working, they flash so everyone can see it from far away.",
      facts: [
        "Orange flashing lamps mean: careful, a work vehicle is busy here.",
        "Snow ploughs, tow trucks and road workers use them too.",
        "The lamps are there on the back of the truck as well."
      ],
      what: "Two amber warning beacons on the golden-yellow cab roof of the garbage truck, with their glass domes and bases, against plain paper."
    },
    {
      id: "mirror", name: "Mirrors",
      polys: [[[1380, 400], [1492, 400], [1492, 770], [1380, 770]]],
      frame: [1340.0, 380, 1520, 790],
      lead: "The big mirrors show the driver everything along the side of the long truck.",
      facts: [
        "The small curved mirror below shows a wider view, so nothing is hidden next to the cab.",
        "The driver checks the mirrors before every turn, looking for cyclists.",
        "Mirrors are heated in winter so they do not fog up."
      ],
      what: "The two black wing mirrors on their arm at the side of the yellow garbage truck cab: a large flat mirror and a small curved wide-angle mirror below it."
    }
  ]},
  lifter: { subs: [
    {
      id: "comb", name: "Comb",
      polys: [[[430, 470], [800, 470], [800, 740], [430, 740]]],
      lead: "The lifter's steel teeth, called the comb, slide under the thick rim at the top of the bin.",
      facts: [
        "Every big wheelie bin has the same kind of rim, so one lifter fits them all.",
        "A bar presses on top of the rim, so the bin cannot fall off when it is upside down.",
        "Bigger bins on four wheels are lifted with arms that grip their sides."
      ],
      what: "The steel comb of the bin lifter: a row of flat teeth hooked under the thick rim of the upside-down green wheeled bin, the lifter's frame and pivots."
    },
    {
      id: "falling", name: "Falling rubbish",
      polys: [[[860, 540], [1060, 560], [1300, 760], [1300, 960], [960, 980], [860, 800]]],
      lead: "Out it all tumbles: bags, boxes, bottles and peels fall into the hopper.",
      facts: [
        "Bags tied shut keep the rubbish together and the street clean.",
        "Glass, paper and plastic often go in their own bins and their own trucks.",
        "If a bin is too heavy or stuck, the crew empties it by hand."
      ],
      what: "Rubbish tumbling out of the tipped green bin into the steel hopper: plastic bags, bottles, packaging and paper falling, the scuffed steel floor of the hopper."
    },
    {
      id: "camera", name: "Reversing camera",
      polys: [[[1080, 20], [1215, 20], [1215, 120], [1080, 120]]],
      frame: [1040.0, 0, 1260, 140],
      lead: "This little camera looks behind the truck. The driver sees its picture on a screen in the cab.",
      facts: [
        "Behind a big truck there is a lot of space the driver cannot see.",
        "When the truck reverses, the screen turns on by itself.",
        "The crew also stands where the driver can see them in the mirrors."
      ],
      what: "A small grey reversing camera in its housing above the hopper opening of the garbage truck, red rear lamps beside it, the yellow tailgate frame."
    }
  ]},
  packer: { subs: [
    {
      id: "cylinders", name: "Cylinders",
      polys: [[[600, 220], [940, 220], [940, 730], [600, 730]]],
      lead: "These shiny tubes are hydraulic cylinders. Oil pushed into them makes the rod slide out with enormous force.",
      facts: [
        "Oil cannot be squashed, so when the pump pushes oil in, the rod has to move.",
        "Let the oil out, and the rod slides back in.",
        "The same kind of cylinder lifts the bin and pushes the wall in the box."
      ],
      what: "Two long shiny steel hydraulic cylinders with black oil hoses and brass fittings inside the yellow tailgate of the garbage truck, mounted on pins."
    },
    {
      id: "blade", name: "Sweep blade",
      polys: [[[580, 690], [920, 690], [920, 940], [580, 940]]],
      lead: "The bottom of the packer is a big curved blade. It scrapes along the hopper and scoops everything up.",
      facts: [
        "Its curve matches the curve of the hopper floor, so nothing is left behind.",
        "Its edge is made of extra-hard steel, because rubbish scrapes it all day.",
        "It is strong enough to break a wooden chair."
      ],
      what: "The curved steel sweep blade at the bottom of the packer in the tailgate of the garbage truck, sitting in the curved hopper, the yellow frame around it."
    }
  ]}
};
