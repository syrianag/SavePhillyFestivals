# Save Philly Festivals - N8N Guide for Non-Technical Owners

![Save Philly Festivals logo](../apps/save-philly-festivals/public/logos/SPF%20One%20Line%20Logo.png)

**Audience:** Product owners, operations leads, and reviewers who approve or monitor N8N work
**Scope:** What N8N does, what stays disabled, approval checkpoints, daily checks, and escalation
**Last updated:** 2026-08-05

This guide explains N8N in plain language so non-technical owners can safely approve, monitor, and pause automation without needing to edit workflow code.

---

## 1. What N8N is used for in this project

N8N is the automation workspace for two controlled workflow areas:

1. `DiasporaDNA` workflow (draft-oriented outreach automation)
2. Organizer subscription workflow handoff boundary (`OrganizerSubscriptions`)

Current safety posture:

- Both workflows are intentionally stored as inactive exports in this repository.
- Nothing in this repository auto-activates workflows in production.
- A code merge is not activation approval.

---

## 2. What is safe to assume today

- N8N can be validated and tested without sending real organizer emails.
- The organizer subscription path is contract-tested but intentionally inactive until explicit approval.
- If configuration is missing, flows fail closed rather than pretending to succeed.

Do not assume any production activation happened just because code exists.

---

## 3. Owner decision points (approval gates)

You should require explicit signoff at each gate:

1. **Deployment approval**
   - Allows infrastructure and workflow import steps only.
   - Does not allow workflow activation.

2. **Controlled proof approval**
   - Allows one tightly scoped test case in production-like conditions.
   - Expected outcome: one controlled result and zero unintended sends.

3. **Activation approval**
   - Allows steady-state operation after proof evidence is reviewed.
   - Must name operators, escalation contacts, and rollback owner.

4. **Change approval for future edits**
   - Any workflow logic/provider change repeats the same gated process.

---

## 4. What owners should check before activation

Use this checklist before approving activation:

| Area | What to verify |
|---|---|
| Credentials | Required secrets are configured only in approved secret stores |
| Domain/TLS | Public URL and HTTPS are healthy and correctly configured |
| Monitoring | Health checks, error alerts, and backup checks are active |
| Backups | Recent backup exists and restore procedure has been tested |
| Privacy/legal | Consent copy, retention policy, and processor approvals are complete |
| Evidence | Controlled proof log is attached and reviewed |
| Ownership | Primary operator, backup operator, and incident owner are named |

If any row is incomplete, keep workflows inactive.

---

## 5. Daily and weekly owner checks

## 5.1 Daily checks (5-10 minutes)

- Confirm N8N service health is green.
- Confirm no unreviewed critical error alerts.
- Confirm queue behavior is normal (no stuck retries or unusual spikes).
- Confirm no unauthorized activation/deactivation occurred.

## 5.2 Weekly checks (15-30 minutes)

- Review failure trends and repeated manual retries.
- Confirm backups are recent and restorable.
- Review provider quota/cost usage.
- Confirm operator contact list is still current.

---

## 6. Incident playbook for non-technical owners

If you suspect unsafe behavior (wrong recipients, duplicates, privacy concern, unexpected activation):

1. Pause or deactivate affected workflow path through the approved operator.
2. Preserve evidence (timestamps, workflow execution IDs, affected record IDs).
3. Notify incident coordinator and privacy owner together.
4. Do not request deletion of logs/evidence during active investigation.
5. Require written go/no-go before reactivation.

---

## 7. Common owner questions

## 7.1 "Code merged. Is it live?"

No. Merge only means code is available for review and deployment planning. Activation still needs explicit approval.

## 7.2 "Can we skip controlled proof to save time?"

No. Controlled proof is the gate that catches misconfiguration before broad impact.

## 7.3 "Can we activate while legal text is still draft?"

No, not for consent-dependent workflows. Legal/privacy dependencies must be approved first.

## 7.4 "What if we need to stop quickly?"

Use the documented deactivation path via named operators. This should be rehearsed before first activation.

---

## 8. Owner handoff package (minimum)

Before accepting ownership, request these artifacts:

- Latest `docs/FDE-DELIVERY-PLAN.md`
- Latest `apps/n8n/README.md`
- Validation and workflow test evidence
- Controlled proof record with expected vs. actual outcomes
- Named operator and escalation list
- Backup/restore proof summary

---

## 9. Where to go for details

- `apps/n8n/README.md` - technical runtime and contract details
- `docs/FDE-DELIVERY-PLAN.md` - phased readiness and gate definitions
- `docs/DELIVERY-WORKFLOW.md` - merge/test/release controls
- `docs/SCHEDULE-CALENDAR-EMAIL.md` - consent and organizer email behavior
- `docs/Client-UserGuide.md` - full application behavior for client operations
