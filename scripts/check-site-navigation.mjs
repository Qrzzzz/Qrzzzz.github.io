import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.resolve(repositoryRoot, process.argv[2] || "docs/.vitepress/dist");
const independentlyDeployedPrefixes = ["/lyrics-card-generator/"];

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    return statSync(target).isDirectory() ? walk(target) : [target];
  });
}

function slash(value) {
  return value.split(path.sep).join("/");
}

function pageRoutes(relativeFile) {
  const fileRoute = `/${slash(relativeFile)}`;
  if (fileRoute === "/index.html") return ["/", "/index.html"];
  if (fileRoute.endsWith("/index.html")) {
    const directoryRoute = fileRoute.slice(0, -"index.html".length);
    return [directoryRoute, directoryRoute.slice(0, -1), fileRoute];
  }
  const extensionless = fileRoute.slice(0, -".html".length);
  return [extensionless, `${extensionless}/`, fileRoute];
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

if (!existsSync(outputRoot)) {
  throw new Error(`找不到 VitePress 构建目录：${outputRoot}`);
}

const htmlFiles = walk(outputRoot).filter((file) => file.endsWith(".html"));
const pages = [];
const pageByRoute = new Map();

for (const file of htmlFiles) {
  const relativeFile = path.relative(outputRoot, file);
  if (slash(relativeFile) === "404.html") continue;
  const routes = pageRoutes(relativeFile);
  const page = {
    file,
    route: routes[0],
    html: readFileSync(file, "utf8"),
    links: []
  };
  pages.push(page);
  for (const route of routes) pageByRoute.set(route, page);
}

const broken = [];

for (const page of pages) {
  const anchorPattern = /<a\b[^>]*\bhref=(?:"([^"]*)"|'([^']*)')[^>]*>/gi;
  for (const match of page.html.matchAll(anchorPattern)) {
    const href = decodeHtml(match[1] ?? match[2] ?? "").trim();
    if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(href)) continue;

    const resolved = new URL(href, `https://qrzzzz.github.io${page.route}`);
    if (resolved.origin !== "https://qrzzzz.github.io") continue;

    let pathname;
    try {
      pathname = decodeURIComponent(resolved.pathname);
    } catch {
      pathname = resolved.pathname;
    }

    if (independentlyDeployedPrefixes.some((prefix) => pathname.startsWith(prefix))) continue;

    const targetPage = pageByRoute.get(pathname);
    if (targetPage) {
      page.links.push(targetPage);
      continue;
    }

    const outputTarget = path.join(outputRoot, pathname.replace(/^\/+/, ""));
    if (!existsSync(outputTarget)) {
      broken.push(`${page.route} -> ${href}`);
    }
  }
}

const root = pageByRoute.get("/");
if (!root) throw new Error("构建产物缺少首页 /。");

const reached = new Set([root]);
const queue = [root];
while (queue.length) {
  const page = queue.shift();
  for (const target of page.links) {
    if (reached.has(target)) continue;
    reached.add(target);
    queue.push(target);
  }
}

const unreachable = pages.filter((page) => !reached.has(page)).map((page) => page.route);

if (broken.length || unreachable.length) {
  const messages = [];
  if (broken.length) messages.push(`失效站内链接：\n${broken.slice(0, 30).join("\n")}`);
  if (unreachable.length) messages.push(`无法从首页点击到达的页面：\n${unreachable.slice(0, 30).join("\n")}`);
  throw new Error(messages.join("\n\n"));
}

console.log(`[docs:navigation-test] 通过：${pages.length} 个页面均可从首页点击到达，且站内链接有效。`);
