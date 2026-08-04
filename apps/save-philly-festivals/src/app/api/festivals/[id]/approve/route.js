import { NextResponse } from "next/server";
import { approveFestival, getFestivalById } from "@/features/festivals/festival-queries";
import { approveFestivalSchema } from "@/features/festivals/festival-schemas";
import { validate } from "@/lib/validate";
import { handleApiError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { auth } from "@/lib/auth";
import { sendFestivalApproved, sendFestivalRejected } from "@/lib/mail";

export async function POST(request, { params }) {
  try {
    const session = await auth();

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      throw new ForbiddenError("Admin access required");
    }

    const { id } = await params;
    const body = await request.json();
    const result = validate(approveFestivalSchema, body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", errors: result.errors },
        { status: 400 }
      );
    }

    const existing = await getFestivalById(id);
    if (!existing) {
      throw new NotFoundError("Festival not found");
    }

    const { status, reason } = result.data;
    const festival = await approveFestival(id, status, reason);

    if (existing.contact_email) {
      const sendFn = status === "approved" ? sendFestivalApproved : sendFestivalRejected;
      await sendFn({
        to: existing.contact_email,
        festivalName: existing.name,
        reason,
      });
    }

    return NextResponse.json(festival);
  } catch (error) {
    return handleApiError(error);
  }
}
