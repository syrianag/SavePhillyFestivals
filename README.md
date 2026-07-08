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

| Branch | Purpose |
|---|---|
| `main` | Production-ready code. Protected — no direct pushes. |
| `develop` | Integration branch. Default working branch. |
| `feature/*` | New features (branch from `develop`, merge to `develop`) |
| `bugfix/*` | Bug fixes during development (branch from `develop`, merge to `develop`) |
| `release/*` | Release candidates (branch from `develop`, merge to `main` & `develop`) |

## Team

- Developers: [Add names here]

## License

[MIT](LICENSE)
