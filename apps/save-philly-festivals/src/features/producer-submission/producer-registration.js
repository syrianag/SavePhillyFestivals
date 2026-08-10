import { z } from "zod";

import { NextResponse } from "next/server";
import { userRepository } from "@/features/users/user-repository";
import { userPasswordSchema } from "@/features/users/user-schema";
import { extractTrustedRequestIp, parsePublicMutationJson, publicMutationGuard } from "@/features/public-mutation/public-mutation-security";

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().min(3).max(254).email(),
  password: userPasswordSchema,
}).strict();

const HEADERS = { "Cache-Control": "private, no-store" };

function json(body, status = 200) {
  return NextResponse.json(body, { status, headers: HEADERS });
}

export async function handleProducerRegister(request, injected) {
  const guard = publicMutationGuard(request, {
    operation: "producer_register",
    identifier: extractTrustedRequestIp(request),
  });
  if (guard) return guard;

  const parsed = await parsePublicMutationJson(request);
  if (parsed.response) return parsed.response;

  const result = registerSchema.safeParse(parsed.data);
  if (!result.success) {
    return json({
      error: "Please check the registration details.",
      issues: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    }, 400);
  }

  const repository = injected?.repository ?? userRepository;
  try {
    const user = await repository.createSelfServiceProducer(result.data);
    return json({ user: { id: user.id, email: user.email, name: user.name } }, 201);
  } catch (error) {
    if (error?.code === "P2002") {
      return json({ error: "An account with that email already exists. Sign in instead.", code: "email_conflict" }, 409);
    }
    console.error("[PRODUCER REGISTRATION] Request failed without logging account payloads.", { name: error?.name, code: error?.code });
    return json({ error: "The account could not be created. Please try again later." }, 500);
  }
}
