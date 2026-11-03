// Exhibit content for each clickable part, ordered nose to tail for the tour.
// Facts are for a Boeing 747-400. Hotspot shapes live in hotspots.js.
window.PARTS = [
  {
    id: "radar",
    name: "Weather radar",
    note: "A radar dish in the nose looks far ahead for storms.",
    zone: "The nose",
    lead: "Behind the smooth, rounded nose cone hides a radar dish that sweeps from side to side, looking far ahead for storms.",
    facts: [
      "The radar sends out invisible radio waves. Raindrops and hail bounce them back, and the pilots see the clouds as colored blobs on a screen.",
      "Green means light rain, yellow is heavier, and red or purple means a big storm the pilots will fly around.",
      "The nose cone is made of a special material that radio waves can pass through. Metal would block them."
    ],
    numbers: [["hundreds of km", "how far ahead the radar can see"]],
    spot: "Look for the round dish just behind the tip of the nose."
  },
  {
    id: "cockpit",
    name: "Flight deck",
    note: "Two pilots fly the plane from the top of the nose.",
    zone: "Upstairs at the front",
    lead: "The pilots sit up here, at the very front of the upper deck, with the whole sky in front of them.",
    facts: [
      "Two pilots fly the 747-400: the captain on the left and the first officer on the right. Older 747s also needed a flight engineer.",
      "Six big screens replaced most of the old dials. The cockpit went from 971 lights, gauges and switches down to 365.",
      "The autopilot can fly the plane for most of the trip, but the pilots watch everything and always do the takeoff themselves."
    ],
    numbers: [["2", "pilots at the controls"], ["6", "main display screens"]],
    spot: "Find the two pilots and the control wheels in front of them."
  },
  {
    id: "avionics",
    name: "Electronics bay",
    note: "Racks of computers under the floor run the plane.",
    zone: "Under the flight deck",
    lead: "Below the cockpit floor is a room packed with shelves of computers. This is the plane's brain.",
    facts: [
      "These boxes run the autopilot, the radios, the navigation and the screens in the cockpit.",
      "Fans keep the electronics cool, because all those computers make a lot of heat.",
      "Engineers can climb down through a hatch to check or swap a box between flights."
    ],
    numbers: [["many dozens", "computer boxes on the racks"]],
    spot: "Look for the tall racks of grey boxes under the cockpit."
  },
  {
    id: "upper-deck",
    name: "Upper deck",
    note: "The famous hump is a whole second floor.",
    zone: "The famous hump",
    lead: "The bump on top is a whole second floor. It makes the 747, nicknamed the Queen of the Skies, easy to spot.",
    facts: [
      "The hump was first planned so the 747 could become a cargo plane with a nose that swings open. The cockpit had to sit up high, out of the way.",
      "The space behind the cockpit was too good to waste, so airlines filled it with seats. Some early 747s even had a lounge bar up here.",
      "On the 747-400 a staircase connects the upper deck to the main deck below."
    ],
    numbers: [["2", "passenger floors"], ["1969", "first flight of the 747"]],
    spot: "Find the stairs that lead up to the second floor."
  },
  {
    id: "first-class",
    name: "First class",
    note: "The roomiest seats ride in the quiet nose.",
    zone: "Main deck, in the nose",
    lead: "The roomiest seats sit right in the nose, under the cockpit, where it is quiet and far from the engines.",
    facts: [
      "On many 747s these seats fold flat into a bed for sleeping on long night flights.",
      "The nose of the 747 is so wide that people sit side by side in a cabin shaped like a rounded room.",
      "Passengers up front are the first off the plane when it lands."
    ],
    numbers: [["around a dozen", "first class seats on many 747-400s"]],
    spot: "Look for the big seats at the very front of the main deck."
  },
  {
    id: "cabin",
    name: "Passenger cabin",
    note: "Ten seats across and two aisles on the main deck.",
    zone: "Main deck",
    lead: "Most travellers ride here, in long rows of seats with two aisles, so you can walk around even at 10 kilometres up.",
    facts: [
      "In economy there are usually ten seats in each row: three by the window, four in the middle, three by the other window.",
      "The cabin is pumped full of air so everyone can breathe normally. Outside, the air is far too thin, and about minus 50 degrees.",
      "Each window has three panes. The middle one has a tiny hole that keeps the air pressure between the panes even."
    ],
    numbers: [["about 416", "passengers with three classes"], ["10", "seats across in economy"]],
    spot: "Find a passenger putting a bag in the overhead bin."
  },
  {
    id: "galley",
    name: "Galley",
    note: "The kitchen, where meals are heated in ovens.",
    zone: "The kitchen",
    lead: "The galley is the plane's kitchen. Meals are cooked on the ground, then heated in small ovens during the flight.",
    facts: [
      "Food and drinks arrive in metal trolleys from the catering truck. The same trolleys roll down the aisle at mealtime.",
      "Up high your sense of taste gets weaker, so airline food is often made a little saltier and spicier.",
      "Everything has a latch or a lock, so nothing can slide around if the plane bumps through some turbulence."
    ],
    numbers: [["hundreds", "meals loaded for a long flight"]],
    spot: "Look for the trolleys and the crew in the kitchen."
  },
  {
    id: "cargo",
    name: "Cargo hold",
    note: "Suitcases travel in containers under the floor.",
    zone: "Under the floor",
    lead: "Beneath the passengers is a huge basement for suitcases, mail and freight.",
    facts: [
      "Bags are packed into metal containers shaped to fit the round belly of the plane. They roll in on little wheels built into the floor.",
      "Loose bags go up a conveyor belt truck and into a separate hold at the back.",
      "Part of the hold is heated, so pets can travel safely too."
    ],
    numbers: [["about 30", "luggage containers fit below"]],
    spot: "Follow a suitcase up the belt loader and into the hold."
  },
  {
    id: "wing",
    name: "Wing and fuel tanks",
    note: "The wings lift the plane and hold its fuel.",
    zone: "The wing",
    lead: "The wings lift the plane into the sky, and they are also giant fuel tanks.",
    facts: [
      "Air rushing over the curved wing pushes it upward. That push is called lift.",
      "Inside, the wing is built like a ladder of ribs and long beams called spars. The fuel fills the spaces in between.",
      "The 747-400 has little upturned tips called winglets. They make the air swirl less at the wingtip, which saves fuel."
    ],
    numbers: [["216,840 litres", "of fuel, about 1,400 bathtubs"], ["64.4 m", "from wingtip to wingtip"]],
    spot: "Find the fuel truck and the hose going up into the wing."
  },
  {
    id: "flaps",
    name: "Flaps and ailerons",
    note: "Panels slide out for extra lift.",
    zone: "Edges of the wing",
    lead: "The wing can change shape. Panels slide out at the back and the front to give extra lift when flying slowly.",
    facts: [
      "For takeoff and landing, the big flaps slide backward and down. The 747 uses flaps split into three parts.",
      "At the front, flaps fold down from under the wing's leading edge.",
      "Ailerons near the wingtips tip up and down to roll the plane into a turn. Spoilers pop up on top to slow it down."
    ],
    numbers: [["3", "slots in the big inner flaps"]],
    spot: "Look along the back edge of the wing for the moving panels."
  },
  {
    id: "engine",
    name: "Jet engine",
    note: "A giant fan with a fire inside pushes the plane.",
    zone: "Under the wing",
    lead: "Four huge engines push the 747 forward. Each one is a giant fan with a fire inside.",
    facts: [
      "The big front fan sucks in air. Most of it blows straight out the back around the engine, and that gives most of the push.",
      "Some air goes into the middle. It is squeezed, mixed with fuel and burned. The hot gas spins the turbine, and the turbine spins the fan.",
      "The fire inside is hotter than lava, so the turbine blades are cooled by air flowing through tiny holes in them."
    ],
    numbers: [["4", "engines"], ["over 2 m", "across the front fan"]],
    spot: "Find the fan blades at the front of the cut-open engine."
  },
  {
    id: "landing-gear",
    name: "Landing gear",
    note: "Eighteen wheels fold up into the belly.",
    zone: "The wheels",
    lead: "The 747 stands on 18 wheels. After takeoff they fold up into the belly, like a bird tucking in its feet.",
    facts: [
      "Two wheels sit under the nose and steer the plane on the ground. Sixteen more carry most of the weight in the middle.",
      "The tyres are filled with nitrogen gas instead of air, because it stays steady when the tyres get hot or very cold.",
      "All 16 main wheels have strong brakes. Together they stop a plane as heavy as about 65 big elephants."
    ],
    numbers: [["18", "wheels"], ["about 397 t", "heaviest takeoff weight"]],
    spot: "Count the wheels on the main landing gear."
  },
  {
    id: "fuselage",
    name: "Fuselage",
    note: "A thin metal tube held in shape by rings.",
    zone: "The body",
    lead: "The plane's long body is a tube made of thin aluminium skin, held in shape by rings and long strips inside.",
    facts: [
      "The rings are called frames and the long strips are called stringers. Together they work like the bones of the plane.",
      "The skin is only a few millimetres thick in most places, yet it holds in the cabin air at every flight.",
      "Windows have rounded corners because round shapes spread the push of the air much better than square ones."
    ],
    numbers: [["70.6 m", "long, nose to tail"], ["6.1 m", "wide inside the cabin"]],
    spot: "Find the rings of the frames where the skin is peeled away."
  },
  {
    id: "bulkhead",
    name: "Pressure bulkhead",
    note: "A strong dome seals in the cabin air.",
    zone: "End of the cabin",
    lead: "At the back of the cabin is a big dome shaped like an umbrella. It seals in the air that passengers breathe.",
    facts: [
      "Behind the dome, the tail is open to the outside air. In front of it, the cabin is pressurised.",
      "A dome shape is very strong, the same way an egg is hard to squeeze from its ends.",
      "Inside the cabin it feels like being on a mountain about 2,400 metres high, even when the plane flies at 11,000 metres."
    ],
    numbers: [["2,400 m", "how high the cabin feels"]],
    spot: "Look for the curved wall where the cabin ends."
  },
  {
    id: "apu",
    name: "Auxiliary power unit",
    note: "A small engine in the tail powers the plane at the gate.",
    zone: "In the tail cone",
    lead: "The very tip of the tail holds a small jet engine. It powers the plane while it waits at the gate.",
    facts: [
      "It is called the APU. It makes electricity for the lights and the kitchen, and air for keeping the cabin cool.",
      "Its air is also used to start the four big engines before the plane leaves the gate.",
      "If you see a little shimmer of heat at the end of the tail on the ground, the APU is running."
    ],
    numbers: [["1", "small extra engine"]],
    spot: "Find the small exhaust hole at the very end of the tail."
  },
  {
    id: "recorder",
    name: "Flight recorders",
    note: "The “black box” is really bright orange.",
    zone: "Near the tail",
    lead: "Everyone calls them black boxes, but they are bright orange so they are easy to find.",
    facts: [
      "There are two. One records hundreds of measurements, like speed and height. The other records the voices in the cockpit.",
      "They sit near the tail and are built to be extremely tough, with thick armour and insulation.",
      "Engineers use the recordings to learn how to make flying even safer."
    ],
    numbers: [["2", "recorders"], ["orange", "the real color of a black box"]],
    spot: "Look for the small orange box near the tail."
  },
  {
    id: "tail",
    name: "Tail",
    note: "The fin and back wings keep the plane straight.",
    zone: "Tail fin and stabilisers",
    lead: "The tall fin and the small back wings keep the plane flying straight, like the feathers on an arrow.",
    facts: [
      "The rudder on the fin swings left and right to turn the nose left or right.",
      "The elevators on the small back wings tip up and down to point the nose up or down.",
      "The top of the fin is 19.4 metres above the ground, as tall as a six-storey building."
    ],
    numbers: [["19.4 m", "tall at the tip of the fin"]],
    spot: "Find the rudder at the back edge of the tall fin."
  },
  {
    id: "jet-bridge",
    name: "Jet bridge",
    note: "A tunnel that brings people aboard.",
    zone: "At the gate",
    lead: "Passengers walk onto the plane through a moving tunnel that reaches out from the terminal.",
    facts: [
      "The jet bridge can drive on its own wheels and move up and down to meet the door exactly.",
      "A soft rubber hood closes around the door, so passengers stay out of the wind and rain.",
      "Some big airports connect two jet bridges at once, so a full 747 can board faster. A few even reached up to the upper deck."
    ],
    numbers: [["5", "pairs of doors on the main deck"]],
    spot: "Follow the line of passengers through the tunnel."
  },
  {
    id: "pushback",
    name: "Pushback tug",
    note: "A low, heavy tug pushes the jet back from the gate.",
    zone: "At the nose wheel",
    lead: "A jet cannot drive backward on its own, so a strong tug pushes it away from the gate.",
    facts: [
      "The tug is low and very heavy, so its wheels can grip the ground while it pushes a plane far bigger than itself.",
      "It connects to the nose wheel, either with a long bar or by lifting the wheel right off the ground.",
      "During pushback, the tug driver talks to the pilots through a headset plugged into the plane."
    ],
    numbers: [["up to 397 t", "of jumbo jet for one tug to push"]],
    spot: "Find the tug parked in front of the nose wheels."
  },
  {
    id: "baggage",
    name: "Baggage team",
    note: "Trolleys and a conveyor belt bring the bags.",
    zone: "On the apron",
    lead: "Every suitcase gets a paper tag with a barcode, so it ends up on the right plane.",
    facts: [
      "Machines in the airport read the tags and sort the bags. Then a little tug pulls them to the plane on a train of trolleys.",
      "The belt loader is a moving ramp. Baggage handlers put bags on the bottom and they ride up into the hold.",
      "Inside the hold, the bags are packed tightly so they cannot slide around during the flight."
    ],
    numbers: [["hundreds", "of suitcases on a full flight"]],
    spot: "Count the trolleys behind the little baggage tug."
  },
  {
    id: "catering",
    name: "Catering truck",
    note: "Its box rises on scissor arms to load the food.",
    zone: "At the back door",
    lead: "This truck brings all the food and drinks. Its whole box lifts up to the door on folding scissor arms.",
    facts: [
      "The door of a 747 is about five metres above the ground, higher than a double-decker bus.",
      "The crew roll trolleys of meals, drinks and ice straight from the truck into the galley.",
      "On the way back, the truck takes away the empty trolleys and rubbish from the last flight."
    ],
    numbers: [["about 5 m", "up to the cabin door"]],
    spot: "Find the person standing on the platform at the back of the box."
  },
  {
    id: "fuel-truck",
    name: "Fuel truck",
    note: "A hose pumps jet fuel up into the wing.",
    zone: "Under the wing",
    lead: "Jet fuel goes in from underneath the wing, through a hose clipped into a panel there.",
    facts: [
      "Jet fuel is a kind of kerosene. It smells a little like the oil in an old lamp.",
      "A 747 needs more fuel than one truck can carry. At big airports the fuel often comes through pipes under the ground, and the truck pumps it into the plane.",
      "The fueller watches the gauges, and the plane's computers make sure each tank gets the right amount."
    ],
    numbers: [["216,840 L", "when every tank is full"]],
    spot: "Follow the black hose from the truck to the wing."
  }
];
