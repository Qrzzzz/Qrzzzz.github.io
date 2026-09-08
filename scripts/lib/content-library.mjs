import { parseFrontmatterDocument, isCalendarDate } from "../../docs/.vitepress/content/frontmatter.mjs";
import {
  readdirSync,
  readFileSync,
  statSync
} from "node:fs";
import path, { relative, resolve } from "node:path";
import process from "node:process";
import {
  LIBRARY_KINDS,
  LIBRARY_STATUSES,
  normalizeLibraryPages
} from "../../docs/.vitepress/content/library.ts";

const COLLECTION_DIRECTORIES = new Map([
  ["notes", "article"],
  ["prompt-collection", "prompt"],
  ["excerpts", "excerpt"]
]);

function slash(value) {
  return value.split(path.sep).join("/");
}

export { parseFrontmatterDocument } from "../../docs/.vitepress/content/frontmatter.mjs";

function walkMarkdown(directory) {
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    return statSync(target).isDirectory()
      ? walkMarkdown(target)
      : target.endsWith(".md")
        ? [target]
        : [];
  });
}

function routeFor(relativePath) {
  const withoutExtension = `/${slash(relativePath).replace(/\.md$/, "")}`;
  if (withoutExtension.endsWith("/index")) {
    return `${withoutExtension.slice(0, -"/index".length)}/`;
  }
  return withoutExtension + ".html";
}

export function collectLibraryRecords(repositoryRoot = process.cwd()) {
  const docsRoot = resolve(repositoryRoot, "docs");
  const records = [];
  const indexes = [];

  for (const [directory, expectedKind] of COLLECTION_DIRECTORIES) {
    const collectionRoot = path.join(docsRoot, directory);
    for (const filePath of walkMarkdown(collectionRoot)) {
      const relativePath = slash(relative(docsRoot, filePath));
      const parsed = parseFrontmatterDocument(
        readFileSync(filePath, "utf8"),
        relativePath
      );
      const record = {
        filePath,
        relativePath,
        url: routeFor(relativePath),
        expectedKind,
        frontmatter: parsed.frontmatter,
        parseError: parsed.error
      };
      if (path.basename(filePath) === "index.md") indexes.push(record);
      else records.push(record);
    }
  }

  return { records, indexes };
}

function isNonEmptyText(value) {
  return typeof value === "string" && Boolean(value.trim());
}

export function validateLibraryRecords(records, indexes = []) {
  const errors = [];
  const urls = new Map();

  for (const index of indexes) {
    if (index.parseError) errors.push(index.parseError);
    if (index.frontmatter.collection === "library") {
      errors.push(`${index.relativePath} 是分类首页，不能加入 Library 内容列表。`);
    }
  }

  for (const record of records) {
    const { frontmatter, relativePath, url } = record;
    if (record.parseError) errors.push(record.parseError);
    if (frontmatter.collection !== "library") {
      errors.push(`${relativePath} 必须声明 collection: library。`);
    }
    if (!LIBRARY_KINDS.includes(frontmatter.kind)) {
      errors.push(`${relativePath} 的 kind 无效。`);
    } else if (frontmatter.kind !== record.expectedKind) {
      errors.push(
        `${relativePath} 的 kind 应为 ${record.expectedKind}，实际为 ${frontmatter.kind}。`
      );
    }
    if (!isNonEmptyText(frontmatter.title)) {
      errors.push(`${relativePath} 缺少 title。`);
    }
    if (
      frontmatter.kind === "article" &&
      Object.hasOwn(frontmatter, "description")
    ) {
      errors.push(`${relativePath} 是文章，不应提供 description。`);
    } else if (
      frontmatter.kind !== "article" &&
      !isNonEmptyText(frontmatter.description)
    ) {
      errors.push(`${relativePath} 缺少 description。`);
    }
    if (!isCalendarDate(frontmatter.published)) {
      errors.push(`${relativePath} 的 published 必须使用 YYYY-MM-DD 格式。`);
    }
    if (!isCalendarDate(frontmatter.updated)) {
      errors.push(`${relativePath} 的 updated 必须使用 YYYY-MM-DD 格式。`);
    } else if (
      isCalendarDate(frontmatter.published) &&
      frontmatter.updated < frontmatter.published
    ) {
      errors.push(`${relativePath} 的 updated 不能早于 published。`);
    }
    if (!LIBRARY_STATUSES.includes(frontmatter.status)) {
      errors.push(`${relativePath} 的 status 无效。`);
    }
    if (
      frontmatter.kind === "excerpt" &&
      !isNonEmptyText(frontmatter.preview)
    ) {
      errors.push(`${relativePath} 是偶拾内容，必须提供 preview。`);
    }
    if (
      !Array.isArray(frontmatter.tags) ||
      !frontmatter.tags.length ||
      frontmatter.tags.some((tag) => !isNonEmptyText(tag))
    ) {
      errors.push(`${relativePath} 的 tags 必须是非空字符串列表。`);
    }
    if (typeof frontmatter.featured !== "boolean") {
      errors.push(`${relativePath} 的 featured 必须是布尔值。`);
    }
    if (frontmatter.status === "archived" && frontmatter.featured === true) {
      errors.push(`${relativePath} 已归档，不能设为 featured。`);
    }

    const duplicate = urls.get(url);
    if (duplicate) {
      errors.push(`${relativePath} 与 ${duplicate} 生成了重复 URL：${url}`);
    } else {
      urls.set(url, relativePath);
    }
  }

  if (!errors.length) {
    try {
      const normalized = normalizeLibraryPages(
        records.map(({ url, frontmatter }) => ({ url, frontmatter }))
      );
      if (normalized.length !== records.length) {
        errors.push(
          `Library 统计数量不一致：元数据 ${records.length} 项，数据加载结果 ${normalized.length} 项。`
        );
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return errors;
}

export function validateLibraryContent(repositoryRoot = process.cwd()) {
  const { records, indexes } = collectLibraryRecords(repositoryRoot);
  return {
    records,
    indexes,
    errors: validateLibraryRecords(records, indexes)
  };
}
