// Shared words for every variant of the lab demo: the same spaces and parts, written for five ages.
// A text is either a string (same for every age) or { 3, 5, 7, 9, 11 }; the viewer picks the nearest
// age at or below the reader's (3 → 3, 6 → 5, 12 → 11). Names can change with age too.
// Facts are checked; numbers are rounded the way a children's encyclopedia would round them.
window.CONTENT = {
  ages: [3, 5, 7, 9, 11],
  ageLabels: { 3: "3+", 5: "5+", 7: "7+", 9: "9+", 11: "11+" },
  spaces: {
    // ------------------------------------------------------------------ the town
    city: {
      title: { 3: "Our town", 7: "The town" },
      intro: {
        3: "This is our town. Tap something in colour to look inside!",
        5: "A little town by a river. Everything in colour opens up. What's inside?",
        7: "A town with an airport, a river and a bus stop. Tap anything in colour to look inside it.",
        9: "Every picture here opens into another picture. Zoom into the jumbo jet or the people at the bus stop and keep going deeper.",
        11: "This map is the top of a tree of pictures: town, machine, part, and deeper still, down to the parts inside one single cell."
      },
      parts: {
        plane: {
          name: { 3: "Big plane", 7: "Jumbo jet" },
          say: {
            3: "A big plane! It flies people high in the sky.",
            5: "A jumbo jet waits at the airport. Lots and lots of people can ride inside it.",
            7: "This jumbo jet is a Boeing 747. It can carry about 400 people across the ocean.",
            9: "The Boeing 747 is about 70 metres long and flies at around 900 kilometres an hour, about 10 kilometres above the ground.",
            11: "The 747-400 has four turbofan engines, can fly about 13,000 km without stopping, and can take off weighing almost 400 tonnes."
          }
        },
        people: {
          name: { 3: "A family", 7: "People at the bus stop" },
          say: {
            3: "A family waits for the bus. What is inside a person?",
            5: "A family waits for the bus. Let's look inside a person!",
            7: "Inside every person is a busy body: a heart, lungs, bones and much more.",
            9: "Your body is made of about 37 trillion tiny cells, all working together.",
            11: "A human body is built from about 37 trillion cells of around 200 different kinds, organised into tissues, organs and organ systems."
          }
        },
        river: {
          name: "River",
          say: {
            3: "Splash! The river flows by.",
            5: "The river flows through the town, all the way to the sea.",
            7: "Boats carry people and goods along the river.",
            9: "A river carries rain and melted snow from the hills back to the sea.",
            11: "A river drains a whole basin of land; the water that falls on it ends up flowing past this town."
          }
        },
        bridge: {
          name: "Bridge",
          say: {
            3: "Cars drive over the bridge.",
            5: "The bridge lets cars and people cross the river.",
            7: "Strong steel cables hang from the tall tower and hold the road up.",
            9: "In a cable-stayed bridge the cables pull the road up towards the tower, so it needs no pillars in the middle of the river.",
            11: "The cables carry the deck's weight in tension to the pylon, which pushes it down into the foundations in compression."
          }
        }
      }
    },

    // ------------------------------------------------------------------ the jumbo jet
    plane: {
      title: { 3: "The big plane", 7: "The Jumbo Jet" },
      intro: {
        3: "A big plane, cut open so you can see inside!",
        5: "The jumbo jet is cut open. Can you find the pilots, the passengers and the bags?",
        7: "This jumbo jet is cut open to show how it works: engines, wings, the cabin and the flight deck.",
        9: "A Boeing 747 is a flying town: pilots up front, hundreds of passengers on two decks, bags underneath and fuel in the wings.",
        11: "A 747-400 cut open: the flight deck, two passenger decks, the cargo holds, the fuel-filled wings and four turbofan engines."
      },
      parts: {
        cockpit: {
          name: { 3: "Pilots' room", 7: "Flight deck" },
          say: {
            3: "The pilots sit at the front. Let's say hello!",
            5: "Two pilots sit at the very front and fly the plane. Let's go and see them!",
            7: "The flight deck is up at the front, where two pilots fly the plane. Tap to go inside.",
            9: "The flight deck sits upstairs, above the nose. Two pilots share the work: one flies, the other checks.",
            11: "From the flight deck the captain and first officer control the plane through computers, hydraulics and wires, taking turns as pilot flying and pilot monitoring."
          }
        },
        cabin: {
          name: { 3: "Seats", 7: "Passenger cabin" },
          say: {
            3: "People sit in rows of seats.",
            5: "Passengers sit in long rows, watching films and eating snacks.",
            7: "The main cabin has rows of ten seats across, with two aisles to walk along.",
            9: "Up to about 400 passengers sit on two decks. The upper deck is in the famous hump behind the cockpit.",
            11: "The cabin is pressurised: at 10 km outside the air is too thin to breathe and about −50 °C, so the inside is kept like a mountain town at about 2,400 m."
          }
        },
        engine: {
          name: { 3: "Engine", 7: "Jet engine" },
          say: {
            3: "Whoosh! The engines push the plane forward.",
            5: "Four big engines suck in air and blow it out fast. That pushes the plane forward.",
            7: "The jumbo jet has four jet engines. A giant fan at the front pulls in the air.",
            9: "Each engine's fan is about 2.4 metres across. Most of the air goes around the hot middle and makes most of the push.",
            11: "A turbofan squeezes air, burns fuel in it and lets the hot gas spin turbines that drive the fan; the air that bypasses the core makes about four fifths of the thrust."
          }
        },
        wing: {
          name: "Wing",
          say: {
            3: "Big wings help it fly.",
            5: "The wings push air down as the plane rushes along, and the air pushes the wings up.",
            7: "Wings push air down, so the air pushes them up: that is lift. The wings hold the fuel, too.",
            9: "Each wing is about 30 metres long. Flaps slide out at the back for take-off and landing, to give more lift at low speed.",
            11: "Lift comes from the wing turning the airflow downwards; slats and flaps change the wing's shape so it can fly slowly enough to land."
          }
        },
        gear: {
          name: { 3: "Wheels", 7: "Landing gear" },
          say: {
            3: "Lots of wheels to land on!",
            5: "The plane has 18 wheels. They fold away inside after take-off.",
            7: "A jumbo jet has 18 wheels: 2 under the nose and 16 under the body and wings.",
            9: "The brakes stop a heavy plane so hard that they can get hotter than 1,000 °C.",
            11: "Sixteen main wheels spread almost 400 tonnes so the runway is not damaged; after take-off they fold into the body to cut drag."
          }
        },
        hold: {
          name: { 3: "Suitcases", 7: "Cargo hold" },
          say: {
            3: "Bags ride down here.",
            5: "Suitcases travel in the hold, under the floor.",
            7: "Bags and boxes are packed into metal containers and loaded into the hold under the cabin.",
            9: "A belt loader and a lift carry the containers up to big doors in the side of the plane.",
            11: "Containers and pallets roll on floor rollers and lock in place, so the load cannot shift and upset the plane's balance."
          }
        },
        tail: {
          name: "Tail",
          say: {
            3: "The tail keeps the plane straight.",
            5: "The tall fin at the back stops the plane wobbling from side to side.",
            7: "The tail has moving parts: the rudder swings the nose left or right, the elevators tip it up or down.",
            9: "The top of the fin is about as high as a six-storey building.",
            11: "Small tail surfaces on a long lever arm balance the plane like the feathers of an arrow; on the 747-400 the tailplane even holds fuel."
          }
        }
      }
    },

    // ------------------------------------------------------------------ the flight deck
    pilots: {
      title: { 3: "The pilots", 7: "The Flight Deck" },
      intro: {
        3: "Hello, pilots! They fly the plane.",
        5: "Two pilots sit side by side. They use a wheel, levers and screens to fly.",
        7: "The captain sits on the left and the first officer on the right. Everything they need is within reach.",
        9: "Two pilots, six screens and hundreds of switches. The jumbo jet once needed three people up here; now two can do it all.",
        11: "The 747-400's glass cockpit cut the lights, dials and switches of older 747s from about 970 to about 365, so two pilots could do the flight engineer's job too."
      },
      parts: {
        captain: {
          name: "Captain",
          say: {
            3: "The captain is the boss of the plane.",
            5: "The captain sits on the left and is in charge of the whole flight.",
            7: "The captain sits in the left seat and makes the big decisions. Both pilots can fly the plane.",
            9: "Captains have usually flown for many thousands of hours. They are responsible for everyone on board.",
            11: "The captain has final authority over the aircraft and everyone in it, but on most flights the two pilots swap who flies and who monitors."
          }
        },
        firstofficer: {
          name: { 3: "Helper pilot", 7: "First officer" },
          say: {
            3: "The helper pilot sits on the right.",
            5: "The first officer sits on the right and helps to fly the plane.",
            7: "The first officer is a real pilot too. The two take turns: one flies, one checks.",
            9: "On very long flights, extra pilots come along so the crew can take turns resting in a bunk.",
            11: "Each pilot cross-checks the other: settings are read aloud and confirmed, so one person's mistake is caught by the other."
          }
        },
        yoke: {
          name: { 3: "Steering wheel", 7: "Control wheel" },
          say: {
            3: "Pull and push to fly! Try it!",
            5: "Turn the wheel to tip the wings, pull it to point the nose up. Tap to try!",
            7: "The control wheel works like a steering wheel and a lever in one. Turn it to bank, pull it back to climb. Tap to fly!",
            9: "Turning the wheel moves the ailerons on the wings; pulling it moves the elevators on the tail. Tap to fly the plane yourself.",
            11: "The yoke moves hydraulic actuators on the ailerons, spoilers and elevators; the 747-400 has four separate hydraulic systems in case one fails. Tap to fly."
          }
        },
        throttle: {
          name: { 3: "Go-fast levers", 7: "Thrust levers" },
          say: {
            3: "Push these to go faster!",
            5: "Four levers, one for each engine. Push them forward for more power.",
            7: "Four thrust levers sit between the pilots, one for each engine. Forward means more power.",
            9: "The levers tell each engine how hard to push. For take-off the engines make enough thrust to lift a jumbo off in under a minute.",
            11: "The thrust levers send a demand to each engine's computer (FADEC), which sets the fuel flow to give exactly that thrust."
          }
        },
        screens: {
          name: { 3: "Screens", 7: "Flight screens" },
          say: {
            3: "Screens show the pilots where to go.",
            5: "The screens show how high, how fast and which way the plane is going.",
            7: "One screen shows a picture of the plane against the sky and the ground: blue for sky, brown for ground.",
            9: "Six big screens show speed, height, direction, the map and the engines.",
            11: "The primary flight display shows attitude, airspeed, altitude and vertical speed; the navigation display shows the route, weather radar and other traffic."
          }
        },
        windows: {
          name: { 3: "Windows", 7: "Windscreen" },
          say: {
            3: "Big windows to look out of.",
            5: "The pilots look out of big strong windows.",
            7: "The windscreen is made of layers of glass and plastic, warmed so it does not freeze or fog up.",
            9: "The windscreen is strong enough to stop a bird hitting it at take-off speed.",
            11: "Laminated glass-and-acrylic panes with a heated layer resist bird strikes and the cabin pressure pushing out on every square centimetre."
          }
        },
        overhead: {
          name: { 3: "Lots of buttons", 7: "Overhead panel" },
          say: {
            3: "So many buttons!",
            5: "Above the pilots' heads are lots of switches for lights, fuel and air.",
            7: "The overhead panel has switches for the lights, fuel pumps, air conditioning and electricity.",
            9: "Switches that are on usually stay dark; a lit switch means something needs attention. Pilots call it the dark cockpit.",
            11: "Systems are laid out as small diagrams on the panel, so a pilot can see how pumps, valves and buses connect at a glance."
          }
        },
        pedals: {
          name: { 3: "Pedals", 7: "Rudder pedals" },
          say: {
            3: "Pedals for the pilots' feet.",
            5: "Pedals by their feet steer the plane on the ground.",
            7: "The pedals move the rudder on the tail. On the ground, pressing the top of a pedal works the brakes.",
            9: "In a crosswind the pilot uses the pedals to keep the nose pointing straight down the runway.",
            11: "Rudder pedals control yaw in the air; toe brakes and a nose-wheel tiller steer the plane on the ground."
          }
        }
      }
    },

    // ------------------------------------------------------------------ you fly
    drive: {
      title: { 3: "You fly!", 7: "Fly the plane" },
      intro: {
        3: "You are the pilot! Up, down, left, right.",
        5: "You are the pilot! Turn the wheel to tip the wings, pull it to climb, and push the levers to go faster.",
        7: "Fly the jumbo jet. The wheel tips the wings and the nose, the levers give power and the flaps help you fly slowly.",
        9: "Bank to turn, pull to climb, and give it power. Watch the horizon move the way a pilot sees it.",
        11: "Pitch, roll and thrust: three controls change the forces on the plane. Watch speed fall as you climb, and lift grow with flaps."
      },
      parts: {
        yoke: {
          name: { 3: "Wheel", 7: "Control wheel" },
          say: {
            3: "Turn it! Pull it! Push it!",
            5: "Turn the wheel to tip the wings and turn. Pull it to go up, push it to go down.",
            7: "Turning the wheel tips the wings, and the plane turns that way. Pulling it raises the nose.",
            9: "Bank the wings and the lift tilts too, pulling the plane round the turn.",
            11: "Rolling tilts the lift vector, and its sideways part curves the flight path; a steeper bank needs more back pressure to hold height."
          }
        },
        throttle: {
          name: { 3: "Go-fast levers", 7: "Thrust levers" },
          say: {
            3: "Push them up to go fast!",
            5: "Push the levers up for more power, pull them down to slow down.",
            7: "More thrust makes the plane go faster, or climb.",
            9: "To climb without slowing down, a pilot needs more thrust as well as a higher nose.",
            11: "Thrust against drag sets the energy the plane gains: spend it on speed, on height, or on both."
          }
        },
        flaps: {
          name: "Flaps",
          say: {
            3: "Flaps out for landing!",
            5: "The flaps slide out of the wings to help the plane fly slowly.",
            7: "Flaps make the wings bigger and more curved, so the plane can fly slowly for landing.",
            9: "With flaps out, the wing makes more lift at low speed, but also more drag.",
            11: "Extended flaps raise the wing's maximum lift coefficient, lowering the stall speed so the plane can approach slowly."
          }
        },
        gear: {
          name: { 3: "Wheels", 7: "Landing gear" },
          say: {
            3: "Wheels down to land!",
            5: "Put the wheels down before you land, and tuck them away after take-off.",
            7: "The wheels fold up into the plane after take-off and come down before landing.",
            9: "Wheels hanging out make a lot of drag, so they come up as soon as the plane is safely climbing.",
            11: "Retracting the gear removes a large part of the drag; it takes about ten seconds to fold away into the wells."
          }
        }
      },
      // what the flight is doing, read out as it changes
      status: {
        climb: { 3: "Up, up, up!", 7: "Climbing.", 11: "Climbing: the nose is up and the plane is gaining height." },
        descend: { 3: "Going down!", 7: "Going down.", 11: "Descending: the nose is down and the plane is losing height." },
        left: { 3: "Turning left!", 7: "Turning left.", 11: "Banking left: the tilted lift pulls the plane round to the left." },
        right: { 3: "Turning right!", 7: "Turning right.", 11: "Banking right: the tilted lift pulls the plane round to the right." },
        level: { 3: "Flying straight.", 7: "Flying straight and level.", 11: "Straight and level: lift balances weight, thrust balances drag." },
        slow: { 3: "Too slow! More power!", 7: "Too slow! Push the levers up.", 11: "Too slow: add thrust or lower the nose before the wing stops lifting." }
      }
    },

    // ------------------------------------------------------------------ a person
    human: {
      title: { 3: "Inside a person", 7: "The Human Body" },
      intro: {
        3: "Look inside a person! There is a heart, and a brain, and bones.",
        5: "This person is see-through, so we can look inside. What can you find?",
        7: "Inside every person is a busy machine: a brain that thinks, lungs that breathe and a heart that pumps.",
        9: "Your body is a team of organs. Each one has a job, and they all depend on each other.",
        11: "Organs work in systems: the heart and vessels move blood, the lungs swap gases, the gut digests, and the brain and nerves run it all."
      },
      parts: {
        brain: {
          name: "Brain",
          say: {
            3: "The brain thinks. It is in your head.",
            5: "Your brain is in your head. It thinks, remembers, and tells your body what to do.",
            7: "Your brain sends messages along nerves to every part of you, even while you sleep.",
            9: "Your brain has about 86 billion nerve cells, sending messages to each other all the time.",
            11: "About 86 billion neurons, each linked to thousands of others; the brain uses about a fifth of your body's energy while weighing only about 2% of it."
          }
        },
        heart: {
          name: "Heart",
          say: {
            3: "Thump, thump! The heart pumps blood.",
            5: "Your heart is about as big as your fist. It squeezes to push blood all around you.",
            7: "Your heart beats about 100,000 times a day, pushing blood out through tubes called arteries.",
            9: "Your heart has four rooms. The right side pumps blood to the lungs, the left side pumps it to the rest of you.",
            11: "Two pumps in one: the right ventricle sends blood through the lungs, the left ventricle, with the thickest wall, sends it around the body."
          }
        },
        lungs: {
          name: "Lungs",
          say: {
            3: "Breathe in, breathe out. Lungs fill with air.",
            5: "When you breathe in, your two lungs fill up with air like balloons.",
            7: "Your lungs take oxygen from the air and pass it into your blood.",
            9: "Your lungs have about 500 million tiny air bags. Spread flat, they would cover about a third of a tennis court.",
            11: "Oxygen crosses the thin walls of about 480 million alveoli into the blood, and carbon dioxide crosses the other way, to be breathed out."
          }
        },
        stomach: {
          name: { 3: "Tummy", 7: "Stomach" },
          say: {
            3: "Food goes in your tummy. Yum!",
            5: "Food goes down into your stomach, a stretchy bag that mashes it into soup.",
            7: "Your stomach squeezes food and mixes it with strong juices that start to break it down.",
            9: "Stomach acid is strong enough to kill most germs in your food. A thick layer of slime stops it from hurting the stomach itself.",
            11: "Gastric acid (pH about 1.5–3.5) and the enzyme pepsin start digesting protein; the stomach lining renews itself every few days."
          }
        },
        bones: {
          name: { 3: "Bones", 7: "Skeleton" },
          say: {
            3: "Bones hold you up.",
            5: "Your bones make a frame inside you that holds you up and keeps your soft insides safe.",
            7: "A grown-up has 206 bones. A baby has more, because some join together as you grow.",
            9: "Bones are alive. Inside the big ones, red marrow makes millions of new blood cells every second.",
            11: "Bone is living tissue of collagen and calcium phosphate, constantly rebuilt; red marrow produces about 2 million red blood cells per second."
          }
        },
        muscles: {
          name: "Muscles",
          say: {
            3: "Muscles help you move and jump.",
            5: "Muscles pull on your bones to make you move.",
            7: "Muscles can only pull, never push, so they work in pairs: one bends your arm, another straightens it.",
            9: "You have more than 600 muscles. The biggest is in your bottom, the busiest are in your eyes.",
            11: "Skeletal muscle fibres shorten when protein filaments slide past each other, powered by ATP; muscles also make most of your body heat."
          }
        },
        skin: {
          name: "Skin",
          say: {
            3: "Skin covers you all over. Let's look closer!",
            5: "Your skin covers you from head to toe. It keeps germs out. Let's look closer!",
            7: "Skin keeps germs out and water in, and tells you about hot, cold and touch. Tap to look inside it.",
            9: "Skin is your biggest organ. A grown-up's skin would cover about two square metres. Tap to look inside.",
            11: "Skin is the largest organ: a barrier, a thermostat and a sense organ in one, renewing its outer layer about every month. Tap to look inside."
          }
        }
      }
    },

    // ------------------------------------------------------------------ skin
    skin: {
      title: { 3: "Skin, very close", 7: "Skin" },
      intro: {
        3: "Skin, very very close! It has hairs and tiny tubes.",
        5: "This is a tiny piece of skin, made huge. Look at the hairs, the tubes and the layers.",
        7: "Skin has layers: a tough outer wall, a strong middle with hairs, sweat tubes and nerves, and soft fat underneath.",
        9: "A piece of skin smaller than a stamp holds hairs, sweat glands, nerves, blood vessels and millions of cells.",
        11: "The epidermis renews itself from below; the dermis holds collagen, glands, vessels and sense receptors; the fat layer insulates and cushions."
      },
      parts: {
        surface: {
          name: { 3: "Top of the skin", 7: "Outer skin" },
          say: {
            3: "The top of your skin is like a wall.",
            5: "The top layer is made of tiny cells packed together, like bricks in a wall.",
            7: "New cells grow at the bottom of the outer skin and move up. Old ones on top flake off.",
            9: "You shed about 30,000 to 40,000 skin cells every minute. Some of the dust in a house is old skin!",
            11: "Keratinocytes move from the basal layer to the surface in about four weeks, filling with keratin and dying to form a waterproof shield."
          }
        },
        hair: {
          name: "Hair",
          say: {
            3: "A hair grows out of the skin.",
            5: "Every hair grows from a little pocket in your skin.",
            7: "A tiny muscle next to each hair can make it stand up when you are cold: goosebumps!",
            9: "Hair is made of keratin, the same stuff as your nails. A hair on your head grows about a centimetre a month.",
            11: "Each follicle has an oil (sebaceous) gland and an arrector pili muscle; the hair shaft itself is dead keratin pushed up from living cells at the root."
          }
        },
        sweat: {
          name: { 3: "Sweat tube", 7: "Sweat gland" },
          say: {
            3: "When you are hot, sweat comes out.",
            5: "This curly tube makes sweat. When sweat dries on your skin, it cools you down.",
            7: "You have millions of sweat glands, most of all on your hands and feet.",
            9: "Running around on a hot day, you can sweat a litre an hour, so drink water!",
            11: "Eccrine glands release mostly water with a little salt; as it evaporates it carries heat away from the skin."
          }
        },
        vessels: {
          name: { 3: "Blood tubes", 7: "Blood vessels" },
          say: {
            3: "Red tubes carry blood.",
            5: "Red and blue tubes bring blood to the skin and take it away.",
            7: "When you are hot they get wider, which is why your cheeks go pink.",
            9: "The smallest vessels, capillaries, are thinner than a hair. Blood cells squeeze through them one at a time.",
            11: "Widening (vasodilation) of skin vessels sends warm blood to the surface to lose heat; narrowing keeps heat in when you are cold."
          }
        },
        nerves: {
          name: { 3: "Feelers", 7: "Nerves" },
          say: {
            3: "Nerves feel things. Tickle!",
            5: "The thin yellow threads feel touch, hot and cold, and tell your brain.",
            7: "If you touch something hot, your nerves tell you to pull away, fast!",
            9: "Your fingertips have so many touch sensors that you can feel a bump smaller than a grain of sand.",
            11: "Different receptors sense light touch, pressure, vibration, stretch, temperature and pain, each sending signals along its own nerve fibre."
          }
        },
        fat: {
          name: { 3: "Soft cushion", 7: "Fat layer" },
          say: {
            3: "Soft fat keeps you warm.",
            5: "Under the skin is soft fat. It keeps you warm, like a blanket.",
            7: "The fat layer is a blanket and a cushion, and it stores energy for later.",
            9: "Fat cells are like tiny balloons full of oil. They can grow bigger or smaller.",
            11: "Adipose tissue stores energy as fat, insulates against heat loss, cushions bumps and releases hormones that help control appetite."
          }
        },
        cell: {
          name: { 3: "A tiny cell", 7: "A skin cell" },
          say: {
            3: "A tiny cell! Let's look inside it.",
            5: "Your whole body is made of tiny cells like this one. Let's look inside!",
            7: "Each cell is far too small to see without a microscope. Tap to look inside one.",
            9: "Thousands of skin cells would fit on the head of a pin. Tap to look inside one.",
            11: "A typical skin cell is about 30 micrometres across, a third the thickness of a hair. Tap to look inside."
          }
        }
      }
    },

    // ------------------------------------------------------------------ a cell
    cell: {
      title: { 3: "Inside a cell", 7: "The Cell" },
      intro: {
        3: "Inside a tiny cell! It has little parts that work all day.",
        5: "A cell is like a tiny town. Each little part has its own job.",
        7: "Every cell has a control room, power stations, factories, a post office and recycling bubbles.",
        9: "A cell is smaller than a speck of dust, yet it builds, sorts, powers and cleans itself all day long.",
        11: "A eukaryotic cell: a nucleus holding DNA, mitochondria making ATP, the ER and Golgi building and shipping proteins, and lysosomes recycling."
      },
      parts: {
        nucleus: {
          name: { 3: "The middle", 7: "Nucleus" },
          say: {
            3: "The middle is the boss. It has the plans.",
            5: "The big round nucleus holds the cell's plans, like a recipe book.",
            7: "The nucleus holds DNA, a long thread of instructions for how to build you.",
            9: "Stretched out, the DNA in one cell would be about two metres long. It is folded up very tightly.",
            11: "About 2 m of DNA, wrapped around proteins into chromosomes, fits into a nucleus about 6 micrometres wide; nuclear pores control what goes in and out."
          }
        },
        mitochondria: {
          name: { 3: "Power beans", 7: "Mitochondria" },
          say: {
            3: "These beans make energy.",
            5: "These little beans turn food into energy, so the cell can work.",
            7: "Mitochondria use the air you breathe in to turn food into energy.",
            9: "Busy cells like muscle cells can have thousands of mitochondria.",
            11: "Mitochondria make ATP by respiration; they have their own small DNA, a clue that they were once free-living bacteria."
          }
        },
        er: {
          name: { 3: "Folded ribbons", 7: "Endoplasmic reticulum" },
          say: {
            3: "Folded ribbons make things.",
            5: "The folded ribbons are covered in tiny dots that build things the cell needs.",
            7: "Tiny dots called ribosomes read the plans and build proteins, the cell's building blocks.",
            9: "The ribbons carry new proteins along like conveyor belts, to the Golgi.",
            11: "Rough ER is studded with ribosomes translating mRNA into proteins, which fold inside its membrane network before being sent on."
          }
        },
        golgi: {
          name: { 3: "Post office", 7: "Golgi" },
          say: {
            3: "The post office sends parcels.",
            5: "The Golgi wraps things in little bubbles and sends them where they need to go.",
            7: "Like a post office, the Golgi sorts, wraps and sends: some bubbles stay, some leave the cell.",
            9: "The Golgi also makes new lysosomes, filling bubbles with the enzymes they need.",
            11: "The Golgi modifies proteins and tags them; enzymes marked with mannose-6-phosphate are sorted into vesicles bound for lysosomes."
          }
        },
        lysosome: {
          name: { 3: "Recycling bubble", 7: "Lysosome" },
          say: {
            3: "A recycling bubble! Let's look inside.",
            5: "These little bubbles break old things into pieces so they can be used again. Let's look inside!",
            7: "Lysosomes are full of juices that take old parts and germs apart. Tap to look inside one.",
            9: "A lysosome is the cell's recycling centre. Tap to see how it works.",
            11: "Lysosomes are acidic, enzyme-filled organelles that digest worn-out parts, germs and large molecules. Tap to look inside."
          }
        },
        membrane: {
          name: { 3: "Cell skin", 7: "Cell membrane" },
          say: {
            3: "A soft skin holds the cell together.",
            5: "A thin, soft skin holds the cell together and lets food in.",
            7: "The membrane decides what goes in and out, through little doors called channels.",
            9: "The membrane is made of two layers of fatty molecules, thinner than a soap bubble.",
            11: "A phospholipid bilayer about 7–8 nanometres thick, studded with proteins that pump, channel and signal."
          }
        },
        cytoplasm: {
          name: { 3: "Cell jelly", 7: "Cytoplasm" },
          say: {
            3: "Everything floats in jelly.",
            5: "Everything floats in a watery jelly.",
            7: "The jelly is criss-crossed by tiny threads that hold everything in place and act as roads.",
            9: "Tiny motor proteins walk along the threads, carrying bubbles from place to place.",
            11: "The cytoskeleton of microtubules and actin gives the cell its shape; kinesin and dynein motors carry cargo along microtubules."
          }
        }
      }
    },

    // ------------------------------------------------------------------ a lysosome
    lysosome: {
      title: { 3: "The recycling bubble", 7: "The Lysosome" },
      intro: {
        3: "Inside the recycling bubble! Old things go in, and little pieces come out.",
        5: "A lysosome takes old, broken things apart, so the cell can use the pieces again.",
        7: "The lysosome is the cell's recycling centre: sour inside, full of tiny cutters, taking apart old parts and germs.",
        9: "Old parts and germs go in, building blocks come out. Nothing in a cell goes to waste.",
        11: "A lysosome: an acidic compartment of about 50 enzymes, fed by autophagy and endocytosis, returning amino acids, sugars and lipids to the cell."
      },
      parts: {
        membrane: {
          name: { 3: "Bubble skin", 7: "Lysosome membrane" },
          say: {
            3: "A bubble skin keeps the strong juice inside.",
            5: "A bubble skin keeps the strong juices inside, so they can't hurt the rest of the cell.",
            7: "The skin of the lysosome is coated with a sugary layer that stops the juices eating it.",
            9: "If a lysosome burst, its juices would be weak in the rest of the cell, because they only work well in sour places.",
            11: "Its lipid bilayer is lined with heavily glycosylated membrane proteins that shield it from its own hydrolases."
          }
        },
        enzymes: {
          name: { 3: "Tiny scissors", 7: "Enzymes" },
          say: {
            3: "Tiny scissors chop up old things.",
            5: "Inside are tiny helpers that chop old and broken things into small pieces.",
            7: "Enzymes are little machines made of protein. In here they cut big things into small building blocks.",
            9: "A lysosome holds about 50 different enzymes. Each one cuts one kind of thing: proteins, fats, sugars or DNA.",
            11: "These hydrolases work best in acid around pH 4.5–5; in the neutral cytoplasm they barely work, which protects the cell if one leaks."
          }
        },
        pump: {
          name: { 3: "Sour pump", 7: "Acid pump" },
          say: {
            3: "A little pump makes it sour inside.",
            5: "Little pumps in the skin push in sour stuff, so the inside is sour, like tomato juice.",
            7: "Pumps in the skin push acid in. The inside is about as sour as tomato juice, and the enzymes love it.",
            9: "The pumps use the cell's energy to make the inside hundreds of times more acidic than the rest of the cell.",
            11: "V-ATPase pumps spend ATP to move protons inward, holding the inside near pH 4.7 while the cytoplasm stays near 7.2."
          }
        },
        old: {
          name: { 3: "Old broken part", 7: "Worn-out part" },
          say: {
            3: "An old broken piece goes in to be fixed into new things.",
            5: "When part of the cell gets old, it is wrapped in a bubble and sent here to be taken apart.",
            7: "The cell wraps worn-out parts, like an old mitochondrion, and joins them to a lysosome. It is called self-eating!",
            9: "This recycling is called autophagy, which means 'self-eating'. It keeps cells healthy and helps them survive when food is short.",
            11: "In autophagy a double-membrane autophagosome engulfs damaged organelles and fuses with a lysosome; Yoshinori Ohsumi won the 2016 Nobel Prize for explaining how."
          }
        },
        germ: {
          name: { 3: "A germ", 7: "Caught germ" },
          say: {
            3: "Gobble! It can eat germs too.",
            5: "When a germ gets caught, the lysosome breaks it into pieces.",
            7: "Some white blood cells swallow germs whole, and their lysosomes take the germs apart.",
            9: "Your body's defenders use lysosomes like a stomach for germs.",
            11: "In phagocytes, a phagosome containing a bacterium fuses with lysosomes, whose acid, enzymes and reactive oxygen destroy it."
          }
        },
        delivery: {
          name: { 3: "New scissors", 7: "Delivery bubble" },
          say: {
            3: "New scissors arrive in a little bubble.",
            5: "New tiny helpers arrive in little bubbles from the cell's post office.",
            7: "New enzymes are made outside, then sent here in little bubbles from the Golgi.",
            9: "The Golgi puts a special label on lysosome enzymes, like an address on a parcel.",
            11: "Enzymes tagged with mannose-6-phosphate bind receptors in the Golgi and travel in vesicles that fuse with endosomes and lysosomes."
          }
        },
        recycle: {
          name: { 3: "Little pieces", 7: "Building blocks out" },
          say: {
            3: "The little pieces are used again to make new things.",
            5: "The small pieces go back out, and the cell builds new parts with them.",
            7: "Doors in the skin let the small pieces back out: amino acids, sugars and fats, ready to be used again.",
            9: "The cell rebuilds new proteins from the recycled pieces. Nothing goes to waste.",
            11: "Transporters export amino acids, sugars, nucleosides and lipids; lysosomes also signal to the cell how well fed it is."
          }
        }
      }
    }
  }
};
