import bcrypt from "bcryptjs";

import { ProducerAccessError } from "./producer-access-repository";
import { sendAccountDecisionEmail } from "./producer-access-notifications";

const BCRYPT_ROUNDS = 12;

/**
 * Self-service registration.
 *
 * Always reports success, even when the address is already registered. Distinguishing the two
 * would turn this endpoint into an account-enumeration oracle: anyone could probe which email
 * addresses hold accounts on a site that also hosts the admin portal. The duplicate case simply
 * creates nothing.
 */
export async function registerAccount(input, { repository }) {
  const existing = await repository.findUserByEmail(input.email);
  if (existing) return { registered: true, created: false };

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  await repository.createPublicAccount({ name: input.name, email: input.email, passwordHash });
  return { registered: true, created: true };
}

export async function requestProducerAccess(input, { repository, user }) {
  if (user.role === "producer" || user.role === "admin" || user.role === "super_admin") {
    throw new ProducerAccessError("This account already has submission access.", 409, "already_granted");
  }
  const open = await repository.findOpenRequestForUser(user.id);
  if (open) throw new ProducerAccessError("A request is already awaiting review.", 409, "already_pending");

  return {
    request: await repository.createRequest({
      userId: user.id,
      organization: input.organization || null,
      festivalName: input.festival_name || null,
      message: input.message || null,
    }),
  };
}

export async function getOwnAccessStatus({ repository, user }) {
  const request = await repository.findLatestRequestForUser(user.id);
  return { role: user.role, request: request || null };
}

export async function listAccessRequests(status, { repository }) {
  return { requests: await repository.listRequests(status) };
}

/**
 * Records an approval or rejection, grants the role on approval, then emails the applicant.
 *
 * Delivery happens after the transaction commits and its failure is reported rather than
 * thrown: the decision is authoritative, and an approved producer must not be left without
 * access because a mail provider was down.
 */
export async function decideAccessRequest(requestId, input, { repository, user }) {
  const request = await repository.decideRequest({
    requestId,
    decision: input.decision,
    reason: input.reason,
    actorUserId: user.id,
  });

  const templateKey = input.decision === "approved" ? "producer_access_approved" : "producer_access_rejected";
  const template = await repository.findTemplate(templateKey);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://savephillyfestivals.com";
  const delivery = template
    ? await sendAccountDecisionEmail({
      template,
      to: request.user.email,
      values: {
        name: request.user.name || request.user.email,
        email: request.user.email,
        site_url: siteUrl,
        producer_url: `${siteUrl}/producer/dashboard`,
        reason: input.reason || "",
      },
    })
    : { delivered: false, reason: "template_missing" };

  return { request, notification: delivery };
}

export async function listEmailTemplates({ repository }) {
  return { templates: await repository.ensureDefaultTemplates() };
}

export async function createEmailTemplate(input, { repository, user }) {
  const existing = await repository.findTemplate(input.key);
  if (existing) throw new ProducerAccessError("A template with that key already exists.", 409, "duplicate_key");
  return { template: await repository.createTemplate({ ...input, updated_by_user_id: user.id }) };
}

export async function updateEmailTemplate(key, input, { repository, user }) {
  return { template: await repository.updateTemplate(key, { ...input, updated_by_user_id: user.id }) };
}
