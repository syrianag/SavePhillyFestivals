import { prisma } from "@/lib/db";

export async function getSchedulesByFestival(festivalId) {
  return prisma.schedule.findMany({
    where: { festival_id: festivalId },
    orderBy: { start_time: "asc" },
    include: {
      festival: {
        select: { id: true, name: true, slug: true },
      },
    },
  });
}

export async function getScheduleById(id) {
  return prisma.schedule.findUnique({
    where: { id },
    include: {
      festival: {
        select: { id: true, name: true, slug: true },
      },
    },
  });
}

export async function createSchedule(data) {
  return prisma.schedule.create({
    data,
  });
}

export async function updateSchedule(id, data) {
  return prisma.schedule.update({
    where: { id },
    data,
  });
}

export async function deleteSchedule(id) {
  return prisma.schedule.delete({
    where: { id },
  });
}

export async function getSavedSchedules(email) {
  return prisma.savedSchedule.findMany({
    where: { user_email: email },
    include: {
      schedule: {
        include: {
          festival: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
    orderBy: { created_at: "desc" },
  });
}

export async function saveSchedule(email, scheduleId) {
  return prisma.savedSchedule.upsert({
    where: {
      user_email_schedule_id: {
        user_email: email,
        schedule_id: scheduleId,
      },
    },
    update: {},
    create: {
      user_email: email,
      schedule_id: scheduleId,
    },
  });
}

export async function removeSavedSchedule(email, scheduleId) {
  return prisma.savedSchedule.delete({
    where: {
      user_email_schedule_id: {
        user_email: email,
        schedule_id: scheduleId,
      },
    },
  });
}
