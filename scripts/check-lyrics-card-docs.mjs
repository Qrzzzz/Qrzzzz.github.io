import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  CONTENT_FORMAT,
  DOCS_ROUTE,
  GENERATED_PROJECT_PAGE,
  GENERATED_PUBLIC_ROOT,
  GENERATED_ROOT,
  MANIFEST_NAME,
  PRODUCTION_BASELINE,
  generatedManifest
} from "./lib/lyrics-card-docs.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedRoot = path.join(repositoryRoot, GENERATED_ROOT);
const generatedPublicRoot = path.join(repositoryRoot, GENERATED_PUBLIC_ROOT);
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
      if (relativeAsset && existsSync(path.join(generatedPublicRoot, ...relativeAsset.split("/")))) continue;
      failures.push(`${relativeFile}: 无效的导入后链接 ${href}`);
    }
  }
}

function checkTrackedGeneratedContent() {
  try {
    const tracked = execFileSync("git", ["ls-files", "--", GENERATED_PROJECT_PAGE, GENERATED_ROOT, GENERATED_PUBLIC_ROOT], {
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
  for (const asset of manifest.assets ?? []) {
    const output = path.join(distRoot, ...asset.output.split("/"));
    if (!existsSync(output) || !statSync(output).isFile()) {
      failures.push(`构建产物缺少附件：${asset.route}`);
    }
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
    if (!projectHtml.includes(`https://github.com/Qrzzzz/lyrics-card-generator/commit/${manifest.commit}`)) {
      failures.push("项目页没有显示与文档清单一致的上游 commit。");
    }
  }
}

try {
  const manifest = generatedManifest(generatedRoot);
  if (manifest.schemaVersion !== 2) failures.push("导入清单不是当前 schemaVersion 2。");
  if (manifest.contentFormat !== CONTENT_FORMAT) {
    failures.push(`导入清单没有使用当前内容格式 ${CONTENT_FORMAT}。`);
  }
  if (!/^[0-9a-f]{40}$/i.test(manifest.commit)) failures.push("导入清单中的上游 commit SHA 无效。");
  if (!manifest.importedAt || Number.isNaN(Date.parse(manifest.importedAt))) failures.push("导入清单缺少有效同步时间。");
  if (!Array.isArray(manifest.routes)) {
    failures.push("导入清单缺少路由列表。");
  } else if (manifest.routes.length < PRODUCTION_BASELINE.minimumImportedRoutes) {
    failures.push(
      `导入路由意外缩水：当前 ${manifest.routes.length}，不得低于 ${PRODUCTION_BASELINE.minimumImportedRoutes}` +
      `（基线 commit ${PRODUCTION_BASELINE.referenceCommit}）。`
    );
  }
  if (!Array.isArray(manifest.assets)) failures.push("导入清单缺少附件列表。");
  if (manifest.projectPage?.source !== "README.md" || manifest.projectPage?.route !== "/projects/lyrics-card-generator/") {
    failures.push("导入清单缺少 README 驱动的项目页记录。");
  }
  const generatedProjectPage = path.join(repositoryRoot, GENERATED_PROJECT_PAGE);
  if (!existsSync(generatedProjectPage)) failures.push("README 驱动的项目页源文件缺失。");
  else {
    const projectMarkdown = readFileSync(generatedProjectPage, "utf8");
    if (!projectMarkdown.includes(`sourceCommit: \"${manifest.commit}\"`)) {
      failures.push("项目页与文档清单没有锁定到同一个上游 commit。");
    }
    if (!projectMarkdown.includes("sourcePath: \"README.md\"")) failures.push("项目页没有记录 README.md 来源。");
    if (!projectMarkdown.includes(`contentFormat: \"${CONTENT_FORMAT}\"`)) {
      failures.push("项目页没有记录当前内容格式。");
    }
    if (!projectMarkdown.includes('class="project-docs-sync sync-notice"')) {
      failures.push("项目页没有说明内容由上游同步。");
    }
    if (!projectMarkdown.includes(`${manifest.repository}/blob/${manifest.commit}/README.md`)) {
      failures.push("项目页的同步说明没有指向锁定 commit 的 README.md。");
    }
    if (!projectMarkdown.includes(DOCS_ROUTE)) failures.push("项目页没有将 README 文档链接改写为本站路由。");
  }

  const routeKeys = new Set();
  for (const entry of manifest.routes ?? []) {
    const key = entry.route.toLowerCase();
    if (routeKeys.has(key)) failures.push(`重复路由：${entry.route}`);
    routeKeys.add(key);
    const output = routeOutput(entry.route);
    if (!existsSync(output)) {
      failures.push(`生成源文件缺失：${entry.route}`);
      continue;
    }
    if (!entry.source) continue;
    const importedMarkdown = readFileSync(output, "utf8");
    if (!importedMarkdown.includes(`contentFormat: \"${CONTENT_FORMAT}\"`)) {
      failures.push(`生成页面没有记录当前内容格式：${entry.route}`);
    }
    if (!importedMarkdown.includes('class="project-docs-sync sync-notice"')) {
      failures.push(`生成页面没有说明内容由上游同步：${entry.route}`);
    }
    const encodedSource = entry.source.split("/").map((part) => encodeURIComponent(part)).join("/");
    if (!importedMarkdown.includes(`${manifest.repository}/blob/${manifest.commit}/${encodedSource}`)) {
      failures.push(`生成页面没有链接到锁定 commit 的源文件：${entry.route}`);
    }
    if (/^\s*\*\s+/m.test(importedMarkdown)) {
      failures.push(`生成页面仍使用星号列表，未按站内格式规范化：${entry.route}`);
    }
    if (/<details\b[^>]*>\s*<summary\b[^>]*>.*?<\/summary>.*?<\/details>/i.test(importedMarkdown)) {
      failures.push(`生成页面仍包含单行折叠内容：${entry.route}`);
    }
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
  const landingMarkdown = readFileSync(path.join(generatedRoot, "index.md"), "utf8");
  const supplementalDocs = (manifest.routes ?? []).filter(
    (entry) => entry.source &&
      !["docs/desktop.md", "docs/examples.md", "docs/releases/README.md"].includes(entry.source) &&
      !entry.source.startsWith("docs/releases/")
  );
  for (const entry of supplementalDocs) {
    if (!landingMarkdown.includes(`href="${entry.route}"`)) {
      failures.push(`项目文档入口没有自动收录上游维护文档：${entry.source}`);
    }
  }
  const releasePages = (manifest.routes ?? []).filter(
    (entry) => /^docs\/releases\/v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?\.(?:zh-CN|zh-TW|en|fr|ja|es)\.md$/.test(entry.source ?? "")
  );
  if (releasePages.length < PRODUCTION_BASELINE.minimumReleasePages) {
    failures.push(
      `具体版本说明意外缩水：当前 ${releasePages.length}，不得低于 ${PRODUCTION_BASELINE.minimumReleasePages}` +
      `（基线 commit ${PRODUCTION_BASELINE.referenceCommit}）。`
    );
  }

  for (const asset of manifest.assets ?? []) {
    const sourceRelative = asset.source.replace(/^docs\//, "");
    const publicFile = path.join(generatedPublicRoot, ...sourceRelative.split("/"));
    if (!existsSync(publicFile) || !statSync(publicFile).isFile()) {
      failures.push(`public 附件缺失：${asset.route}`);
    }
  }

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
    `${releasePages.length} 个具体版本说明，${manifest.assets.length} 个附件，` +
    `commit ${manifest.commit.slice(0, 8)}` +
    `${checkDist ? "，构建边界正常" : ""}。`
  );
} catch (error) {
  console.error(`[docs:check] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
