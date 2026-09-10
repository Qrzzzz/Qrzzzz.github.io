export const SHARE_IMAGE_FORMAT = Object.freeze({ id: "longform", width: 540, scale: 2 });

// Freeze the active palette at click time so a theme toggle cannot mix colors.
export function snapshotShareImagePalette(style) {
  return Object.fromEntries(["canvas", "surface", "surface-subtle", "text", "text-muted", "line", "line-strong", "accent", "link", "content-accent", "content-muted", "code-bg", "code-text"]
    .map(name => [`--share-${name}`, style.getPropertyValue(`--site-${name}`).trim()]));
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

const contentTags = new Set("h1 h2 h3 h4 h5 h6 p blockquote ul ol li hr pre code strong em del s a br img figure figcaption cite table thead tbody tfoot tr th td dl dt dd sup sub details summary div".split(" "));
const excluded = 'script, style, template, noscript, button, input, select, textarea, nav, .header-anchor, .line-numbers-wrapper, .lang, .share-image-entry, [data-share-image-exclude]';

// VitePress has already parsed Markdown. Rebuild semantic content without site
// styles or interactive controls, rather than flattening or reparsing Markdown.
export function extractLongformContent(source, fallbackTitle = "Untitled article", pageKind = "article") {
  if (!source) throw new Error("Article content is unavailable");
  const doc = source.ownerDocument;
  const output = doc.createElement("div");
  const titleNode = pageKind === "excerpt" ? null : source.querySelector("h1");
  function copy(node, parent, omitTitle = false) {
    if (omitTitle && node === titleNode) return;
    if (node.nodeType === 3) {
      parent.appendChild(doc.createTextNode(node.textContent ?? ""));
      return;
    }
    if (node.nodeType !== 1 || node.matches(excluded) || node.matches(".excerpt-entry__heading")) return;
    const tag = node.tagName.toLowerCase();
    const target = contentTags.has(tag) ? doc.createElement(tag) : parent;
    if (target !== parent) {
      for (const attr of tag === "ol" ? ["start"] : tag === "li" ? ["value"] : []) {
        if (/^-?\d+$/.test(node.getAttribute(attr) ?? "")) target.setAttribute(attr, node.getAttribute(attr));
      }
      if (tag === "ol" && node.hasAttribute("reversed")) target.setAttribute("reversed", "");
      if (tag === "td" || tag === "th") {
        for (const attr of ["colspan", "rowspan"]) {
          if (/^\d+$/.test(node.getAttribute(attr) ?? "")) target.setAttribute(attr, node.getAttribute(attr));
        }
      }
      if (tag === "details") target.setAttribute("open", "");
      if (tag === "a" || tag === "img") {
        const attr = tag === "a" ? "href" : "src";
        const raw = node.getAttribute(attr);
        if (raw) {
          try {
            const url = new URL(raw, doc.baseURI);
            if (["https:", "http:"].includes(url.protocol) || (tag === "a" && url.protocol === "mailto:")) target.setAttribute(attr, url.href);
          } catch { /* Keep text even when a URL is invalid. */ }
        }
        if (tag === "img") target.setAttribute("alt", node.getAttribute("alt") ?? "");
      }
      parent.appendChild(target);
    }
    for (const child of node.childNodes) copy(child, target, omitTitle);
  }
  const titleOutput = doc.createElement("div");
  if (titleNode) for (const child of titleNode.childNodes) copy(child, titleOutput);
  for (const child of source.childNodes) copy(child, output, true);
  return { title: pageKind === "excerpt" ? "" : titleOutput.textContent.trim() || String(fallbackTitle), html: output.innerHTML };
}

export function measureLongformHeight(element) {
  const height = Math.ceil(Math.max(element.scrollHeight, element.getBoundingClientRect().height));
  if (!Number.isFinite(height) || height <= 0) throw new Error("Invalid export height");
  return height;
}

export function createShareImageFilename(title) {
  const safeTitle = String(title ?? "").normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-").replace(/-+/g, "-")
    .replace(/^[.\s-]+|[.\s-]+$/g, "").slice(0, 48);
  return `${safeTitle || "article"}-longform.png`;
}
