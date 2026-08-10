# Save Philly Festivals — Handoff Document

## Purpose
This document summarizes the project in two versions:
- A plain-language version for non-technical stakeholders
- A technical version for developers and technical partners

---

# 1) Handoff for Non-Technical People

## What this project is
Save Philly Festivals is a web platform for discovering, organizing, and promoting festivals in Philadelphia. It helps festival organizers submit their events, allows visitors to browse events and save schedules, and gives admins a way to review and approve submissions.

## What the site is meant to do
- Help people find festivals in the Philadelphia area
- Let organizers submit information about their festival
- Let admins review and approve content before it goes live
- Let visitors save favorite schedules and receive reminders or confirmations
- Support calendar downloads and email notifications

## Main parts of the system

### Public-facing website
This is the main experience for visitors. People can browse festivals, view them in a calendar-like view, and explore details such as location, dates, and content.

### Festival submission process
Festival organizers can submit their event information through the site. That information is stored in the system and then reviewed before it becomes public.

### Admin review workflow
Admins can review submitted festivals, approve or reject them, and add notes if needed. This helps keep the site accurate and organized.

### Schedule and saved plans
Visitors can save festival schedules they are interested in. This creates a personal list that can be referenced later.

### Email and notifications
The system can send emails for important actions, such as confirmation after saving a schedule or updates after a festival is approved or rejected.

### Calendar export
The system can create calendar files that people can add to their own calendar app.

## What the technology is doing behind the scenes
The system is built as a web app with three main layers:
- Frontend: what users see and interact with
- Backend/API: where requests are processed and business rules are applied
- Database: where all festival and user information is stored

## How the app works in simple terms
1. A festival organizer enters event details.
2. The information is sent to the app.
3. The app stores it securely in a database.
4. An admin reviews it.
5. If approved, the festival becomes available to the public.
6. Visitors can view it, save it, and receive email updates as needed.

## Current status
The project is a working web application foundation with festival management, API routes, scheduling, file upload support, and email integration. Some parts are fully wired up, while others are in progress or intended for future expansion.

## Important handoff notes
- The app is built around a content management flow for festivals.
- The database is the central source of truth for festival data.
- Email and calendar features are important for user experience and outreach.
- Admin review is a key part of the publishing process.
- Authentication and user role management are important next steps for stronger access control.

---

# 2) Handoff for Technical People

## Project Overview
Save Philly Festivals is a Next.js-based web application for festival discovery, submission, moderation, scheduling, email notifications, and calendar export. The codebase uses a modular app-router structure under src/ with API routes, feature modules, shared UI, and a Prisma-backed data layer.

## Tech Stack
- Framework: Next.js 16 (App Router)
- UI Library: React 19
- Styling: Tailwind CSS + shadcn/ui
- Language: JavaScript
- Database: PostgreSQL
- ORM: Prisma
- Authentication: NextAuth integration is present in dependencies and planned/partially wired; role-based access is documented and expected in the architecture
- Validation: Zod
- Form handling: React Hook Form
- Email: Resend via nodemailer-compatible wrapper
- Calendar: ICS generation via ics package
- Maps: Leaflet / react-leaflet
- Utilities: UUID generation, class variance utilities, dotenv, bcryptjs

## Project Structure
- src/app: route-level pages and API endpoints
- src/components: shared UI and layout components
- src/features: feature-specific logic for festivals, schedules, organizations, communications, permissions, tasks, users
- src/lib: shared infrastructure such as DB, errors, validation, email, uploads, calendar helpers
- prisma/: schema and migrations
- docs/: documentation and implementation plans

## Core Domains

### Festivals
Festival records contain metadata such as name, slug, description, location, dates, contact info, status, and related schedules/categories/tags/files.

### Schedules
Schedules represent event entries tied to a festival and include title, description, timing, performer, and location.

### Saved Schedules
Saved schedules are personal user collections keyed by email and schedule ID. This supports save-for-later functionality and opt-in updates.

### Communications / Email
Email workflows support festival submission confirmation, schedule confirmations, mailing list forwarding, approval, and rejection notifications.

### Uploads
File uploads are supported by a dedicated API route and helper layer, intended for logos, images, documents, and festival assets.

### Permissions / Roles
The documented role model includes public, producer, admin, and super_admin. The expected access pattern is role-based authorization over festivals, approvals, schedules, categories, and system settings.

## API Architecture
The application exposes route handlers under src/app/api for the following categories:
- /api/health
- /api/festivals
- /api/festivals/[id]
- /api/festivals/[id]/approve
- /api/schedules
- /api/schedules/save
- /api/schedules/saved
- /api/organizations
- /api/communications
- /api/permissions
- /api/tasks
- /api/upload
- /api/users

These endpoints handle CRUD operations, validation, error handling, and side effects such as email dispatch.

## Data Flow Overview

### Festival submission lifecycle
1. Producer submits festival data through the frontend or API.
2. The request is validated.
3. The festival is persisted to PostgreSQL via Prisma.
4. The object receives an initial status such as draft or pending.
5. An admin reviews the submission.
6. Approval or rejection updates status and can trigger email notifications.

### Schedule save lifecycle
1. Visitor submits an email and schedule selection.
2. The request is validated.
3. The save is written to the database as an idempotent upsert.
4. A confirmation email is dispatched.
5. If opted in, a mailing list update is forwarded to the festival contact.

## Connectivity and Integrations
- Database connectivity: Prisma client connected to PostgreSQL through DATABASE_URL
- Email delivery: Resend-based mail service with fallback safe behavior for local development
- Calendar export: ICS generation for events and festival lists
- File uploads: route and helper layer for media/document submission
- Maps: Leaflet integration for geographic presentation

## Error Handling and Validation Strategy
- Shared error utilities in src/lib/errors.js
- Validation wrappers in src/lib/validate.js
- Zod schemas in feature modules for domain-specific validation
- API routes use centralized handling to return consistent responses and status codes

## Important Implementation Notes
- The project follows a modular architecture with clear domain separation.
- The docs describe a planned backend implementation structure with Prisma models, feature modules, and API route mappings.
- Several pieces are already implemented in the repository, while others are documented as next-step work.
- The codebase is moving toward a more structured backend layer with reusable validation, mail, and error utilities.

## Recommended Next Steps for Continuity
1. Finalize authentication and authorization flow.
2. Complete role-based access checks across all protected routes.
3. Standardize all API route implementations under the documented feature structure.
4. Ensure production environment variables are fully configured.
5. Add end-to-end testing around festival creation, approval, and schedule-save workflows.

---

## Quick Summary for Handoff
This project is a festival platform with a public-facing discovery experience, admin review workflow, saved schedules, email integration, and calendar export. The technical foundation is built on Next.js, Prisma, PostgreSQL, and a modular API architecture. The main handoff priority is to preserve the intent of the existing workflow while closing the remaining gaps around authentication, access control, and operational hardening.
