export function mapApprovedScheduleSelections(items, { festivals = [], events = [] }) {
  const festivalById = new Map(festivals.map((festival) => [festival.id, festival]));
  const eventById = new Map(events.map((event) => [event.id, event]));
  const resolved = [];
  const unavailable = [];

  for (const item of items) {
    const record = item.type === "festival"
      ? festivalById.get(item.id)
      : eventById.get(item.id);

    if (record) resolved.push({ ...item, record });
    else unavailable.push(item);
  }

  return { resolved, unavailable };
}
