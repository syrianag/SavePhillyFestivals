import { prisma } from "@/lib/db";
import { publishedSelectionWhere } from "@/features/editorial-workflow/publication-policy";
import { mapApprovedScheduleSelections } from "@/features/schedule-email/schedule-email-resolution";

const requestInclude = { items: { orderBy: { position: "asc" } } };

export const scheduleEmailRepository = {
  findByIdempotencyKey(idempotencyKey) {
    return prisma.scheduleEmailRequest.findUnique({
      where: { idempotency_key: idempotencyKey },
      include: requestInclude,
    });
  },

  async resolveApproved(items) {
    const festivalIds = items.filter(({ type }) => type === "festival").map(({ id }) => id);
    const eventIds = items.filter(({ type }) => type === "event").map(({ id }) => id);
    const [festivals, events] = await Promise.all([
      prisma.festival.findMany({
        where: { id: { in: festivalIds }, ...publishedSelectionWhere },
        select: { id: true, name: true, slug: true, location: true, start_date: true, end_date: true, occurrences: { where: { is_primary: true }, take: 1, select: { start_at: true, end_at: true, all_day_start: true, all_day_end: true } } },
      }),
      prisma.schedule.findMany({
        where: { id: { in: eventIds }, festival: publishedSelectionWhere },
        select: {
          id: true,
          title: true,
          location: true,
          start_time: true,
          end_time: true,
          festival: { select: { id: true, name: true, slug: true } },
        },
      }),
    ]);

    const resolvedFestivals = festivals.map((festival) => {
      const occurrence = festival.occurrences?.[0];
      return occurrence ? { ...festival, start_date: occurrence.start_at || occurrence.all_day_start, end_date: occurrence.end_at || occurrence.all_day_end } : festival;
    });
    return mapApprovedScheduleSelections(items, { festivals: resolvedFestivals, events });
  },

  createRequest({ email, idempotencyKey, version, items }) {
    return prisma.scheduleEmailRequest.create({
      data: {
        recipient_email: email,
        idempotency_key: idempotencyKey,
        selection_version: version,
        items: {
          create: items.map((item) => ({
            position: item.position,
            item_type: item.type,
            item_id: item.id,
            resolution_status: item.resolutionStatus,
          })),
        },
      },
      include: requestInclude,
    });
  },

  markSent(id, providerMessageId) {
    const now = new Date();
    return prisma.scheduleEmailRequest.update({
      where: { id },
      data: {
        delivery_status: "sent",
        provider_message_id: providerMessageId,
        attempted_at: now,
        sent_at: now,
      },
      include: requestInclude,
    });
  },

  markFailed(id, failure) {
    return prisma.scheduleEmailRequest.update({
      where: { id },
      data: {
        delivery_status: "failed",
        failure_code: failure.code,
        failure_message: failure.message,
        attempted_at: new Date(),
      },
      include: requestInclude,
    });
  },
};
