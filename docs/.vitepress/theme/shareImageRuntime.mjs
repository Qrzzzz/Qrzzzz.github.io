export { extractLongformContent, SHARE_IMAGE_CHARACTER_LIMIT, countShareCharacters } from "./shareImageContent.mjs";

export const SHARE_IMAGE_FORMAT = Object.freeze({ id: "longform", width: 540, scale: 2 });

// Freeze the active palette at click time so a theme toggle cannot mix colors.
export function snapshotShareImagePalette(style) {
  return Object.fromEntries([
    ...["canvas", "surface", "surface-subtle", "text", "text-muted", "line", "line-strong", "accent", "link", "content-accent", "content-muted", "content-surface", "code-bg", "code-text", "marker-fill", "font-reading", "font-sans", "font-mono"]
      .map(name => [`--share-${name}`, style.getPropertyValue(`--site-${name}`).trim()]),
    ...["success", "warning", "danger"]
      .map(name => [`--share-${name}`, style.getPropertyValue(`--vp-c-${name}-1`).trim()])
  ]);
}

export async function withExportTimeout(task, milliseconds = 15000) {
  let timer;
  try {
    return await Promise.race([task, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Export timed out")), milliseconds);
    })]);
  } finally {
    clearTimeout(timer);
  }
}

export function measureLongformHeight(element) {
  const height = Math.ceil(Math.max(element.scrollHeight, element.getBoundingClientRect().height));
  if (!Number.isFinite(height) || height <= 0) throw new Error("Invalid export height");
  if (height * SHARE_IMAGE_FORMAT.scale > 30000) throw new Error("Image is too tall. Enable the 3,000-character limit or share the original link.");
  return height;
}

export function createShareImageFilename(title, truncated = false) {
  const safeTitle = String(title ?? "").normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-").replace(/-+/g, "-")
    .replace(/^[.\s-]+|[.\s-]+$/g, "").slice(0, 48);
  return `${safeTitle || "article"}-longform${truncated ? "-truncated" : ""}.png`;
}
