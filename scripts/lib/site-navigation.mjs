import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parseHTML } from "linkedom";
import { PROJECTS } from "../../docs/.vitepress/content/projects.mjs";

const origin = "https://qrzzzz.github.io";
const externalPrefixes = PROJECTS.map(project => new URL(project.homepage))
  .filter(url => url.origin === origin).map(url => url.pathname);
export function outputFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? outputFiles(target) : [target];
  });
}
export function canonicalRoute(relative) {
  return "/" + relative.replaceAll("\\", "/").replace(/(^|\/)index\.html$/, "$1");
}

export function checkSiteNavigation(root, { requiredRoutes = [] } = {}) {
  root = path.resolve(root);
  const pages = outputFiles(root).filter(file => file.endsWith(".html") && path.basename(file) !== "404.html")
    .map(file => {
      const { document } = parseHTML(readFileSync(file, "utf8"));
      return { file, route: canonicalRoute(path.relative(root, file)), document, links: new Set(),
        anchors: new Set([...document.querySelectorAll("[id], a[name]")].flatMap(node => [node.id, node.getAttribute("name")]).filter(Boolean)) };
    });
  const byRoute = new Map();
  for (const page of pages) {
    byRoute.set(page.route, page);
    if (page.route.endsWith("/")) {
      byRoute.set(page.route + "index.html", page);
      if (page.route !== "/") byRoute.set(page.route.slice(0, -1), page);
    } else if (page.route.endsWith(".html")) byRoute.set(page.route.slice(0, -5), page);
  }
  const errors = [];
  for (const route of requiredRoutes) if (!byRoute.has(route)) errors.push(`Removed public URL: ${route}`);
  function resolveLink(page, raw, navigation) {
    if (!raw || /^(data:|mailto:|tel:|javascript:)/i.test(raw)) return;
    let url, pathname, fragment;
    try {
      url = new URL(raw, origin + page.route);
      if (url.origin !== origin) return;
      pathname = decodeURIComponent(url.pathname);
      fragment = decodeURIComponent(url.hash.slice(1)).split(":~:text=")[0];
    } catch { errors.push(`${page.route}: Invalid URL ${raw}`); return; }
    if (externalPrefixes.some(prefix => pathname.startsWith(prefix) || pathname === prefix.slice(0, -1))) return;
    const target = byRoute.get(pathname);
    if (target) {
      if (navigation) page.links.add(target);
      if (fragment && !target.anchors.has(fragment)) errors.push(`${page.route}: Missing fragment ${raw}`);
      return;
    }
    const file = path.resolve(root, "." + pathname);
    if (!file.startsWith(root + path.sep) || !existsSync(file) || !statSync(file).isFile()) errors.push(`${page.route}: Missing resource ${raw}`);
  }
  for (const page of pages) {
    for (const node of page.document.querySelectorAll("a[href]")) resolveLink(page, node.getAttribute("href"), true);
    for (const node of page.document.querySelectorAll("img[src], source[src], video[src], audio[src], script[src], iframe[src], track[src]")) resolveLink(page, node.getAttribute("src"), false);
    for (const node of page.document.querySelectorAll("video[poster]")) resolveLink(page, node.getAttribute("poster"), false);
    for (const node of page.document.querySelectorAll("link[href]")) resolveLink(page, node.getAttribute("href"), false);
    for (const node of page.document.querySelectorAll("img[srcset], source[srcset]")) {
      const value = node.getAttribute("srcset");
      if (!value.startsWith("data:")) for (const candidate of value.split(",")) resolveLink(page, candidate.trim().split(/\s+/)[0], false);
    }
  }
  const home = byRoute.get("/");
  if (!home) errors.push("Missing home page");
  const reached = new Set(home ? [home] : []), queue = [...reached];
  for (const page of queue) for (const target of page.links) if (!reached.has(target)) { reached.add(target); queue.push(target); }
  for (const page of pages) if (!reached.has(page)) errors.push(`Unreachable page: ${page.route}`);
  return { pages: pages.length, routes: pages.map(page => page.route).sort(), errors };
}
