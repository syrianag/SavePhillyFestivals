**Philly Fests Design Handoff Document**

**Project Completion Date:** December 2025

**Design Team:** Simran Kaur, Mengqi Cao, Uraiba Zafar, Iris Sun

**Client:** DiasporaDNA / Philly Fests

Figma Files here

**1\. How to Use the Figma Files**

**For Non-Technical Team Members**

**What is Figma?**

Figma is a design tool where we've created all the visual designs for the Philly Fests website. Think of it like a detailed blueprint that shows exactly what the website should look like and how it should work.

**Accessing the Files:**

1\. You'll receive a link to the Figma project

2\. Create a free Figma account at figma.com

3\. Click the link to open the design files (no software installation needed—it works in your browser\!)

**Navigating the Files:**

● **Left sidebar:** Shows all pages and screens (Homepage, Festival Pages, Calendar View, etc.)

● **Main canvas:** The design workspace where you can view screens

● **Right sidebar:** Shows details about selected elements (colors, fonts, spacing)
**For Developers**

**File Organization:** Our Figma file is structured with development handoff in mind:

�� Philly Fests Design Files

├── �� Cover Page (Project Overview)

├── �� Branding

 │               	├── Colors

 │ 		├── Typography

 │		├── Imagery

├── �� Desktop Designs

├── �� Mobile Designs

└── �� Annotated Designs

├── Components

**Using Figma for Development:**

1\. **Inspect Mode (Critical for Developers):**

○ Click any element in the design

○ Right panel shows: dimensions, colors (with hex codes), fonts, spacing ○ Code snippets available for CSS/iOS/Android

2\. **Export Assets:**

○ Select any element → Right sidebar → "Export" section

○ Available formats: PNG, JPG, SVG, PDF

○ Can export at multiple resolutions (@1x, @2x, @3x for retina displays) 3\. **Design Tokens:**

○ All colors are saved as **Styles** (see left sidebar)

○ All text styles are saved as **Text Styles**

○ Use these to maintain consistency (colors like "Primary Orange" instead of hardcoding "\#FF6B35")

4\. **Component Library:**

○ Reusable components (buttons, cards, inputs) are in the **Components page** ○ Each component has variants (default, hover, active, disabled states)
○ Build once, use everywhere

5\. **Responsive Behavior:**

○ We've designed for Desktop (1440px) and Mobile (390px)

○ Auto-layout components show how elements should flex/resize

○ Constraints indicate how elements pin to edges

**Developer Handoff Plugins to Install:**

● **Figma Dev Mode** (built-in, paid feature): Best for detailed code handoff

○ Shows measurements between elements

○ Generates code snippets

○ Tracks design changes

● **Anima** (free tier available): Export designs to HTML/CSS/React

○ Good for quick prototyping

○ Not production-ready but useful for structure

● **Zeplin or Avocode** (alternatives): Traditional handoff tools if your team prefers them

**Best Practices:**

● Don't rely on absolute pixel values—use relative units (%, em, rem)

● Colors and typography should be CSS variables (we've defined the system) ● Focus on responsive behavior—designs should adapt, not break

**2\. Recommended Technical Solutions**

**Content Management System (CMS)**

**Recommended: Webflow or WordPress**

**Option A: Webflow** (Easiest, No-Code)

● **Pros:** Visual builder similar to Figma, built-in hosting, easy for non-developers to update ● **Cons:** Monthly cost ($23-$35/month), less customization for complex features ● **Best for:** Getting live quickly, small team without dedicated developer
**Option B: WordPress \+ Custom Theme**

● **Pros:** Open-source (free), massive plugin ecosystem, full control

● **Cons:** Requires developer for initial setup, more maintenance

● **Best for:** Long-term flexibility, custom features like Schedule Builder **Option C: Headless CMS (Advanced)**

● **Tools:** Contentful, Strapi, or Sanity \+ React/Next.js frontend

● **Pros:** Maximum flexibility, great performance, modern tech stack

● **Cons:** Requires experienced developers, longer development time

● **Best for:** If you have technical team and want cutting-edge solution

**Our Recommendation:** Start with **WordPress** for balance of flexibility and accessibility.

**3\. Feature Implementation Guide**

**A. Producer Submission Form → Festival Page Workflow**

**The Goal:** Festival organizers submit their festival details through a form. You review submissions, then publish approved festivals to the live site.

**Recommended Solution 1: WordPress \+ Gravity Forms \+ Advanced Custom Fields (ACF) How It Works:**

1\. **Gravity Forms** ($59/year): Create the submission form

2\. **Advanced Custom Fields (ACF)** ($49/year): Store festival data

3\. **Workflow:**

○ Producer fills out form on "For Producers" page

○ Submission creates a **Draft** festival post in WordPress

○ You review in WordPress admin (wp-admin/edit.php?post\_type=festival) ○ Click "Publish" when approved → festival goes live on site

**Setup Steps:**

1\. Install Gravity Forms plugin

2\. Create form with specified fields

3\. Map form fields to Custom Post Type "Festivals" using ACF

4\. Set submission notification to your team email

5\. Configure form to create draft posts

**Alternative: Webflow Forms \+ Airtable/Make.com**
● Form submits to Airtable (free database)

● Review submissions in Airtable

● Use Make.com (formerly Integromat) to push approved entries to Webflow CMS ● More complex setup but no WordPress needed

**B. Schedule Builder \- Mailing List Integration**

**The Goal:** When users save festivals and email their schedule, automatically subscribe them to each festival organizer's mailing list.

**Recommended Solution: Zapier \+ Mailchimp (or similar ESP)**

**Requirements from Festival Organizers:** Each festival must provide:

1\. Their Mailchimp List ID (or Constant Contact/SendGrid credentials)

2\. Subscriber Segments setup: "Reminders," "Updates," "Discovery"

3\. Consent to receive subscribers via Philly Fests

**Technical Implementation:**

**Option 1: Zapier (Easiest, No-Code)**

**Setup Flow:**

1\. User submits email \+ selected festivals via schedule builer on your site 2\. **Trigger:** Form submission (Webflow, WordPress, Typeform—whatever you use) 3\. **Zapier Actions:**

○ Parse JSON of selected festivals

○ Loop through each festival

○ Add user email to that festival's Mailchimp list

○ Tag subscriber with: "via-philly-fests", "2025-schedule-builder"

○ Assign to segments based on user preferences (reminders/updates checked) 4\. Send confirmation email from Philly Fests with schedule summary

**Zapier Pricing:** Free for up to 100 tasks/month, $19.99/month for 750 tasks **Option 2: Custom API Integration (Requires Developer)**

// Pseudocode example

async function subscribeToFestivals(userEmail, festivals, preferences) {

// Send confirmation email first

await sendConfirmationEmail(userEmail, festivals);
// Subscribe to each festival's list

for (const festival of festivals) {

const segments \= \[\];

if (preferences.reminders) segments.push('reminders');

if (preferences.updates) segments.push('updates');

if (preferences.discovery) segments.push('discovery');

await mailchimpAPI.subscribe({

listId: festival.mailchimp\_list\_id,

email: userEmail,

segments: segments,

tags: \['philly-fests', 'schedule-builder-2025'\],

source: 'Philly Fests Schedule Builder'

});

}

// Store subscription in database for "Manage Schedule" feature await database.saveSubscription({

email: userEmail,

festivals: festivals.map(f \=\> f.id),

token: generateUniqueToken(),

created\_at: new Date()

});

}

**Email Service Provider Options:**

● **Mailchimp:** Most common, good API, free up to 500 contacts ● **Constant Contact:** Similar to Mailchimp, popular with nonprofits ● **SendGrid:** Developer-friendly, transactional emails

● **ConvertKit:** Great for creators, simple API

**Important: Legal Compliance**

● Include checkbox: "I agree to receive emails from my selected festivals" ● Confirmation email must explain they're subscribed to X festivals ● Each organizer's emails must have unsubscribe link (ESP handles this) ● Maintain record of consent (timestamp, IP, festivals selected)

**C. Export to Personal Calendar Feature**
**The Goal:** Users click "Export to Calendar" → download .ics file → works with Google/Apple/Outlook calendars.

**Recommended Solution: ICS.js Library (Free, Open-Source) Technical Implementation:**

// Frontend JavaScript using ics.js library

import { createEvents } from 'ics';

function exportScheduleToCalendar(festivals) {

const events \= festivals.map(festival \=\> ({

start: formatDate(festival.start\_date),

end: formatDate(festival.end\_date),

title: festival.name,

description: festival.description,

location: festival.address,

url: festival.website\_url,

status: 'CONFIRMED',

busyStatus: 'BUSY',

organizer: { name: festival.name, email: festival.contact\_email }, alarms: \[

{ action: 'display', trigger: { hours: 24, before: true } }, // 1 day before { action: 'display', trigger: { hours: 2, before: true } } // 2 hours before \]

}));

const { error, value } \= createEvents(events);

if (error) {

console.error(error);

return;

}

// Trigger download

const blob \= new Blob(\[value\], { type: 'text/calendar' });

const link \= document.createElement('a');

link.href \= URL.createObjectURL(blob);

link.download \= 'philly-fests-schedule.ics';

link.click();

}

**Setup Steps:**
1\. Install ics.js: `npm install ics` or include CDN link

2\. Add "Export to Calendar" button on Schedule Builder

3\. On click, generate .ics file from saved festivals

4\. Browser automatically downloads file

5\. User opens file → imports to their calendar app

**No Backend Required** \- This runs entirely in the browser\!

**Alternative: Pre-generated ICS Files**

● For individual festivals, generate .ics file on server

● Store as downloadable asset: `/downloads/south-street-festival.ics` ● Simple "Add to Calendar" button on each festival page

**Services (Paid Options):**

● **AddEvent.com** ($10/month): Well designed "Add to Calendar" buttons OR

● **AddToCalendar.com**: Free, simple implementation

**D. Social Media Grid \- Pull from Hashtags**

**The Goal:** Display Instagram/Twitter posts tagged with festival hashtag (e.g., \#SouthStreetFest) on the festival page.

**Recommended Solutions:**

**Option 1: Flockler** ($49/month)

● Aggregates social media by hashtag, handle, or location

● Supports Instagram, Twitter, Facebook, TikTok

● Embeddable widget (just paste code into page)

● Moderation dashboard (approve/hide posts)

● GDPR compliant

**Option 2: Curator.io** ($29/month)

● Similar to Flockler

● Better Instagram support (official partner)

● Nice grid/carousel layouts

● Analytics on post engagement
**Option 3: Custom API Integration** (Free but Complex)

**Challenge:** Instagram and Twitter have restricted their APIs. You'll need:

● **Instagram:** Business account \+ Facebook Developer App \+ approval process ● **Twitter:** Twitter API v2 access (free tier: 500k tweets/month)

**Instagram API** is more restrictive \- requires:

1\. Instagram Business Account connected to Facebook Page

2\. Facebook Developer App

3\. User access token with `instagram_basic` permission

4\. Hashtag search only works for Business accounts' own posts or mentioned posts

**Our Recommendation:** Start with **Curator.io or Flockler** for fastest implementation. Their moderation features are valuable since you'll want to filter inappropriate content before displaying on your site.

**Implementation Notes:**

● Always include link to official festival social accounts above grid

**E. Schedule Builder \- Browser Local Storage**

**The Goal:** Save user's festival selections in browser without requiring account creation. **Important Notes:**

● LocalStorage persists until user clears browser data

● Limited to \~5-10MB per domain

● Synchronous (blocks code execution) \- use sparingly

● Not secure \- don't store sensitive data

● Not shared across devices

**4\. Support & Clarifications**

**What We Provide**

**Complete Figma Design Files** with:

● All screens (desktop \+ mobile)
● Interactive prototypes

● Component library

● Design system documentation

● Annotations for functionality

**Design Handoff Documentation** (this document)

**What Developers Will Need to Build**

**Frontend Development:**

● Convert designs to HTML/CSS/JavaScript

● Implement responsive behavior

● Build interactive components (filters, modals, schedule builder)

● Integrate with CMS

**Backend Development:**

● Set up CMS and database

● Producer submission form workflow

● Schedule builder email integration

● API integrations (Mailchimp, social media)

**Questions? We're Here to Help**

We want to ensure a smooth handoff. If you or your development team has questions about:

● Design decisions or rationale

● How specific interactions should work

● Exporting specific assets

**Please reach out\!**

● **Emails:**

- skaur@pratt.edu
- mcao13@pratt.edu
- uzafar@pratt.edu
- wsun16@pratt.edu

*Thank you for the opportunity to work on Philly Fests. We're excited to see this platform come to life and support Philadelphia's vibrant festival community\!*