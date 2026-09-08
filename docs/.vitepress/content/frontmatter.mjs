import { parseDocument } from "yaml";

export function isCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function parseFrontmatterDocument(source, filePath = "Markdown 文件") {
  const match = source.replace(/^\uFEFF/, "").match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---(?:[ \t]*\r?\n|$)/);
  if (!match) return { frontmatter: {}, error: `${filePath} 缺少有效的 frontmatter。` };
  try {
    const document = parseDocument(match[1], { uniqueKeys: true });
    if (document.errors.length) throw document.errors[0];
    const frontmatter = document.toJS({ maxAliasCount: 50 });
    if (!frontmatter || typeof frontmatter !== "object" || Array.isArray(frontmatter)) throw new Error("frontmatter 必须是映射");
    return { frontmatter };
  } catch (error) {
    return { frontmatter: {}, error: `${filePath}: ${error.message}` };
  }
}
