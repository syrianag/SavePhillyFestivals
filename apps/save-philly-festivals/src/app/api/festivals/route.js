import { NextResponse } from "next/server";
import { getFestivals, createFestival } from "@/features/festivals/festival-queries";
import { createFestivalSchema } from "@/features/festivals/festival-schemas";
import { validate } from "@/lib/validate";
import { handleApiError } from "@/lib/errors";
import { auth } from "@/lib/auth";
import { FESTIVAL_STATUS } from "@/lib/constants";
import { sendSubmissionConfirmation } from "@/lib/mail";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const search = searchParams.get("search");

    const session = await auth();
    const isAdmin = session?.user?.role === "admin" || session?.user?.role === "super_admin";

    // Non-admin users can only see approved festivals
    const filterStatus = isAdmin ? status : FESTIVAL_STATUS.APPROVED;

    const result = await getFestivals({
      status: filterStatus,
      page,
      limit,
      search,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const result = validate(createFestivalSchema, body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", errors: result.errors },
        { status: 400 }
      );
    }

    const session = await auth();
    const submitData = {
      ...result.data,
      submitted_by: session?.user?.email || result.data.submitted_by || null,
    };

    const festival = await createFestival(submitData);

    if (submitData.contact_email) {
      await sendSubmissionConfirmation({
        to: submitData.contact_email,
        festivalName: festival.name,
      });
    }

    return NextResponse.json(festival, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
