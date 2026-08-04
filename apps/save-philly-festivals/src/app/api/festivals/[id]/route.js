import { NextResponse } from "next/server";
import { getFestivalById, updateFestival, deleteFestival } from "@/features/festivals/festival-queries";
import { updateFestivalSchema } from "@/features/festivals/festival-schemas";
import { validate } from "@/lib/validate";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { auth } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const festival = await getFestivalById(id);

    if (!festival) {
      throw new NotFoundError("Festival not found");
    }

    return NextResponse.json(festival);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = validate(updateFestivalSchema, body);

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

    const festival = await updateFestival(id, result.data);
    return NextResponse.json(festival);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getFestivalById(id);

    if (!existing) {
      throw new NotFoundError("Festival not found");
    }

    await deleteFestival(id);
    return NextResponse.json({ message: "Festival deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
