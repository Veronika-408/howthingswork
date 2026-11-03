// Level 3: parts inside a part. Outlines are in the pixels of that part's detail tile
// (1536 x 1024, art/zoom/tiles/<part>.png). "what" describes the area for the repaint prompt.
window.ZOOM = {
  radar: { subs: [
    {
      id: "dish", name: "Radar antenna",
      polys: [[[130,520],[160,420],[230,340],[330,330],[400,380],[410,560],[380,680],[300,720],[200,690],[150,620]]],
      lead: "The antenna is a flat round plate covered in tiny slots. It does not need to be curved like a satellite dish.",
      facts: [
        "Motors tilt it up and down and swing it from side to side, so it can sweep the whole sky ahead.",
        "It sends out short bursts of radio waves, then listens for the echo. The longer the echo takes, the farther away the rain is.",
        "Pilots can tilt it down to see the ground, which helps them spot mountains and coastlines."
      ],
      what: "The flat round weather-radar antenna plate with its fine slots, mounted on its motorised tilt-and-sweep drive, inside the cut-open nose of the jet."
    },
    {
      id: "radome", name: "Radome",
      polys: [[[30,540],[60,420],[125,330],[150,330],[140,720],[60,660]]],
      lead: "The rounded nose cone is called the radome, short for radar dome. Unlike most of the skin, it is not made of metal.",
      facts: [
        "It is made of layers of glass fibre and honeycomb, which radio waves pass through easily.",
        "It has thin metal strips on the outside that carry lightning safely away.",
        "Birds and hail sometimes dent it, so engineers check it often."
      ],
      what: "The curved fibreglass radome at the tip of the jet's nose, cut open to show its layered honeycomb shell, with the radar antenna just behind it."
    }
  ]},
  cockpit: { subs: [
    {
      id: "windows", name: "Cockpit windows",
      polys: [[[300,640],[330,590],[410,520],[540,520],[640,520],[690,545],[690,660],[560,650],[420,648],[320,660]]],
      lead: "The cockpit windows are thick sandwiches of glass and plastic. They are heated from inside.",
      facts: [
        "The heating keeps them clear of ice and makes them bend instead of break if a bird hits them.",
        "New window designs are tested by firing a bird-sized object at them at high speed.",
        "Small side windows can be opened on the ground, so the pilots can talk to the ground crew."
      ],
      what: "The row of slanted front windows of the jet's flight deck, with their thick framed glass panes and the smooth white nose skin around them, seen from outside."
    },
    {
      id: "controls", name: "Pilots and controls",
      polys: [[[700,400],[1160,390],[1170,700],[700,700]]],
      lead: "Each pilot has a control wheel, rudder pedals and a full set of screens, so either one can fly the plane alone.",
      facts: [
        "Turning the wheel moves the ailerons on the wings. Pushing or pulling it moves the elevators on the tail.",
        "The four thrust levers between the seats control the four engines, one lever for each.",
        "The pilots eat different meals, so if one meal makes someone ill, the other pilot is still well."
      ],
      numbers: [["4", "thrust levers"], ["2", "control wheels"]],
      what: "Two pilots in white shirts with epaulettes sitting SIDE BY SIDE at the controls of the 747 flight deck (seen from the side, the first officer is beyond the captain at the same position, partly hidden), an empty jump seat behind them: control wheels, the screens on the instrument panel, the centre pedestal with four thrust levers and the side panels of switches."
    }
  ]},
  avionics: { subs: [
    {
      id: "racks", name: "Computer racks",
      polys: [[[360,350],[510,350],[510,630],[360,630]], [[225,640],[800,640],[800,800],[225,800]]],
      frame: [330, 340, 720, 650],
      lead: "The shelves are full of boxes that slide in and out like drawers. Each box does one job.",
      facts: [
        "One box works out where the plane is, another runs the autopilot, another talks to the radios.",
        "The most important boxes come in twos or threes. If one breaks, another takes over straight away.",
        "Engineers can pull out a faulty box and slide in a new one in a few minutes."
      ],
      numbers: [["2 or 3", "copies of the most important computers"]],
      what: "Rows of shelf racks in the electronics bay holding grey electronic boxes with handles and connectors, bundles of wiring and cooling air ducts."
    }
  ]},
  "first-class": { subs: [
    {
      id: "seats", name: "First class seats",
      polys: [[[307,380],[920,380],[920,760],[307,760]]],
      lead: "Each first class seat is like a small armchair with its own table, lamp and television.",
      facts: [
        "Buttons in the armrest make the seat recline, raise the footrest or turn it into a bed.",
        "The seats are bolted to rails in the floor, so airlines can move them to change the cabin layout.",
        "Every seat, even the big ones, has a life jacket stowed underneath."
      ],
      what: "Wide first class leather seats in the nose of the 747 with passengers reading and drinking tea, small side tables, reading lamps and the curved cabin wall with windows."
    },
    {
      id: "door", name: "Passenger door",
      polys: [[[1253,395],[1510,395],[1510,815],[1253,815]]],
      lead: "The big passenger doors on a 747 move inward a little, then slide up into the ceiling.",
      facts: [
        "In flight the air inside presses the door firmly into its frame, so it cannot be opened.",
        "An emergency slide is packed inside the bottom of every door. It inflates in a few seconds.",
        "A 747 has ten main deck doors, five on each side."
      ],
      numbers: [["10", "main deck doors"]],
      what: "The open forward main-deck passenger door of the 747 with its thick rounded frame, the docked jet bridge in front of it and a flight attendant greeting passengers."
    }
  ]},
  "upper-deck": { subs: [
    {
      id: "stairs", name: "Staircase",
      polys: [[[320,480],[590,480],[590,775],[320,775]]],
      lead: "A curving staircase connects the two floors. The 747 was the first airliner with stairs inside.",
      facts: [
        "Early 747s had a spiral staircase. The 747-400 has a straight one that is easier to carry trays up.",
        "During takeoff and landing nobody is allowed on the stairs.",
        "Flight attendants use the stairs all flight long, to serve meals on both floors."
      ],
      what: "The staircase inside the 747 that leads from the main deck up to the upper deck, with handrails, carpeted steps and flight attendants walking up and down."
    },
    {
      id: "cabin", name: "Upper deck cabin",
      polys: [[[300,300],[1230,300],[1230,470],[300,470]]],
      frame: [660, 290, 1230, 480],
      lead: "Up in the hump, the cabin is narrower and quieter, with its own small windows and storage bins along the sides.",
      facts: [
        "The walls curve inward a lot here, because this floor sits right under the roof of the hump.",
        "Seats up here are popular, because the cabin feels small and calm.",
        "Later 747s, like this one, have a longer hump than the first ones, so more seats fit."
      ],
      what: "The upper deck cabin under the 747's hump with rows of blue seats, seated passengers, a flight attendant in the aisle, small windows and the curved roof frames."
    }
  ]},
  "jet-bridge": { subs: [
    {
      id: "cab", name: "Bridge head",
      polys: [[[660,340],[980,340],[980,640],[660,640]]],
      frame: [600, 330, 1000, 650],
      lead: "The end of the jet bridge is a small room that can turn and tilt so it lines up with the door.",
      facts: [
        "A driver steers it slowly up to the plane using a control desk inside the head.",
        "A soft folding canopy, like a giant accordion, closes around the door frame.",
        "Sensors watch the gap. As the plane gets lighter or heavier the bridge moves up and down with it."
      ],
      what: "The head of the grey jet bridge docked at the forward door of the 747, with its folding rubber canopy closed around the door frame and its telescoping tunnel sections."
    }
  ]},
  engine: { subs: [
    {
      id: "fan", name: "Fan",
      polys: [[[318,520],[340,420],[400,365],[480,345],[560,360],[600,420],[612,640],[560,720],[480,745],[400,730],[340,660]]],
      lead: "The fan is the big wheel of blades at the front. It does most of the work of pushing the plane forward.",
      facts: [
        "The blades are twisted, like a propeller, so each part of the blade meets the air at the right angle.",
        "At full power the tips of the blades move faster than the speed of sound.",
        "The pointed spinner in the middle is painted with a swirl on some planes, so ground crew can see when it is turning."
      ],
      numbers: [["38", "fan blades on many 747 engines"]],
      what: "The large front fan of the cut-away turbofan engine: the intake lip, many wide twisted fan blades around a pointed spinner, and the fan case around them."
    },
    {
      id: "compressor", name: "Compressor",
      polys: [[[620,400],[800,390],[810,670],[620,690]]],
      lead: "Behind the fan, row after row of small blades squeeze the air tighter and tighter.",
      facts: [
        "Each row of spinning blades pushes the air into a smaller space, like squeezing a balloon.",
        "By the end the air is squeezed to about thirty times its normal pressure, and it is very hot.",
        "Between the spinning rows are rows of blades that stay still and straighten the airflow."
      ],
      numbers: [["about 30x", "how much the air is squeezed"]],
      what: "The compressor section of the cut-away turbofan: many rows of small closely packed metal blades on drums, getting smaller toward the back, with pipes and casing around them."
    },
    {
      id: "combustor", name: "Combustion chamber",
      polys: [[[805,420],[905,420],[905,650],[805,655]]],
      lead: "In the combustion chamber, fuel is sprayed into the squeezed air and burned in a steady flame.",
      facts: [
        "A ring of nozzles sprays fuel as a fine mist, like a perfume spray, so it burns completely.",
        "The flame never touches the metal walls. A blanket of cooler air flows along them.",
        "Spark plugs light the flame when the engine starts. After that it keeps burning on its own."
      ],
      numbers: [["about 2,000°C", "inside the flame"]],
      what: "The ring-shaped combustion chamber of the cut-away turbofan, glowing orange, with a ring of fuel nozzles and pipes around it."
    },
    {
      id: "turbine", name: "Turbine and exhaust",
      polys: [[[905,400],[1100,420],[1205,470],[1205,560],[1100,625],[905,650]]],
      lead: "The hot gas rushes out through the turbine and spins it like wind spins a windmill.",
      facts: [
        "The turbine is joined to the fan and compressor by long shafts, so it keeps them turning.",
        "After the turbine, the gas leaves through the exhaust cone at the back.",
        "The hottest turbine blades are cast as a single metal crystal, which keeps them strong even when red hot."
      ],
      what: "The turbine stages and the exhaust cone at the back of the cut-away turbofan: rows of metal blades, the shaft and the tapered exhaust nozzle."
    }
  ]},
  "landing-gear": { subs: [
    {
      id: "bogie", name: "Wheels and brakes",
      polys: [[[300,460],[640,450],[640,680],[300,680]]],
      lead: "Each main gear leg carries a bogie, a frame with four wheels. Inside every wheel is a stack of brake discs.",
      facts: [
        "The brakes are made of carbon. They can glow red hot after a hard stop.",
        "Each wheel has a computer that stops it locking up and skidding, like the brakes in a car.",
        "The tyres are checked before every flight. A worn tyre is swapped in under an hour."
      ],
      numbers: [["4", "wheels on each bogie"]],
      what: "A four-wheel main landing gear bogie of the 747 with big black tyres, the brake discs and hubs visible in the wheels, the axles and the bogie beam."
    },
    {
      id: "strut", name: "Shock strut",
      polys: [[[690,370],[830,370],[830,545],[690,545]]],
      frame: [650, 350, 870, 560],
      lead: "The tall shiny leg is a giant shock absorber. It squashes when the plane lands and gently springs back.",
      facts: [
        "Inside is oil and nitrogen gas. The gas works like a spring and the oil slows the bounce.",
        "Hydraulic arms fold the whole leg up into the belly after takeoff.",
        "If the hydraulics fail, the gear can fall down on its own, pulled by its weight."
      ],
      what: "The tall polished main landing gear shock strut of the 747 with its torque links, hydraulic pipes and retraction arms, joining the wing above to the bogie below."
    }
  ]},
  galley: { subs: [
    {
      id: "trolleys", name: "Meal trolleys",
      polys: [[[387,520],[880,520],[880,815],[387,815]]],
      lead: "The metal trolleys are the same standard size on most planes, so they slide into any galley.",
      facts: [
        "Each trolley is packed full of trays on the ground and locked into its slot for takeoff.",
        "Cold air is blown through the trolley bays to keep the food and drinks fresh.",
        "A pedal at the bottom works as a brake, so a heavy trolley cannot roll away on its own."
      ],
      numbers: [["up to about 100 kg", "for a full trolley"]],
      what: "Metal airline meal trolleys with latches, handles and brake pedals in the 747 galley, with flight attendants preparing trays beside them."
    },
    {
      id: "ovens", name: "Ovens",
      polys: [[[380,245],[590,245],[590,430],[380,430]]],
      lead: "Galley ovens do not cook food from raw. They only heat meals that were cooked in a kitchen on the ground.",
      facts: [
        "Hot air or steam blows around the trays, so many meals warm up evenly at the same time.",
        "There are no open flames anywhere on a plane, so everything in the galley runs on electricity.",
        "Next to the ovens are hot water boilers and coffee makers."
      ],
      what: "A stack of stainless steel galley ovens, coffee makers and latched storage boxes built into the wall of the 747 galley."
    }
  ]},
  tail: { subs: [
    {
      id: "fin", name: "Fin structure",
      polys: [[[1107,573],[1240,387],[1413,140],[1333,400],[1280,573]]],
      lead: "Inside, the fin is built like a small wing standing upright: two strong beams with ribs between them.",
      facts: [
        "The thin skin is riveted over this frame, and together they make a light but very stiff box.",
        "Hydraulic pipes run up inside the fin to power the rudder.",
        "The fin pushes back against any sideways swing, the way the feathers keep an arrow straight."
      ],
      what: "The inside of the 747 tail fin with its skin cut away: two spars and a ladder of ribs, hydraulic pipes and cables running up inside."
    },
    {
      id: "rudder", name: "Rudder",
      polys: [[[1413,127],[1473,117],[1347,567],[1287,567]]],
      frame: [1250, 110, 1490, 580],
      lead: "The rudder is the tall flap on the back edge of the fin. Swinging it left or right turns the nose left or right.",
      facts: [
        "The pilots move it with pedals under their feet.",
        "On the 747 the rudder is split into an upper and a lower part, each moved by its own hydraulics, so one can work if the other fails.",
        "It matters most when landing in a crosswind, or if one engine stops and the plane wants to swing sideways."
      ],
      numbers: [["2", "rudder halves"]],
      what: "The rudder on the trailing edge of the 747 tail fin, with its hinge line and blue edge stripe and the actuators that move it."
    },
    {
      id: "stabiliser", name: "Horizontal stabiliser",
      polys: [[[1150,655],[1300,660],[1525,695],[1300,725],[1150,722]]],
      lead: "The small back wing is the horizontal stabiliser. The elevators hinged to its back edge point the nose up or down.",
      facts: [
        "The whole stabiliser can also tilt slowly to balance the plane as fuel is used up.",
        "Many 747-400s carry extra fuel inside the stabiliser.",
        "It works like the tail of a kite, keeping the nose from bobbing up and down."
      ],
      what: "The horizontal stabiliser of the 747 tail with its elevators along the trailing edge, swept back, partly cut away to show ribs."
    }
  ]},
  apu: { subs: [
    {
      id: "unit", name: "APU engine",
      polys: [[[840,430],[1020,430],[1020,650],[840,650]]],
      lead: "The APU is a small jet engine about the size of a fridge, hidden inside the tail cone.",
      facts: [
        "It starts from the plane's batteries, before the big engines are running.",
        "It drives a generator for electricity and blows air for the air conditioning.",
        "It can also run in flight, as a backup if a generator stops working."
      ],
      what: "The small gas-turbine auxiliary power unit inside the cut-open tail cone of the 747, with its intake duct, pipes, generator and mounting struts."
    },
    {
      id: "exhaust", name: "APU exhaust",
      polys: [[[1150,360],[1350,360],[1350,560],[1150,560]]],
      lead: "The APU's hot exhaust comes out of the pointed tip of the tail, as far from people as possible.",
      facts: [
        "Ground crew never stand right behind the tail while the APU runs, because the air is very hot.",
        "A small door opens on the tail to let air into the APU and closes again when it stops.",
        "Using the APU on the ground burns much less fuel than running a big engine."
      ],
      what: "The pointed metal exhaust nozzle at the very tip of the 747 tail cone, with heat-stained metal and riveted panels."
    }
  ]},
  pushback: { subs: [
    {
      id: "towbar", name: "Towbar",
      polys: [[[930,420],[1110,420],[1110,510],[930,510]]],
      frame: [900, 380, 1130, 530],
      lead: "The towbar is the strong metal arm that links the tug to the nose wheels.",
      facts: [
        "Each kind of plane needs its own towbar, shaped to fit its nose gear.",
        "It has a shear pin, a small bolt that snaps on purpose if the tug pulls too hard, to protect the plane.",
        "Some modern tugs have no towbar at all. They scoop the nose wheels up and carry them."
      ],
      what: "A yellow aircraft towbar with its hitch and wheels joining the pushback tug to the axle of the 747 nose landing gear."
    },
    {
      id: "nose-gear", name: "Nose landing gear",
      polys: [[[1010,140],[1265,140],[1265,495],[1010,495]]],
      lead: "The nose gear has two wheels. It steers the plane when it drives slowly on the ground.",
      facts: [
        "The captain steers with a small wheel called a tiller, next to the seat.",
        "Before pushback, the crew put in a pin that disconnects the steering, so the tug can turn the wheels freely.",
        "After takeoff the nose gear folds forward into the belly under the cockpit."
      ],
      numbers: [["2", "nose wheels"]],
      what: "The 747 nose landing gear: a polished shock strut with torque links and steering cylinders, two black tyres, and the open gear doors under the nose."
    }
  ]},
  baggage: { subs: [
    {
      id: "belt-loader", name: "Belt loader",
      polys: [[[693,300],[1035,300],[1035,640],[693,640]]],
      lead: "A belt loader is a moving ramp on wheels. It carries suitcases from the ground up into the hold.",
      facts: [
        "The belt can run upward for loading or downward for unloading.",
        "The driver raises the top end to exactly the height of the cargo door.",
        "Rubber bumpers stop the loader from scratching the plane."
      ],
      what: "A conveyor belt loader truck parked at the open cargo door of the 747, its sloping belt carrying colourful suitcases up into the hold, with handlers in hi-vis vests."
    },
    {
      id: "carts", name: "Baggage carts",
      polys: [[[360,625],[1190,625],[1190,815],[360,815]]],
      frame: [560, 610, 1190, 820],
      lead: "A little tug pulls a train of baggage carts from the airport's sorting hall to the plane.",
      facts: [
        "The carts have sides or curtains, so no bag can fall off on the bumpy ride.",
        "Bags for the same city are kept together, and bags that must change planes are loaded last so they come off first.",
        "Handlers lift heavy suitcases all day, so they learn to bend their knees, not their backs."
      ],
      what: "A small airport baggage tug pulling three wheeled baggage carts full of colourful suitcases across the apron, with a handler walking beside them."
    }
  ]},
  catering: { subs: [
    {
      id: "box", name: "Catering box",
      polys: [[[947,200],[1373,200],[1373,495],[947,495]]],
      lead: "The white box on top of the truck is a small cold room on stilts, full of meal trolleys.",
      facts: [
        "It is cooled, so the food stays fresh on the way from the airport kitchen.",
        "A platform at the front slides out to bridge the gap to the plane's door.",
        "Caterers roll fresh trolleys in and bring the used ones back out."
      ],
      what: "The insulated white box of the catering truck raised high beside the 747, with its front platform, open rear door and caterers in hi-vis vests."
    },
    {
      id: "scissor", name: "Scissor lift",
      polys: [[[920,495],[1280,495],[1280,650],[920,650]]],
      lead: "Folding metal arms, crossed like a pair of scissors, push the box straight up into the air.",
      facts: [
        "A hydraulic ram pushes the arms apart, and the box rises slowly and evenly.",
        "Legs fold down from the truck before lifting, so it cannot tip over.",
        "The same idea is used by the lifts that reach high shelves in warehouses."
      ],
      what: "The black crossed scissor arms and hydraulic ram of the catering high-loader truck, lifting the box above the truck chassis, with folding stabiliser legs."
    }
  ]},
  "fuel-truck": { subs: [
    {
      id: "panel", name: "Refuelling point",
      polys: [[[400,110],[520,110],[520,220],[400,220]]],
      frame: [380, 90, 540, 240],
      lead: "Fuel goes in through sockets under the wing. The hose snaps on with a tight seal, so not a drop is spilled.",
      facts: [
        "The fuel is pumped in under pressure, which fills the tanks far faster than pouring.",
        "On a small panel, the crew set how much fuel each tank should get.",
        "Valves inside close by themselves when a tank is full."
      ],
      what: "The refuelling coupling under the 747 wing with the thick black fuel hose clipped into it, the small open panel with gauges, and the riveted underside of the wing."
    }
  ]}
};
