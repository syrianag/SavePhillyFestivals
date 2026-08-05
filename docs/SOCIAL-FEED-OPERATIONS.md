# Moderated Social Feed Operations

**Feature:** F-09  
**Status:** Implementation complete; external provider activation requires separate approval  
**Authoritative time zone:** `America/New_York`

## Recommended provider

Use **Curator.io** for the initial controlled proof and production launch, subject to contract and privacy review.

Reasons:

- The design handoff identifies Curator.io as having stronger Instagram support and official-partner status.
- Its entry price is lower than the Flockler option documented in the handoff.
- The application does not depend on Curator widgets or embeds. It ingests normalized text-card data into PostgreSQL, so switching to Flockler does not require replacing the public UI or moderation model.

Keep Flockler configured as the supported alternative if Curator cannot meet account eligibility, moderation, retention, accessibility, privacy, or service-level requirements.

Provider endpoint paths and response contracts must be verified against the purchased plan during the controlled proof. Do not activate either adapter based only on marketing documentation.

## Privacy and security model

- Provider credentials are server-only environment variables and are never stored in PostgreSQL, sent to browsers, or committed to Git.
- Provider API origins are fixed in code; administrators cannot supply fetch URLs.
- Provider content enters PostgreSQL as `pending` and cannot become public without a local editor approval and immutable audit transition.
- Public pages render first-party React text cards linking to canonical posts. They do not execute provider scripts, HTML, iframes, autoplay media, or tracking widgets.
- Hidden and rejected posts are excluded by the database query, not filtered after public retrieval.
- Provider failure preserves previously approved cached posts. An empty or unavailable cache renders stable fallback copy and keeps official festival links available.
- Synchronization errors exposed to operators are redacted codes. Public pages never expose provider diagnostics, feed IDs, cursors, reviewer identities, or credentials.

## Required server configuration

Set these values in the deployment secret manager, not in source control:

```text
SOCIAL_FEED_SYNC_SECRET=<dedicated random secret of at least 32 characters>
CURATOR_SOCIAL_FEED_TOKEN=<Curator API token, only if Curator is enabled>
FLOCKLER_SOCIAL_FEED_TOKEN=<Flockler API token, only if Flockler is enabled>
```

`SOCIAL_FEED_SYNC_SECRET` must be unique to this integration and must not reuse `AUTH_SECRET`, an N8N secret, or a provider token. Rotate it after suspected exposure and on the organization’s normal secret-rotation schedule.

## Recommended operating policy

### Refresh frequency

- Sync enabled feeds every **30 minutes**, scheduled in `America/New_York` for operator reporting.
- Add randomized jitter so all festival feeds do not run simultaneously.
- Reduce to every 10 minutes only during a festival’s active date window after provider quotas and database load are measured.
- Apply bounded retries for `429` and transient `5xx` failures. Do not retry authentication, malformed-response, or configuration failures indefinitely.
- Never synchronize during a public festival-page request.

### Moderation ownership and SLA

| Responsibility | Primary | Backup |
|---|---|---|
| Social moderation | Iris Sun — `wsun16@pratt.edu` | Uraiba Zafar — `uzafar@pratt.edu` |
| Product/privacy escalation | Mengqi Cao — `mcao13@pratt.edu` | Simran Kaur — `skaur@pratt.edu` |
| Incident/release coordination | Simran Kaur — `skaur@pratt.edu` | Iris Sun — `wsun16@pratt.edu` |

Recommended SLA:

- Review pending posts within **one business day** during normal operation.
- Review within **four hours** during an active festival day when staffing is explicitly scheduled.
- Hide a previously approved post immediately when a credible safety, rights, harassment, impersonation, or privacy report is received.
- Record a concise internal reason for hidden or rejected decisions. Do not place sensitive personal information in moderation reasons.

Confirm that the `pratt.edu` addresses remain available after handoff and replace them with organization-owned role aliases when available.

### Approval criteria

Approve a post only when it:

- Clearly relates to the configured festival or hashtag.
- Comes from a plausible source and links to an allowed social network.
- Does not expose private contact information or sensitive personal data.
- Does not contain harassment, hate, threats, explicit material, unsafe instructions, deceptive promotion, or obvious impersonation.
- Does not create a known copyright, publicity-right, or takedown issue.
- Is understandable as a text card without relying on inaccessible embedded media.

Use `hidden` for content that was visible or may be reconsidered. Use `rejected` for content that should not be published under the current review.

## Retention recommendation

- Delete unreviewed `pending` cache records after **90 days** when they have no moderation transitions and are no longer part of the active source generation.
- Retain reviewed post metadata and moderation transitions with the project’s immutable editorial audit records under the organization’s approved audit-retention schedule. The current schema intentionally prevents deleting reviewed posts while their immutable transition history exists.
- Before production activation, privacy/legal owners must approve that reviewed-record retention period. If they require content minimization or deletion, add and test a forward migration for audited tombstoning/redaction before enabling provider sync; do not claim the current schema deletes reviewed records.
- Do not store raw provider payloads, embed HTML, media files, access tokens, or unnecessary profile data.
- Do not run a deletion job against reviewed posts until the audited redaction model is implemented and approved.

## Activation checklist

Production synchronization remains disabled until all items are complete:

1. Purchase and privacy/legal review of the selected provider plan.
2. Eligible provider/social accounts connected with least privilege.
3. Provider endpoint and normalized response contract proven in a non-production environment.
4. Dedicated secrets stored in the deployment secret manager and rotation owner named.
5. Scheduled sync configured with quotas, bounded retry, timeout, and alerting.
6. Moderators confirm access, policy, SLA, and escalation contacts.
7. Public fallback and cached-post behavior verified during simulated provider failure.
8. Reviewed-record retention period approved; if content deletion is required, an audited redaction migration and maintenance job are deployed first.
9. Monitoring confirms sync success/failure counts without logging content or secrets unnecessarily.
10. Explicit activation approval recorded separately from the application deployment.

## Incident response

- **Provider unavailable:** Leave the feed enabled if approved cache remains appropriate; visitors receive cached posts or stable fallback copy. Investigate provider status and quota before retrying.
- **Credential failure:** Disable scheduled sync, rotate the affected credential, verify logs are redacted, then run a controlled proof.
- **Unsafe public post:** Mark it hidden in the admin page, document the reason, and escalate rights/privacy or safety reports to the named owner.
- **Incorrect hashtag/feed:** Disable the festival feed first, correct configuration using the current revision, then synchronize and review new pending posts.
- **Suspected audit tampering:** Restrict administrative access, preserve database/log evidence, and involve the technical security operator. Moderation transitions are immutable at the database layer.

## Recovery and forward-only rollback

The database migration adds new tables and does not alter existing festival visibility. If provider activation causes problems:

1. Disable the scheduled sync job.
2. Turn off affected feeds with the per-festival `enabled` control.
3. Keep official social-account links available.
4. Correct provider/configuration issues and resume through a controlled proof.

Do not drop social-feed tables or rewrite moderation history as an operational rollback. Use a reviewed forward migration if schema changes are required.
