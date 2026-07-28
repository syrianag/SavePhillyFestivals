export const categories = ["Music", "Food", "Art", "Cultural", "Community", "Caribbean", "Holidays"];

export const areas = [
  "West Philadelphia",
  "Kensington",
  "Center City",
  "South Philly",
  "North Philly",
];

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const festivals = [
  {
    id: 1,
    slug: generateSlug("South Street Festival"),
    title: "South Street Festival",
    date: "May 3-4, 2025",
    rawDate: "2025-05-03",
    location: "South Street",
    category: "Music",
    tags: ["Music", "Food", "Arts"],
    description:
      "South Street comes alive with live music, local food vendors, and art installations spanning multiple blocks. This beloved annual celebration brings together the best of Philadelphia's creative community for a weekend of performances, flavors, and culture.",
    bgColor: "#1E7BF6",
    image: null,
  },
  {
    id: 2,
    slug: generateSlug("Harvest Moon Festival"),
    title: "Harvest Moon Festival",
    date: "November 23, 2025",
    rawDate: "2025-11-23",
    location: "Fairmount Park, Philadelphia",
    category: "Community",
    tags: ["Seasonal", "Music", "Outdoor"],
    description:
      "Celebrate the autumn season under the harvest moon at Fairmount Park. Enjoy live folk and bluegrass music, seasonal food vendors, pumpkin decorating, hayrides, and community bonfires. A perfect fall outing for the whole family.",
    bgColor: "#206C4E",
    image: null,
  },
  {
    id: 3,
    slug: generateSlug("Taste of Kensington"),
    title: "Taste of Kensington",
    date: "December 14, 2025",
    rawDate: "2025-12-14",
    location: "Kensington",
    category: "Food",
    tags: ["Food", "Community"],
    description:
      "Taste your way through Kensington's best flavors at this community food celebration. From family recipes to innovative dishes, local vendors and home cooks share the cuisine that makes this neighborhood special. Come hungry, leave inspired.",
    bgColor: "#F6C847",
    image: null,
  },
  {
    id: 4,
    slug: generateSlug("52nd Street Summer Block Party"),
    title: "52nd Street Summer Block Party",
    date: "June 15, 2025",
    rawDate: "2025-06-15",
    location: "West Philadelphia",
    category: "Music",
    tags: ["Music", "Community"],
    description:
      "The street becomes the party at this beloved neighborhood tradition. Neighbors gather for music, food, games, and the kind of community spirit that makes Philadelphia feel like home.",
    bgColor: "#206C4E",
    badge: "Featured",
    image: null,
  },
  {
    id: 5,
    slug: generateSlug("Community Mural Festival"),
    title: "Community Mural Festival",
    date: "July 20, 2025",
    rawDate: "2025-07-20",
    location: "North Philly",
    category: "Art",
    tags: ["Art", "Community"],
    description:
      "Watch as local artists transform blank walls into vibrant murals during this interactive community art festival. Participate in painting workshops, meet the artists, and see creativity come to life across the neighborhood.",
    bgColor: "#FE7D0C",
    image: null,
  },
  {
    id: 6,
    slug: generateSlug("South Philly Sabor"),
    title: "South Philly Sabor",
    date: "August 10, 2025",
    rawDate: "2025-08-10",
    location: "South Philly",
    category: "Food",
    tags: ["Food", "Cultural"],
    description:
      "A celebration of South Philly's rich culinary heritage featuring Italian, Mexican, Vietnamese, and American cuisines. Live cooking demonstrations, tasting competitions, and family-friendly activities throughout the day.",
    bgColor: "#FF8577",
    image: null,
  },
  {
    id: 7,
    slug: generateSlug("Dance at the Art Museum"),
    title: "Dance at the Art Museum",
    date: "September 5, 2025",
    rawDate: "2025-09-05",
    location: "Center City",
    category: "Cultural",
    tags: ["Cultural", "Arts"],
    description:
      "An evening of dance performances on the steps of the Philadelphia Museum of Art featuring local and international dance companies. From ballet to hip-hop, experience the full spectrum of movement and expression.",
    bgColor: "#FB439B",
    image: null,
  },
  {
    id: 8,
    slug: generateSlug("Winter Farmers Market"),
    title: "Winter Farmers Market",
    date: "January 11, 2026",
    rawDate: "2026-01-11",
    location: "West Philadelphia",
    category: "Community",
    tags: ["Food", "Community", "Seasonal"],
    description:
      "Fresh local produce, artisan goods, and handmade crafts under one roof. Support Philadelphia's farmers and makers while stocking up on seasonal ingredients and unique gifts.",
    bgColor: "#206C4E",
    badge: "Featured",
    image: null,
  },
  {
    id: 9,
    slug: generateSlug("Caribbean Summer Fest"),
    title: "Caribbean Summer Fest",
    date: "August 24, 2025",
    rawDate: "2025-08-24",
    location: "Kensington",
    category: "Caribbean",
    tags: ["Music", "Food", "Cultural"],
    description:
      "Experience the rhythms, flavors, and colors of Caribbean culture at this vibrant street festival. Steel drum performances, jerk chicken, tropical drinks, and dancehall music fill the streets from noon to night.",
    bgColor: "#FE7D0C",
    image: null,
  },
  {
    id: 10,
    slug: generateSlug("Philadelphia Christmas Village"),
    title: "Philadelphia Christmas Village",
    date: "December 6, 2025",
    rawDate: "2025-12-06",
    location: "Center City",
    category: "Holidays",
    tags: ["Holiday", "Community", "Outdoor"],
    description:
      "A beloved holiday tradition at Love Park and Dilworth Park featuring dozens of wooden vendor chalets selling gifts, food, and drinks. Enjoy live holiday music, ice skating, and the glowing Christmas village light display.",
    bgColor: "#C41E3A",
    image: null,
  },
  {
    id: 11,
    slug: generateSlug("Hanukkah in the Park"),
    title: "Hanukkah in the Park",
    date: "December 18, 2025",
    rawDate: "2025-12-18",
    location: "Fairmount Park",
    category: "Holidays",
    tags: ["Holiday", "Cultural", "Community"],
    description:
      "Join the community for a grand menorah lighting, live music, traditional foods, and family activities celebrating the Festival of Lights. A joyful gathering for all ages under the open sky.",
    bgColor: "#1E7BF6",
    image: null,
  },
  {
    id: 12,
    slug: generateSlug("New Years Eve on the Parkway"),
    title: "New Year's Eve on the Parkway",
    date: "December 31, 2025",
    rawDate: "2025-12-31",
    location: "Benjamin Franklin Parkway",
    category: "Holidays",
    tags: ["Holiday", "Music", "Community"],
    description:
      "Ring in the new year with a spectacular celebration along the Benjamin Franklin Parkway featuring live performances, food vendors, and a dazzling midnight fireworks display over the Art Museum steps.",
    bgColor: "#FB439B",
    image: null,
  },
  {
    id: 13,
    slug: generateSlug("Kwanzaa Market and Celebration"),
    title: "Kwanzaa Market & Celebration",
    date: "December 28, 2025",
    rawDate: "2025-12-28",
    location: "North Philly",
    category: "Holidays",
    tags: ["Holiday", "Cultural", "Art"],
    description:
      "A week-long celebration of African heritage featuring artisan vendors, traditional drumming, storytelling, and kinara lighting ceremonies. Discover handmade crafts and taste traditional Kwanzaa feast dishes.",
    bgColor: "#206C4E",
    image: null,
  },
];

export const articles = [
  {
    id: 1,
    title: "Article Name",
    description:
      "We're grateful for the support of our incredible community partners who make these festivals possible.",
    bgColor: "#FE7D0C",
    textColor: "#FFFFFF",
  },
  {
    id: 2,
    title: "Article Name",
    description:
      "We're grateful for the support of our incredible community partners who make these festivals possible.",
    bgColor: "#F6C847",
    textColor: "#000000",
  },
  {
    id: 3,
    title: "Article Name",
    description:
      "We're grateful for the support of our incredible community partners who make these festivals possible.",
    bgColor: "#206C4E",
    textColor: "#FFFFFF",
  },
];

export const nearbyVenues = [
  {
    id: 1,
    name: "Dream World Bakes",
    location: "Kensington Ave",
    description: "Artisan bakery known for Caribbean-inspired pastries and custom cakes.",
    image: "Add Photo",
  },
  {
    id: 2,
    name: "Little Walter's",
    location: "Frankford Ave",
    description: "Neighborhood coffee shop and music venue featuring local jazz and folk artists.",
    image: "Add Photo",
  },
  {
    id: 3,
    name: "Jaffa Bar",
    location: "Front St",
    description: "Mediterranean fusion kitchen serving sharing plates and craft cocktails.",
    image: "Add Photo",
  },
  {
    id: 4,
    name: "Laser Wolf",
    location: "Fishtown",
    description: "Cozy wine bar with an ever-changing seasonal small plates menu.",
    image: "Add Photo",
  },
  {
    id: 5,
    name: "Yuhiro",
    location: "Northern Liberties",
    description: "Japanese-inspired ramen and izakaya-style small plates.",
    image: "Add Photo",
  },
  {
    id: 6,
    name: "Sor Ynez",
    location: "South St",
    description: "Family-owned taqueria serving authentic Mexican street food since 1998.",
    image: "Add Photo",
  },
];

export const tours = [
  {
    id: "bus",
    type: "Bus Tour",
    price: "$39.99",
    pillColor: "#F6C847",
    description:
      "Experience Philadelphia's festival scene from the comfort of a guided bus tour. We'll take you through multiple neighborhoods, sharing the stories behind the block parties, cultural celebrations, and community gatherings that define the City of Brotherly Love.",
  },
  {
    id: "walking",
    type: "Walking Tour",
    price: "$29",
    pillColor: "#FE7D0C",
    description:
      "Explore festival neighborhoods on foot and feel the energy up close. Our walking tours take you through the streets where block parties come alive, past vibrant murals, and into the heart of Philadelphia's most iconic cultural celebrations.",
  },
  {
    id: "diy",
    type: "DIY Digital Tour Route",
    price: "FREE",
    pillColor: "#FF8577",
    description:
      "Go at your own pace with our self-guided digital tour. We've mapped out the festival hotspots, historic venues, and community gathering spaces across Philadelphia so you can explore the city's festival culture on your schedule.",
  },
];
