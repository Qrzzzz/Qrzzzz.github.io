import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  DOCS_ROUTE,
  GENERATED_ROOT,
  MANIFEST_NAME,
  generatedManifest
} from "./lib/lyrics-card-docs.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedRoot = path.join(repositoryRoot, GENERATED_ROOT);
const distRoot = path.join(repositoryRoot, "docs/.vitepress/dist");
const checkDist = process.argv.includes("--dist");
const failures = [];

function walk(root, current = root) {
  if (!existsSync(root)) return [];
  const files = [];
  for (const item of readdirSync(current, { withFileTypes: true })) {
    const absolute = path.join(current, item.name);
    if (item.isDirectory()) files.push(...walk(root, absolute));
    else if (item.isFile()) files.push(absolute);
  }
  return files;
}

function routeOutput(route, extension = "md") {
  const relative = route.slice(DOCS_ROUTE.length).replace(/\/$/, "");
  return path.join(generatedRoot, ...relative.split("/").filter(Boolean), `index.${extension}`);
}

function distOutput(route) {
  const relative = route.replace(/^\//, "").replace(/\/$/, "");
  return path.join(distRoot, ...relative.split("/"), "index.html");
}

function linksIn(content) {
  const links = [];
  let fenced = false;
  for (const line of content.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    for (const match of line.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g)) links.push(match[1]);
    for (const match of line.matchAll(/\b(?:href|src)=(?:"([^"]+)"|'([^']+)')/gi)) links.push(match[1] ?? match[2]);
  }
  return links;
}

function checkGeneratedLinks(manifest) {
  const routes = new Set(manifest.routes.map((entry) => entry.route));
  for (const file of walk(generatedRoot).filter((entry) => entry.endsWith(".md"))) {
    const relativeFile = path.relative(repositoryRoot, file).replaceAll("\\", "/");
    for (const href of linksIn(readFileSync(file, "utf8"))) {
      if (!href.startsWith(DOCS_ROUTE)) continue;
      const clean = decodeURIComponent(href.split(/[?#]/, 1)[0]);
      if (clean.endsWith("/") && routes.has(clean)) continue;
      const relativeAsset = clean.slice(DOCS_ROUTE.length);
      if (relativeAsset && existsSync(path.join(generatedRoot, ...relativeAsset.split("/")))) continue;
      failures.push(`${relativeFile}: 无效的导入后链接 ${href}`);
    }
  }
}

function checkTrackedGeneratedContent() {
  try {
    const tracked = execFileSync("git", ["ls-files", "--", GENERATED_ROOT], {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
    if (tracked) failures.push(`生成内容被 Git 跟踪：\n${tracked}`);
  } catch (error) {
    failures.push(`无法检查 Git 跟踪状态：${error instanceof Error ? error.message : error}`);
  }
}

function checkBuild(manifest) {
  if (!existsSync(distRoot)) {
    failures.push(`构建目录不存在：${distRoot}`);
    return;
  }
  const forbidden = [
    path.join(distRoot, "lyrics-card-generator"),
    path.join(repositoryRoot, "_site/lyrics-card-generator"),
    path.join(repositoryRoot, "out/lyrics-card-generator")
  ];
  for (const target of forbidden) {
    if (existsSync(target)) failures.push(`发现冲突构建目录：${target}`);
  }
  for (const entry of manifest.routes) {
    const output = distOutput(entry.route);
    if (!existsSync(output)) failures.push(`构建产物缺少路由：${entry.route}`);
  }
  for (const html of walk(distRoot).filter((entry) => entry.endsWith(".html"))) {
    const content = readFileSync(html, "utf8");
    if (/(?:href|src)=["']\/lyrics-card-generator\//.test(content)) {
      failures.push(`${path.relative(repositoryRoot, html)} 含有指向冲突路径的站内链接。`);
    }
  }
  const projectPage = path.join(distRoot, "projects/lyrics-card-generator/index.html");
  if (!existsSync(projectPage)) {
    failures.push("构建产物缺少项目详情页。");
  } else {
    const projectHtml = readFileSync(projectPage, "utf8");
    if (!projectHtml.includes("https://qrzzzz.github.io/lyrics-card-generator/")) {
      failures.push("项目页没有保留现有 Web Lite 外部地址。");
    }
    if (!projectHtml.includes(DOCS_ROUTE)) failures.push("项目页无法进入发布文档。");
  }
}

try {
  const manifest = generatedManifest(generatedRoot);
  if (!/^[0-9a-f]{40}$/i.test(manifest.commit)) failures.push("导入清单中的上游 commit SHA 无效。");
  if (!manifest.importedAt || Number.isNaN(Date.parse(manifest.importedAt))) failures.push("导入清单缺少有效同步时间。");
  if (!Array.isArray(manifest.routes) || manifest.routes.length < 6) failures.push("导入路由数量异常。");

  const routeKeys = new Set();
  for (const entry of manifest.routes ?? []) {
    const key = entry.route.toLowerCase();
    if (routeKeys.has(key)) failures.push(`重复路由：${entry.route}`);
    routeKeys.add(key);
    if (!existsSync(routeOutput(entry.route))) failures.push(`生成源文件缺失：${entry.route}`);
  }

  const requiredRoutes = [
    DOCS_ROUTE,
    `${DOCS_ROUTE}desktop/`,
    `${DOCS_ROUTE}examples/`,
    `${DOCS_ROUTE}releases/`
  ];
  for (const route of requiredRoutes) {
    if (!routeKeys.has(route.toLowerCase())) failures.push(`缺少必要路由：${route}`);
  }
  const releasePages = manifest.routes.filter(
    (entry) => entry.route.startsWith(`${DOCS_ROUTE}releases/`) && entry.route !== `${DOCS_ROUTE}releases/`
  );
  if (releasePages.length < 2) failures.push("具体版本说明页面少于两个。");

  if (!existsSync(path.join(generatedRoot, MANIFEST_NAME))) failures.push("导入清单缺失。");
  checkGeneratedLinks(manifest);
  checkTrackedGeneratedContent();
  if (checkDist) checkBuild(manifest);

  if (failures.length) {
    console.error(`[docs:check] 失败（${failures.length} 项）：\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log(
    `[docs:check] 通过：${manifest.routes.length} 条唯一路由，` +
    `${releasePages.length} 个具体版本说明，commit ${manifest.commit.slice(0, 8)}` +
    `${checkDist ? "，构建边界正常" : ""}。`
  );
} catch (error) {
  console.error(`[docs:check] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
