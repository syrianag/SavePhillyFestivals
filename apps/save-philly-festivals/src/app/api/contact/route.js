import { z } from "zod";

import { NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/mail";
import { extractTrustedRequestIp, parsePublicMutationJson, publicMutationGuard } from "@/features/public-mutation/public-mutation-security";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().toLowerCase().min(3).max(254).email("A valid email is required"),
  message: z.string().trim().min(1, "Message is required").max(5000),
}).strict();

export async function POST(request) {
  const guard = publicMutationGuard(request, {
    operation: "contact",
    identifier: extractTrustedRequestIp(request),
  });
  if (guard) return guard;

  const parsed = await parsePublicMutationJson(request);
  if (parsed.response) return parsed.response;

  const result = contactSchema.safeParse(parsed.data);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) },
      { status: 400, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const sendResult = await sendContactEmail(result.data);
  if (!sendResult.success) {
    return NextResponse.json(
      { error: "Your message could not be sent. Please try again later." },
      { status: 502, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  return NextResponse.json({ success: true }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
