import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getTasks, createTask } from "@/features/tasks/task-queries";
import { createTaskSchema } from "@/features/tasks/task-schemas";
import { validate } from "@/lib/validate";

export async function GET(request) {
  await requireAdmin();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const assignee = searchParams.get("assignee") || undefined;

  const result = await getTasks({ status, assignee });
  return NextResponse.json(result);
}

export async function POST(request) {
  await requireAdmin();

  const body = await request.json();
  const result = validate(createTaskSchema, body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: result.errors },
      { status: 400 }
    );
  }

  const task = await createTask(result.data);
  return NextResponse.json({ task }, { status: 201 });
}
