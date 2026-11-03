// Exhibit content for the tram, front to back. Facts are for a generic modern
// 100% low-floor articulated city tram. Hotspot shapes live in hotspots.js.
window.PARTS = [
  {
    id: "pantograph", name: "Pantograph", note: "Springy arms press up on the wire to take the power.",
    zone: "On the roof",
    lead: "The folding arms on the roof are the pantograph. They push a strip up against the wire and collect the electricity that drives the tram.",
    facts: [
      "Springs push the arms up all the time, so the strip stays touching the wire even over bumps.",
      "The strip at the top is made of carbon, like a very hard pencil lead. It slides along the wire and wears out instead of the wire.",
      "When the tram goes to sleep in the depot, the driver lowers the pantograph with a button."
    ],
    numbers: [["600-750 V", "in the wire, about 50 times a car battery"]],
    spot: "Find the zig-zag arms on the roof and the little bar that touches the wire."
  },
  {
    id: "wire", name: "Overhead wire", note: "One copper wire above the street carries the power.",
    zone: "Above the street",
    lead: "A single copper wire hangs above the tracks along the whole city. It is how the electricity reaches the tram.",
    facts: [
      "The wire is held up by thin cross-wires on poles, and pulled tight with heavy weights so it does not sag in summer.",
      "It zig-zags a little from side to side, so it does not wear a groove in one spot of the pantograph strip.",
      "The electricity goes down through the tram, into the motors and back home through the rails."
    ],
    numbers: [["about 1 cm", "thick copper wire"]],
    spot: "Follow the wire from pole to pole above the tram."
  },
  {
    id: "roof", name: "Roof equipment", note: "The tram's machine room is up on the roof.",
    zone: "On the roof",
    lead: "Because the floor is so low, there is no room for machines underneath. So most of them live on the roof.",
    facts: [
      "Boxes called inverters change the electricity from the wire into exactly what the motors need, to go faster or slower.",
      "Air conditioning units keep the passengers cool in summer and warm in winter.",
      "When the tram brakes, the motors make electricity. If nobody else can use it, it is turned into heat in a box called a resistor."
    ],
    numbers: [["many tonnes", "of equipment on the roof"]],
    spot: "Find the big grey boxes with grilles on top of the tram."
  },
  {
    id: "cab", name: "Driver's cab", note: "The driver sits at the front, with no steering wheel.",
    zone: "At the front",
    lead: "The driver sits behind the big front window. There is a desk with screens and one handle that makes the tram go and stop.",
    facts: [
      "There is no steering wheel! The rails steer the tram. The driver only chooses how fast it goes.",
      "Push the handle forward to speed up, pull it back to brake. In the middle the tram just rolls.",
      "Many trams have a cab at both ends, so at the end of the line the driver simply walks to the other end and drives back."
    ],
    numbers: [["0", "steering wheels"]],
    spot: "Look for the driver's hand on the handle."
  },
  {
    id: "front-bogie", name: "Motor bogie", note: "Electric motors turn the wheels.",
    zone: "Under the front",
    lead: "Under the tram are bogies: small frames with four wheels each. Some of them have electric motors that turn the wheels.",
    facts: [
      "The electric motor spins very fast, so a gearbox slows it down and makes it stronger before it turns the wheels.",
      "The bogie can swivel a little, so the tram can follow curves in the track.",
      "Rubber springs between the wheels and the tram make the ride smooth and quiet."
    ],
    numbers: [["4", "wheels on each bogie"]],
    spot: "Find the round motor next to the big front wheel."
  },
  {
    id: "saloon", name: "Passenger saloon", note: "Room to sit, stand, and park a pushchair.",
    zone: "Inside",
    lead: "Inside, the tram is one long room. People sit, stand and hold on to the yellow poles and straps.",
    facts: [
      "The poles are bright yellow so they are easy to see and grab when the tram starts or stops.",
      "There is a wide space with no seats for pushchairs and wheelchairs.",
      "Screens show the name of the next stop, and a voice says it too."
    ],
    numbers: [["about 200", "passengers on a long tram"]],
    spot: "Find the pushchair parked in the tram."
  },
  {
    id: "doors", name: "Doors and low floor", note: "No steps: the floor is level with the stop.",
    zone: "Doors",
    lead: "The floor is so low that you walk straight in from the stop, without any steps. That is why it is called a low-floor tram.",
    facts: [
      "To keep the floor low, the wheels hide under the seats and the machines live on the roof.",
      "The doors slide open wide, so many people can get on and off quickly.",
      "Rubber edges on the doors feel if someone is in the way, and the doors open again."
    ],
    numbers: [["about 30 cm", "from the rail to the floor"]],
    spot: "Find someone stepping in through an open door."
  },
  {
    id: "joint", name: "Articulation", note: "Bendy joints let a long tram turn corners.",
    zone: "Between the sections",
    lead: "A long tram is made of several sections, joined by bendy joints. It can wiggle around tight city corners like a caterpillar.",
    facts: [
      "The black folds are like an accordion. They stretch on the outside of a curve and squeeze on the inside.",
      "Inside the joint, the floor is a round turning plate, so you can walk from one section to the next.",
      "Without joints, a tram this long could never get around the corners of old streets."
    ],
    numbers: [["5", "sections in this tram"]],
    spot: "Count the black accordion joints."
  },
  {
    id: "bogie", name: "Wheels and brakes", note: "Steel wheels, and three kinds of brake.",
    zone: "Under the middle",
    lead: "The wheels are made of steel, and they roll on steel rails. That is why trams are so smooth and use so little energy.",
    facts: [
      "Normally the motors brake the tram, and make electricity while they do it.",
      "Disc brakes, like on a bicycle, hold the tram still at the stop.",
      "For an emergency, magnets drop down onto the rails and grip them hard."
    ],
    numbers: [["3", "kinds of brake"]],
    spot: "Find the wheels under the middle section."
  },
  {
    id: "rails", name: "Grooved rails", note: "Rails sunk into the street, with a slot for the wheel.",
    zone: "In the street",
    lead: "Tram rails are set into the street, level with the cobbles, so cars and bikes can cross them.",
    facts: [
      "Each rail has a narrow groove. The rim on the inside of the wheel runs in it and keeps the tram on the track.",
      "The rails also carry the electricity back to the power station.",
      "Cyclists cross tram rails at a steep angle, so their tyre does not slip into the groove."
    ],
    numbers: [["1435 mm", "between the rails, in many cities"]],
    spot: "Find the two shiny rails in the cobbles."
  },
  {
    id: "points", name: "Switch points", note: "Moving blades choose which way the tram goes.",
    zone: "In the street",
    lead: "Where tracks split, a switch decides which way the tram goes. The tram cannot steer, so the track steers it.",
    facts: [
      "Two thin steel blades slide sideways. They guide the wheels onto the left or the right track.",
      "A small motor in a box under the street moves the blades. Some switches are worked by the driver from the cab.",
      "In winter, little heaters in the switch melt the snow so the blades can still move."
    ],
    numbers: [["a few cm", "is all the blades move"]],
    spot: "Find where the rails split into two."
  },
  {
    id: "stop", name: "Tram stop", note: "A shelter, a ticket machine and a raised kerb.",
    zone: "At the stop",
    lead: "At the stop, people wait under a glass shelter. The kerb is raised so it is level with the tram floor.",
    facts: [
      "A ticket machine sells tickets, and some trams have one on board too.",
      "A screen at the stop tells you how many minutes until the next tram.",
      "Stand behind the line on the kerb until the tram has stopped."
    ],
    numbers: [["every few minutes", "a tram at busy stops"]],
    spot: "Find the red ticket machine."
  }
];
