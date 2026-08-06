const CARD_COLORS = [
  "#1E7BF6",
  "#206C4E",
  "#B03A48",
  "#7B2D8B",
  "#1F3A93",
  "#C76F2A",
  "#0E8A63",
];

function colorForSlug(slug) {
  if (!slug) return CARD_COLORS[0];
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash << 5) - hash + slug.charCodeAt(i);
    hash |= 0;
  }
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length];
}

function formatDateRange(startDate, endDate) {
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return "Date TBD";

  const monthDay = { month: "long", day: "numeric" };

  if (endDate) {
    const end = new Date(endDate);
    if (!isNaN(end.getTime())) {
      if (start.toDateString() !== end.toDateString()) {
        const sameYear = start.getFullYear() === end.getFullYear();
        const endStr = end.toLocaleDateString(
          "en-US",
          sameYear ? monthDay : { ...monthDay, year: "numeric" }
        );
        return `${start.toLocaleDateString("en-US", monthDay)} – ${endStr}, ${end.getFullYear()}`;
      }
    }
  }

  return start.toLocaleDateString("en-US", { ...monthDay, year: "numeric" });
}

export function mapFestivalToCard(f) {
  const category = f.categories?.[0]?.category?.name;
  const locationParts = [f.location, f.city, f.state].filter(Boolean);

  return {
    id: f.id,
    slug: f.slug,
    title: f.name,
    rawDate: f.start_date ? new Date(f.start_date).toISOString() : "",
    date: formatDateRange(f.start_date, f.end_date),
    location: locationParts.join(", ") || "Philadelphia, PA",
    category: category || "Community",
    description: f.description || "",
    bgColor: colorForSlug(f.slug),
    badge: undefined,
    image: f.image_url || null,
    tags: f.tags?.map((t) => t.tag?.name).filter(Boolean) || [],
  };
}

export function mapFestivalsToCards(festivals) {
  return festivals.map(mapFestivalToCard);
}
