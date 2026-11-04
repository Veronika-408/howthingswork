// Exhibit content for the weather plate, in the order of the tour: the life of a cloud, left to right.
// Hotspot shapes live in hotspots.js.
window.PARTS = [
  {
    id: "sun", name: "The Sun", note: "It warms the water and starts it all.",
    zone: "In the sky",
    lead: "All weather starts with the Sun. It warms the land, the air and the water, and warm water slowly rises into the sky as an invisible gas.",
    facts: [
      "The Sun warms some places more than others. Warm air rises and cool air rushes in to take its place: that is wind.",
      "Every second, the Sun lifts millions of tonnes of water from the seas and lakes into the air.",
      "Never look straight at the Sun, not even with sunglasses. It can hurt your eyes."
    ],
    numbers: [["150 million km", "away, and its warmth still reaches us"]],
    spot: "Find the golden Sun at the top of the page."
  },
  {
    id: "vapour", name: "Water vapour", note: "Warm water rises as an invisible gas.",
    zone: "Above the lake",
    lead: "When the Sun warms the lake, some of the water turns into water vapour, a gas so thin you cannot see it. It floats up with the warm air.",
    facts: [
      "This is called evaporation. It is also how wet washing dries on a line.",
      "Warm air rises, like a hot-air balloon. It carries the water vapour up with it.",
      "The higher it goes, the colder the air gets. Every kilometre up is about 6 to 10 degrees colder."
    ],
    numbers: [["6-10 °C", "colder for every kilometre up"]],
    spot: "Find the wavy lines rising from the lake."
  },
  {
    id: "newcloud", name: "A new cloud", note: "Cold air turns the vapour into tiny drops.",
    zone: "Where a cloud is born",
    lead: "High up, the air is cold. The water vapour cools down and turns back into tiny drops of water, each one around a speck of dust, salt or pollen. Billions of them together make a cloud.",
    facts: [
      "A cloud is not smoke or cotton wool. It is made of tiny drops of water, or of tiny bits of ice.",
      "A cloud drop is about a hundredth of a millimetre across, so small that rising air holds it up.",
      "The flat bottom of a fluffy cloud is the height where the air gets cold enough for the drops to form."
    ],
    numbers: [["about 500 tonnes", "of water in one small fluffy cloud, as heavy as 100 elephants"]],
    spot: "Find the little white cloud with the flat bottom."
  },
  {
    id: "raincloud", name: "Rain cloud", note: "Tiny drops bump together and grow.",
    zone: "Inside a cloud",
    lead: "Inside a rain cloud, the tiny drops are blown around. When two bump into each other they join, and the drop grows. When a drop is too heavy to float, it falls as rain.",
    facts: [
      "It takes about a million cloud drops to make one raindrop.",
      "Rain clouds look grey because they are so thick and full of water that sunlight cannot shine through them.",
      "In cold clouds, raindrops often start as snowflakes high up, and melt on their way down."
    ],
    numbers: [["1 million", "cloud drops in one raindrop"]],
    spot: "Look inside the cut-open cloud: can you see the drops getting bigger towards the bottom?"
  },
  {
    id: "rain", name: "Rain", note: "Too heavy to float, the drops fall.",
    zone: "Under the rain cloud",
    lead: "Raindrops fall out of the bottom of the cloud and land on the fields, the roofs and the umbrellas. Plants and animals drink the water.",
    facts: [
      "Raindrops are not shaped like tears. Small ones are round, and big ones are flattened like the top of a burger bun.",
      "A big raindrop falls at about 30 kilometres an hour, as fast as a bicycle going downhill.",
      "The air smells fresh after rain because the rain lifts smells out of the soil and plants."
    ],
    numbers: [["30 km/h", "for a big falling raindrop"]],
    spot: "Find the child with the red umbrella."
  },
  {
    id: "rainbow", name: "Rainbow", note: "Sunlight split into its colours by raindrops.",
    zone: "In the sunny gap",
    lead: "Sunlight looks white, but it is made of all the colours mixed together. When it shines through raindrops, each drop bends the light and splits it into its colours.",
    facts: [
      "You only see a rainbow with the Sun behind you and rain in front of you.",
      "Red is always on the outside of the bow and violet on the inside.",
      "A rainbow is really a whole circle. From the ground, the land hides the bottom half, but from an aeroplane you can sometimes see the full ring."
    ],
    numbers: [["7", "colours: red, orange, yellow, green, blue, indigo, violet"]],
    spot: "Which colour is on the top of the rainbow?"
  },
  {
    id: "thundercloud", name: "Thundercloud", note: "The tallest cloud, full of ice and wind.",
    zone: "A storm",
    lead: "On hot days, warm wet air can rise so fast and so high that it builds a giant cloud, taller than the highest mountain. Its top is so cold that it is full of ice.",
    facts: [
      "When the cloud reaches the top of the weather layer, it can't go higher, so it spreads out flat like an anvil.",
      "Strong winds inside toss ice and drops up and down. They rub and bump, and the cloud fills up with electricity, like a balloon rubbed on your hair.",
      "Hailstones grow inside it: each trip up through the cloud adds another layer of ice, like the layers of an onion."
    ],
    numbers: [["up to 15 km", "tall, nearly twice as high as Mount Everest"]],
    spot: "Find the flat top of the storm cloud."
  },
  {
    id: "lightning", name: "Lightning", note: "A giant spark, hotter than the Sun's surface.",
    zone: "A storm",
    lead: "When the cloud is full of electricity, it jumps down to the ground in one giant spark. That is lightning. It heats the air so fast that the air bursts with a bang: thunder.",
    facts: [
      "Lightning is about 30,000 degrees, about five times hotter than the surface of the Sun.",
      "You see the flash first and hear the thunder later, because light is much faster than sound. Count the seconds: every 3 seconds is 1 kilometre away.",
      "When you hear thunder, go indoors. A house or a car is a safe place to watch a storm."
    ],
    numbers: [["30,000 °C", "about five times hotter than the Sun's surface"], ["3 seconds", "of counting for each kilometre away"]],
    spot: "Find where the lightning touches the ground."
  },
  {
    id: "rod", name: "Lightning rod", note: "A metal rod that leads lightning safely away.",
    zone: "On the hill",
    lead: "Lightning likes to hit the highest point around. A metal rod on top of a tall building catches it and sends it down a thick wire safely into the ground.",
    facts: [
      "Benjamin Franklin invented the lightning rod more than 270 years ago.",
      "Tall trees get struck too, so never shelter under a tree in a storm.",
      "Lightning strikes somewhere on Earth about 40 to 50 times every second."
    ],
    numbers: [["40-50", "lightning flashes on Earth every second"]],
    spot: "Find the thin rod on top of the tower."
  },
  {
    id: "snowcloud", name: "Snow cloud", note: "So cold that the drops freeze.",
    zone: "Over the mountains",
    lead: "Over the cold mountains, the cloud is below freezing. Tiny bits of ice grow there, catching the water vapour around them, until they become snowflakes heavy enough to fall.",
    facts: [
      "The air is colder high up, so the mountain tops get snow while the valley below gets rain.",
      "Snow falls slowly, about as fast as a slow walk, because snowflakes are light and wide.",
      "Fresh snow is mostly air. That is why it is so quiet after snowfall: the snow swallows the sound."
    ],
    numbers: [["0 °C", "and colder for snow"]],
    spot: "Find the skier on the snowy mountain."
  },
  {
    id: "snowflakes", name: "Snowflakes", note: "Every snowflake has six arms.",
    zone: "Falling snow",
    lead: "A snowflake grows from one tiny ice crystal. Water freezes in a pattern with six sides, so every snowflake grows six arms.",
    facts: [
      "All six arms grow in the same air at the same time, so they come out alike.",
      "Each snowflake takes its own path through the cloud, so each one grows a little differently.",
      "When it is just below freezing, flakes stick together into big fluffy clumps, which are best for snowmen."
    ],
    numbers: [["6", "arms on every snowflake"]],
    spot: "Count the arms of the biggest snowflake."
  },
  {
    id: "river", name: "Back to the lake", note: "The water goes round and round.",
    zone: "On the ground",
    lead: "Rain and melted snow run downhill into streams and rivers, and the rivers carry the water back to the lake and the sea. Then the Sun warms it, and it all starts again. This is the water cycle.",
    facts: [
      "The Earth keeps using the same water, again and again.",
      "The water you drink today may once have fallen as rain on a dinosaur.",
      "Some of the rain soaks into the ground and is drunk by plants. They breathe it back out into the air through their leaves."
    ],
    numbers: [["the same water", "for billions of years"]],
    spot: "Follow the river from the mountains back to the lake."
  }
];
