export function filterByDate(list, dateFilter) {
  if (!dateFilter) return list;
  const now = new Date();
  return list.filter((f) => {
    const d = new Date(f.rawDate);
    if (dateFilter === "this-week") {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return d >= now && d <= weekEnd;
    }
    if (dateFilter === "this-month") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (dateFilter === "next-month") {
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return d.getMonth() === next.getMonth() && d.getFullYear() === next.getFullYear();
    }
    return true;
  });
}

export function filterFestivals(list, { query, filters }) {
  let result = list;

  if (query) {
    const q = query.toLowerCase();
    result = result.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
    );
  }

  if (filters.type) {
    result = result.filter((f) => f.category === filters.type);
  }

  if (filters.area) {
    result = result.filter((f) => f.location.toLowerCase().includes(filters.area.toLowerCase()));
  }

  result = filterByDate(result, filters.date);

  return result;
}

export function getUpcoming(list, count = 8) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const sorted = [...list].sort((a, b) => a.rawDate.localeCompare(b.rawDate));
  const future = sorted.filter((f) => new Date(f.rawDate) >= startOfToday);

  if (future.length >= count) return future.slice(0, count);

  const futureIds = new Set(future.map((f) => f.id));
  const past = [...sorted]
    .sort((a, b) => b.rawDate.localeCompare(a.rawDate))
    .filter((f) => !futureIds.has(f.id));
  return [...future, ...past].slice(0, count);
}

export function getFeatured(list, count = 4) {
  const badged = list.filter((f) => f.badge === "Featured");
  const rest = getUpcoming(
    list.filter((f) => !badged.includes(f)),
    Math.max(0, count - badged.length)
  );
  return [...badged, ...rest].slice(0, count);
}
