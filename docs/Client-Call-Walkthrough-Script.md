# Save Philly Festivals: Client Demo Call Walkthrough Script

This script provides a step-by-step guide for conducting a live demonstration of the modernized **Save Philly Festivals** application during a client call. 

---

## 📞 Call Preparation & Pre-requisites

### 1. Roles & Accounts Needed
Ensure you have the following test credentials active or seeded in the database:
*   **Producer Persona:**
    *   **Email:** `producer@example.com`
    *   **Password:** `producer123` (or any valid credentials with the `producer` role)
*   **Admin/Editor Persona:**
    *   **Email:** `admin@example.com`
    *   **Password:** `admin123` (or any valid credentials with the `admin` role)

### 2. Assets & Setup
*   Have a sample image file (PNG/JPG) ready on your desktop to demonstrate the file upload fields.
*   Run the development environment locally (`pnpm run dev` at `http://localhost:3100`).
*   Keep the terminal open to show clean execution logs if requested.

---

## 📑 Walkthrough Script

```
────────────────────────────────────────────────────────────────────────────────
PHASE 1: Public Discovery & Interactive Calendar (5 Minutes)
────────────────────────────────────────────────────────────────────────────────
```

#### Step 1: Open the Portal
*   **Action:** Direct your browser to `http://localhost:3100/`.
*   **Talking Points:** 
    > "Welcome to the modernized Save Philly Festivals platform. As you can see, we have implemented a clean glassmorphic aesthetic using the Antigravity design tokens. The homepage has been completely restructured to maximize visual clarity, with curated HSL color palettes and proper layout margins to prevent page overflow."

#### Step 2: Live Search & Filtering
*   **Action:** Type `Beer` into the search box and press Enter. Then toggle the **Date filter** to `Next month` and change the sort order to `Soonest`.
*   **System Response:** The grid updates instantly.
*   **Action:** Direct the client's attention to the URL bar.
*   **Talking Points:** 
    > "Notice that the search is fully stateful. Every filter option you pick is immediately mirrored in the browser's address bar. This means you can bookmark this exact search or use the browser's Back button, and your filters are perfectly preserved. If we search for a term with no matches, the system displays a clear 'No festivals match your search' panel with a single-click reset option."

#### Step 3: Schedule Builder & Time Overlaps
*   **Action:** Click the **Add to Schedule** button on two or three cards. Open the **Schedule Builder** sidebar or widget.
*   **Talking Points:**
    > "Our Schedule Builder allows public visitors to plan their itinerary without creating an account. The selections are saved securely in the browser's local storage. If we add two overlapping events, the system warns the user with a time-overlap indicator, but lets them keep both. All dates are processed in local Philadelphia wall-clock time (`America/New_York`) to avoid timezone drift."

#### Step 4: Export & Sharing
*   **Action:** Click **Export to Calendar**.
*   **System Response:** The browser downloads `philly-fests-schedule.ics`.
*   **Talking Points:**
    > "By clicking 'Export to Calendar', visitors can download standard iCalendar (`.ics`) files compatible with Google Calendar, Apple Calendar, and Microsoft Outlook. The export handles multi-day date standards correctly, ensuring end-dates are formatted correctly for seamless calendar imports."

```
────────────────────────────────────────────────────────────────────────────────
PHASE 2: Producer Submission Flow (8 Minutes)
────────────────────────────────────────────────────────────────────────────────
```

#### Step 1: Sign in as a Producer
*   **Action:** Navigate to `http://localhost:3100/login`. Input the producer credentials and sign in.
*   **Talking Points:**
    > "Now let's switch roles. I am logging in as a festival coordinator/producer. The authentication flow uses NextAuth to enforce secure, role-based page redirects."

#### Step 2: Create a Draft Festival
*   **Action:** Navigate to `http://localhost:3100/producer/submit`. Type `Fringe Arts Festival` in the Name field. Fill out random details for locations, but leave the description empty. Click **Save draft**.
*   **System Response:** Shows a "Draft saved successfully" toast message.
*   **Talking Points:**
    > "Producers can save drafts at any point. They do not have to finish the form in one sitting. All partial data is stored privately."

#### Step 3: Trigger Form Validation
*   **Action:** Click the **Review submission** button while the description is empty.
*   **System Response:** Form fails validation and scrolls to show the validation error checklist (e.g., "Description is required (min 20 characters)").
*   **Talking Points:**
    > "Before a producer can submit a festival, the application runs strict client-side and server-side validation checks. Let's add a valid description to satisfy the 20-character minimum requirement."

#### Step 4: Finalize and Submit for Review
*   **Action:** Paste a description of more than 20 characters. Click **Review submission**. Tick the three agreement boxes (ownership, terms, accuracy) and click **Submit for Review**.
*   **System Response:** The page transitions to a read-only view. The status badge changes to `Pending review` with a status timeline indicating Revision 1.
*   **Talking Points:**
    > "Once submitted, the record transitions to 'Pending review' and is instantly locked. The producer cannot edit it while the editorial team is reviewing it. This prevents double-submission conflicts."

```
────────────────────────────────────────────────────────────────────────────────
PHASE 3: Administrative Review & Editorial Workflow (10 Minutes)
────────────────────────────────────────────────────────────────────────────────
```

#### Step 1: Access Editorial Queue
*   **Action:** Sign out, log back in as the editor/administrator account, and go to `http://localhost:3100/admin/festivals`.
*   **Talking Points:**
    > "I am now signed in as an administrator. The admin panel shows the queue of submissions. I can filter by status using these quick chips across the top—for example, selecting 'Pending review' to see the Fringe Arts Festival we just submitted."

#### Step 2: Open Submission & Verify Privacy
*   **Action:** Click **Review** on the Fringe Arts Festival.
*   **Talking Points:**
    > "In the detail view, I can inspect all submission details. Notice the 'Private Contact Info' block. This contact data is available strictly to our editorial team and is never leaked to public discovery APIs or search indexes."

#### Step 3: The Request Changes Loop
*   **Action:** Scroll to the action form. Set the Next State to `changes_requested`. Write `Please add more specific venue details.` in both the Internal Reason and the Producer Message fields. Submit.
*   **System Response:** Shows transition confirmation.
*   **Talking Points:**
    > "If a submission needs corrections, the editor sends it back by choosing 'Changes Requested'. We require both an internal audit reason and a producer message. This starts the feedback loop."
*   **Action (Optional):** Quickly log back in as the producer and open `/producer/festivals` to show the draft is unlocked, highlighting the editorial alert panel with the message: *"Please add more specific venue details."*

#### Step 4: Approval & Separate Publication
*   **Action:** Sign back in as the Admin, open the festival detail page, and set the next state to `approved`. Submit. Then set the next state to `published` and click submit.
*   **Talking Points:**
    > "Notice that the workflow separates approval from publication. Approving a festival registers editorial acceptance, but keeps it private so you can preview it. A separate action is required to publish it to the live site."

#### Step 5: Verify Live Listing
*   **Action:** Go to `http://localhost:3100/` and search for `Fringe Arts`.
*   **System Response:** The festival appears live in the public results.
*   **Talking Points:**
    > "As expected, the festival is now live and searchable by the public."

#### Step 6: Trigger Cancellation Tombstone
*   **Action:** Go back to the Admin detail page for the festival, select `canceled` as the next state, write `Weather cancellation` as the internal reason, and `This festival has been canceled due to local flooding.` as the public message. Submit.
*   **Action:** Go back to the public detail page of the festival (`http://localhost:3100/festivals/<slug>`).
*   **System Response:** The page displays a red **Canceled** banner containing the custom message. Add-to-schedule buttons, event schedules, and social links are automatically deactivated and hidden.
*   **Talking Points:**
    > "When a festival is canceled, we do not simply delete the page. We display a public 'Cancellation Tombstone'. This preserves the URL for search engines and bookmarks while showing a red banner explaining the cancellation."

```
────────────────────────────────────────────────────────────────────────────────
PHASE 4: Moderated Social Feed Aggregator (7 Minutes)
────────────────────────────────────────────────────────────────────────────────
```

#### Step 1: Open Social Feed Configuration
*   **Action:** In the Admin detail view of the published festival, scroll down to the **Social Feed Manager**.
*   **Talking Points:**
    > "Lastly, let's look at the Social Feed Aggregator. This feature pulls public social posts (via hashtags) from platforms using aggregation providers like Curator.io or Flockler."

#### Step 2: Save Hashtag Configuration
*   **Action:** Type `PhillyArts` in the hashtag field, select `Curator.io`, and click **Save social feed**.
*   **System Response:** Shows a confirmation toast.
*   **Talking Points:**
    > "When the editor saves the feed configuration, we trigger an immediate sync. The new settings are stored alongside a versioned revision index."

#### Step 3: Curation & Reason Logging
*   **Action:** Scroll to the feed's cached posts. Locate a post, type `Promotional spam` in its moderation reason textbox, and click **Hide** or **Reject**.
*   **System Response:** The post is hidden.
*   **Talking Points:**
    > "To protect the public page, all incoming social posts start as 'Pending' and are kept private. The administrator reviews them here. If the moderator hides or rejects a post, the UI requires them to input a moderation reason to maintain an immutable log of curation decisions."

---

## 💬 Q&A & Wrap-Up
*   Confirm that all data transitions have been successfully demonstrated.
*   Reiterate that all verified flows are covered by E2E automation tests.
*   Open the floor for client feedback and questions.
