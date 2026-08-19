import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const CONTENT_FORMAT = "site-writing-style@1";
export const MANIFEST_PATH = ".cache/project-readmes-manifest.json";

export const PROJECT_READMES = Object.freeze([
  {
    slug: "lyrics-card-generator-android",
    repository: "Qrzzzz/lyrics-card-generator-android",
    title: "Lyrics Card Generator Android",
    description: "在 Android 上制作高质感歌词分享卡片。",
    summary: "网易云音乐导入、六步卡片编辑、离线实时预览和高清 PNG 导出。",
    status: "released",
    statusLabel: "正式发布 · Android",
    statusEvidence: "releases/latest",
    sourcePath: "README.md",
    homepage: "https://github.com/Qrzzzz/lyrics-card-generator-android/releases/latest"
  },
  {
    slug: "second-glow",
    repository: "Qrzzzz/second-glow",
    title: "Second Glow",
    description: "将闲置手机变成低功耗常亮桌面屏。",
    summary: "为横屏旧手机设计的常亮信息面板，展示时钟、天气、市场趋势和设备状态。",
    status: "online",
    statusLabel: "在线作品 · Web",
    statusEvidence: "Cyber StandBy Dashboard",
    sourcePath: "index.html",
    homepage: "https://qrzzzz.github.io/second-glow/",
    readmeFallback: true
  },
  {
    slug: "password-generator",
    repository: "Qrzzzz/password-generator",
    title: "密码规则生成器",
    description: "按照目标网站的复杂规则生成并验证密码。",
    summary: "支持字符类别、数量、位置、重复和禁止片段规则，生成与验证均在浏览器本地完成。",
    status: "maintained",
    statusLabel: "持续维护 · Web 工具",
    statusEvidence: "在线地址：<https://qrzzzz.github.io/password-generator/>",
    sourcePath: "README.md",
    homepage: "https://qrzzzz.github.io/password-generator/"
  },
  {
    slug: "bili-downloader",
    repository: "Qrzzzz/bili-downloader",
    title: "Bili Downloader Lite",
    description: "本地运行的 Bilibili 视频下载工具。",
    summary: "支持登录、分 P、清晰度选择、进度管理和失败重试，仅用于用户有权访问的内容。",
    status: "stable",
    statusLabel: "稳定版 1.1 · Windows",
    statusEvidence: "当前稳定版本：**1.1**",
    sourcePath: "README.md",
    homepage: "https://github.com/Qrzzzz/bili-downloader/releases/latest"
  },
  {
    slug: "aegis-vault-mobile",
    repository: "Qrzzzz/AegisVaultMobile",
    title: "AegisVault Mobile",
    description: "离线优先的 Android 文本加密与 Base64 工具。",
    summary: "提供 AES-256-GCM 文本加密、Base64 编解码、中英双语界面和本地工作流。",
    status: "released",
    statusLabel: "正式发布 · Android",
    statusEvidence: "releases/latest",
    sourcePath: "README.md",
    homepage: "https://github.com/Qrzzzz/AegisVaultMobile/releases/latest"
  },
  {
    slug: "slop-infinity",
    repository: "Qrzzzz/AI-slop-site",
    title: "SLOP∞",
    description: "以完整前端工程反讽中文 AI 企业站表达的静态迷宫。",
    summary: "一个故意极其丑陋、极其抽象，但工程结构正常且不收集数据的前端实验。",
    status: "online",
    statusLabel: "在线实验 · Web",
    statusEvidence: "GitHub Pages",
    sourcePath: "README.md",
    homepage: "https://qrzzzz.github.io/AI-slop-site/"
  }
]);

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

function encodePath(value) {
  return value.split("/").map((part) => encodeURIComponent(part)).join("/");
}

function withoutFrontmatter(content) {
  const normalized = content.replace(/\r\n?/g, "\n");
  if (!normalized.startsWith("---\n")) return normalized;
  const match = normalized.match(/^---\n[\s\S]*?\n---\n/);
  if (!match) throw new Error("README front matter 未闭合。");
  return normalized.slice(match[0].length);
}

function withoutAlignmentWrapper(content) {
  const opening = /^\s*<div\s+align=["']center["']>\s*/i;
  if (!opening.test(content)) return content;
  return content
    .replace(opening, "")
    .replace(/\n<\/div>\s*\n(?=\s*---(?:\n|$))/, "\n");
}

function fenceMarker(line) {
  return line.match(/^\s*(`{3,}|~{3,})/)?.[1] ?? null;
}

function transformOutsideFences(content, transform) {
  const lines = content.split(/(?<=\n)/);
  let fence = null;
  return lines.map((line) => {
    const marker = fenceMarker(line);
    if (marker) {
      if (!fence) fence = { character: marker[0], length: marker.length };
      else if (marker[0] === fence.character && marker.length >= fence.length) fence = null;
      return line;
    }
    return fence ? line : transform(line);
  }).join("");
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

function rewriteReadmeLinks(content, { repository, commitSha }) {
  const resolve = (rawTarget) => {
    const destination = splitDestination(rawTarget);
    const href = destination.href;
    if (!href || href.startsWith("#") || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) return rawTarget;

    const splitAt = href.search(/[?#]/);
    const pathname = (splitAt === -1 ? href : href.slice(0, splitAt)).replace(/^\.\//, "").replace(/^\//, "");
    const tail = splitAt === -1 ? "" : href.slice(splitAt);
    const normalized = path.posix.normalize(pathname);
    if (!normalized || normalized === "." || normalized.startsWith("../")) {
      throw new Error(`README 链接超出仓库范围：${href}`);
    }

    const encoded = encodePath(normalized);
    destination.href = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(normalized)
      ? `https://raw.githubusercontent.com/${repository}/${commitSha}/${encoded}${tail}`
      : `https://github.com/${repository}/blob/${commitSha}/${encoded}${tail}`;
    return joinDestination(destination);
  };

  return transformOutsideFences(content, (line) => {
    let transformed = line.replace(/(!?\[[^\]]*\])\(([^)]+)\)/g, (_full, label, target) => `${label}(${resolve(target)})`);
    transformed = transformed.replace(/^(\s*\[[^\]]+\]:\s*)(\S+)(.*)$/g, (_full, prefix, target, suffix) => `${prefix}${resolve(target)}${suffix}`);
    return transformed.replace(/\b(href|src)=(["'])([^"']+)\2/gi, (_full, attribute, quote, target) => {
      return `${attribute}=${quote}${resolve(target)}${quote}`;
    });
  });
}

function normalizeReadme(content) {
  const lines = [];
  let fence = null;
  for (const rawLine of content.replace(/\r\n?/g, "\n").split("\n")) {
    const marker = fenceMarker(rawLine);
    if (marker) {
      if (!fence) fence = { character: marker[0], length: marker.length };
      else if (marker[0] === fence.character && marker.length >= fence.length) fence = null;
      lines.push(rawLine);
      continue;
    }
    if (fence) {
      lines.push(rawLine);
      continue;
    }
    let line = rawLine.replace(/[ \t]+$/, "").replace(/^(\s*)\*\s+/, "$1- ");
    const compactDetails = line.match(/^\s*<details(\b[^>]*)>\s*<summary(\b[^>]*)>(.*?)<\/summary>\s*(.*?)\s*<\/details>\s*$/i);
    if (compactDetails) {
      lines.push(`<details${compactDetails[1]}>`, `<summary${compactDetails[2]}>${compactDetails[3].trim()}</summary>`, "", compactDetails[4], "", "</details>");
      continue;
    }
    lines.push(line);
  }
  return lines.join("\n").trim();
}

function firstHeading(content) {
  let fence = null;
  for (const line of content.split(/\r?\n/)) {
    const marker = fenceMarker(line);
    if (marker) {
      if (!fence) fence = { character: marker[0], length: marker.length };
      else if (marker[0] === fence.character && marker.length >= fence.length) fence = null;
      continue;
    }
    if (!fence && /^#\s+/.test(line)) return true;
  }
  return false;
}

function adaptReadmeHeader(content, project) {
  const lines = content.split("\n");
  const headingIndex = lines.findIndex((line) => /^#\s+/.test(line));
  if (headingIndex === -1) return `# ${project.title}\n\n<p class="lead">${escapeHtml(project.description)}</p>\n\n${content}`;

  lines[headingIndex] = `# ${project.title}`;
  let nextContentIndex = headingIndex + 1;
  while (lines[nextContentIndex]?.trim() === "") nextContentIndex += 1;
  if (/^###\s+/.test(lines[nextContentIndex] ?? "")) lines.splice(nextContentIndex, 1);
  while (lines[headingIndex + 1]?.trim() === "") lines.splice(headingIndex + 1, 1);
  lines.splice(headingIndex + 1, 0, "", `<p class="lead">${escapeHtml(project.description)}</p>`, "");
  return lines.join("\n").trim();
}

function insertAfterLead(content, insertedContent) {
  const lead = /<p class="lead">[^\n]*<\/p>/;
  if (!lead.test(content)) throw new Error("项目页缺少导语。");
  return content.replace(lead, (match) => `${match}\n\n${insertedContent.trim()}`);
}

function frontmatter(project, commitSha) {
  return `---
title: ${escapeYaml(project.title)}
description: ${escapeYaml(project.description)}
lang: "zh-CN"
pageClass: "project-readme-page"
editLink: false
lastUpdated: false
contentFormat: ${escapeYaml(CONTENT_FORMAT)}
projectStatus: ${escapeYaml(project.status)}
sourceRepository: ${escapeYaml(`https://github.com/${project.repository}`)}
sourcePath: ${escapeYaml(project.sourcePath)}
sourceCommit: ${escapeYaml(commitSha)}
---`;
}

function breadcrumb(project) {
  return `<nav class="docs-breadcrumb" aria-label="面包屑" lang="zh-CN"><a href="/" lang="zh-CN">首页</a><span aria-hidden="true">/</span><a href="/projects/" lang="zh-CN">项目</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(project.title)}</span></nav>`;
}

function syncNotice(project, commitSha, hasReadme) {
  const repositoryUrl = `https://github.com/${project.repository}`;
  const sourceUrl = `${repositoryUrl}/blob/${commitSha}/${encodePath(project.sourcePath)}`;
  const explanation = hasReadme
    ? `正文随源仓库中的 <a href="${sourceUrl}"><code>README.md</code></a> 更新。本站只在同步时改写相对链接并统一排版，不单独维护正文副本。`
    : `源仓库目前没有 README；本页只根据锁定 commit 的 <a href="${sourceUrl}"><code>${escapeHtml(project.sourcePath)}</code></a>、在线入口和明确的项目摘要生成，不把补充介绍伪装成上游 README。`;
  return `<aside class="project-docs-sync sync-notice" aria-label="同步说明" lang="zh-CN">
  <strong class="sync-notice__title">${hasReadme ? "本页由上游同步" : "本页使用透明回退说明"}</strong>
  <p>${explanation}</p>
</aside>`;
}

function sourceInfo(project, commitSha, importedAt) {
  const repositoryUrl = `https://github.com/${project.repository}`;
  return `<footer class="project-docs-sync import-source" aria-label="来源信息" lang="zh-CN">
  <span>项目状态 <strong>${escapeHtml(project.statusLabel)}</strong></span>
  <span>上游仓库 <a href="${repositoryUrl}">${escapeHtml(project.repository)}</a></span>
  <span>上游 commit <a href="${repositoryUrl}/commit/${commitSha}"><code>${commitSha.slice(0, 8)}</code></a></span>
  <span>同步时间 <time datetime="${escapeHtml(importedAt)}">${escapeHtml(importedAt)}</time></span>
</footer>`;
}

function fallbackBody(project) {
  return `# ${project.title}

<p class="lead">${escapeHtml(project.description)}</p>

${escapeHtml(project.summary)}

## 访问入口

- [打开在线作品](${project.homepage})
- [查看源仓库](https://github.com/${project.repository})`;
}

function readCommitSha(sourceRoot, explicitSha) {
  if (explicitSha) return explicitSha.trim();
  return execFileSync("git", ["-C", sourceRoot, "rev-parse", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

export function importProjectReadme({ project, sourceRoot, outputRoot, commitSha, importedAt = new Date().toISOString() }) {
  const absoluteSource = path.resolve(sourceRoot);
  const resolvedSha = readCommitSha(absoluteSource, commitSha);
  if (!/^[0-9a-f]{40}$/i.test(resolvedSha)) throw new Error(`${project.repository} 的 commit SHA 无效。`);

  const sourceFile = path.join(absoluteSource, ...project.sourcePath.split("/"));
  if (!existsSync(sourceFile)) throw new Error(`${project.repository} 缺少 ${project.sourcePath}。`);
  const rawSource = readFileSync(sourceFile, "utf8");
  if (project.statusEvidence && !rawSource.includes(project.statusEvidence)) {
    throw new Error(
      `${project.repository} 的 ${project.sourcePath} 已不再包含状态依据：${project.statusEvidence}。` +
      "请重新核对项目状态后再更新站内标签。"
    );
  }
  const hasReadme = !project.readmeFallback;
  let body;
  if (hasReadme) {
    body = withoutAlignmentWrapper(withoutFrontmatter(rawSource));
    body = normalizeReadme(rewriteReadmeLinks(body, { repository: project.repository, commitSha: resolvedSha }));
    body = adaptReadmeHeader(body, project);
  } else {
    const readmePath = path.join(absoluteSource, "README.md");
    if (existsSync(readmePath)) {
      throw new Error(`${project.repository} 已新增 README.md；请移除 readmeFallback，让项目页改为直接同步 README。`);
    }
    body = fallbackBody(project);
  }

  const page = `${frontmatter(project, resolvedSha)}\n\n${breadcrumb(project)}\n\n` +
    `${insertAfterLead(body, syncNotice(project, resolvedSha, hasReadme)).trim()}\n\n` +
    `${sourceInfo(project, resolvedSha, importedAt)}\n`;
  const absoluteOutput = path.resolve(outputRoot);
  mkdirSync(path.dirname(absoluteOutput), { recursive: true });
  writeFileSync(absoluteOutput, page, "utf8");

  return {
    slug: project.slug,
    repository: project.repository,
    route: `/projects/${project.slug}/`,
    output: path.relative(process.cwd(), absoluteOutput).replaceAll("\\", "/"),
    sourcePath: project.sourcePath,
    sourceMode: hasReadme ? "readme" : "fallback",
    status: project.status,
    statusLabel: project.statusLabel,
    statusEvidence: project.statusEvidence,
    homepage: project.homepage,
    commit: resolvedSha
  };
}

export function writeProjectReadmeManifest(entries, manifestPath = path.resolve(MANIFEST_PATH), importedAt = new Date().toISOString()) {
  mkdirSync(path.dirname(manifestPath), { recursive: true });
  const manifest = { schemaVersion: 1, contentFormat: CONTENT_FORMAT, importedAt, entries };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}
