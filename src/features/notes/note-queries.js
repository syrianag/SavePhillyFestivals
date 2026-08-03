import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export async function getNotes({ entityType, entityId }) {
  const notes = await prisma.note.findMany({
    where: { entity_type: entityType, entity_id: entityId },
    orderBy: { created_at: "desc" },
  });

  return { notes };
}

export async function createNote({ body, author_email, entity_type, entity_id }) {
  return prisma.note.create({
    data: {
      id: randomUUID(),
      body,
      author_email: author_email || null,
      entity_type,
      entity_id,
      updated_at: new Date(),
    },
  });
}

export async function deleteNote(id) {
  return prisma.note.delete({ where: { id } });
}
