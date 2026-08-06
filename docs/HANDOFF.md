# Save Philly Festivals — Supervisor Hand-Off Guide

A plain-English guide to what the website is, how it works, and how to keep it running. Written for someone who does **not** write code. Anything that requires a developer is marked **"Needs developer."**

---

## 1. Project Overview

**Purpose:** Save Philly Festivals is a website for discovering, promoting, and managing festivals in Philadelphia. Visitors use it to find festivals and build a personal schedule; organizations and producers use it to get their festivals in front of the public; and the internal admin team uses a private back office to review submissions and manage everything.

### Website Users

| User | What They Do |
|---|---|
| Public Visitors | Browse, search, and filter festivals; save them to a schedule; export to their calendar |
| Festival Organizations | Have a public company page and submit their festivals for review |
| Producers | Submit and manage their own festivals through a private portal |
| Administrators | Review submissions and manage festivals, companies, producers, tasks, and accounts in the Admin Portal |

### Main Features

| Feature | What It Does |
|---|---|
| Discover Festivals | Homepage with featured festivals, a map view, and a calendar view, powered by live database data |
| Festival Search | Text search plus filters by date, type, and neighborhood |
| Schedule Builder | Save festivals to a personal schedule and get an email confirmation |
| Email Notifications | Auto-emails for schedule saves, submissions, approvals/rejections, and contact messages |
| Calendar Export | Download a `.ics` file importable into Google or Apple calendars |
| Festival Submission | Step-by-step form for adding a new festival |
| Contact Form | Contact page and About page forms send messages by email |
| Admin Portal | Internal back office for reviewing submissions and managing the site |
| Producer Portal | Producers manage their festivals; Overview includes a real schedule calendar |

---

## 2. Website Workflow

### Public User Journey
1. Open the website.
2. Browse festivals on the homepage (featured list, map, or calendar view).
3. Search or filter by date, type, or neighborhood.
4. Save festivals to a personal schedule.
5. Export the schedule to a phone or Google/Apple calendar.

### Festival Submission Workflow
1. An organization or producer fills out the festival submission form.
2. The information is saved to the database.
3. An admin reviews the submission in the **Pending Review** area.
4. The admin **approves** it or **rejects** it (with an optional reason).
5. Only **approved** festivals appear on the public website.

---

## 3. Website Navigation

| Page | Purpose | Who Uses It |
|---|---|---|
| Homepage / Discover Festivals | Browse and search festivals (featured, map, calendar) | Everyone |
| Festival Details | View full info for one festival (dates, location, website, schedule) | Everyone |
| Organizations | Company pages with about info and their approved festivals | Everyone |
| About | Mission, sponsors, and contact info | Everyone |
| Tours | Guided tour marketing pages (bus, walking, DIY) | Everyone |
| Resources | Producer toolkit, guidelines, funding, volunteer info | Everyone |
| Contact | Contact form and contact details | Everyone |
| Login | Sign in to the Producer or Admin portals | Producers, Admins |
| Producer Portal | Producers manage their festivals and submissions | Producers |
| Admin Portal | Internal management of the whole site | Admins |

---

## 4. Admin Portal Guide

Log in at **Login → Admin**. All admin pages share the same left-hand menu (Dashboard, Festivals, Pending Review, Organizations, Schedules, Producers, Task Board, Settings).

### Dashboard

**Purpose:** Home base that shows how the site is doing at a glance.

**Where to Find It:** Admin Portal → Dashboard

**How to Use It:**
1. Read the stat cards (total festivals, producers, pending review, approved, rejected).
2. Scan the "Producers at a Glance" list and recent activity.
3. Use a quick-action button to jump to common tasks.

**Available Buttons:**

| Button | Purpose |
|---|---|
| New Festival | Opens the festival submission form |
| Submit Festival | Opens the festival submission form |
| View All Festivals | Opens the full festival list |
| Review Pending | Opens the Pending Review area |
| Settings | Opens account and user management |

### Festivals

**Purpose:** The master list of every festival in the system, with status and search.

**Where to Find It:** Admin Portal → Festivals

**How to Use It:**
1. Type in the search box to find a festival by name.
2. Use the **Status** dropdown to filter (Draft / Pending Review / Approved / Rejected).
3. Click **Review** on a row to open the review dialog.

**Available Buttons:**

| Button | Purpose |
|---|---|
| New Festival | Opens the festival submission form |
| Review | Opens the review dialog for that festival |

*Note: Editing an existing festival's details is not built yet — **needs developer**.*

### Pending Review

**Purpose:** The inbox for new festival submissions waiting to be approved.

**Where to Find It:** Admin Portal → Pending Review

**How to Use It:**
1. Open a submission card with the **Review** button.
2. Read the full festival details.
3. Choose **Approve** or **Reject**.

**Available Buttons:**

| Button | Purpose |
|---|---|
| Review | Opens the review dialog |
| Approve | Publishes the festival to the public site |
| Reject | Hides the festival; shows an optional "reason" box |
| Confirm Reject | Confirms the rejection (after entering an optional reason) |
| Cancel | Closes the dialog without saving |

*Note: No email is sent to the submitter yet — **needs developer**.*

### Organizations

**Purpose:** The list of festival companies/organizations.

**Where to Find It:** Admin Portal → Organizations

**How to Use It:**
1. Search by company name.
2. Click the pencil icon to edit a company.
3. Click the trash icon to delete a company (with confirmation).

**Available Buttons:**

| Button | Purpose |
|---|---|
| New Organization | Opens the create-company dialog |
| Save / Cancel (edit dialog) | Save or discard company changes |
| Delete / Cancel (confirm dialog) | Confirm or cancel deleting a company |

### Producers

**Purpose:** Overview of producer accounts and their activity.

**Where to Find It:** Admin Portal → Producers

**How to Use It:**
1. Read the stat cards (total producers, submissions, approved, pending).
2. Use the table to see each producer's festivals and last activity.
3. Click the arrow icon on a row to open that producer's detail page.

**Available Buttons:**

| Button | Purpose |
|---|---|
| Create Producer | Takes you to Settings → Create Account |
| Row arrow icon | Opens the producer's detail page |

### Producer Details

**Purpose:** One producer's full profile with stats, their festivals, and internal notes.

**Where to Find It:** Admin Portal → Producers → click a producer

**How to Use It:**
1. Review the producer's info and stat cards (total festivals, approved, pending, drafts).
2. Review their festival list with the per-row **Review** button.
3. Use the Notes section to leave internal comments (e.g., "Called on Monday").

**Available Buttons:**

| Button | Purpose |
|---|---|
| Review | Opens the review dialog for that festival |
| Add Note | Saves your note to the producer's profile |
| Trash icon (on a note) | Deletes that note |

### Schedules

**Purpose:** A read-only list of the latest performance schedules.

**Where to Find It:** Admin Portal → Schedules

**How to Use It:** View only. Shows festival, event title, date, time, and performer.

**Available Buttons:** None — read-only.

### Task Board

**Purpose:** An internal to-do board for the team, with three columns (To Do / In Progress / Done).

**Where to Find It:** Admin Portal → Task Board

**How to Use It:**
1. Click **New Task** to add a task (title, description, priority, due date, assignee).
2. Move tasks between columns with the left/right arrow icons on each card.
3. Click the pencil to edit a task or the trash to delete it.

**Available Buttons:**

| Button | Purpose |
|---|---|
| New Task | Opens the create-task dialog |
| Left/Right arrows | Move a task between columns |
| Pencil icon | Edit a task |
| Trash icon | Delete a task |
| Create Task / Save Changes | Submit the task dialog |

### Settings

**Purpose:** Manage user accounts and roles.

**Where to Find It:** Admin Portal → Settings

**How to Use It:**
1. Use the Users table to see all accounts.
2. Click **Create Account** to add a person (name, email, password, role).
3. Click the pencil to change a role, or the trash to delete an account.

**Available Buttons:**

| Button | Purpose |
|---|---|
| Create Account | Opens the create-account dialog |
| Pencil icon | Edit a user's role |
| Save / Cancel (role dialog) | Save or discard the role change |
| Trash icon | Delete an account |
| Delete / Cancel (confirm dialog) | Confirm or cancel deleting an account |

### Submit Festival

**Purpose:** The 4-step festival submission form (Basic Details → Host Info → Your Story → Review & Submit).

**Where to Find It:** Admin Portal → Submit Festival

**How to Use It:**
1. Fill out each step of the form.
2. Review the summary on the final step.
3. Submit — the festival lands in **Pending Review.**

**Available Buttons:**

| Button | Purpose |
|---|---|
| Next / Back | Move between form steps |
| Submit | Saves the festival and sends it to Pending Review |

---

## 5. Managing Festivals

### Creating a Festival
1. Go to **Admin Portal → Submit Festival** (or click **New Festival**).
2. Complete the 4 steps: Basic Details → Host Info → Your Story → Review & Submit.
3. Submit. The festival is saved with **Pending Review** status.

### Reviewing Festivals
1. Go to **Admin Portal → Pending Review** (or **Festivals** and click **Review**).
2. Read the festival's full details in the dialog.

### Approving Festivals
1. Open the review dialog for the festival.
2. Click **Approve.**
3. The festival's status becomes **Approved** and it appears on the public website.

### Rejecting Festivals
1. Open the review dialog for the festival.
2. Click **Reject.**
3. (Optional) Enter a reason.
4. Click **Confirm Reject.**
5. The festival stays hidden and keeps a **Rejected** status.

### Editing Festivals
Editing an existing festival's title, description, website, category, location, or dates after it's been submitted is **not built yet — needs developer.** Admins can currently create, approve, or reject festivals only.

---

## 6. Managing Organizations

### Finding Organizations
Go to **Admin Portal → Organizations** and use the search box (or scroll the list).

### Editing Organizations
1. Click the pencil icon on the company row.
2. Edit name, description, website URL, email, phone, etc.
3. Click **Save.**

### Deleting Organizations
1. Click the trash icon on the company row.
2. Click **Delete** to confirm.

### Viewing Organization Websites
- On the public site: open the company's page (from any of their festivals or by navigating to their URL) — it shows their website link and approved festivals.
- In the Admin Portal: open the **Edit Organization** dialog to see or copy the website URL.

---

## 7. Managing Producers

### Viewing Producers
Go to **Admin Portal → Producers.** The table shows each producer's name, email, festival counts, last activity, and member date.

### Viewing Producer Details
Click the arrow icon on a producer's row to open their detail page with stats, their festival list, and the Notes section.

### Adding Notes
1. Open the producer's detail page.
2. Type a note in the Notes section.
3. Click **Add Note.** Each note can be removed with its trash icon.

---

## 8. Task Board

### Creating Tasks
1. Go to **Admin Portal → Task Board.**
2. Click **New Task.**
3. Fill in title, description, priority (Low/Medium/High), due date, and assignee.
4. Click **Create Task.**

### Editing Tasks
1. Click the pencil icon on the task card.
2. Update the fields.
3. Click **Save Changes.**

### Deleting Tasks
1. Click the trash icon on the task card.
2. Confirm the deletion.

### Moving Tasks
Click the left/right arrow icons on a task card to move it between To Do, In Progress, and Done.

---

## 9. User Accounts

### Creating Accounts
1. Go to **Admin Portal → Settings.**
2. Click **Create Account.**
3. Enter name, email, and password (min. 8 characters).
4. Choose a role and click **Create Account.**

### Editing Roles
1. In **Settings → Users**, click the pencil icon.
2. Pick the new role and click **Save.**

### Deleting Accounts
1. In **Settings → Users**, click the trash icon.
2. Click **Delete** to confirm.

### User Permissions

| Role | Permissions |
|---|---|
| Public | Browse the public site |
| Producer | Submit festivals; manage their own submissions in the Producer Portal |
| Admin | Full access to the Admin Portal (manage festivals, companies, producers, tasks, accounts) |
| Super Admin | Everything an Admin can do, plus the ability to assign the Super Admin role |

---

## 10. Editing the Website

**Short version: nearly all website content lives in code files, so editing the site requires a developer.** The exceptions are festival and company content, which admins manage in the Admin Portal.

### Editing Text
- Text (e.g., homepage headlines, About page) lives in the project's source files. A developer edits the file, saves it, and the change goes live after deployment. **Needs developer.**

### Editing Images
- Images uploaded through the site are stored in the server's `public/uploads/` folder. Max size: 5 MB. Allowed types: JPEG, PNG, WebP, SVG.
- Replacing images outside the submission form **needs developer.** There is no cloud backup yet.

### Editing Festival Information
- Admins can create festivals and approve/reject them, but editing the fields of an existing festival is **not built yet — needs developer.**

### Deploying Changes
- Saving = a developer saves and commits code. Deploying = the code is merged through the branch flow and the hosting service rebuilds the site. The deployment automation is still a placeholder — **needs developer.**

---

## 11. Using the Figma Files

### What Is Figma?
Figma is a browser-based design tool where the website's look (colors, layouts, components) is designed before and alongside development.

### Opening the Files
- The files live in a shared Figma project — anyone with the link and access can open and comment.
- Design tokens (colors, fonts, sizes) were already extracted from Figma and applied to the site (July 2026).
- Access: **[add Figma link / owner here]**

### Making Changes
1. **Duplicate the page** so the original design stays safe.
2. **Edit the design** (layout, colors, text).
3. **Share the updated version** link with the developer, who rebuilds that screen in code.

*Note: A Figma change does not change the website automatically — a developer must implement it.*

---

## 12. Festival Submission Process

| Step | Action |
|---|---|
| 1 | Organization or producer submits the festival form |
| 2 | Information is saved to the database |
| 3 | Admin reviews it in Pending Review |
| 4 | Festival is approved or rejected |
| 5 | Approved festivals become public on the website |

---

## 13. Troubleshooting

### Festivals

| Problem | Solution |
|---|---|
| Festival not showing on the public site | It was never approved — check Pending Review or its status in Festivals |
| A submission seems to have vanished | Check Festivals (status filter) and Pending Review — it may be Draft, Pending, or Rejected |
| Festival's website link doesn't work | Wrong or outdated URL — fixing an existing festival **needs developer** |

### Images

| Problem | Solution |
|---|---|
| Image not showing | The upload may have failed, or the file was moved/renamed — re-upload through the form; otherwise **needs developer** |
| Can't upload an image | File may exceed 5 MB or be a type other than JPEG/PNG/WebP/SVG |

### Email

| Problem | Solution |
|---|---|
| Submitter says they never got a confirmation email | Check that `RESEND_API_KEY` is set in the environment. When it isn't, emails are logged to the server console instead of sent. |

### Contact Form

| Problem | Solution |
|---|---|
| Form says "Message Sent" but no one received a message | Check that `RESEND_API_KEY` and `CONTACT_EMAIL` are set. When `RESEND_API_KEY` is missing, the message is logged to the server console and `CONTACT_EMAIL` (default `info@savephillyfestivals.org`) is not used. |

---

## 14. Known Issues

Use the checkboxes to track what still needs work.

- [ ] No festival editing (admin edit screen) — *not built*
- [x] Email notifications — *built: schedule saves, submissions, approvals/rejections, contact messages*
- [x] Contact form connected — *built: sends email via `POST /api/contact`*
- [ ] Featured companies not implemented
- [ ] Manual deployment (deploy automation is a placeholder) — *not built*
- [ ] Image backup not implemented
- [x] Producer dashboard calendar — *built: real calendar of the producer's festival dates*
- [ ] Homepage "Learn more" links to a `/calendar` page that doesn't exist
- [ ] Interactive map is a placeholder box on the homepage
- [ ] Sponsors, story pages, tours booking, and resources downloads are static/marketing only
- [ ] `/my-schedule` page (view/remove saved schedules) not yet linked from the UI

---

## 15. File Organization

| Folder | Purpose |
|---|---|
| src/app | Website pages (homepage, festivals, admin, producer) |
| src/components | Reusable UI pieces (nav bar, cards, forms, dialogs) |
| src/features | Website features (festivals, organizations, producers, tasks, notes, schedule) |
| public/uploads | Uploaded images and files |
| prisma | Database structure |
| docs | This and other guides |

---

## 16. Weekly & Monthly Maintenance

### Weekly Checklist
- [ ] Review pending festivals in Pending Review
- [ ] Check website links (festival and company)
- [ ] Remove expired festivals

### Monthly Checklist
- [ ] Review organizations (names, websites, contacts)
- [ ] Update featured festivals on the homepage
- [ ] Back up uploaded images (currently stored only on the server)

---

## 17. Quick Reference Guide

| I Need To... | Go Here |
|---|---|
| Add Festival | Admin → Submit Festival |
| Approve Festival | Admin → Pending Review |
| View Organizations | Admin → Organizations |
| Edit User Accounts | Admin → Settings |
| Assign Tasks | Admin → Task Board |
| View Producer Notes | Admin → Producers → open producer |
| Find Company Website | Admin → Organizations → pencil icon |
| Troubleshoot Issues | Section 13 |

---

*Last updated: 2026-08-06. For anything marked "needs developer," contact the development team. Developers: see `docs/CORE-FEATURES.md` for the implemented P0+P1 features and deferred P2 list.*
