export const SHARE_IMAGE_FORMATS = Object.freeze({
  portrait: Object.freeze({
    id: "portrait",
    label: "竖版 4:5",
    width: 540,
    height: 675,
    scale: 2,
    maxTitleLength: 56,
    maxExcerptLength: 150
  }),
  square: Object.freeze({
    id: "square",
    label: "方形 1:1",
    width: 540,
    height: 540,
    scale: 2,
    maxTitleLength: 48,
    maxExcerptLength: 96
  }),
  wide: Object.freeze({
    id: "wide",
    label: "横版 1.91:1",
    width: 600,
    height: 315,
    scale: 2,
    maxTitleLength: 42,
    maxExcerptLength: 72
  })
});

export function getShareImageFormat(value) {
  return SHARE_IMAGE_FORMATS[value] ?? SHARE_IMAGE_FORMATS.portrait;
}

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

export function createShareImageFilename(title, formatId = "portrait") {
  const safeTitle = String(title ?? "")
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .slice(0, 48);
  const safeFormat = SHARE_IMAGE_FORMATS[formatId] ? formatId : "portrait";

  return `${safeTitle || "article"}-${safeFormat}.png`;
}
