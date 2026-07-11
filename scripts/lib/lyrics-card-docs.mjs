import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import path from "node:path";

export const DOCS_ROUTE = "/projects/lyrics-card-generator/docs/";
export const GENERATED_ROOT = "docs/projects/lyrics-card-generator/docs";
export const GENERATED_PUBLIC_ROOT = "docs/public/projects/lyrics-card-generator/docs";
export const MANIFEST_NAME = ".import-manifest.json";
export const UPSTREAM_REPOSITORY = "https://github.com/Qrzzzz/lyrics-card-generator";

const REQUIRED_SOURCES = ["desktop.md", "examples.md", "releases/README.md"];
const REQUIRED_ROUTES = [
  DOCS_ROUTE,
  `${DOCS_ROUTE}desktop/`,
  `${DOCS_ROUTE}examples/`,
  `${DOCS_ROUTE}releases/`
];
const LANGUAGE_NAMES = {
  en: "English",
  es: "Español",
  fr: "Français",
  ja: "日本語",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文"
};

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function normalizeRelative(value) {
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
  return normalized === "." ? "" : normalized.replace(/^\.\//, "");
}

function walk(root, current = root) {
  const entries = [];
  for (const item of readdirSync(current, { withFileTypes: true })) {
    const absolute = path.join(current, item.name);
    if (item.isDirectory()) entries.push(...walk(root, absolute));
    else if (item.isFile()) entries.push(toPosix(path.relative(root, absolute)));
  }
  return entries.sort((a, b) => a.localeCompare(b, "en"));
}

function markdownRoute(sourcePath) {
  const normalized = normalizeRelative(sourcePath);
  const directory = path.posix.dirname(normalized);
  const basename = path.posix.basename(normalized, ".md");
  const routePart = basename.toLowerCase() === "readme"
    ? directory === "." ? "" : directory
    : normalized.slice(0, -3);
  return `${DOCS_ROUTE}${routePart ? `${routePart}/` : ""}`;
}

function routeOutput(route) {
  const routePart = route.slice(DOCS_ROUTE.length).replace(/\/$/, "");
  return routePart ? `${routePart}/index.md` : "index.md";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeYaml(value) {
  return JSON.stringify(value);
}

function withoutFrontmatter(content) {
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) {
    return { body: content, upstreamFrontmatter: "" };
  }
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) throw new Error("Markdown front matter is not closed.");
  return {
    body: content.slice(match[0].length),
    upstreamFrontmatter: match[1].trim()
  };
}

function firstHeading(content) {
  let fenced = false;
  for (const line of content.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (!fenced) {
      const match = line.match(/^#\s+(.+?)\s*#*$/);
      if (match) return match[1].replace(/<[^>]+>/g, "").trim();
    }
  }
  return "";
}

function fallbackTitle(sourcePath) {
  if (sourcePath === "desktop.md") return "桌面端维护";
  if (sourcePath === "examples.md") return "示例内容维护";
  if (sourcePath === "releases/README.md") return "版本说明";
  const basename = path.posix.basename(sourcePath, ".md");
  const match = basename.match(/^(v[^.]+(?:\.[^.]+){2})\.(.+)$/);
  if (match) return `${match[1]} · ${LANGUAGE_NAMES[match[2]] ?? match[2]}`;
  return basename;
}

function breadcrumb(sourcePath, currentTitle) {
  const items = [
    ["首页", "/"],
    ["项目", "/projects/"],
    ["lyrics-card-generator", "/projects/lyrics-card-generator/"],
    ["发布文档", DOCS_ROUTE]
  ];
  if (sourcePath) items.push([currentTitle, null]);
  else items[items.length - 1][1] = null;

  return `<nav class="docs-breadcrumb" aria-label="面包屑">${items
    .map(([label, link]) => link
      ? `<a href="${link}">${escapeHtml(label)}</a>`
      : `<span aria-current="page">${escapeHtml(label)}</span>`)
    .join('<span aria-hidden="true">/</span>')}</nav>`;
}

function breadcrumbTitle(sourcePath, pageTitle) {
  if (sourcePath === "desktop.md") return "桌面端维护";
  if (sourcePath === "examples.md") return "示例内容维护";
  if (sourcePath === "releases/README.md") return "版本说明";
  return pageTitle;
}

function splitDestination(raw) {
  const value = raw.trim();
  if (value.startsWith("<")) {
    const closing = value.indexOf(">");
    if (closing !== -1) {
      return { href: value.slice(1, closing), suffix: value.slice(closing + 1), angle: true };
    }
  }
  const match = value.match(/^(\S+?)(\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?$/);
  return match
    ? { href: match[1], suffix: match[2] ?? "", angle: false }
    : { href: value, suffix: "", angle: false };
}

function joinDestination({ href, suffix, angle }) {
  return `${angle ? `<${href}>` : href}${suffix}`;
}

function splitHref(href) {
  const index = href.search(/[?#]/);
  return index === -1
    ? { pathname: href, tail: "" }
    : { pathname: href.slice(0, index), tail: href.slice(index) };
}

function encodeRoutePath(value) {
  return value.split("/").map((part) => encodeURIComponent(part)).join("/");
}

function transformOutsideFences(content, transform) {
  const lines = content.split(/(?<=\n)/);
  let fenced = false;
  return lines.map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      return line;
    }
    return fenced ? line : transform(line);
  }).join("");
}

function createResolver({ sourceRoot, sourcePath, markdownBySource, directoryIndexes, errors }) {
  return (rawTarget) => {
    const destination = splitDestination(rawTarget);
    const originalHref = destination.href;
    if (!originalHref || originalHref.startsWith("#")) return rawTarget;

    let href = originalHref;
    const upstreamMatch = href.match(
      /^https:\/\/github\.com\/Qrzzzz\/lyrics-card-generator\/(?:blob|raw)\/main\/docs\/(.+)$/i
    );
    if (upstreamMatch) href = decodeURIComponent(upstreamMatch[1]);
    else if (/^(?:[a-z][a-z\d+.-]*:|\/\/|\/)/i.test(href)) return rawTarget;

    const { pathname: hrefPath, tail } = splitHref(href);
    let decodedPath;
    try {
      decodedPath = decodeURIComponent(hrefPath);
    } catch {
      errors.push(`${sourcePath}: 无法解析链接编码 ${originalHref}`);
      return rawTarget;
    }
    const resolved = upstreamMatch
      ? normalizeRelative(decodedPath)
      : normalizeRelative(path.posix.join(path.posix.dirname(sourcePath), decodedPath));

    if (!resolved || resolved.startsWith("../")) {
      errors.push(`${sourcePath}: 链接超出 docs/ 范围 ${originalHref}`);
      return rawTarget;
    }

    let markdown = markdownBySource.get(resolved);
    if (!markdown && !path.posix.extname(resolved)) markdown = markdownBySource.get(`${resolved}.md`);
    if (!markdown) markdown = directoryIndexes.get(resolved.replace(/\/$/, ""));

    if (markdown) {
      destination.href = `${markdown.route}${tail}`;
      return joinDestination(destination);
    }

    const assetPath = path.join(sourceRoot, ...resolved.split("/"));
    if (existsSync(assetPath) && statSync(assetPath).isFile()) {
      destination.href = `${DOCS_ROUTE}${encodeRoutePath(resolved)}${tail}`;
      return joinDestination(destination);
    }

    errors.push(`${sourcePath}: 无法解析链接 ${originalHref}`);
    return rawTarget;
  };
}

function rewriteLinks(content, context) {
  const resolve = createResolver(context);
  return transformOutsideFences(content, (line) => {
    let transformed = line.replace(/(!?\[[^\]]*\])\(([^)]+)\)/g, (full, label, target) => {
      return `${label}(${resolve(target)})`;
    });
    transformed = transformed.replace(/^(\s*\[[^\]]+\]:\s*)(\S+)(.*)$/g, (full, prefix, target, suffix) => {
      return `${prefix}${resolve(target)}${suffix}`;
    });
    transformed = transformed.replace(/\b(href|src)=(['"])([^'"]+)\2/gi, (full, attribute, quote, target) => {
      return `${attribute}=${quote}${resolve(target)}${quote}`;
    });
    return transformed;
  });
}

function frontmatter({ title, description, sourcePath, commitSha, upstreamFrontmatter }) {
  const retained = upstreamFrontmatter
    .split(/\r?\n/)
    .filter((line) => !/^(title|description|editLink|lastUpdated|sourceRepository|sourcePath|sourceCommit):/.test(line))
    .join("\n")
    .trim();
  return [
    "---",
    `title: ${escapeYaml(title)}`,
    `description: ${escapeYaml(description)}`,
    "editLink: false",
    "lastUpdated: false",
    `sourceRepository: ${escapeYaml(UPSTREAM_REPOSITORY)}`,
    `sourcePath: ${escapeYaml(`docs/${sourcePath}`)}`,
    `sourceCommit: ${escapeYaml(commitSha)}`,
    retained,
    "---"
  ].filter(Boolean).join("\n");
}

function readCommitSha(sourceRoot, explicitSha) {
  if (explicitSha) return explicitSha.trim();
  try {
    return execFileSync("git", ["-C", sourceRoot, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch {
    throw new Error(`无法读取上游 commit SHA：${sourceRoot} 必须位于 Git 检出中，或传入 commitSha。`);
  }
}

function createLanding({ commitSha, importedAt, releaseCount }) {
  const shortSha = commitSha.slice(0, 8);
  return `---
title: 发布文档
description: lyrics-card-generator 从源仓库同步的公开维护文档和版本资料。
editLink: false
lastUpdated: false
---

${breadcrumb("", "发布文档")}

# 发布文档

<p class="project-docs-owner">所属项目：<a href="/projects/lyrics-card-generator/"><strong>lyrics-card-generator</strong></a></p>

这里集中展示该项目从源仓库同步的公开维护文档和版本资料。

<div class="project-docs-grid">
  <a class="project-docs-card" href="${DOCS_ROUTE}desktop/"><strong>桌面端维护</strong><span>桌面架构、开发命令与发布检查。</span></a>
  <a class="project-docs-card" href="${DOCS_ROUTE}examples/"><strong>示例内容维护</strong><span>示例歌曲内容的维护流程与约束。</span></a>
  <a class="project-docs-card" href="${DOCS_ROUTE}releases/"><strong>版本说明</strong><span>${releaseCount} 篇多语言、多版本发布资料。</span></a>
</div>

## 同步信息

<div class="project-docs-sync">
  <span>文档源 <a href="${UPSTREAM_REPOSITORY}/tree/main/docs">Qrzzzz/lyrics-card-generator / docs</a></span>
  <span>上游 commit <a href="${UPSTREAM_REPOSITORY}/commit/${commitSha}"><code>${shortSha}</code></a></span>
  <span>最近同步 <time datetime="${importedAt}">${importedAt}</time></span>
</div>
`;
}

export function importLyricsCardDocs({
  sourceRoot,
  outputRoot = path.resolve(GENERATED_ROOT),
  publicOutputRoot = path.resolve(GENERATED_PUBLIC_ROOT),
  commitSha,
  importedAt = new Date().toISOString()
}) {
  const absoluteSource = path.resolve(sourceRoot);
  const absoluteOutput = path.resolve(outputRoot);
  const absolutePublicOutput = path.resolve(publicOutputRoot);
  if (!existsSync(absoluteSource) || !statSync(absoluteSource).isDirectory()) {
    throw new Error(`上游文档目录不存在：${absoluteSource}`);
  }

  const files = walk(absoluteSource);
  for (const required of REQUIRED_SOURCES) {
    if (!files.includes(required)) throw new Error(`上游缺少必要入口：docs/${required}`);
  }

  const resolvedSha = readCommitSha(absoluteSource, commitSha);
  if (!/^[0-9a-f]{7,40}$/i.test(resolvedSha)) {
    throw new Error(`上游 commit SHA 无效：${resolvedSha}`);
  }

  const markdownFiles = files.filter((file) => file.toLowerCase().endsWith(".md"));
  const assetFiles = files.filter((file) => !file.toLowerCase().endsWith(".md"));
  const markdownBySource = new Map();
  const directoryIndexes = new Map();
  const routeKeys = new Map([[DOCS_ROUTE.toLowerCase(), "<generated landing>"]]);

  for (const sourcePath of markdownFiles) {
    const route = markdownRoute(sourcePath);
    const routeKey = route.toLowerCase();
    if (routeKeys.has(routeKey)) {
      throw new Error(`路由重名：${sourcePath} 与 ${routeKeys.get(routeKey)} 均映射到 ${route}`);
    }
    routeKeys.set(routeKey, sourcePath);
    const entry = { sourcePath, route, outputPath: routeOutput(route) };
    markdownBySource.set(sourcePath, entry);
    if (path.posix.basename(sourcePath).toLowerCase() === "readme.md") {
      directoryIndexes.set(path.posix.dirname(sourcePath).replace(/^\.$/, ""), entry);
    }
  }

  rmSync(absoluteOutput, { recursive: true, force: true });
  rmSync(absolutePublicOutput, { recursive: true, force: true });
  mkdirSync(absoluteOutput, { recursive: true });
  mkdirSync(absolutePublicOutput, { recursive: true });

  for (const asset of assetFiles) {
    const source = path.join(absoluteSource, ...asset.split("/"));
    const destination = path.join(absolutePublicOutput, ...asset.split("/"));
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(source, destination);
  }

  const errors = [];
  const routes = [];
  for (const entry of markdownBySource.values()) {
    const raw = readFileSync(path.join(absoluteSource, ...entry.sourcePath.split("/")), "utf8");
    const { body, upstreamFrontmatter } = withoutFrontmatter(raw);
    const title = firstHeading(body) || fallbackTitle(entry.sourcePath);
    const description = entry.sourcePath.startsWith("releases/")
      ? `${title}：lyrics-card-generator 上游发布资料。`
      : `${title}：lyrics-card-generator 上游维护文档。`;
    const rewritten = rewriteLinks(body, {
      sourceRoot: absoluteSource,
      sourcePath: entry.sourcePath,
      markdownBySource,
      directoryIndexes,
      errors
    });
    const needsHeading = !firstHeading(body);
    const metadata = frontmatter({
      title,
      description,
      sourcePath: entry.sourcePath,
      commitSha: resolvedSha,
      upstreamFrontmatter
    });
    const generatedHeading = needsHeading ? `# ${title}\n\n` : "";
    const output = `${metadata}\n\n${breadcrumb(entry.sourcePath, breadcrumbTitle(entry.sourcePath, title))}\n\n` +
      `${generatedHeading}${rewritten.trimStart()}`;
    const destination = path.join(absoluteOutput, ...entry.outputPath.split("/"));
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, `${output.trimEnd()}\n`, "utf8");
    routes.push({ source: `docs/${entry.sourcePath}`, route: entry.route, output: entry.outputPath });
  }

  if (errors.length) {
    rmSync(absoluteOutput, { recursive: true, force: true });
    rmSync(absolutePublicOutput, { recursive: true, force: true });
    throw new Error(`文档导入失败：\n- ${errors.join("\n- ")}`);
  }

  const releaseCount = routes.filter((entry) => entry.source.startsWith("docs/releases/") && !entry.source.endsWith("README.md")).length;
  writeFileSync(
    path.join(absoluteOutput, "index.md"),
    createLanding({ commitSha: resolvedSha, importedAt, releaseCount }),
    "utf8"
  );

  const manifest = {
    schemaVersion: 1,
    repository: UPSTREAM_REPOSITORY,
    commit: resolvedSha,
    importedAt,
    sourceRoot: "docs/",
    outputRoute: DOCS_ROUTE,
    markdownCount: markdownFiles.length,
    assetCount: assetFiles.length,
    assets: assetFiles.map((asset) => ({
      source: `docs/${asset}`,
      route: `${DOCS_ROUTE}${encodeRoutePath(asset)}`,
      output: `projects/lyrics-card-generator/docs/${asset}`
    })),
    routes: [
      { source: null, route: DOCS_ROUTE, output: "index.md" },
      ...routes.sort((a, b) => a.route.localeCompare(b.route, "en"))
    ]
  };
  writeFileSync(path.join(absoluteOutput, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  for (const route of REQUIRED_ROUTES) {
    if (!manifest.routes.some((entry) => entry.route === route)) {
      throw new Error(`导入后缺少必要路由：${route}`);
    }
  }

  return manifest;
}

export function generatedManifest(outputRoot = path.resolve(GENERATED_ROOT)) {
  const manifestPath = path.join(outputRoot, MANIFEST_NAME);
  if (!existsSync(manifestPath)) {
    throw new Error(`未找到导入清单：${manifestPath}。请先运行 npm run docs:pull。`);
  }
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}
