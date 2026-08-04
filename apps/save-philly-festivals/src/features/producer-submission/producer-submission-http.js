import { Buffer } from "node:buffer";

import { NextResponse } from "next/server";

import { authorizeProducer, ProducerAuthenticationError, ProducerAuthorizationError } from "./producer-authorization";
import { uploadPrivateFestivalAsset } from "./producer-asset-service";
import { ProducerSubmissionError } from "./producer-submission-errors";
import { presentFestivalAsset, presentProducerFestival } from "./producer-submission-presenter";
import {
  enforceProducerMutationOrigin,
  localProducerRateLimiter,
  producerEdgeRateLimitVerified,
} from "./producer-request-security";
import {
  assetMetadataSchema,
  createProducerDraftSchema,
  patchProducerFestivalSchema,
  PRODUCER_JSON_BODY_LIMIT,
  PRODUCER_MULTIPART_MAX_BYTES,
  producerFestivalIdSchema,
  submitProducerFestivalSchema,
} from "./producer-submission-schema";
import {
  createOwnedDraft,
  getOwnedFestival,
  listOwnedFestivals,
  patchOwnedFestival,
  submitOwnedFestival,
} from "./producer-submission-service";

const PRIVATE_HEADERS = Object.freeze({ "Cache-Control": "private, no-store" });

function json(body, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

function invalidRequest(message = "Invalid request.", status = 400, issues) {
  return json({ error: message, ...(issues ? { issues } : {}) }, status);
}

export async function productionDependencies({ includeProvider = false, includeNotificationProvider = false } = {}) {
  const { producerE2EFixtureEnabled, producerE2EDependencies } = await import("./producer-e2e-fixture");
  if (producerE2EFixtureEnabled()) return producerE2EDependencies();

  const [{ auth }, { producerSubmissionRepository }] = await Promise.all([
    import("@/lib/auth"),
    import("./producer-submission-repository"),
  ]);
  const dependencies = {
    getSession: auth,
    repository: producerSubmissionRepository,
    userRepository: producerSubmissionRepository,
    rateLimiter: localProducerRateLimiter,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    nodeEnv: process.env.NODE_ENV,
    edgeRateLimitVerified: producerEdgeRateLimitVerified(),
  };
  if (includeProvider) dependencies.provider = (await import("@/lib/google-drive")).googleDriveClient;
  if (includeNotificationProvider) dependencies.notificationProvider = (await import("@/lib/mail")).producerNotificationProvider;
  return dependencies;
}

async function authenticatedDependencies(injected, options) {
  const dependencies = injected || await productionDependencies(options);
  const user = await authorizeProducer(dependencies);
  return { ...dependencies, user };
}

function contentLength(request) {
  const raw = request.headers.get("content-length");
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

function originError(request, dependencies) {
  return enforceProducerMutationOrigin(request, dependencies.siteUrl, dependencies.nodeEnv)
    ? null
    : invalidRequest("Cross-origin producer mutation rejected.", 403);
}

function deploymentRateLimitError(dependencies) {
  return dependencies.edgeRateLimitVerified === false
    ? json({ error: "Producer mutations are unavailable until edge rate limiting is verified.", code: "edge_rate_limit_unverified" }, 503)
    : null;
}

function rateLimitError(dependencies, user, operation) {
  const accepted = dependencies.rateLimiter?.consume?.({ userId: user.id, operation });
  return accepted === false ? invalidRequest("Too many producer requests. Try again later.", 429) : null;
}

async function readBoundedBytes(request, limit) {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new Uint8Array(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), byteLength));
}

async function readBoundedText(request, limit) {
  const bytes = await readBoundedBytes(request, limit);
  return bytes === null ? null : Buffer.from(bytes).toString("utf8");
}

async function parseJson(request, schema) {
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") return { response: invalidRequest("Content-Type must be application/json.", 415) };
  if ((contentLength(request) ?? 0) > PRODUCER_JSON_BODY_LIMIT) return { response: invalidRequest("Request body is too large.", 413) };

  const text = await readBoundedText(request, PRODUCER_JSON_BODY_LIMIT).catch(() => null);
  if (text === null) return { response: invalidRequest("Request body is too large.", 413) };
  let body;
  try { body = JSON.parse(text); } catch { return { response: invalidRequest("Request body must be valid JSON.") }; }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { response: invalidRequest("Invalid request.", 400, parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))) };
  }
  return { data: parsed.data };
}

async function parseFestivalId(context) {
  const params = await context.params;
  const parsed = producerFestivalIdSchema.safeParse(params?.id);
  return parsed.success ? parsed.data : null;
}

function handledError(error, operation) {
  if (error instanceof ProducerAuthenticationError || error instanceof ProducerAuthorizationError || error instanceof ProducerSubmissionError) {
    return json({
      error: error.message,
      ...(error.issues ? { issues: error.issues } : {}),
      ...(error.code ? { code: error.code } : {}),
    }, error.statusCode);
  }
  if (error?.code === "provider_unconfigured") return json({ error: "Private asset uploads are unavailable.", code: "provider_unconfigured" }, 503);
  if (error?.code === "provider_error") return json({ error: "Private asset upload failed.", code: "provider_error" }, 502);
  console.error(`[PRODUCER SUBMISSION] ${operation} failed; request data was redacted.`);
  return json({ error: "The producer request could not be processed." }, 500);
}

export async function handleCreateDraft(request, injected) {
  try {
    const dependencies = await authenticatedDependencies(injected);
    const rejected = originError(request, dependencies)
      || deploymentRateLimitError(dependencies)
      || rateLimitError(dependencies, dependencies.user, "create");
    if (rejected) return rejected;
    const parsed = await parseJson(request, createProducerDraftSchema);
    if (parsed.response) return parsed.response;
    const result = await createOwnedDraft(parsed.data, dependencies);
    return json({ festival: presentProducerFestival(result.festival), replayed: result.replayed }, result.replayed ? 200 : 201);
  } catch (error) { return handledError(error, "draft creation"); }
}

export async function handleListOwned(_request, injected) {
  try {
    const dependencies = await authenticatedDependencies(injected);
    const festivals = await listOwnedFestivals(dependencies);
    return json({ festivals: festivals.map(presentProducerFestival) });
  } catch (error) { return handledError(error, "list"); }
}

export async function handleGetOwned(request, context, injected) {
  const festivalId = await parseFestivalId(context);
  if (!festivalId) return invalidRequest("Festival not found.", 404);
  try {
    const dependencies = await authenticatedDependencies(injected);
    const festival = await getOwnedFestival(festivalId, dependencies);
    return json({ festival: presentProducerFestival(festival) });
  } catch (error) { return handledError(error, "read"); }
}

export async function handlePatchOwned(request, context, injected) {
  const festivalId = await parseFestivalId(context);
  if (!festivalId) return invalidRequest("Festival not found.", 404);
  try {
    const dependencies = await authenticatedDependencies(injected);
    const rejected = originError(request, dependencies)
      || deploymentRateLimitError(dependencies)
      || rateLimitError(dependencies, dependencies.user, "patch");
    if (rejected) return rejected;
    const parsed = await parseJson(request, patchProducerFestivalSchema);
    if (parsed.response) return parsed.response;
    const festival = await patchOwnedFestival(festivalId, parsed.data, dependencies);
    return json({ festival: presentProducerFestival(festival) });
  } catch (error) { return handledError(error, "update"); }
}

export async function handleSubmitOwned(request, context, injected) {
  const festivalId = await parseFestivalId(context);
  if (!festivalId) return invalidRequest("Festival not found.", 404);
  try {
    const dependencies = await authenticatedDependencies(injected, { includeNotificationProvider: true });
    const rejected = originError(request, dependencies)
      || deploymentRateLimitError(dependencies)
      || rateLimitError(dependencies, dependencies.user, "submit");
    if (rejected) return rejected;
    const parsed = await parseJson(request, submitProducerFestivalSchema);
    if (parsed.response) return parsed.response;
    const result = await submitOwnedFestival(festivalId, parsed.data, dependencies);
    return json({ festival: presentProducerFestival(result.festival), replayed: result.replayed }, result.replayed ? 200 : 202);
  } catch (error) { return handledError(error, "submit"); }
}

async function parseMultipart(request) {
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "multipart/form-data") return { response: invalidRequest("Content-Type must be multipart/form-data.", 415) };
  const declaredLength = contentLength(request);
  if (declaredLength === null) return { response: invalidRequest("A valid bounded Content-Length is required for uploads.", 411) };
  if (declaredLength > PRODUCER_MULTIPART_MAX_BYTES) return { response: invalidRequest("Request body is too large.", 413) };

  // Next/Node formData() buffers. Read through a hard byte bound first, then parse the
  // bounded copy; deployment ingress must enforce the same maximum.
  const body = await readBoundedBytes(request, PRODUCER_MULTIPART_MAX_BYTES).catch(() => null);
  if (body === null || body.byteLength > declaredLength) return { response: invalidRequest("Request body is too large.", 413) };
  let form;
  try {
    form = await new Request(request.url, { method: request.method, headers: request.headers, body }).formData();
  } catch { return { response: invalidRequest("Invalid multipart request.") }; }
  const allowed = new Set(["file", "purpose", "alt_text", "rights_acknowledged", "rights_version"]);
  const entries = [...form.entries()];
  if (entries.some(([key]) => !allowed.has(key)) || [...allowed].some((key) => form.getAll(key).length !== 1)) {
    return { response: invalidRequest("Invalid multipart fields.") };
  }
  const parsed = assetMetadataSchema.safeParse(Object.fromEntries(entries.filter(([key]) => key !== "file")));
  if (!parsed.success) return { response: invalidRequest("Invalid asset metadata.") };
  return { file: form.get("file"), metadata: parsed.data };
}

export async function handleUploadAsset(request, context, injected) {
  const festivalId = await parseFestivalId(context);
  if (!festivalId) return invalidRequest("Festival not found.", 404);
  try {
    // Authenticate and enforce mutation policy before buffering multipart content.
    const dependencies = await authenticatedDependencies(injected, { includeProvider: true });
    const rejected = originError(request, dependencies)
      || deploymentRateLimitError(dependencies)
      || rateLimitError(dependencies, dependencies.user, "upload");
    if (rejected) return rejected;
    if (!await dependencies.provider?.isOperational?.()) return json({ error: "Private asset uploads are unavailable.", code: "provider_unconfigured" }, 503);
    const parsed = await parseMultipart(request);
    if (parsed.response) return parsed.response;
    const asset = await uploadPrivateFestivalAsset(festivalId, parsed.file, parsed.metadata, dependencies);
    return json({ asset: presentFestivalAsset(asset) }, 201);
  } catch (error) { return handledError(error, "private asset upload"); }
}

export async function handleProducerCapabilities(_request, injected) {
  try {
    const dependencies = await authenticatedDependencies(injected, { includeProvider: true });
    const edgeVerified = dependencies.edgeRateLimitVerified !== false;
    const providerOperational = await dependencies.provider?.isOperational?.();
    return json({
      uploads: { enabled: Boolean(edgeVerified && providerOperational) },
      mutations: { enabled: edgeVerified },
    });
  } catch (error) { return handledError(error, "capabilities"); }
}
