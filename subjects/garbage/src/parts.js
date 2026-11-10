// Exhibit content for the garbage truck, in the order of the tour. Facts are for a generic modern
// two-axle rear-loader refuse truck in a European city. Hotspot shapes live in hotspots.js.
window.PARTS = [
  {
    id: "cab", name: "Low cab", note: "The crew climbs in and out all morning.",
    zone: "At the front",
    lead: "The driver and the crew ride in the cab. Its floor is low, so they can hop in and out with just one small step.",
    facts: [
      "The truck stops every few houses, so the crew gets in and out again and again.",
      "Big windows and mirrors help the driver see cyclists and children around the truck.",
      "The driver steers with a wheel and drives very slowly from bin to bin."
    ],
    numbers: [["hundreds", "of bins emptied in one round"]],
    spot: "Find the driver's hands on the steering wheel."
  },
  {
    id: "engine", name: "Engine", note: "A big diesel engine sits under the cab.",
    zone: "Under the cab",
    lead: "Under the cab is a big engine. It drives the wheels, and it also powers the machines that lift, squash and push the rubbish.",
    facts: [
      "The radiator at the very front keeps the engine cool.",
      "While the truck stands still and the crew is loading, the engine keeps turning a pump for the machines.",
      "Some new garbage trucks have electric motors and big batteries instead, so they are quiet and make no smoke."
    ],
    numbers: [["about 3", "family cars' worth of engine power"]],
    spot: "Find the radiator grille at the front of the engine."
  },
  {
    id: "wheels", name: "Wheels", note: "Two wheels at the front, four at the back.",
    zone: "Under the truck",
    lead: "The truck has two axles. At the front there is one wheel on each side, and at the back two wheels side by side, because the back carries the heavy rubbish.",
    facts: [
      "Twin wheels at the back share the weight, so each tyre carries less.",
      "A long spinning shaft takes the power from the engine back to the rear wheels.",
      "Strong air brakes stop the heavy truck safely, even when it is full."
    ],
    numbers: [["6", "tyres in total"], ["about 18 tonnes", "when full, as heavy as three elephants"]],
    spot: "Look at the back wheels. Two tyres side by side!"
  },
  {
    id: "fuel", name: "Fuel tank", note: "A big shiny tank of diesel.",
    zone: "Between the wheels",
    lead: "The shiny silver box between the wheels is the fuel tank. It holds the diesel the engine burns.",
    facts: [
      "Stopping and starting all day uses a lot of fuel, much more than driving along a road.",
      "The truck fills up at the depot, before or after its round.",
      "The tank holds enough for a whole day of collecting."
    ],
    numbers: [["a few hundred litres", "of diesel in the tank"]],
    spot: "Find the big silver tank between the wheels."
  },
  {
    id: "hydraulics", name: "Oil pump and tank", note: "Oil under pressure is the truck's muscle.",
    zone: "Between the wheels",
    lead: "The engine turns a pump that pushes oil through thick hoses. The pushed oil moves every machine on the truck.",
    facts: [
      "The oil pushes on pistons inside long metal tubes called cylinders, and the cylinders slide out with great force.",
      "The black box is the oil tank. The oil goes round and round: from the tank, to the cylinders, and back.",
      "This kind of oil power is called hydraulics. Diggers and cranes use it too."
    ],
    numbers: [["about 100 times", "the pressure in a car tyre"]],
    spot: "Follow the black hoses from the pump up to the body."
  },
  {
    id: "body", name: "The big box", note: "All the squashed rubbish rides in here.",
    zone: "In the middle",
    lead: "The big box behind the cab is where the rubbish goes. It is pressed together so tightly that much more fits in.",
    facts: [
      "Squashed rubbish takes up a few times less space, so the truck can visit many more streets before it is full.",
      "The box is closed, so nothing blows away and the street stays clean.",
      "A full truck drives to a sorting plant, or to a plant that burns rubbish to make electricity and heat for homes."
    ],
    numbers: [["about 16 m³", "of space, a small room full of rubbish"]],
    spot: "Find a black rubbish bag squashed in the box."
  },
  {
    id: "ejector", name: "Push-out wall", note: "A sliding wall pushes the rubbish out at the end.",
    zone: "At the front of the box",
    lead: "At the front of the box stands a steel wall that can slide. When the truck is full, it pushes all the rubbish out of the back.",
    facts: [
      "A very long cylinder, made of tubes inside tubes, stretches out to push the wall.",
      "While the truck fills up, the wall holds the rubbish tight, and slowly slides towards the cab to make room.",
      "To empty the truck, the whole back of the truck lifts up and the wall pushes everything out."
    ],
    numbers: [["1", "wall pushes out the whole load"]],
    spot: "Find the long shiny tube behind the wall."
  },
  {
    id: "packer", name: "Packer blade", note: "A strong blade scoops and squashes the rubbish.",
    zone: "At the back",
    lead: "In the back of the truck is a big curved blade. It scoops the rubbish up out of the hopper and squashes it into the box.",
    facts: [
      "Strong cylinders move the blade: some slide it up and down, others swing it like a scoop.",
      "It goes round in a loop: down, scoop, up and push, again and again.",
      "It is strong enough to crush boxes, bottles and even an old chair."
    ],
    numbers: [["less than half a minute", "for one scoop and squash"]],
    spot: "Find the two shiny cylinders that move the blade."
  },
  {
    id: "hopper", name: "Hopper", note: "The low trough where the rubbish falls in.",
    zone: "At the back",
    lead: "The hopper is the low trough at the very back. The rubbish from the bins falls in here first.",
    facts: [
      "It is low, so workers can also throw in bags by hand.",
      "When the hopper is full, the packer blade sweeps it clean.",
      "Nobody may ever climb into the hopper. The blade is far too strong."
    ],
    numbers: [["about 1 m", "above the street"]],
    spot: "Find the rubbish falling out of the bin into the hopper."
  },
  {
    id: "lifter", name: "Bin lifter", note: "Steel teeth lift the bin and tip it upside down.",
    zone: "On the back",
    lead: "The bin lifter grabs a bin under its front edge with steel teeth, lifts it up and turns it upside down over the hopper.",
    facts: [
      "The worker presses a button and the lifter does all the heavy lifting.",
      "Many lifters give the bin a little shake at the top, so nothing stays stuck inside.",
      "Then it puts the bin gently back down on the pavement."
    ],
    numbers: [["a few seconds", "to empty one bin"]],
    spot: "Find the green bin turned upside down."
  },
  {
    id: "lights", name: "Lights and camera", note: "Flashing lights warn everyone, a camera looks behind.",
    zone: "On the roof",
    lead: "The orange lights on the roof flash to tell everyone: careful, the truck is working here!",
    facts: [
      "There are flashing lights on the cab and on the back, so they can be seen from both ends.",
      "The driver cannot see behind the truck, so a small camera above the hopper shows it on a screen in the cab.",
      "When the truck reverses, it beeps loudly."
    ],
    numbers: [["4", "orange lights flashing"]],
    spot: "Find the little camera at the top of the back."
  },
  {
    id: "crew", name: "Crew", note: "Workers in bright clothes bring the bins.",
    zone: "On the pavement",
    lead: "The crew rolls the bins to the truck, hooks them on the lifter and puts them back. They work in every weather.",
    facts: [
      "Their clothes are bright orange with shiny stripes, so drivers see them even in the dark.",
      "They wear strong gloves and boots to keep their hands and feet safe.",
      "Many children wave to the crew, and the crew often waves back!"
    ],
    numbers: [["2", "workers at the back"]],
    spot: "Find the worker pressing the button."
  },
  {
    id: "bins", name: "Wheelie bins", note: "Bins on wheels wait on the pavement.",
    zone: "On the pavement",
    lead: "People put their rubbish in bins with wheels and a lid. On collection day the bins wait on the pavement.",
    facts: [
      "The lid keeps out rain, birds and smells.",
      "Many towns have different bins for different things: plastic and cans, paper, glass, and everything else.",
      "The rim at the top of the bin is shaped to fit the teeth of the lifter."
    ],
    numbers: [["240 litres", "in a big bin, about a full bathtub"]],
    spot: "Count the bins on the pavement. Can you find the cat watching?"
  }
];
