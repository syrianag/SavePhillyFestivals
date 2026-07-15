# Coding Standards

## Naming Conventions

| Category | Convention | Example |
|---|---|---|
| Files | `kebab-case` | `festival-card.jsx` |
| React Components | `PascalCase` | `FestivalCard.jsx` |
| Functions | `camelCase` | `getFestivals()` |
| Variables | `camelCase` | `festivalList` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_PAGE_SIZE` |
| Database models | `PascalCase` | `Festival`, `User` |
| Database fields | `snake_case` | `event_date`, `created_at` |
| CSS classes | `kebab-case` | `card-wrapper` |

## Component Organization

- One component per file
- Default export for page components
- Named exports for shared/reusable components
- Collocate test files: `ComponentName.test.jsx`
- Collocate story files: `ComponentName.stories.jsx` (if using Storybook)

## File Structure per Component

```
FestivalCard/
├── index.jsx          # Re-export
├── FestivalCard.jsx   # Component
├── FestivalCard.test.jsx
└── FestivalCard.module.css  # (only if Tailwind isn't sufficient)
```

## CSS Organization

1. **Tailwind utility classes first** for 95% of styling
2. `cn()` helper (from shadcn) for conditional classes
3. CSS modules or inline style only when Tailwind can't handle the requirement
4. Global styles in `src/app/globals.css` (Tailwind directives + CSS custom properties)

## Import Order

Group imports in this order with a blank line between groups:

1. Node built-ins / Third-party packages (react, next, etc.)
2. `@/lib/*` (utilities, db, constants)
3. `@/components/*` (shared UI components)
4. `@/features/*` (feature-specific modules)
5. `@/hooks/*` (custom hooks)
6. `@/styles/*` (stylesheets)
7. Relative imports (for sibling files)

Within each group, sort alphabetically.

```jsx
// Good
import { useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { FESTIVAL_STATUS } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layouts/main-layout";

import { useAuth } from "@/hooks/use-auth";

import { FestivalCard } from "./festival-card";
```

## Environment Variables

| Variable | Scope | Example |
|---|---|---|
| `NEXT_PUBLIC_*` | Client-side (prefix required) | `NEXT_PUBLIC_SITE_URL` |
| Without prefix | Server-side only | `DATABASE_URL` |

- Never commit `.env.local` or `.env*.local` files
- Commit `.env.example` with placeholder values

## Note on Next.js 16 Middleware Deprecation

Next.js 16 has deprecated `middleware.js` in favor of `proxy.js`. When implementing auth middleware, switch to the `src/proxy.js` convention. Refer to: https://nextjs.org/docs/messages/middleware-to-proxy

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add festival search by date range
fix: correct timezone offset on event cards
chore: update dependencies
docs: update README setup instructions
refactor: extract pagination into shared hook
style: format code with prettier
test: add festival card unit tests
```

## Pull Request Workflow

1. Create feature branch from `develop`: `feature/short-description`
2. Open a **Draft PR** early for visibility
3. Mark **Ready for Review** when complete
4. Require at least one approval before merging
5. Squash merge into `develop`
6. Delete the feature branch after merge

## Branch Naming

```
dev-a/ui/add-festival-search
dev-a/ui/festival-cards
dev-b/api/festival-crud
dev-b/api/auth-setup
bugfix/fix-timezone-offset
release/v1.2.0
```

- `dev-a/ui/*` — Developer A (frontend/UI work)
- `dev-b/api/*` — Developer B (backend/API work)
- `bugfix/*` — Bug fixes (any developer)
- `release/*` — Release candidates
