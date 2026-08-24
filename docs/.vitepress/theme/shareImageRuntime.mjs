export const SHARE_IMAGE_FORMAT = Object.freeze({
  id: "portrait-3x4",
  label: "Portrait 3:4",
  width: 540,
  height: 720,
  scale: 2,
  maxTitleLength: 56,
  maxExcerptLength: 200
});

export function normalizeShareText(value, maxLength = Number.POSITIVE_INFINITY) {
  const normalized = String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!Number.isFinite(maxLength) || normalized.length <= maxLength) {
    return normalized;
  }

  const clipped = Array.from(normalized)
    .slice(0, Math.max(1, maxLength - 1))
    .join("")
    .replace(/[\s，、；：,;:—-]+$/u, "");
  return `${clipped}…`;
}

export function resolveShareExcerpt(
  bodyFragments,
  fallbackDescription = "",
  maxLength = SHARE_IMAGE_FORMAT.maxExcerptLength
) {
  const bodyText = normalizeShareText(
    Array.from(bodyFragments ?? [])
      .map((fragment) =>
        typeof fragment === "string" ? fragment : fragment?.textContent ?? ""
      )
      .filter(Boolean)
      .join(" "),
    maxLength
  );

  return bodyText || normalizeShareText(fallbackDescription, maxLength);
}

export function createShareImageFilename(title) {
  const safeTitle = String(title ?? "")
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .slice(0, 48);

  return `${safeTitle || "article"}-3x4.png`;
}
