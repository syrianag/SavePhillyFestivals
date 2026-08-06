import { NextResponse } from "next/server";
import { contactMessageSchema } from "@/features/contact/contact-schemas";
import { validate } from "@/lib/validate";
import { handleApiError } from "@/lib/errors";
import { sendContactMessage } from "@/lib/mail";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = validate(contactMessageSchema, body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", errors: result.errors },
        { status: 400 }
      );
    }

    const mailResult = await sendContactMessage(result.data);

    if (!mailResult.success) {
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, stubbed: mailResult.stubbed || false },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
