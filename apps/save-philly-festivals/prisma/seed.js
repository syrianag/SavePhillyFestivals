import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import {
  buildFestivalRevisionSnapshot,
  FESTIVAL_REVISION_SNAPSHOT_SELECT,
} from "../src/features/editorial-workflow/festival-revision-snapshot.js";

const prismaDirectory = dirname(fileURLToPath(import.meta.url));

config({
  path: [join(prismaDirectory, "../.env.local"), join(prismaDirectory, "../.env")],
  quiet: true,
});

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ─── Seed Data ─────────────────────────────────────────────

function requireSeedCredential(name, { normalizeEmail = false } = {}) {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`${name} is required for explicit local database seeding`);
  }

  return normalizeEmail ? value.trim().toLowerCase() : value;
}

const users = [
  {
    email: requireSeedCredential("LOCAL_ADMIN_EMAIL", { normalizeEmail: true }),
    password: requireSeedCredential("LOCAL_ADMIN_PASSWORD"),
    name: "Admin User",
    role: "admin",
  },
  {
    email: requireSeedCredential("LOCAL_PRODUCER_EMAIL", { normalizeEmail: true }),
    password: requireSeedCredential("LOCAL_PRODUCER_PASSWORD"),
    name: "Producer User",
    role: "producer",
  },
];

const categories = [
  {
    name: "Music",
    slug: "music",
    description: "Live musical performances across all genres",
  },
  {
    name: "Food",
    slug: "food",
    description: "Culinary festivals, food trucks, and tasting events",
  },
  {
    name: "Art",
    slug: "art",
    description: "Visual arts, galleries, and creative installations",
  },
  {
    name: "Cultural",
    slug: "cultural",
    description: "Celebrations of cultural heritage and traditions",
  },
  {
    name: "Community",
    slug: "community",
    description: "Neighborhood gatherings and community-driven events",
  },
  {
    name: "Caribbean",
    slug: "caribbean",
    description: "Caribbean culture, music, food, and traditions",
  },
];

const tags = [
  { name: "Free", slug: "free" },
  { name: "Family-Friendly", slug: "family-friendly" },
  { name: "Outdoor", slug: "outdoor" },
  { name: "Indoor", slug: "indoor" },
  { name: "Annual", slug: "annual" },
];

const festivals = [
  // ── Approved (5) ──────────────────────────────────────────
  {
    name: "Mann Center Summer Music Festival",
    description:
      "A multi-day outdoor music festival at the Mann Center featuring world-class orchestras, pop, rock, and R&B acts under the summer sky. Enjoy lawn seating with skyline views and curated food vendors.",
    location: "The Mann Center for the Performing Arts",
    city: "Philadelphia",
    state: "PA",
    zip_code: "19131",
    latitude: 39.9629,
    longitude: -75.205,
    image_url:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1600&q=80",
    website_url: "https://www.mannmusiccenter.org",
    status: "approved",
    submitted_by: "producer@savephillyfestivals.org",
    contact_name: "Sarah Mitchell",
    contact_email: "sarah@manncenter.org",
    contact_phone: "(215) 546-7901",
    story:
      "The Mann Center has been a beloved outdoor concert destination in Fairmount Park since 1930.",
    mission:
      "To present exceptional musical performances that bring diverse audiences together in a stunning outdoor setting.",
    history:
      "Originally known as the Robin Hood Dell, the Mann Center has hosted legendary performers from Frank Sinatra to Beyoncé.",
    start_date: new Date("2026-07-10T17:00:00"),
    end_date: new Date("2026-07-12T22:00:00"),
    categorySlugs: ["music"],
    tagSlugs: ["outdoor", "annual", "family-friendly"],
  },
  {
    name: "South Philly Caribbean Festival",
    description:
      "A vibrant celebration of Caribbean culture along South Philadelphia's Italian Market corridor. Featuring steel drum bands, jerk chicken, reggae DJs, and colorful costume parades.",
    location: "9th Street Italian Market",
    city: "Philadelphia",
    state: "PA",
    zip_code: "19147",
    latitude: 39.9389,
    longitude: -75.1585,
    image_url:
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1600&q=80",
    website_url: "https://www.southphillycaribbeanfest.org",
    status: "approved",
    submitted_by: "producer@savephillyfestivals.org",
    contact_name: "Marcus Thompson",
    contact_email: "marcus@spcfest.org",
    contact_phone: "(215) 555-0142",
    story:
      "Born from the rich Caribbean immigrant community in South Philly, this festival celebrates the flavors and rhythms of the islands.",
    mission:
      "To share Caribbean heritage with all Philadelphians and foster cultural understanding through music, food, and art.",
    history:
      "Now in its 12th year, the festival draws over 30,000 visitors annually to the historic Italian Market district.",
    start_date: new Date("2026-08-01T11:00:00"),
    end_date: new Date("2026-08-02T20:00:00"),
    categorySlugs: ["caribbean", "food", "music"],
    tagSlugs: ["free", "outdoor", "annual"],
  },
  {
    name: "Spruce Street Harbor Park Art Walk",
    description:
      "An immersive outdoor art experience along the Delaware River waterfront featuring large-scale installations, interactive sculptures, and live mural painting. Local food vendors and craft beer gardens line the boardwalk.",
    location: "Spruce Street Harbor Park",
    city: "Philadelphia",
    state: "PA",
    zip_code: "19106",
    latitude: 39.9442,
    longitude: -75.1383,
    image_url:
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1600&q=80",
    website_url: "https://www.penns-landing.com",
    status: "approved",
    submitted_by: null,
    contact_name: "Elena Rodriguez",
    contact_email: "elena@phlwaterfront.com",
    contact_phone: "(215) 555-0198",
    story:
      "The Art Walk transforms the Delaware River waterfront into an open-air gallery each summer.",
    mission:
      "To make world-class art accessible to everyone while activating Philadelphia's waterfront spaces.",
    history:
      "Launched in 2021 as part of the Delaware River Waterfront Corporation's ongoing revitalization efforts.",
    start_date: new Date("2026-08-15T10:00:00"),
    end_date: new Date("2026-08-17T21:00:00"),
    categorySlugs: ["art", "community"],
    tagSlugs: ["free", "outdoor", "family-friendly"],
  },
  {
    name: "Fishtown neighborhood Block Party & Food Fest",
    description:
      "Fishtown's signature block party stretching along Frankford Avenue with over 40 local restaurants, craft breweries, and live bands. From gourmet tacos to artisanal ice cream, every block is a food adventure.",
    location: "Frankford Avenue, Fishtown",
    city: "Philadelphia",
    state: "PA",
    zip_code: "19125",
    latitude: 39.9662,
    longitude: -75.1333,
    image_url:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80",
    website_url: "https://www.fishtownfest.org",
    status: "approved",
    submitted_by: "producer@savephillyfestivals.org",
    contact_name: "Jake O'Brien",
    contact_email: "jake@fishtownbid.org",
    contact_phone: "(215) 555-0167",
    story:
      "What started as a small neighborhood gathering in 2015 has grown into one of Philly's most anticipated food events.",
    mission:
      "To showcase Fishtown's incredible restaurant scene and bring neighbors together over great food and music.",
    history:
      "The festival was started by the Fishtown Business Improvement District to highlight the neighborhood's culinary renaissance.",
    start_date: new Date("2026-09-05T12:00:00"),
    end_date: new Date("2026-09-06T22:00:00"),
    categorySlugs: ["food", "music", "community"],
    tagSlugs: ["outdoor", "family-friendly", "annual"],
  },
  {
    name: "Philadelphia Caribbean Jazz & Culture Festival",
    description:
      "A two-day celebration blending Caribbean jazz, soca, and calypso with visual art and cultural workshops. Enjoy live performances on the main stage, steel pan drum circles, and Caribbean culinary demonstrations.",
    location: "Mann Center for the Performing Arts",
    city: "Philadelphia",
    state: "PA",
    zip_code: "19131",
    latitude: 39.9629,
    longitude: -75.205,
    image_url:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1600&q=80",
    website_url: "https://www.phlcaribbeanjazz.org",
    status: "approved",
    submitted_by: null,
    contact_name: "Diane Campbell",
    contact_email: "diane@phlcaribbeanjazz.org",
    contact_phone: "(215) 555-0211",
    story:
      "This festival bridges the gap between Caribbean musical traditions and the rich jazz history of Philadelphia.",
    mission:
      "To celebrate the Caribbean diaspora's contribution to American music and culture through world-class performances.",
    history:
      "Founded in 2018 by a collective of Caribbean-American musicians dedicated to preserving their musical heritage.",
    start_date: new Date("2026-09-19T13:00:00"),
    end_date: new Date("2026-09-20T21:00:00"),
    categorySlugs: ["music", "caribbean", "cultural"],
    tagSlugs: ["outdoor", "annual"],
  },

  // ── Pending (2) ───────────────────────────────────────────
  {
    name: "Logan Square Fall Arts Festival",
    description:
      "A juried arts festival in Logan Square featuring 150+ artists, live demonstrations, and hands-on workshops. The festival closes with a stunning lantern parade through the square.",
    location: "Logan Square",
    city: "Philadelphia",
    state: "PA",
    zip_code: "19103",
    latitude: 39.9581,
    longitude: -75.1713,
    image_url:
      "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1600&q=80",
    website_url: "https://www.logansquareartsfest.org",
    status: "pending",
    submitted_by: "producer@savephillyfestivals.org",
    contact_name: "Priya Sharma",
    contact_email: "priya@logansquare.org",
    contact_phone: "(215) 555-0183",
    story:
      "The Logan Square Fall Arts Festival has become a cornerstone of Philadelphia's autumn cultural calendar.",
    mission:
      "To provide a platform for emerging and established artists while activating one of Philly's most beautiful public spaces.",
    history:
      "Started in 2019 as a way to showcase local talent during the fall foliage season in Logan Square.",
    start_date: new Date("2026-10-03T10:00:00"),
    end_date: new Date("2026-10-04T18:00:00"),
    categorySlugs: ["art", "community"],
    tagSlugs: ["free", "outdoor", "family-friendly"],
  },
  {
    name: "Rittenhouse Row Harvest Festival",
    description:
      "An upscale harvest celebration along Rittenhouse Square with farm-to-table tastings, wine pairings, and live acoustic music. Local boutiques offer exclusive fall collections and artisan goods.",
    location: "Rittenhouse Square",
    city: "Philadelphia",
    state: "PA",
    zip_code: "19103",
    latitude: 39.9493,
    longitude: -75.1718,
    image_url:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1600&q=80",
    website_url: "https://www.rittenhouserow.org",
    status: "pending",
    submitted_by: null,
    contact_name: "Thomas Greene",
    contact_email: "tom@rittenhouserow.org",
    contact_phone: "(215) 555-0156",
    story:
      "The Harvest Festival celebrates the bounty of Pennsylvania's farms in the heart of Center City.",
    mission:
      "To connect urban Philadelphians with local farmers and artisans through a sophisticated harvest celebration.",
    history:
      "Launched in 2020 by the Rittenhouse Square Business Association to support local agriculture and restaurants.",
    start_date: new Date("2026-10-10T11:00:00"),
    end_date: new Date("2026-10-11T19:00:00"),
    categorySlugs: ["food", "community"],
    tagSlugs: ["outdoor", "family-friendly"],
  },

  // ── Draft (2) ─────────────────────────────────────────────
  {
    name: "Germantown Avenue Music Walk",
    description:
      "A self-guided walking tour of Germantown Avenue's legendary music venues, featuring pop-up performances in historic churches, jazz clubs, and community spaces. Each stop tells a piece of Philly's musical story.",
    location: "Germantown Avenue, Mount Airy",
    city: "Philadelphia",
    state: "PA",
    zip_code: "19119",
    latitude: 40.0577,
    longitude: -75.1851,
    image_url:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1600&q=80",
    website_url: "https://www.germantownavemusic.org",
    status: "draft",
    submitted_by: "producer@savephillyfestivals.org",
    contact_name: "Andre Williams",
    contact_email: "andre@germantownmusic.org",
    contact_phone: "(215) 555-0194",
    story:
      "Germantown Avenue has been the backbone of Philadelphia's music scene since the early 20th century.",
    mission:
      "To highlight the rich musical heritage of Northwest Philadelphia and support emerging local artists.",
    history:
      "A new concept for 2026, designed to bring attention to the often-overlooked music venues of Germantown.",
    start_date: new Date("2026-09-26T14:00:00"),
    end_date: new Date("2026-09-26T22:00:00"),
    categorySlugs: ["music", "cultural"],
    tagSlugs: ["free", "outdoor"],
  },
  {
    name: "Penn Treaty Park Waterfront Festival",
    description:
      "A community-driven waterfront festival at Penn Treaty Park with kayaking demos, environmental workshops, local band performances, and a sustainability showcase. Food trucks line the Delaware River path.",
    location: "Penn Treaty Park",
    city: "Philadelphia",
    state: "PA",
    zip_code: "19125",
    latitude: 39.9668,
    longitude: -75.1262,
    image_url:
      "https://images.unsplash.com/photo-1503265192943-9d7eea6fc77a?auto=format&fit=crop&w=1600&q=80",
    website_url: "https://www.penntreatyparkfest.org",
    status: "draft",
    submitted_by: null,
    contact_name: "Lisa Chen",
    contact_email: "lisa@penntreaty.org",
    contact_phone: "(215) 555-0129",
    story:
      "The Waterfront Festival transforms Penn Treaty Park into a celebration of the Delaware River ecosystem.",
    mission:
      "To promote environmental stewardship while bringing the Fishtown and Northern Liberties communities together.",
    history:
      "Planned as a pilot event for 2026, inspired by successful waterfront festivals in other river cities.",
    start_date: new Date("2026-10-17T10:00:00"),
    end_date: new Date("2026-10-18T18:00:00"),
    categorySlugs: ["community", "music"],
    tagSlugs: ["free", "outdoor", "family-friendly"],
  },

  // ── Rejected (1) ──────────────────────────────────────────
  {
    name: "Philly Taco Challenge",
    description:
      "A competitive eating event challenging participants to sample tacos from 20+ local taquerias in one afternoon. Includes a salsa-making contest and live mariachi music.",
    location: "Xfinity Live!",
    city: "Philadelphia",
    state: "PA",
    zip_code: "19148",
    latitude: 39.9042,
    longitude: -75.174,
    image_url:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80",
    website_url: "https://www.phillytacochallenge.com",
    status: "rejected",
    submitted_by: "producer@savephillyfestivals.org",
    contact_name: "Mike Russo",
    contact_email: "mike@tacochallenge.com",
    contact_phone: "(215) 555-0177",
    story:
      "The Taco Challenge was conceived as a fun way to celebrate Philadelphia's growing Mexican food scene.",
    mission:
      "To bring attention to the city's best taquerias through a lighthearted competitive eating event.",
    history:
      "Proposed as a first-year event, though the submission was rejected due to health and safety concerns.",
    start_date: new Date("2026-08-22T12:00:00"),
    end_date: new Date("2026-08-22T18:00:00"),
    categorySlugs: ["food"],
    tagSlugs: ["outdoor"],
  },
];

const schedules = [
  // ── Mann Center Summer Music Festival ──────────────────────
  {
    festivalSlug: "mann-center-summer-music-festival",
    title: "Philadelphia Orchestra Opening Night",
    description:
      "The legendary Philadelphia Orchestra performs Beethoven's 9th Symphony under the stars.",
    location: "TD Pavilion Main Stage",
    start_time: new Date("2026-07-10T19:30:00"),
    end_time: new Date("2026-07-10T22:00:00"),
    performer: "Philadelphia Orchestra",
    genre: "Classical",
    is_headliner: true,
  },
  {
    festivalSlug: "mann-center-summer-music-festival",
    title: "R&B & Soul Sunset Session",
    description:
      "Smooth R&B and soul performances as the sun sets over the festival grounds.",
    location: "TD Pavilion Main Stage",
    start_time: new Date("2026-07-11T18:00:00"),
    end_time: new Date("2026-07-11T20:30:00"),
    performer: "Ledisi & Musiq Soulchild",
    genre: "R&B/Soul",
    is_headliner: false,
  },
  {
    festivalSlug: "mann-center-summer-music-festival",
    title: "Indie Rock Matinee",
    description:
      "Up-and-coming indie rock bands take the stage for an afternoon of fresh sounds.",
    location: "Cherry Grove Stage",
    start_time: new Date("2026-07-12T14:00:00"),
    end_time: new Date("2026-07-12T17:00:00"),
    performer: "Snacktime Philly & Main Line Brass",
    genre: "Indie Rock",
    is_headliner: false,
  },
  {
    festivalSlug: "mann-center-summer-music-festival",
    title: "Closing Night Headliner",
    description:
      "A high-energy closing performance featuring a chart-topping headline act.",
    location: "TD Pavilion Main Stage",
    start_time: new Date("2026-07-12T20:00:00"),
    end_time: new Date("2026-07-12T22:00:00"),
    performer: "Janelle Monáe",
    genre: "Pop/Funk",
    is_headliner: true,
  },

  // ── South Philly Caribbean Festival ────────────────────────
  {
    festivalSlug: "south-philly-caribbean-festival",
    title: "Steel Drum Kickoff",
    description:
      "Opening ceremonies with a steel drum ensemble performing classic Caribbean rhythms.",
    location: "Main Stage, 9th & Passyunk",
    start_time: new Date("2026-08-01T11:00:00"),
    end_time: new Date("2026-08-01T13:00:00"),
    performer: "Pan Masters Steel Orchestra",
    genre: "Steel Pan/Calypso",
    is_headliner: true,
  },
  {
    festivalSlug: "south-philly-caribbean-festival",
    title: "Reggae Afternoon",
    description:
      "Live reggae music from local and touring bands with a mellow island vibe.",
    location: "Main Stage, 9th & Passyunk",
    start_time: new Date("2026-08-01T15:00:00"),
    end_time: new Date("2026-08-01T17:30:00"),
    performer: "The Roots Rebirth Band",
    genre: "Reggae",
    is_headliner: false,
  },
  {
    festivalSlug: "south-philly-caribbean-festival",
    title: "Soca Dance Party",
    description:
      "High-energy soca music to close out day one with an unforgettable dance party.",
    location: "Dance Stage, 10th & Ellsworth",
    start_time: new Date("2026-08-01T18:00:00"),
    end_time: new Date("2026-08-01T20:00:00"),
    performer: "DJ Riddim Rider",
    genre: "Soca",
    is_headliner: false,
  },

  // ── Spruce Street Harbor Park Art Walk ─────────────────────
  {
    festivalSlug: "spruce-street-harbor-park-art-walk",
    title: "Live Mural Painting: River Dreams",
    description:
      "Watch as Philadelphia muralist works on a large-scale river-themed mural in real time.",
    location: "Mural Pavilion",
    start_time: new Date("2026-08-15T10:00:00"),
    end_time: new Date("2026-08-15T16:00:00"),
    performer: "Betsy Casañas",
    genre: "Visual Art",
    is_headliner: true,
  },
  {
    festivalSlug: "spruce-street-harbor-park-art-walk",
    title: "Interactive Sound Sculpture Installation",
    description:
      "Touch and play with sound sculptures crafted from recycled harbor materials.",
    location: "Sculpture Garden",
    start_time: new Date("2026-08-16T11:00:00"),
    end_time: new Date("2026-08-16T19:00:00"),
    performer: "Chris Veal",
    genre: "Sound Art",
    is_headliner: false,
  },
  {
    festivalSlug: "spruce-street-harbor-park-art-walk",
    title: "Waterfront DJ Set",
    description:
      "Chill electronic beats as you stroll the harbor park installations at sunset.",
    location: "Boardwalk Stage",
    start_time: new Date("2026-08-17T17:00:00"),
    end_time: new Date("2026-08-17T21:00:00"),
    performer: "DJ Do You Even House",
    genre: "Electronic",
    is_headliner: false,
  },

  // ── Fishtown Block Party & Food Fest ───────────────────────
  {
    festivalSlug: "fishtown-neighborhood-block-party-food-fest",
    title: "Philly Cheesesteak Throwdown",
    description:
      "12 of Philly's best cheesesteak spots compete for the title of Ultimate Cheesesteak Champion.",
    location: "Frankford Ave Food Court",
    start_time: new Date("2026-09-05T12:00:00"),
    end_time: new Date("2026-09-05T15:00:00"),
    performer: "Judged Competition",
    genre: "Food Event",
    is_headliner: true,
  },
  {
    festivalSlug: "fishtown-neighborhood-block-party-food-fest",
    title: "Craft Beer Garden",
    description:
      "Taste 50+ local craft beers from Philadelphia-area breweries in a shaded beer garden setting.",
    location: "Frankford Ave Beer Garden",
    start_time: new Date("2026-09-05T14:00:00"),
    end_time: new Date("2026-09-06T20:00:00"),
    performer: "Various Local Breweries",
    genre: "Food/Beverage",
    is_headliner: false,
  },
  {
    festivalSlug: "fishtown-neighborhood-block-party-food-fest",
    title: "Live Music on the Avenue",
    description:
      "Local bands perform rock, folk, and Americana on the outdoor stage along Frankford Avenue.",
    location: "Frankford Ave Main Stage",
    start_time: new Date("2026-09-05T16:00:00"),
    end_time: new Date("2026-09-06T22:00:00"),
    performer: "The Wonder Years & mewithoutYou",
    genre: "Rock/Indie",
    is_headliner: false,
  },

  // ── Philadelphia Caribbean Jazz & Culture Festival ─────────
  {
    festivalSlug: "philadelphia-caribbean-jazz-culture-festival",
    title: "Opening Night: Caribbean Jazz Legends",
    description:
      "A night of world-class Caribbean jazz featuring legends and rising stars of the genre.",
    location: "TD Pavilion Main Stage",
    start_time: new Date("2026-09-19T13:00:00"),
    end_time: new Date("2026-09-19T16:00:00"),
    performer: "Monty Alexander Quartet",
    genre: "Jazz/Caribbean",
    is_headliner: true,
  },
  {
    festivalSlug: "philadelphia-caribbean-jazz-culture-festival",
    title: "Steel Pan Workshop",
    description:
      "An interactive workshop where attendees learn to play basic steel pan rhythms.",
    location: "Workshop Tent",
    start_time: new Date("2026-09-19T16:30:00"),
    end_time: new Date("2026-09-19T18:00:00"),
    performer: "Raymond Toussaint",
    genre: "Steel Pan",
    is_headliner: false,
  },
  {
    festivalSlug: "philadelphia-caribbean-jazz-culture-festival",
    title: "Sunday Gospel-Jazz Fusion",
    description:
      "A unique blend of Caribbean jazz and gospel traditions featuring a full choir and jazz ensemble.",
    location: "TD Pavilion Main Stage",
    start_time: new Date("2026-09-20T14:00:00"),
    end_time: new Date("2026-09-20T16:30:00"),
    performer: "Philadelphia Gospel Choir & Jazz Ensemble",
    genre: "Gospel/Jazz",
    is_headliner: false,
  },
  {
    festivalSlug: "philadelphia-caribbean-jazz-culture-festival",
    title: "Soca & Jazz Closing Celebration",
    description:
      "A high-energy closing set blending soca rhythms with jazz improvisation for an unforgettable finale.",
    location: "TD Pavilion Main Stage",
    start_time: new Date("2026-09-20T18:00:00"),
    end_time: new Date("2026-09-20T21:00:00"),
    performer: "Rikki Jai & The Jazz Warriors",
    genre: "Soca/Jazz",
    is_headliner: true,
  },
];

// ─── Seed Functions ────────────────────────────────────────

async function seedUsers() {
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { password_hash: passwordHash, name: u.name, role: u.role },
      create: {
        email: u.email,
        name: u.name,
        password_hash: passwordHash,
        role: u.role,
      },
    });
  }
  console.log(`Seeded ${users.length} users`);

  const admin = await prisma.user.findUnique({
    where: { email: users[0].email },
    select: { id: true, role: true },
  });
  if (!admin || !["admin", "super_admin"].includes(admin.role)) {
    throw new Error("Seed audit actor must exist with an admin or super_admin role");
  }
  return admin;
}

async function seedCategories() {
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: { name: c.name, slug: c.slug, description: c.description },
    });
  }
  console.log(`Seeded ${categories.length} categories`);
}

async function seedTags() {
  for (const t of tags) {
    await prisma.tag.upsert({
      where: { slug: t.slug },
      update: { name: t.name },
      create: { name: t.name, slug: t.slug },
    });
  }
  console.log(`Seeded ${tags.length} tags`);
}

const seedWorkflowState = Object.freeze({
  draft: "draft",
  pending: "pending_review",
  approved: "published",
  rejected: "rejected",
});

/* A single deterministic publication timestamp for every seed-published festival keeps the
 * fixture idempotent across re-runs: the audit validator compares revision snapshots field
 * by field, so a per-run `new Date()` would make the second seed diverge and fail. */
const SEED_PUBLISHED_AT = new Date("2026-05-01T12:00:00.000Z");

function seedFestivalData(festival, slug) {
  const workflowState = seedWorkflowState[festival.status];
  if (!workflowState) throw new Error(`Unsupported seed workflow state: ${festival.status}`);
  const published = workflowState === "published";
  return {
    name: festival.name,
    slug,
    description: festival.description,
    location: festival.location,
    city: festival.city,
    state: festival.state,
    zip_code: festival.zip_code,
    latitude: festival.latitude ?? null,
    longitude: festival.longitude ?? null,
    image_url: festival.image_url ?? null,
    website_url: festival.website_url,
    logo_url: null,
    rejection_reason: null,
    submitted_by: festival.submitted_by,
    contact_name: festival.contact_name,
    contact_email: festival.contact_email,
    contact_phone: festival.contact_phone,
    story: festival.story,
    mission: festival.mission,
    history: festival.history,
    start_date: festival.start_date,
    end_date: festival.end_date,
    calendar_date_type: "timed",
    time_zone: "America/New_York",
    all_day_start: null,
    all_day_end: null,
    calendar_status: "confirmed",
    calendar_sequence: 0,
    calendar_published_at: published ? SEED_PUBLISHED_AT : null,
    first_published_at: published ? SEED_PUBLISHED_AT : null,
    published_at: published ? SEED_PUBLISHED_AT : null,
    canceled_at: null,
    public_message: null,
    workflow_state: workflowState,
    revision: 0,
  };
}

function comparableSeedValue(value) {
  return value instanceof Date ? value.toISOString() : value ?? null;
}

function assertSeedFestivalStable(current, desired) {
  const drifted = Object.entries(desired)
    .filter(([field, value]) => comparableSeedValue(current[field]) !== comparableSeedValue(value))
    .map(([field]) => field);
  if (drifted.length > 0) {
    throw new Error(`Seed festival ${desired.slug} differs in ${drifted.join(", ")}; refusing an unaudited fixture mutation`);
  }
}

async function ensureFestivalAudit(transaction, festival, actor) {
  const existingTransition = await transaction.festivalTransition.findUnique({
    where: {
      festival_id_revision: {
        festival_id: festival.id,
        revision: festival.revision,
      },
    },
    select: { id: true, actor_user_id: true, from_state: true, to_state: true },
  });
  const transition = existingTransition || await transaction.festivalTransition.create({
    data: {
      id: randomUUID(),
      festival_id: festival.id,
      actor_user_id: actor.id,
      from_state: null,
      to_state: festival.workflow_state,
      revision: festival.revision,
      reason: festival.workflow_state === "rejected" ? "Seed fixture rejection" : null,
      producer_message: festival.workflow_state === "rejected" ? "This sample festival was not accepted." : null,
    },
    select: { id: true, actor_user_id: true, from_state: true, to_state: true },
  });
  if (transition.from_state !== null || transition.to_state !== festival.workflow_state) {
    throw new Error(`Seed festival ${festival.slug} has incompatible revision ${festival.revision} transition evidence`);
  }
  const transitionActor = await transaction.user.findUnique({
    where: { id: transition.actor_user_id },
    select: { role: true },
  });
  if (!transitionActor || !["admin", "super_admin"].includes(transitionActor.role)) {
    throw new Error(`Seed festival ${festival.slug} audit actor has an invalid role snapshot`);
  }
  const existingRevision = await transaction.festivalRevision.findUnique({
    where: { transition_id: transition.id },
    select: { id: true },
  });
  if (!existingRevision) {
    await transaction.festivalRevision.create({
      data: {
        id: randomUUID(),
        festival_id: festival.id,
        workflow_revision: festival.revision,
        transition_id: transition.id,
        actor_user_id: transition.actor_user_id,
        snapshot: buildFestivalRevisionSnapshot(festival),
      },
    });
  }
}

async function seedFestivals(actor) {
  const seedFestivalSelect = {
    ...FESTIVAL_REVISION_SNAPSHOT_SELECT,
    image_url: true,
    latitude: true,
    longitude: true,
  };

  async function ensurePrimaryOccurrence(transaction, festival) {
    if (festival.workflow_state !== "published") return;
    const existing = await transaction.festivalOccurrence.findFirst({
      where: { festival_id: festival.id, source_key: "seed-primary" },
      select: { id: true },
    });
    if (existing) return;
    const now = new Date();
    await transaction.festivalOccurrence.create({
      data: {
        id: randomUUID(),
        festival_id: festival.id,
        source_key: "seed-primary",
        is_primary: true,
        calendar_date_type: "timed",
        time_zone: "America/New_York",
        start_at: festival.start_date,
        end_at: festival.end_date,
        all_day_start: null,
        all_day_end: null,
        calendar_status: "confirmed",
        calendar_sequence: 0,
        calendar_published_at: festival.calendar_published_at,
        updated_at: now,
      },
    });
  }

  for (const f of festivals) {
    const slug = generateSlug(f.name);
    const desired = seedFestivalData(f, slug);
    const festival = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.festival.findUnique({
        where: { slug },
        select: seedFestivalSelect,
      });
      let created;
      if (existing) {
        assertSeedFestivalStable(existing, desired);
        await ensureFestivalAudit(transaction, existing, actor);
        created = existing;
      } else {
        created = await transaction.festival.create({
          data: { id: randomUUID(), ...desired },
          select: seedFestivalSelect,
        });
        await ensureFestivalAudit(transaction, created, actor);
      }
      await ensurePrimaryOccurrence(transaction, created);
      return created;
    });

    // ── Festival-Category links ─────────────────────────────
    for (const catSlug of f.categorySlugs) {
      const category = await prisma.category.findUnique({
        where: { slug: catSlug },
      });
      if (category) {
        await prisma.festivalCategory.upsert({
          where: {
            festival_id_category_id: {
              festival_id: festival.id,
              category_id: category.id,
            },
          },
          update: {},
          create: {
            festival_id: festival.id,
            category_id: category.id,
          },
        });
      }
    }

    // ── Festival-Tag links ──────────────────────────────────
    for (const tagSlug of f.tagSlugs) {
      const tag = await prisma.tag.findUnique({ where: { slug: tagSlug } });
      if (tag) {
        await prisma.festivalTag.upsert({
          where: {
            festival_id_tag_id: {
              festival_id: festival.id,
              tag_id: tag.id,
            },
          },
          update: {},
          create: {
            festival_id: festival.id,
            tag_id: tag.id,
          },
        });
      }
    }
  }
  console.log(`Seeded ${festivals.length} festivals`);
}

async function seedSchedules() {
  let count = 0;

  for (const s of schedules) {
    const festival = await prisma.festival.findUnique({
      where: { slug: s.festivalSlug },
    });

    if (!festival) {
      console.warn(`Festival not found: ${s.festivalSlug}, skipping schedule`);
      continue;
    }

    const existingSchedule = await prisma.schedule.findFirst({
      where: {
        festival_id: festival.id,
        title: s.title,
        start_time: s.start_time,
      },
    });

    const data = {
      festival_id: festival.id,
      title: s.title,
      description: s.description,
      location: s.location,
      start_time: s.start_time,
      end_time: s.end_time,
      performer: s.performer,
      genre: s.genre,
      is_headliner: s.is_headliner,
    };

    if (existingSchedule) {
      await prisma.schedule.update({ where: { id: existingSchedule.id }, data });
    } else {
      await prisma.schedule.create({ data });
    }
    count++;
  }

  console.log(`Seeded ${count} schedules`);
}

// ─── Main ──────────────────────────────────────────────────

async function main() {
  const auditActor = await seedUsers();
  await seedCategories();
  await seedTags();
  await seedFestivals(auditActor);
  await seedSchedules();
  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
