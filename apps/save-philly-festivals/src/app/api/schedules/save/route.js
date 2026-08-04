import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveSchedule } from "@/features/schedules/schedule-queries";
import { saveScheduleWithOptInSchema } from "@/features/schedules/schedule-schemas";
import { validate } from "@/lib/validate";
import { handleApiError, NotFoundError } from "@/lib/errors";
import {
  sendScheduleConfirmation,
  sendMailingListForward,
} from "@/lib/mail";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = validate(saveScheduleWithOptInSchema, body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", errors: result.errors },
        { status: 400 }
      );
    }

    const { email, schedule_id, receive_updates } = result.data;

    const schedule = await prisma.schedule.findUnique({
      where: { id: schedule_id },
      include: {
        festival: {
          select: { id: true, name: true, contact_email: true },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundError("Schedule not found");
    }

    const saved = await saveSchedule(email, schedule_id);

    let emailSent = false;
    let updatesForwarded = false;

    try {
      const confirmationResult = await sendScheduleConfirmation({
        to: email,
        festivalName: schedule.festival.name,
        scheduleTitle: schedule.title,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
      });
      emailSent = confirmationResult.success;
    } catch (emailError) {
      console.error("[SCHEDULE] Confirmation email failed:", emailError.message);
    }

    if (receive_updates && schedule.festival.contact_email) {
      try {
        await sendMailingListForward({
          to: schedule.festival.contact_email,
          visitorEmail: email,
          festivalName: schedule.festival.name,
        });
        updatesForwarded = true;
      } catch (emailError) {
        console.error("[SCHEDULE] Mailing list forward failed:", emailError.message);
      }
    }

    return NextResponse.json(
      {
        saved,
        email_sent: emailSent,
        updates_forwarded: updatesForwarded,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
