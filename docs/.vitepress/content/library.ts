export const LIBRARY_KINDS = ["article", "prompt", "excerpt"] as const;
export const LIBRARY_STATUSES = ["stable", "maintained", "archived"] as const;

export type LibraryKind = (typeof LIBRARY_KINDS)[number];
export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

export type LibraryItem = {
  url: string;
  kind: LibraryKind;
  title: string;
  displayTitle: string;
  description: string;
  published: string;
  updated: string;
  status: LibraryStatus;
  tags: string[];
  featured: boolean;
};

export type LibrarySourcePage = {
  url: string;
  frontmatter: Record<string, unknown>;
};

export const LIBRARY_KIND_LABELS: Record<LibraryKind, string> = {
  article: "文章",
  prompt: "提示词",
  excerpt: "偶拾"
};

export const LIBRARY_STATUS_LABELS: Record<LibraryStatus, string> = {
  stable: "已定稿",
  maintained: "持续修订",
  archived: "已归档"
};

export function isLibraryKind(value: unknown): value is LibraryKind {
  return typeof value === "string" && LIBRARY_KINDS.includes(value as LibraryKind);
}

export function isLibraryStatus(value: unknown): value is LibraryStatus {
  return (
    typeof value === "string" &&
    LIBRARY_STATUSES.includes(value as LibraryStatus)
  );
}

function requiredText(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`Library 内容缺少有效的 ${field}。`);
  }
  return value.trim();
}

function normalizeDate(value: unknown, field: string) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }

  const text = requiredText(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new TypeError(`Library 内容的 ${field} 必须使用 YYYY-MM-DD 格式。`);
  }
  return text;
}

export function normalizeLibraryItem(page: LibrarySourcePage): LibraryItem {
  const { frontmatter } = page;
  if (!isLibraryKind(frontmatter.kind)) {
    throw new TypeError(`Library 内容 ${page.url} 的 kind 无效。`);
  }
  if (!isLibraryStatus(frontmatter.status)) {
    throw new TypeError(`Library 内容 ${page.url} 的 status 无效。`);
  }

  const title = requiredText(frontmatter.title, "title");
  const published = normalizeDate(frontmatter.published, "published");
  const updated = normalizeDate(frontmatter.updated ?? published, "updated");
  if (updated < published) {
    throw new TypeError(`Library 内容 ${page.url} 的 updated 早于 published。`);
  }

  const featured = frontmatter.featured === true;
  if (frontmatter.status === "archived" && featured) {
    throw new TypeError(`已归档的 Library 内容 ${page.url} 不能设为 featured。`);
  }

  const preview =
    typeof frontmatter.preview === "string" ? frontmatter.preview.trim() : "";

  return {
    url: requiredText(page.url, "url"),
    kind: frontmatter.kind,
    title,
    displayTitle:
      frontmatter.kind === "excerpt" && preview ? preview : title,
    description: requiredText(frontmatter.description, "description"),
    published,
    updated,
    status: frontmatter.status,
    tags: Array.isArray(frontmatter.tags)
      ? frontmatter.tags
          .filter((tag): tag is string => typeof tag === "string")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [],
    featured
  };
}

export function sortLibraryItems(left: LibraryItem, right: LibraryItem) {
  const dateOrder = right.updated.localeCompare(left.updated);
  return dateOrder || left.title.localeCompare(right.title, "zh-CN");
}

export function normalizeLibraryPages(pages: LibrarySourcePage[]) {
  return pages
    .filter(({ frontmatter }) => frontmatter.collection === "library")
    .map(normalizeLibraryItem)
    .sort(sortLibraryItems);
}

export function matchesLibraryItem(item: LibraryItem, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
  if (!normalizedQuery) return true;

  return [
    item.title,
    item.displayTitle,
    item.description,
    item.kind,
    LIBRARY_KIND_LABELS[item.kind],
    ...item.tags
  ]
    .join("\n")
    .toLocaleLowerCase("zh-CN")
    .includes(normalizedQuery);
}
