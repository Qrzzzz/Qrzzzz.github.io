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
// Raise these together, with tests, after an intentional production content change.
export const PRODUCTION_BASELINE = Object.freeze({
  referenceCommit: "01166666",
  minimumReleasePages: 234,
  minimumImportedRoutes: 238,
  minimumReachablePages: 246
});

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
const RELEASE_LANGUAGES = ["zh-CN", "zh-TW", "en", "fr", "ja", "es"];
const RELEASE_LANGUAGE_SET = new Set(RELEASE_LANGUAGES);
const RELEASE_NAV_LABELS = {
  "zh-CN": (version) => `${version} 的版本语言`,
  "zh-TW": (version) => `${version} 的版本語言`,
  en: (version) => `Languages for ${version}`,
  fr: (version) => `Langues de ${version}`,
  ja: (version) => `${version} の言語`,
  es: (version) => `Idiomas de ${version}`
};
const SOURCE_INFO_COPY = {
  "zh-CN": { label: "来源信息", repository: "上游仓库", commit: "上游 commit", synced: "同步时间" },
  "zh-TW": { label: "來源資訊", repository: "上游儲存庫", commit: "上游 commit", synced: "同步時間" },
  en: { label: "Source information", repository: "Upstream repository", commit: "Upstream commit", synced: "Synced" },
  fr: { label: "Informations sur la source", repository: "Dépôt en amont", commit: "Commit en amont", synced: "Synchronisation" },
  ja: { label: "出典情報", repository: "上流リポジトリ", commit: "上流 commit", synced: "同期日時" },
  es: { label: "Información de origen", repository: "Repositorio de origen", commit: "Commit de origen", synced: "Sincronización" }
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

function parseReleaseVersion(value) {
  const match = value.match(
    /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
  );
  if (!match) return null;
  const prerelease = match[4] ? match[4].split(".") : null;
  if (prerelease?.some((identifier) => /^\d+$/.test(identifier) && identifier.length > 1 && identifier.startsWith("0"))) {
    return null;
  }
  return {
    core: [BigInt(match[1]), BigInt(match[2]), BigInt(match[3])],
    prerelease
  };
}

function comparePrerelease(left, right) {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] === undefined) return -1;
    if (right[index] === undefined) return 1;
    const leftNumeric = /^\d+$/.test(left[index]);
    const rightNumeric = /^\d+$/.test(right[index]);
    if (leftNumeric && rightNumeric) {
      const leftNumber = BigInt(left[index]);
      const rightNumber = BigInt(right[index]);
      if (leftNumber !== rightNumber) return leftNumber < rightNumber ? -1 : 1;
      continue;
    }
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  }
  return 0;
}

function compareReleaseVersions(left, right) {
  const leftVersion = parseReleaseVersion(left);
  const rightVersion = parseReleaseVersion(right);
  if (!leftVersion || !rightVersion) return right.localeCompare(left, "en", { numeric: true });
  for (let index = 0; index < leftVersion.core.length; index += 1) {
    if (leftVersion.core[index] === rightVersion.core[index]) continue;
    return leftVersion.core[index] > rightVersion.core[index] ? -1 : 1;
  }
  if (leftVersion.prerelease === null && rightVersion.prerelease !== null) return -1;
  if (leftVersion.prerelease !== null && rightVersion.prerelease === null) return 1;
  if (leftVersion.prerelease === null) return 0;
  return -comparePrerelease(leftVersion.prerelease, rightVersion.prerelease);
}

function releaseCandidateIdentity(sourcePath) {
  const match = sourcePath.match(/^releases\/(v[^/]+)\.md$/);
  if (!match) return null;
  const stem = match[1];
  for (const language of RELEASE_LANGUAGES) {
    const suffix = `.${language}`;
    if (!stem.endsWith(suffix)) continue;
    const version = stem.slice(0, -suffix.length);
    return parseReleaseVersion(version) ? { version, language } : null;
  }
  const separator = stem.lastIndexOf(".");
  if (separator !== -1) {
    const version = stem.slice(0, separator);
    const language = stem.slice(separator + 1);
    if (parseReleaseVersion(version) && /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]+)*$/.test(language)) {
      return { version, language };
    }
  }
  return parseReleaseVersion(stem) ? { version: stem, language: null } : null;
}

function releaseIdentity(sourcePath) {
  const identity = releaseCandidateIdentity(sourcePath);
  return identity?.language && RELEASE_LANGUAGE_SET.has(identity.language) ? identity : null;
}

function collectReleaseVersions(markdownBySource) {
  const candidates = new Map();
  for (const entry of markdownBySource.values()) {
    const identity = releaseCandidateIdentity(entry.sourcePath);
    if (!identity) continue;
    if (!candidates.has(identity.version)) candidates.set(identity.version, new Map());
    candidates.get(identity.version).set(identity.language, entry);
  }

  const errors = [];
  const versions = new Map();
  for (const [version, languages] of candidates) {
    const present = new Set([...languages.keys()].filter(Boolean));
    const missing = RELEASE_LANGUAGES.filter((language) => !present.has(language));
    const unexpected = [...present].filter((language) => !RELEASE_LANGUAGE_SET.has(language));
    if (languages.has(null)) errors.push(`版本 ${version} 的 Release Note 文件缺少语言后缀`);
    if (missing.length) errors.push(`版本 ${version} 缺少 Release Note 语言：${missing.join(", ")}`);
    if (unexpected.length) errors.push(`版本 ${version} 包含不支持的 Release Note 语言：${unexpected.join(", ")}`);
    if (!missing.length && !unexpected.length && !languages.has(null)) {
      versions.set(version, new Map(RELEASE_LANGUAGES.map((language) => [language, languages.get(language)])));
    }
  }
  if (errors.length) {
    throw new Error(
      `Release Note 语言集合无效；每个版本必须恰有 ${RELEASE_LANGUAGES.join(", ")} 六种语言：\n- ${errors.join("\n- ")}`
    );
  }
  return versions;
}

function releaseLanguageLink({ version, language, route, className, currentLanguage }) {
  const name = LANGUAGE_NAMES[language];
  const current = language === currentLanguage ? ' aria-current="page"' : "";
  return `<a class="${className}" href="${route}" lang="${language}" hreflang="${language}" aria-label="${escapeHtml(`${version} · ${name}`)}"${current}>${escapeHtml(name)}</a>`;
}

function createReleaseArchive(versions) {
  const sortedVersions = [...versions.keys()].sort(compareReleaseVersions);
  const releaseCount = [...versions.values()].reduce((total, entries) => total + entries.size, 0);
  const rows = sortedVersions.map((version) => {
    const languages = versions.get(version);
    const links = RELEASE_LANGUAGES.map((language) => {
      const entry = languages.get(language);
      return entry
        ? releaseLanguageLink({
            version,
            language,
            route: entry.route,
            className: "release-archive__language"
          })
        : "";
    }).filter(Boolean);
    return `  <li class="release-archive__row">
    <strong class="release-archive__version">${escapeHtml(version)}</strong>
    <nav class="release-archive__languages" aria-label="${escapeHtml(`${version} 的语言版本`)}" lang="zh-CN">
      ${links.join("\n      ")}
    </nav>
  </li>`;
  });

  return `<p class="release-archive__summary">已从上游同步 <strong>${sortedVersions.length}</strong> 个版本、<strong>${releaseCount}</strong> 篇多语言版本说明。</p>

<ol class="release-archive" aria-label="全部版本说明" lang="zh-CN">
${rows.join("\n")}
</ol>`;
}

function demoteFirstHeading(content) {
  let demoted = false;
  return transformOutsideFences(content, (line) => {
    if (demoted || !/^#\s+/.test(line)) return line;
    demoted = true;
    return `#${line}`;
  });
}

function createReleaseIndex(content, archive) {
  return `# 版本说明\n\n${archive}\n\n${demoteFirstHeading(content).trimStart()}`;
}

function createReleaseLanguageNav(versions, version, currentLanguage) {
  const languages = versions.get(version);
  if (!languages) return "";
  const links = RELEASE_LANGUAGES.map((language) => {
    const entry = languages.get(language);
    return entry
      ? releaseLanguageLink({
          version,
          language,
          route: entry.route,
          className: "release-language-nav__link",
          currentLanguage
        })
      : "";
  }).filter(Boolean);
  const label = RELEASE_NAV_LABELS[currentLanguage]?.(version) ?? RELEASE_NAV_LABELS["zh-CN"](version);
  return `<nav class="release-language-nav" aria-label="${escapeHtml(label)}" lang="${currentLanguage}">${links.join("\n  ")}</nav>`;
}

function createSourceInfo({ commitSha, importedAt, language = "zh-CN" }) {
  const copy = SOURCE_INFO_COPY[language] ?? SOURCE_INFO_COPY["zh-CN"];
  const shortSha = commitSha.slice(0, 8);
  return `<footer class="project-docs-sync import-source" aria-label="${escapeHtml(copy.label)}" lang="${language}">
  <span>${escapeHtml(copy.repository)} <a href="${UPSTREAM_REPOSITORY}">Qrzzzz/lyrics-card-generator</a></span>
  <span>${escapeHtml(copy.commit)} <a href="${UPSTREAM_REPOSITORY}/commit/${commitSha}"><code>${shortSha}</code></a></span>
  <span>${escapeHtml(copy.synced)} <time datetime="${escapeHtml(importedAt)}">${escapeHtml(importedAt)}</time></span>
</footer>`;
}

function replaceInitialLanguageLine(content, navigation) {
  let replaced = false;
  const transformed = transformOutsideFences(content, (line) => {
    if (replaced || !/^\s*(?:Language|Languages|Idioma|Idiomas|Langue|Langues|语言|語言|言語)\s*[:：]/.test(line)) {
      return line;
    }
    replaced = true;
    return `${navigation}\n`;
  });
  return replaced ? transformed : `${navigation}\n\n${transformed.trimStart()}`;
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

function breadcrumb(sourcePath, currentTitle, pageLanguage = "zh-CN") {
  const items = [
    ["首页", "/", "zh-CN"],
    ["项目", "/projects/", "zh-CN"],
    ["lyrics-card-generator", "/projects/lyrics-card-generator/", "en"],
    ["项目文档", DOCS_ROUTE, "zh-CN"]
  ];
  if (sourcePath) items.push([currentTitle, null, pageLanguage]);
  else items[items.length - 1][1] = null;

  return `<nav class="docs-breadcrumb" aria-label="面包屑" lang="zh-CN">${items
    .map(([label, link, language]) => link
      ? `<a href="${link}" lang="${language}">${escapeHtml(label)}</a>`
      : `<span aria-current="page" lang="${language}">${escapeHtml(label)}</span>`)
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

function frontmatter({ title, description, sourcePath, commitSha, upstreamFrontmatter, lang }) {
  const retained = upstreamFrontmatter
    .split(/\r?\n/)
    .filter((line) => !/^(title|description|lang|editLink|lastUpdated|sourceRepository|sourcePath|sourceCommit):/.test(line))
    .join("\n")
    .trim();
  return [
    "---",
    `title: ${escapeYaml(title)}`,
    `description: ${escapeYaml(description)}`,
    lang ? `lang: ${escapeYaml(lang)}` : "",
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
title: 项目文档
description: lyrics-card-generator 从源仓库同步的公开维护文档和版本资料。
editLink: false
lastUpdated: false
---

${breadcrumb("", "项目文档")}

# 项目文档

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

  // Validate the complete upstream release set before replacing the last good import.
  const releaseVersions = collectReleaseVersions(markdownBySource);

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
  const releaseArchive = createReleaseArchive(releaseVersions);
  for (const entry of markdownBySource.values()) {
    const raw = readFileSync(path.join(absoluteSource, ...entry.sourcePath.split("/")), "utf8");
    const { body, upstreamFrontmatter } = withoutFrontmatter(raw);
    const release = releaseIdentity(entry.sourcePath);
    const title = entry.sourcePath === "releases/README.md"
      ? "版本说明"
      : firstHeading(body) || fallbackTitle(entry.sourcePath);
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
    const pageContent = entry.sourcePath === "releases/README.md"
      ? createReleaseIndex(rewritten, releaseArchive)
      : release
        ? replaceInitialLanguageLine(
            rewritten,
            createReleaseLanguageNav(releaseVersions, release.version, release.language)
          )
        : rewritten;
    const pageLanguage = release?.language ?? "zh-CN";
    const needsHeading = entry.sourcePath !== "releases/README.md" && !firstHeading(body);
    const metadata = frontmatter({
      title,
      description,
      sourcePath: entry.sourcePath,
      commitSha: resolvedSha,
      upstreamFrontmatter,
      lang: release?.language
    });
    const generatedHeading = needsHeading ? `# ${title}\n\n` : "";
    const sourceInfo = createSourceInfo({ commitSha: resolvedSha, importedAt, language: pageLanguage });
    const output = `${metadata}\n\n${breadcrumb(entry.sourcePath, breadcrumbTitle(entry.sourcePath, title), pageLanguage)}\n\n` +
      `${generatedHeading}${pageContent.trim()}\n\n${sourceInfo}`;
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
