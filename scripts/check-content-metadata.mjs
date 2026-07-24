import {
  readdirSync,
  readFileSync,
  statSync
} from "node:fs";
import path, { dirname, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  LIBRARY_KINDS,
  LIBRARY_STATUSES,
  normalizeLibraryPages
} from "../docs/.vitepress/content/library.ts";

const COLLECTION_DIRECTORIES = new Map([
  ["notes", "article"],
  ["prompt-collection", "prompt"],
  ["excerpts", "excerpt"]
]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function slash(value) {
  return value.split(path.sep).join("/");
}

function parseScalar(value) {
  const text = value.trim();
  if (!text) return "";
  if (text === "true") return true;
  if (text === "false") return false;
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }
  return text;
}

export function parseFrontmatterDocument(source, filePath = "Markdown 文件") {
  const normalizedSource = source.replace(/^\uFEFF/, "");
  const match = normalizedSource.match(
    /^---[ \t]*\r?\n([\s\S]*?)\r?\n---(?:[ \t]*\r?\n|$)/
  );
  if (!match) {
    return {
      frontmatter: {},
      error: `${filePath} 缺少有效的 frontmatter。`
    };
  }

  const frontmatter = {};
  let arrayKey;
  for (const rawLine of match[1].split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith("#")) continue;

    const listMatch = rawLine.match(/^\s+-\s+(.+)$/);
    if (listMatch && arrayKey) {
      frontmatter[arrayKey].push(parseScalar(listMatch[1]));
      continue;
    }

    const fieldMatch = rawLine.match(/^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$/);
    if (!fieldMatch) {
      arrayKey = undefined;
      continue;
    }

    const [, key, value = ""] = fieldMatch;
    if (!value.trim()) {
      frontmatter[key] = [];
      arrayKey = key;
    } else {
      frontmatter[key] = parseScalar(value);
      arrayKey = undefined;
    }
  }

  return { frontmatter };
}

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
  return withoutExtension;
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
    if (!isNonEmptyText(frontmatter.description)) {
      errors.push(`${relativePath} 缺少 description。`);
    }
    if (!ISO_DATE.test(frontmatter.published ?? "")) {
      errors.push(`${relativePath} 的 published 必须使用 YYYY-MM-DD 格式。`);
    }
    if (!ISO_DATE.test(frontmatter.updated ?? "")) {
      errors.push(`${relativePath} 的 updated 必须使用 YYYY-MM-DD 格式。`);
    } else if (
      ISO_DATE.test(frontmatter.published ?? "") &&
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

function main() {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const result = validateLibraryContent(repositoryRoot);
  if (result.errors.length) {
    throw new Error(
      `Library 内容元数据校验失败：\n${result.errors.map((error) => `- ${error}`).join("\n")}`
    );
  }

  console.log(
    `[docs:content-check] 通过：${result.records.length} 项 Library 内容元数据有效，URL 无重复。`
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
