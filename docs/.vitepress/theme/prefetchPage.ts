const fetched = new Map<string, HTMLLinkElement>();

/** Fetch only a destination the reader has pointed to, focused, or touched. */
export function prefetchPage(event: Event) {
  const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
  if (anchor) prefetchLink(anchor, "high");
}

export function prefetchLink(anchor: HTMLAnchorElement, priority = "auto") {
  if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
  const url = new URL(anchor.href);
  if (url.origin !== location.origin || url.pathname === location.pathname) return;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (connection?.saveData || /2g/.test(connection?.effectiveType ?? "")) return;
  let path = decodeURIComponent(url.pathname).replace(/\.html$/, "").replace(/\/$/, "/index").slice(1).replaceAll("/", "_") + ".md";
  const hashes = (window as Window & { __VP_HASH_MAP__?: Record<string, string> }).__VP_HASH_MAP__;
  if (!hashes?.[path.toLowerCase()]) path = path.endsWith("_index.md") ? path.slice(0, -9) + ".md" : path.slice(0, -3) + "_index.md";
  const hash = hashes?.[path.toLowerCase()];
  if (!hash) return;
  const src = `/assets/${path}.${hash}.js`;
  const existing = fetched.get(src);
  if (existing) {
    if (priority === "high") existing.setAttribute("fetchpriority", "high");
    return;
  }
  const link = document.createElement("link");
  link.rel = "modulepreload";
  link.setAttribute("fetchpriority", priority);
  link.href = src;
  link.onerror = () => { fetched.delete(src); link.remove(); };
  fetched.set(src, link);
  document.head.append(link);
  return link;
}
