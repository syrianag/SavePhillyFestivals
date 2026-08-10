# Sponsored ad space — how it works and how to fill it

For Monica and the Save Philly Festivals team. Covers what is on the site today, how a
sponsor gets onto the page right now, and what changes when the admin screen ships.

---

## What is on the site today

Sponsorship is **one centered band in the site footer**, running on every public page —
the visitor-facing pages only, never the admin or producer back office.

| | |
|---|---|
| Where | Top of the footer, directly below the page content, above the nav links |
| Creative size | 320 × 120 px per sponsor tile |
| Capacity | Three tiles across on desktop; they stack on tablet and phone |
| Devices | All of them — desktop, tablet, phone |

**Your three current sponsors are already in it** — Alston-Beech Foundation,
Philadelphia Activities Fund, and PECO Powering the Arts. They used to sit in a grid
partway down the About page, which meant only visitors who opened that page ever saw
them. They now appear on every page on the site, and the About page section is gone.

None of the three has supplied artwork, so each renders as a name pill in its own
color — the same colors they had on the About page. A sponsor who sends a 320 × 120
creative renders as a full image tile instead. Both forms sit in the same band and line
up on the same row, so you can mix them as sponsors send you artwork.

Three more behaviors worth knowing:

**An unsold band renders nothing at all.** Not a grey box, not a "your ad here" panel —
the divider disappears with it and the footer simply closes up. You never have to keep
the band full to keep the site looking right.

**Sponsors are styled into the site, not bolted onto it.** The band sits on the footer's
dark navy, the heading matches the "Explore / Producers / Company" headings beside it,
and each sponsor sits on a white card with a thin outline that brightens on hover. It
reads as a section of the site rather than an ad network's rectangle.

**It works on phones.** This is the reason the band is in the footer. An earlier version
put ads down the left and right sides of every page, which is more inventory on paper —
but side rails have to be hidden on phones, where they would squeeze the festival list
into an unreadable column. Roughly the majority of your visitors are on a phone, so rail
inventory would have been invisible to most of the audience. One footer band is fewer
slots that everyone actually sees, in a single strip you can review at a glance before
it goes live.

There are also **demo creatives** available — three invented businesses
(Franklin & Vine Roasters, Rowhouse Print Co., Delaware Ave Sound Co.) that appear
*after* your real sponsors so you can see what a paid image tile looks like next to
them, and show that to a prospective advertiser. Each carries a yellow **DEMO AD**
badge in the artwork. They are switched on by a setting and are off by default, so the
live site shows only your three real sponsors.

---

## This is not Google AdSense — and that is a decision, not an oversight

You asked for ad space "like Google AdSense." What is built is **direct-sold sponsorship**:
you sell the space to a local business, they send you artwork, it goes on the site, they
pay you. AdSense is different — Google auto-fills your slots with ads it chooses, and pays
you a small amount per view.

The site's security settings currently block all third-party ad networks by design. The
same rule that stops an outside script from running on your pages stops Google's ad tag
from running too. Turning AdSense on is possible, but it means loosening that rule and
letting Google's code run on every page.

Before doing that, the money is worth comparing honestly:

- **AdSense** on a community site at your traffic level typically returns single-digit to
  low double-digit dollars per month. It fills the space automatically and requires almost
  no work from you, but you do not control which ads appear — a competitor, or something
  off-brand for a cultural festival site, can show up.
- **Direct sponsorship** at a local rate of, say, $150–$500 per tile per month is a
  materially different number, and you choose who appears. It costs you sales effort.

For a site whose audience is "people who care about Philadelphia festivals," the sponsor
list is the product — Alston-Beech, PECO, a neighborhood credit union. Direct selling is
almost certainly the better business, which is why it is what got built. If you want
AdSense as a floor to fill space you have not sold, say so and it can be scoped; it is a
security-settings change plus a Google account setup, not a rewrite.

---

## How a sponsor gets on the site right now

Today this is a small developer task, not something you can do yourself. The process:

1. **You sell the tile** and agree the run dates.
2. **The sponsor sends you two things**: an image at 320 × 120, and the web address their
   tile should link to.
3. **You forward both to Rob**, saying which dates.
4. **The change goes live** in the next deploy — it is roughly a ten-minute edit.

What to ask a sponsor for, so you are not chasing them twice:

- **Artwork** as PNG, JPG, or SVG at **320 × 120**. Under 200 KB keeps pages fast.
  Sending a logo alone does not work — the tile needs to fill the whole space, so ask for
  a finished creative, or have a print shop build one. The demo tiles are a good template:
  logo mark on the left, business name, one line of what they do, one short call to action.
- **A destination URL**, the full address starting with `https://`.
- **A one-line description of the tile** for screen-reader users, e.g. "Franklin & Vine
  Roasters, small-batch coffee roasted in Philly." This is an accessibility requirement,
  not a nice-to-have.
- **Start and end dates.** Nothing expires automatically today — a sponsor stays up until
  someone removes them.

The technical detail, for the record: creatives are **self-hosted**, meaning the image
file lives on your own site rather than being pulled from an ad network. That is what
keeps the security settings intact, and it is also why each new sponsor is a small code
change today.

---

## What changes when the admin screen ships

The piece that makes this self-serve — item **A4b** on the delivery list — is an admin
screen under **Admin → Sponsors**. It has not been built yet. When it lands you will be
able to, without involving a developer:

- Upload a sponsor's artwork directly through the browser
- Set the link and the alt text
- Set a start and end date, so a campaign turns itself off when it is paid through
- Reorder the tiles, or rotate more sponsors than fit at once
- Take a sponsor down immediately

That work needs a database change plus the screen itself, so it lands after the current
delivery. Everything above stays true when it ships — same band, same tile size, same
empty-band behavior. The only thing that changes is who can make the edit.

---

## Selling the tiles — what to tell a prospect

Useful facts when you are on the phone with a potential sponsor:

- Their tile appears on **every public page** of the site, not one page — home, individual
  festival pages, the calendar, the map, tours, and the about page.
- It shows on **phones as well as desktops**, which side-rail advertising cannot do.
- It sits at the end of the page, where a visitor who has finished browsing festivals is
  looking — not competing with the content for attention halfway down.
- Clicks open in a new tab, so visitors do not lose their place.
- The audience is people actively planning to attend Philadelphia festivals — worth more
  to a caterer, a stage rental company, a print shop, or a neighborhood bank than a
  general banner buy.
- You control who appears. There is no ad network deciding for you.

A reasonable starting structure is a flat monthly rate per tile, with a discount for
booking a full festival season. Because there are only three visible at a time, scarcity
is a real selling point — worth saying out loud on a call.

---

## For developers

`PLACEMENTS` in `src/features/sponsors/sponsor-placements.js` holds the live band and
needs no flag — the three real sponsors moved there from the About page's hardcoded
`SPONSORS` array, which is gone.

Demo mode is the environment variable `SPONSOR_DEMO=1`, read in the same module; it
appends example paid tiles after the real sponsors. **Never set it in production** —
those businesses are invented and linking to `example.com` beside real sponsors would
misrepresent the band.

```sh
SPONSOR_DEMO=1 pnpm run dev:web
```

To place a real sponsor today, add the creative under
`apps/save-philly-festivals/public/sponsors/` and add an entry to `PLACEMENTS` in
`sponsor-placements.js`:

```js
const PLACEMENTS = Object.freeze({
  [SPONSOR_SLOTS.FOOTER]: Object.freeze([
    Object.freeze({
      name: "Sponsor Name",
      imageUrl: "/sponsors/sponsor-name-320x120.png",
      href: "https://sponsor.example.org",
      alt: "Sponsor Name, one line describing the tile",
      ...SPONSOR_TILE,
    }),
  ]),
});
```

`getSponsorsForSlot` is the single seam between placement data and presentation. The
admin-managed version (A4b) replaces its body with a repository read and touches neither
`AdSlot` nor `Footer`. `AdSlot` owns the band's full-bleed divider and padding as well as
its content, so an unsold slot removes the entire section rather than leaving an empty
bordered strip behind.

Covered by `tests/unit/sponsor-placements.test.js`, which asserts the empty-by-default
contract, that only exactly `"1"` enables demo mode, and that every demo creative ships
at the tile size with its DEMO AD badge intact.
