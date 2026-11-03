// Level 3 inside the tram: outlines in pixels of the part's detail tile (1536 x 1024,
// tram/art/zoom/tiles/<part>.png). "what" describes the area for the repaint prompt.
window.ZOOM = {
  pantograph: { subs: [
    {
      id: "strip", name: "Contact strip",
      polys: [[[991,  300],  [691,  300],  [691,  205],  [991,  205]]],
      lead: "At the very top is a bar with a strip of carbon. It is the only part of the tram that touches the wire.",
      facts: [
        "Carbon is soft and slippery, so it slides along the copper wire without scratching it.",
        "The strip wears down slowly and is swapped for a new one every few months.",
        "In winter, a little spark can sometimes flash when the strip touches ice on the wire."
      ],
      what: "The top of the tram pantograph: the bow-shaped head with its carbon contact strip pressing up against the copper overhead wire, small springs and horns at the ends."
    },
    {
      id: "arms", name: "Arms and springs",
      polys: [[[916,  800],  [536,  800],  [536,  290],  [916,  290]]],
      frame: [526.0, 280, 936.0, 810],
      lead: "The arms fold like a knee. Big springs push them up all the time, so the strip stays on the wire even over bumps.",
      facts: [
        "If the wire goes higher or lower, the arms simply open or close a little.",
        "To lower the pantograph, a small motor or air cylinder pulls the arms down against the springs.",
        "The arms are light and stiff, so they can follow the wire quickly at full speed."
      ],
      what: "The red folding arms of the tram pantograph bending like a knee, with the long coiled lifting springs and the joints, against plain paper."
    },
    {
      id: "base", name: "Insulators",
      polys: [[[916,  830],  [536,  830],  [536,  760],  [916,  760]]],
      frame: [516.0, 730, 936.0, 850],
      lead: "The pantograph stands on little ridged feet called insulators. They stop the electricity from getting into the tram's metal body.",
      facts: [
        "Electricity cannot flow through the insulators, so the roof stays safe.",
        "Their ridges make the path for electricity longer, even when they are wet with rain.",
        "From the pantograph, the electricity goes into a thick cable instead."
      ],
      what: "The base of the tram pantograph on the roof: its steel frame standing on ridged insulators, the thick power cable leaving it, roof equipment around."
    }
  ]},
  cab: { subs: [
    {
      id: "handle", name: "Speed handle",
      polys: [[[926,  720],  [756,  720],  [756,  560],  [926,  560]]],
      frame: [716.0, 520, 976.0, 740],
      lead: "The driver controls the tram with one handle. Forward makes it go faster, back makes it slow down.",
      facts: [
        "If the driver lets go of the handle for too long, the tram stops by itself, in case the driver feels unwell.",
        "Pulled all the way back, the handle also drops the magnetic brakes onto the rails.",
        "There is no steering wheel: the rails steer."
      ],
      what: "The driver's hand on the single speed-control handle on the tram cab desk, with buttons for the doors and the bell and two small screens."
    },
    {
      id: "windscreen", name: "Windscreen",
      polys: [[[836,  440],  [656,  820],  [436,  820],  [436,  700],  [656,  240],  [896,  240]]],
      lead: "The big curved window gives the driver a wide view of the street, the people and the cars.",
      facts: [
        "A tram is long and cannot swerve, so the driver must watch far ahead.",
        "The glass is heated in winter so it never mists over.",
        "Mirrors and cameras let the driver see the doors along the whole tram."
      ],
      what: "The large curved windscreen of the tram cab with its wiper, seen from outside, with the driver behind it and reflections of the sky."
    },
    {
      id: "machine", name: "Ticket machine",
      polys: [[[556,  510],  [426,  510],  [426,  190],  [556,  190]]],
      lead: "At the stop, a machine sells tickets. You choose a ticket and pay with coins or a card.",
      facts: [
        "Many cities also let you buy a ticket with your phone.",
        "Inside the tram, a small box stamps or reads the ticket.",
        "Children travel cheaper, and the youngest travel free in many cities."
      ],
      what: "The red ticket machine at the tram stop with its screen, buttons and coin slot (no readable text), a passenger standing next to it."
    }
  ]},
  "front-bogie": { subs: [
    {
      id: "motor", name: "Motor and gears",
      polys: [[[1096,  620],  [836,  620],  [836,  470],  [1096,  470]]],
      lead: "The electric motor spins very fast. A box of gears slows it down and makes it strong enough to push the heavy tram.",
      facts: [
        "Electric motors are quiet and do not make smoke.",
        "Some modern trams have a small motor inside each wheel instead.",
        "Fans blow cool air through the motor, because it gets warm."
      ],
      what: "The tram's electric traction motor and gearbox between the wheels of the bogie: a ribbed metal cylinder, the gear housing, cables and cooling ducts."
    },
    {
      id: "wheel", name: "Steel wheel",
      polys: [[[866,  670],  [686,  670],  [686,  470],  [866,  470]]],
      frame: [656.0, 450, 896.0, 690],
      lead: "Tram wheels are steel, with a small rim on the inside. The rim runs in the groove of the rail and keeps the tram on the track.",
      facts: [
        "Steel on steel rolls very easily, so a tram uses little energy.",
        "A rubber ring inside the wheel makes it quieter.",
        "The wheels are measured often, and reshaped on a special lathe when they wear."
      ],
      what: "A tram steel wheel on its grooved rail, close up: the flange running in the rail groove, the rubber-cushioned hub, the brake disc beside it."
    },
    {
      id: "sand", name: "Sand box",
      polys: [[[736,  700],  [636,  700],  [636,  620],  [736,  620]],  [[856,  420],  [716,  420],  [716,  330],  [856,  330]]],
      frame: [616.0, 320, 866.0, 710],
      lead: "When the rails are wet or icy, the wheels can slip. So the tram can sprinkle a little sand in front of them.",
      facts: [
        "The sand is kept in a box and blown down a pipe right in front of the wheel.",
        "It works like sand on an icy path: it gives grip.",
        "The tram does it by itself when it feels the wheels starting to slip."
      ],
      what: "The tram's sand pipe pointing down at the rail in front of a wheel, with the small sand box above it among the pipes of the bogie."
    }
  ]},
  points: { subs: [
    {
      id: "blades", name: "Switch blades",
      polys: [[[1276,  500],  [736,  560],  [736,  470],  [1276,  400]]],
      lead: "The switch blades are long thin pieces of rail. They slide sideways to point the wheels one way or the other.",
      facts: [
        "Only one blade touches the rail at a time; the other stands open.",
        "They move just a few centimetres, but that is enough.",
        "In winter they are heated, so snow and ice cannot block them."
      ],
      what: "The two thin moving switch blades of the tram points set in the cobbled street, one pressed against the rail and one standing open, with the rails curving away."
    },
    {
      id: "motor-box", name: "Switch motor",
      polys: [[[1156,  650],  [936,  650],  [936,  520],  [1156,  520]]],
      frame: [896.0, 500, 1176.0, 670],
      lead: "Under a steel lid in the street is a small motor. It pushes and pulls a rod that moves the blades.",
      facts: [
        "The driver can set the points with a button in the cab, or a computer does it.",
        "The motor locks the blades firmly in place before the tram arrives.",
        "Workers can open the lid to check and grease the motor."
      ],
      what: "The open switch motor box set into the cobblestones beside the tram points, with the motor, the push rod and cables, the steel lid lifted."
    }
  ]}
};
