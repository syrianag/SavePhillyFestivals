import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  getTaskById,
  updateTask,
  deleteTask,
} from "@/features/tasks/task-queries";
import { updateTaskSchema } from "@/features/tasks/task-schemas";
import { validate } from "@/lib/validate";

export async function GET(request, { params }) {
  await requireAdmin();
  const { id } = await params;

  const task = await getTaskById(id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function PATCH(request, { params }) {
  await requireAdmin();
  const { id } = await params;

  const body = await request.json();
  const result = validate(updateTaskSchema, body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: result.errors },
      { status: 400 }
    );
  }

  const task = await updateTask(id, result.data);
  return NextResponse.json({ task });
}

export async function DELETE(request, { params }) {
  await requireAdmin();
  const { id } = await params;

  try {
    await deleteTask(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to delete task" },
      { status: 400 }
    );
  }
}
