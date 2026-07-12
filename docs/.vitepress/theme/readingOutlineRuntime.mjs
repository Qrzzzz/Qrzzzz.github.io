export const MIN_INLINE_SECTIONS = 3;
export const MAX_INLINE_SECTIONS = 8;

export function buildOutlineModel(entries, maximumInline = MAX_INLINE_SECTIONS) {
  const headers = entries
    .filter(
      (entry) =>
        entry &&
        typeof entry.id === "string" &&
        entry.id.trim() &&
        typeof entry.text === "string" &&
        entry.text.trim() &&
        (entry.level === 2 || entry.level === 3)
    )
    .map((entry) => ({
      id: entry.id.trim(),
      text: entry.text.trim(),
      level: entry.level
    }));

  const topLevel = headers.filter((entry) => entry.level === 2);

  return {
    headers,
    inlineHeaders: topLevel.slice(0, maximumInline),
    hasInlineOutline: topLevel.length >= MIN_INLINE_SECTIONS,
    hasMore: topLevel.length > maximumInline
  };
}
