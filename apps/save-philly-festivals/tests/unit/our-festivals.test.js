import { describe, expect, it, vi } from "vitest";

import {
  createOurFestivalItemSchema,
  reorderOurFestivalItemsSchema,
  updateOurFestivalItemSchema,
} from "@/features/our-festivals/our-festivals-schema";
import {
  createOurFestivalItem,
  publicOurFestivalItems,
} from "@/features/our-festivals/our-festivals-service";

const validItem = {
  title: "Odunde Festival",
  image_url: "https://cdn.example.com/odunde.jpg",
  alt_text: "Dancers in white on South Street",
};

describe("our festivals schema", () => {
  it("accepts a minimal valid item", () => {
    expect(createOurFestivalItemSchema.safeParse(validItem).success).toBe(true);
  });

  /* Alt text is required rather than optional: the gallery is entirely imagery, so an item
   * without it is unusable with a screen reader rather than merely degraded. */
  it("rejects an item with no alt text", () => {
    const { alt_text, ...withoutAlt } = validItem;
    expect(createOurFestivalItemSchema.safeParse(withoutAlt).success).toBe(false);
  });

  it("rejects a blank alt text", () => {
    expect(createOurFestivalItemSchema.safeParse({ ...validItem, alt_text: "   " }).success).toBe(false);
  });

  /* The CSP allows `img-src https:` plus same-origin, so anything else would render as a
   * broken image no matter what the curator typed. */
  it("rejects a non-https image origin", () => {
    expect(createOurFestivalItemSchema.safeParse({ ...validItem, image_url: "http://cdn.example.com/a.jpg" }).success).toBe(false);
    expect(createOurFestivalItemSchema.safeParse({ ...validItem, image_url: "javascript:alert(1)" }).success).toBe(false);
  });

  it("accepts an existing public asset path so approved uploads can be reused", () => {
    const parsed = createOurFestivalItemSchema.safeParse({
      ...validItem,
      image_url: "/api/public/assets/2f1c1b4e-0000-4000-8000-000000000000",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown fields", () => {
    expect(createOurFestivalItemSchema.safeParse({ ...validItem, sneaky: true }).success).toBe(false);
  });

  it("requires at least one field on update", () => {
    expect(updateOurFestivalItemSchema.safeParse({}).success).toBe(false);
    expect(updateOurFestivalItemSchema.safeParse({ title: "New title" }).success).toBe(true);
  });

  /* A duplicated id would make the resulting order depend on which update landed last. */
  it("rejects a reorder payload containing duplicate ids", () => {
    const id = "2f1c1b4e-0000-4000-8000-000000000000";
    expect(reorderOurFestivalItemsSchema.safeParse({ order: [id, id] }).success).toBe(false);
    expect(reorderOurFestivalItemsSchema.safeParse({ order: [id] }).success).toBe(true);
  });
});

describe("createOurFestivalItem", () => {
  it("appends to the end when no explicit position is given", async () => {
    const repository = {
      nextSortOrder: vi.fn().mockResolvedValue(7),
      create: vi.fn().mockImplementation((data) => Promise.resolve(data)),
    };
    const { item } = await createOurFestivalItem({ ...validItem }, { repository });
    expect(repository.nextSortOrder).toHaveBeenCalled();
    expect(item.sort_order).toBe(7);
  });

  it("honours an explicit position", async () => {
    const repository = {
      nextSortOrder: vi.fn(),
      create: vi.fn().mockImplementation((data) => Promise.resolve(data)),
    };
    const { item } = await createOurFestivalItem({ ...validItem, sort_order: 3 }, { repository });
    expect(repository.nextSortOrder).not.toHaveBeenCalled();
    expect(item.sort_order).toBe(3);
  });
});

describe("publicOurFestivalItems", () => {
  /* The gallery item's own status governs visibility; the linked festival's workflow state
   * governs only whether the "read more" link is safe to render. */
  it("keeps the item but drops the link when the linked festival is not published", async () => {
    const repository = {
      listPublished: vi.fn().mockResolvedValue([
        { id: "a", title: "Draft-linked", festival: { id: "f1", name: "Hidden", slug: "hidden", workflow_state: "draft" } },
        { id: "b", title: "Live-linked", festival: { id: "f2", name: "Shown", slug: "shown", workflow_state: "published" } },
        { id: "c", title: "Unlinked", festival: null },
      ]),
    };

    const items = await publicOurFestivalItems({ repository });

    expect(items).toHaveLength(3);
    expect(items[0].festival).toBeNull();
    expect(items[1].festival).toEqual({ name: "Shown", slug: "shown" });
    expect(items[2].festival).toBeNull();
  });

  it("never leaks the linked festival's internal workflow state", async () => {
    const repository = {
      listPublished: vi.fn().mockResolvedValue([
        { id: "a", title: "Item", festival: { id: "f1", name: "Shown", slug: "shown", workflow_state: "published" } },
      ]),
    };
    const [item] = await publicOurFestivalItems({ repository });
    expect(item.festival).not.toHaveProperty("workflow_state");
    expect(item.festival).not.toHaveProperty("id");
  });
});
