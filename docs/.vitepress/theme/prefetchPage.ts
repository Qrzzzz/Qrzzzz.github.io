const fetched = new Set<string>();

/** Fetch only a destination the reader has pointed to, focused, or touched. */
export function prefetchPage(event: Event) {
  const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
  if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
  const url = new URL(anchor.href);
  if (url.origin !== location.origin || url.pathname === location.pathname) return;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (connection?.saveData || /2g/.test(connection?.effectiveType ?? "")) return;
  const path = decodeURIComponent(url.pathname).replace(/\.html$/, "").replace(/\/$/, "/index").slice(1).replaceAll("/", "_").toLowerCase() + ".md";
  const hash = (window as Window & { __VP_HASH_MAP__?: Record<string, string> }).__VP_HASH_MAP__?.[path];
  if (!hash) return;
  const src = `/assets/${path}.${hash}.js`;
  if (fetched.has(src)) return;
  fetched.add(src);
  const link = document.createElement("link");
  link.rel = "modulepreload";
  link.href = src;
  link.onerror = () => { fetched.delete(src); link.remove(); };
  document.head.append(link);
}
