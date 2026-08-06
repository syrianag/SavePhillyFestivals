import { Buffer } from "node:buffer";

import { NextResponse } from "next/server";
import { authorizeUserManager } from "./user-authorization";
import { userRepository } from "./user-repository";
import { createUserSchema, listUsersQuerySchema, updateUserSchema, USER_JSON_BODY_LIMIT, userIdSchema } from "./user-schema";
import { createManagedUser, deactivateManagedUser, getManagedUser, listManagedUsers, updateManagedUser } from "./user-service";
import { UserManagementError } from "./user-policy";
import { consumeUserManagementRateLimit, enforceUserManagementOrigin, userManagementEdgeRateLimitVerified } from "./user-request-security";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

function json(body, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

async function dependencies() {
  const { userManagementE2EDependencies } = await import("./user-e2e-fixture");
  const fixture = await userManagementE2EDependencies();
  if (fixture) return fixture;
  const { auth } = await import("@/lib/auth");
  return { getSession: auth, repository: userRepository };
}

async function authorized(injected) {
  const values = injected || await dependencies();
  return { ...values, actor: await authorizeUserManager(values) };
}

async function parseId(context) {
  const parsed = userIdSchema.safeParse((await context.params)?.id);
  return parsed.success ? parsed.data : null;
}

async function parseJson(request, schema) {
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") return { response: json({ error: "Content-Type must be application/json." }, 415) };

  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > USER_JSON_BODY_LIMIT)) {
    return { response: json({ error: "Request body is too large." }, 413) };
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > USER_JSON_BODY_LIMIT) return { response: json({ error: "Request body is too large." }, 413) };

  let body;
  try {
    body = JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch {
    return { response: json({ error: "Request body must be valid JSON." }, 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      response: json({
        error: "Invalid request.",
        issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      }, 400),
    };
  }
  return { data: parsed.data };
}

function mutationGate(request, values) {
  if (!enforceUserManagementOrigin(request, values.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL, values.nodeEnv ?? process.env.NODE_ENV)) {
    return json({ error: "Cross-origin account mutation rejected." }, 403);
  }
  if (!(values.edgeRateLimitVerified ?? userManagementEdgeRateLimitVerified())) {
    return json({ error: "Account mutations are unavailable until edge rate limiting is verified." }, 503);
  }
  if (!(values.consumeRateLimit ? values.consumeRateLimit(values.actor.id) : consumeUserManagementRateLimit(values.actor.id))) {
    return json({ error: "Too many account-management requests. Try again later." }, 429);
  }
  return null;
}

function handled(error) {
  if (error instanceof UserManagementError || error?.statusCode) {
    return json({ error: error.message, ...(error.code ? { code: error.code } : {}) }, error.statusCode || 400);
  }
  if (error?.code === "P2002") return json({ error: "An account with that email already exists.", code: "email_conflict" }, 409);
  console.error("[USER MANAGEMENT] Request failed without logging account payloads.", { name: error?.name, code: error?.code });
  return json({ error: "The account-management request could not be processed." }, 500);
}

export async function handleUserList(request, injected) {
  try {
    const values = await authorized(injected);
    const parsed = listUsersQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    if (!parsed.success) return json({ error: "Invalid query." }, 400);
    return json({ ...await listManagedUsers(parsed.data, values), current_user: values.actor });
  } catch (error) {
    return handled(error);
  }
}

export async function handleUserCreate(request, injected) {
  try {
    const values = await authorized(injected);
    const gate = mutationGate(request, values);
    if (gate) return gate;
    const parsed = await parseJson(request, createUserSchema);
    if (parsed.response) return parsed.response;
    return json({ user: await createManagedUser(parsed.data, values) }, 201);
  } catch (error) {
    return handled(error);
  }
}

export async function handleUserGet(_request, context, injected) {
  const id = await parseId(context);
  if (!id) return json({ error: "User not found." }, 404);
  try {
    const values = await authorized(injected);
    return json({ user: await getManagedUser(id, values) });
  } catch (error) {
    return handled(error);
  }
}

export async function handleUserUpdate(request, context, injected) {
  const id = await parseId(context);
  if (!id) return json({ error: "User not found." }, 404);
  try {
    const values = await authorized(injected);
    const gate = mutationGate(request, values);
    if (gate) return gate;
    const parsed = await parseJson(request, updateUserSchema);
    if (parsed.response) return parsed.response;
    return json({ user: await updateManagedUser(id, parsed.data, values) });
  } catch (error) {
    return handled(error);
  }
}

export async function handleUserDeactivate(request, context, injected) {
  const id = await parseId(context);
  if (!id) return json({ error: "User not found." }, 404);
  try {
    const values = await authorized(injected);
    const gate = mutationGate(request, values);
    if (gate) return gate;
    return json({ user: await deactivateManagedUser(id, values), deactivated: true });
  } catch (error) {
    return handled(error);
  }
}
