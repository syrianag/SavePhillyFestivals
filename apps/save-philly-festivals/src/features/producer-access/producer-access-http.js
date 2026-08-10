import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";

import { authorizeEditor } from "@/features/editorial-workflow/editorial-authorization";
import { editorialRepository } from "@/features/editorial-workflow/editorial-repository";
import { EditorialPolicyError } from "@/features/editorial-workflow/editorial-transition-policy";
import { enforceProducerMutationOrigin } from "@/features/producer-submission/producer-request-security";
import { producerAccessRepository, ProducerAccessError } from "./producer-access-repository";
import {
  accessDecisionSchema,
  accessRequestSchema,
  emailTemplateCreateSchema,
  emailTemplateSchema,
  PRODUCER_ACCESS_JSON_BODY_LIMIT,
  registrationSchema,
} from "./producer-access-schema";
import {
  createEmailTemplate,
  decideAccessRequest,
  getOwnAccessStatus,
  listAccessRequests,
  listEmailTemplates,
  registerAccount,
  requestProducerAccess,
  updateEmailTemplate,
} from "./producer-access-service";

const HEADERS = { "Cache-Control": "private, no-store" };

function json(body, status = 200) { return NextResponse.json(body, { status, headers: HEADERS }); }

/* Registration is the only unauthenticated write in the application, so it gets its own much
 * tighter bucket keyed by client address rather than by user. In-process like the other limiters
 * here — it blunts casual scripted abuse, and is explicitly not a substitute for the edge rate
 * limiting the deployment provides. */
const registrationBuckets = new Map();
const REGISTRATION_LIMIT = 5;
const REGISTRATION_WINDOW_MS = 15 * 60_000;

function clientKey(request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

function consumeRegistration(key) {
  const now = Date.now();
  const current = registrationBuckets.get(key);
  if (!current || current.resetAt <= now) {
    registrationBuckets.set(key, { count: 1, resetAt: now + REGISTRATION_WINDOW_MS });
    return true;
  }
  current.count += 1;
  return current.count <= REGISTRATION_LIMIT;
}

async function parseJson(request, schema) {
  if (request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
    return { response: json({ error: "Content-Type must be application/json." }, 415) };
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > PRODUCER_ACCESS_JSON_BODY_LIMIT) return { response: json({ error: "Request body is too large." }, 413) };
  let body;
  try { body = JSON.parse(Buffer.from(bytes).toString("utf8")); }
  catch { return { response: json({ error: "Request body must be valid JSON." }, 400) }; }
  const parsed = schema.safeParse(body);
  return parsed.success
    ? { data: parsed.data }
    : { response: json({ error: "Invalid request.", issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) }, 400) };
}

function handled(error) {
  if (error instanceof ProducerAccessError) return json({ error: error.message, code: error.code }, error.statusCode);
  if (error instanceof EditorialPolicyError && error.code === "forbidden") return json({ error: error.message, code: error.code }, 403);
  if (error?.statusCode) return json({ error: error.message, ...(error.code ? { code: error.code } : {}) }, error.statusCode);
  console.error("[PRODUCER ACCESS] Request failed; private data was redacted.");
  return json({ error: "The request could not be processed." }, 500);
}

async function sessionUser() {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) throw new ProducerAccessError("Authentication required.", 401, "unauthenticated");
  return session.user;
}

async function editorContext(injected) {
  if (injected) return injected;
  const { auth } = await import("@/lib/auth");
  const values = { getSession: auth, userRepository: editorialRepository, repository: producerAccessRepository };
  return { ...values, user: await authorizeEditor({ ...values, repository: editorialRepository }) };
}

function originGate(request) {
  if (!enforceProducerMutationOrigin(request, process.env.NEXT_PUBLIC_SITE_URL, process.env.NODE_ENV)) {
    return json({ error: "Cross-origin request rejected." }, 403);
  }
  return null;
}

export async function handleRegister(request, injected) {
  try {
    const gate = originGate(request); if (gate) return gate;
    if (!consumeRegistration(clientKey(request))) {
      return json({ error: "Too many registration attempts. Try again later." }, 429);
    }
    const parsed = await parseJson(request, registrationSchema); if (parsed.response) return parsed.response;
    const repository = injected?.repository || producerAccessRepository;
    return json(await registerAccount(parsed.data, { repository }), 201);
  } catch (error) { return handled(error); }
}

export async function handleAccessRequest(request, injected) {
  try {
    const gate = originGate(request); if (gate) return gate;
    const user = injected?.user || await sessionUser();
    const parsed = await parseJson(request, accessRequestSchema); if (parsed.response) return parsed.response;
    const repository = injected?.repository || producerAccessRepository;
    return json(await requestProducerAccess(parsed.data, { repository, user }), 201);
  } catch (error) { return handled(error); }
}

export async function handleAccessStatus(_request, injected) {
  try {
    const user = injected?.user || await sessionUser();
    const repository = injected?.repository || producerAccessRepository;
    return json(await getOwnAccessStatus({ repository, user }));
  } catch (error) { return handled(error); }
}

export async function handleAdminRequestList(request, injected) {
  try {
    const values = await editorContext(injected);
    const status = new URL(request.url).searchParams.get("status") || undefined;
    return json(await listAccessRequests(status, values));
  } catch (error) { return handled(error); }
}

export async function handleAdminDecision(request, context, injected) {
  try {
    const values = await editorContext(injected);
    const gate = originGate(request); if (gate) return gate;
    const requestId = (await context.params)?.id;
    if (!requestId) return json({ error: "Request not found." }, 404);
    const parsed = await parseJson(request, accessDecisionSchema); if (parsed.response) return parsed.response;
    return json(await decideAccessRequest(requestId, parsed.data, values));
  } catch (error) { return handled(error); }
}

export async function handleTemplateList(_request, injected) {
  try { return json(await listEmailTemplates(await editorContext(injected))); }
  catch (error) { return handled(error); }
}

export async function handleTemplateCreate(request, injected) {
  try {
    const values = await editorContext(injected);
    const gate = originGate(request); if (gate) return gate;
    const parsed = await parseJson(request, emailTemplateCreateSchema); if (parsed.response) return parsed.response;
    return json(await createEmailTemplate(parsed.data, values), 201);
  } catch (error) { return handled(error); }
}

export async function handleTemplateUpdate(request, context, injected) {
  try {
    const values = await editorContext(injected);
    const gate = originGate(request); if (gate) return gate;
    const key = (await context.params)?.key;
    if (!key) return json({ error: "Template not found." }, 404);
    const parsed = await parseJson(request, emailTemplateSchema); if (parsed.response) return parsed.response;
    return json(await updateEmailTemplate(key, parsed.data, values));
  } catch (error) { return handled(error); }
}
