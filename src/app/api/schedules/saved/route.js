import { NextResponse } from "next/server";
import { getSavedSchedules, removeSavedSchedule } from "@/features/schedules/schedule-queries";
import { removeSavedScheduleSchema } from "@/features/schedules/schedule-schemas";
import { validate } from "@/lib/validate";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      throw new ValidationError("Email query parameter is required");
    }

    const saved = await getSavedSchedules(email);

    return NextResponse.json({ saved });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const result = validate(removeSavedScheduleSchema, body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", errors: result.errors },
        { status: 400 }
      );
    }

    const { email, schedule_id } = result.data;

    try {
      await removeSavedSchedule(email, schedule_id);
    } catch {
      throw new NotFoundError("Saved schedule not found");
    }

    return NextResponse.json({ message: "Schedule removed from your list" });
  } catch (error) {
    return handleApiError(error);
  }
}
