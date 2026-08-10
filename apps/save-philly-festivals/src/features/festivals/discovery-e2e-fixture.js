export const DISCOVERY_DETAIL_SLUG = "riverfront-arts-festival";
export const DISCOVERY_UNAPPROVED_SLUG = "unapproved-neighborhood-festival";
export const DISCOVERY_ALL_DAY_SLUG = "germantown-heritage-days";

export const DISCOVERY_E2E_FESTIVALS = [
  {
    id: "e2e-approved-1",
    slug: DISCOVERY_DETAIL_SLUG,
    name: "Riverfront Arts Festival",
    description: "Local artists, food, and performances along the Delaware River.",
    location: "Penn's Landing",
    city: "Philadelphia",
    start_date: new Date("2026-09-12T14:00:00.000Z"),
    end_date: new Date("2026-09-13T22:00:00.000Z"),
    created_at: new Date("2026-07-01T12:00:00.000Z"),
    image_url: null,
    // Real Penn's Landing coordinates so the map fixture exercises actual pin rendering.
    latitude: 39.9457,
    longitude: -75.1407,
    categories: [{ category: { name: "Art", slug: "art" } }],
  },
  {
    id: "e2e-approved-2",
    slug: "south-philly-food-fest",
    name: "South Philly Food Fest",
    description: "A neighborhood celebration of Philadelphia food makers.",
    location: "South Philadelphia",
    city: "Philadelphia",
    start_date: new Date("2026-10-03T15:00:00.000Z"),
    end_date: null,
    created_at: new Date("2026-07-15T12:00:00.000Z"),
    image_url: null,
    latitude: 39.9312,
    longitude: -75.1585,
    categories: [{ category: { name: "Food", slug: "food" } }],
  },
  /* An all-day, multi-day festival — the shape every CSV-imported festival takes, and the one
   * the other two fixtures cannot reproduce. Their timed mid-day UTC values format to the same
   * calendar day in UTC and in Philadelphia, so they hid the day-key defect that put calendar
   * dots one day away from the festivals they represent. `T00:00:00.000Z` is what a `@db.Date`
   * column actually round-trips, and in Philadelphia that instant is the previous evening. */
  {
    id: "e2e-approved-3",
    slug: DISCOVERY_ALL_DAY_SLUG,
    name: "Germantown Heritage Days",
    description: "Two days of neighborhood history, music, and food in Germantown.",
    location: "Germantown",
    city: "Philadelphia",
    start_date: null,
    end_date: null,
    calendar_date_type: "all_day",
    all_day_start: new Date("2026-09-15T00:00:00.000Z"),
    all_day_end: new Date("2026-09-16T00:00:00.000Z"),
    time_zone: "America/New_York",
    created_at: new Date("2026-07-20T12:00:00.000Z"),
    image_url: null,
    latitude: 40.0362,
    longitude: -75.1735,
    categories: [{ category: { name: "Cultural", slug: "cultural" } }],
  },
];

const detailFixture = {
  ...DISCOVERY_E2E_FESTIVALS[0],
  state: "PA",
  zip_code: "19106",
  website_url: "https://example.com/riverfront-arts-festival",
  logo_url: null,
  social_instagram: "https://www.instagram.com/riverfrontartsfestival/",
  social_facebook: "https://facebook.com/riverfrontartsfestival",
  social_twitter: "javascript:alert(1)",
  social_tiktok: "https://not-tiktok.example/@festival",
  social_youtube: "https://www.youtube.com/@RiverfrontArtsFestival",
  story: null,
  mission: null,
  history: null,
  tags: [
    { tag: { name: "Community", slug: "community" } },
    { tag: { name: "Outdoor", slug: "outdoor" } },
  ],
  schedules: [
    {
      id: "fixture-program-2",
      title: "Riverfront Headliner Set",
      description: "A closing set from Philadelphia favorites.",
      location: "Main Stage",
      start_time: new Date("2026-09-12T21:00:00.000Z"),
      end_time: new Date("2026-09-12T22:30:00.000Z"),
      performer: "Philly All-Stars",
      genre: "Soul",
      is_headliner: true,
    },
    {
      id: "fixture-program-1",
      title: "Community Arts Parade",
      description: null,
      location: "Riverfront Promenade",
      start_time: new Date("2026-09-12T16:00:00.000Z"),
      end_time: new Date("2026-09-12T17:00:00.000Z"),
      performer: null,
      genre: null,
      is_headliner: false,
    },
  ],
};

const unavailableFeedDetailFixture = {
  ...DISCOVERY_E2E_FESTIVALS[1],
  state: "PA",
  zip_code: "19147",
  website_url: "https://example.com/south-philly-food-fest",
  logo_url: null,
  social_instagram: "https://www.instagram.com/southphillyfoodfest/",
  social_facebook: null,
  social_twitter: null,
  social_tiktok: null,
  social_youtube: null,
  story: null,
  mission: null,
  history: null,
  schedules: [],
  tags: [],
};

const allDayDetailFixture = {
  ...DISCOVERY_E2E_FESTIVALS[2],
  state: "PA",
  zip_code: "19144",
  website_url: "https://example.com/germantown-heritage-days",
  logo_url: null,
  social_instagram: null,
  social_facebook: null,
  social_twitter: null,
  social_tiktok: null,
  social_youtube: null,
  story: null,
  mission: null,
  history: null,
  schedules: [],
  tags: [],
};

export function getDiscoveryE2eFestival(slug) {
  if (process.env.DISCOVERY_E2E_FIXTURE !== "1") return undefined;
  if (slug === DISCOVERY_DETAIL_SLUG) return detailFixture;
  if (slug === unavailableFeedDetailFixture.slug) return unavailableFeedDetailFixture;
  if (slug === DISCOVERY_ALL_DAY_SLUG) return allDayDetailFixture;
  return null;
}

export function getDiscoveryE2eFestivalCatalog() {
  if (process.env.DISCOVERY_E2E_FIXTURE !== "1") return undefined;
  return [
    detailFixture,
    unavailableFeedDetailFixture,
    allDayDetailFixture,
  ];
}
