import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export const TASK_STATUS = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
};

export const TASK_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

function normalizeData(data) {
  const normalized = { ...data };

  if (normalized.description === "") normalized.description = null;
  if (normalized.assignee_email === "") normalized.assignee_email = null;
  if (normalized.festival_id === "") normalized.festival_id = null;

  if (normalized.due_date) {
    normalized.due_date = new Date(normalized.due_date);
  } else if (normalized.due_date === null || normalized.due_date === "") {
    normalized.due_date = null;
  }

  return normalized;
}

export async function getTasks({ status, assignee, limit = 100 } = {}) {
  const where = {};

  if (status) where.status = status;
  if (assignee) where.assignee_email = assignee;

  const tasks = await prisma.task.findMany({
    where,
    include: {
      Festival: { select: { id: true, name: true } },
    },
    orderBy: [{ created_at: "asc" }],
    take: Math.min(limit, 200),
  });

  return { tasks };
}

export async function getTaskById(id) {
  return prisma.task.findUnique({
    where: { id },
    include: {
      Festival: { select: { id: true, name: true } },
    },
  });
}

export async function createTask(data) {
  const normalized = normalizeData(data);
  return prisma.task.create({
    data: {
      ...normalized,
      id: randomUUID(),
      status: normalized.status || TASK_STATUS.TODO,
      priority: normalized.priority || TASK_PRIORITY.MEDIUM,
      updated_at: new Date(),
    },
  });
}

export async function updateTask(id, data) {
  const normalized = normalizeData(data);
  const payload = { ...normalized, updated_at: new Date() };

  if (normalized.status === TASK_STATUS.DONE) {
    payload.completed_at = new Date();
  } else if (normalized.status && normalized.status !== TASK_STATUS.DONE) {
    payload.completed_at = null;
  }

  return prisma.task.update({ where: { id }, data: payload });
}

export async function deleteTask(id) {
  return prisma.task.delete({ where: { id } });
}
