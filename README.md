# Save Philly Festivals

A web application for discovering, managing, and promoting festivals in Philadelphia.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** JavaScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** TBD

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## Branch Strategy

| Branch | Purpose | Who |
|---|---|---|
| `main` | Production-ready code. Protected — no direct pushes. | Both |
| `develop` | Integration branch. Always branch from here. | Both |
| `dev-a/ui/*` | Frontend features (e.g., `dev-a/ui/festival-cards`) | Developer A |
| `dev-b/api/*` | Backend features (e.g., `dev-b/api/festival-crud`) | Developer B |
| `release/*` | Release candidates (branch from `develop`, merge to `main` & `develop`) | Both |

### Daily Workflow

1. **Pull latest:** `git checkout develop && git pull`
2. **Create feature branch:** `git checkout -b dev-a/ui/<task-name>`
3. **Work & commit:** `git add . && git commit -m "feat: description"`
4. **Push:** `git push -u origin dev-a/ui/<task-name>`
5. **Open a Pull Request** on GitHub from your branch → `develop`
6. **Teammate reviews** — once approved, squash merge into `develop`
7. **Delete the branch** after merging

### Golden Rules

- Never push directly to `main`
- Always branch from `develop`, not `main`
- Always pull latest `develop` before starting a new branch
- Name branches `dev-a/ui/*` or `dev-b/api/*`
- Delete branches after merging

## Team

- Developers: [Add names here]

## License

[MIT](LICENSE)
