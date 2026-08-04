---
name: Feature delivery
description: Tested feature or vertical slice
---

## Requirement

- Feature ID / issue:
- Acceptance criteria addressed:

## Summary

Describe the user-visible behavior and the smallest coherent vertical slice delivered.

## Evidence

- [ ] Desktop screenshot/recording attached for UI changes
- [ ] Mobile screenshot/recording attached for UI changes
- [ ] Loading, empty, error, and accessibility states reviewed where applicable

## Tests

- [ ] Focused unit tests added/updated and passing
- [ ] API/database or N8N contract tests added/updated where applicable
- [ ] Playwright critical path added/updated and passing
- [ ] `pnpm run verify` passes
- [ ] `pnpm run e2e` passes
- [ ] No live provider was called by tests
- [ ] No flaky test or accepted retry

Commands and results:

```text
Add exact commands and pass counts here.
```

## Data and operations

- [ ] No schema change
- [ ] Prisma migration included, blank-database tested, and upgrade/rollback notes supplied
- [ ] No new personal data or consent impact
- [ ] Privacy/security impact documented and approved
- [ ] No external integration activation
- [ ] Integration remains disabled/inactive pending separate approval

Migration/rollback/disablement notes:

## Review

- [ ] Branch is current with `main`
- [ ] Product/design owner reviewed changed behavior and copy
- [ ] Required engineering approvals obtained
- [ ] Two approvals obtained for auth, authorization, consent, uploads, migrations, calendar semantics, N8N, or deployment changes
- [ ] All conversations resolved
- [ ] Squash merge selected
- [ ] Branch will be deleted after merge
