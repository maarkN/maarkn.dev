/**
 * The old one-page home had `#about`, `#projects` and `#contact` sections,
 * and those anchors still live in profiles and e-mails. The terminal turns
 * them into the matching command so the link keeps landing somewhere useful.
 */
const ANCHORS: Readonly<Record<string, string>> = {
  about: "whoami",
  projects: "projects",
  contact: "contact",
};

/** `#contact` → `contact`; `null` for anything else. */
export function anchorCommand(hash: string): string | null {
  const name = hash.replace(/^#/, "").toLowerCase();
  return ANCHORS[name] ?? null;
}

/**
 * The URL to replace the current one with: the hash gone and `?cmd=` set to
 * the command — unless the URL already carries a `cmd`, which wins. `null`
 * when the hash is not one of the old anchors.
 */
export function anchorRedirect(href: string): string | null {
  const url = new URL(href);
  const command = anchorCommand(url.hash);
  if (!command) return null;
  url.hash = "";
  if (!url.searchParams.has("cmd")) url.searchParams.set("cmd", command);
  return `${url.pathname}${url.search}`;
}
