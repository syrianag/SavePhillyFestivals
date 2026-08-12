import { DEFAULT_FOOTER_SECTIONS, DEFAULT_HEADER_LINKS } from "./navigation-defaults";
import { isPrivateHref } from "./navigation-schema";

export async function listNavigationLinks(input, { repository }) {
  return { links: await repository.list(input) };
}

export async function createNavigationLink(input, { repository }) {
  return { link: await repository.create(input) };
}

export async function updateNavigationLink(id, input, { repository }) {
  return { link: await repository.update(id, input) };
}

export async function removeNavigationLink(id, { repository }) {
  return repository.remove(id);
}

export async function reorderNavigationLinks({ order }, { repository }) {
  return { links: await repository.applyOrder(order) };
}

/**
 * Shape the public header and footer actually render.
 *
 * Returns the shipped defaults when the table is empty, so a fresh environment shows the real
 * menu instead of nothing. Private routes are filtered again here rather than trusted from
 * storage: the schema rejects them on write, but a row could predate a rule change or arrive
 * through a direct database edit, and a leaked `/admin` link in public navigation is exactly the
 * failure this feature must not introduce.
 */
export function toPublicNavigation(links) {
  const safe = (links ?? []).filter((link) => link.visible !== false && !isPrivateHref(link.href));

  const header = safe
    .filter((link) => link.placement === "header")
    .map((link) => ({ label: link.label, href: link.href }));

  const footerGroups = new Map();
  for (const link of safe.filter((item) => item.placement === "footer")) {
    const title = link.section || "More";
    if (!footerGroups.has(title)) footerGroups.set(title, []);
    footerGroups.get(title).push({ label: link.label, href: link.href });
  }
  const footer = [...footerGroups.entries()].map(([title, groupLinks]) => ({ title, links: groupLinks }));

  return {
    header: header.length > 0 ? header : DEFAULT_HEADER_LINKS.map((link) => ({ ...link })),
    footer: footer.length > 0 ? footer : DEFAULT_FOOTER_SECTIONS.map((group) => ({
      title: group.title,
      links: group.links.map((link) => ({ ...link })),
    })),
  };
}
