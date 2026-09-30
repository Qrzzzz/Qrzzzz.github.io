export const SHARE_IMAGE_CHARACTER_LIMIT = 3000;

const contentTags = new Set("h1 h2 h3 h4 h5 h6 p blockquote ul ol li hr pre code strong em del s a br img figure figcaption cite table thead tbody tfoot tr th td dl dt dd sup sub details summary div".split(" "));
const contentClasses = new Set(["custom-block", "custom-block-title", "info", "tip", "warning", "danger", "text-emphasis"]);
const excluded = 'script, style, template, noscript, button, input, select, textarea, nav, .header-anchor, .line-numbers-wrapper, .lang, .share-image-entry, [data-share-image-exclude]';
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const languagePattern = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i;
const graphemes = text => Array.from(segmenter.segment(text), item => item.segment);
export const countShareCharacters = text => graphemes(text).filter(value => /\S/u.test(value)).length;

// Work on a detached, allowlisted document. Resource placeholders let us decide
// which content survives before loading any diagrams or images.
export function extractLongformContent(source, fallbackTitle = "Untitled article", pageKind = "article", diagramImages = new Map(), options = {}) {
  if (!source) throw new Error("Article content is unavailable");
  const doc = source.ownerDocument;
  const output = doc.createElement("div");
  const metadata = doc.createElement("div");
  const attribution = doc.createElement("div");
  const resources = [];
  const titleNode = pageKind === "excerpt" ? null : source.querySelector("h1");
  function copy(node, parent, omitTitle = false, collectResources = options.collectResources) {
    if (omitTitle && node === titleNode) return;
    if (diagramImages.has(node)) {
      const snapshot = diagramImages.get(node);
      const image = doc.createElement("img");
      image.setAttribute("src", snapshot.src);
      image.setAttribute("alt", snapshot.alt);
      parent.appendChild(image);
      return;
    }
    if (node.nodeType === 3) {
      parent.appendChild(doc.createTextNode(node.textContent ?? ""));
      return;
    }
    if (node.nodeType !== 1 || node.matches(excluded) || node.matches(".excerpt-entry__heading")) return;
    if (options.separateMetadata && node.matches(".article-header")) {
      for (const child of node.childNodes) copy(child, metadata, true, collectResources);
      return;
    }
    if (options.separateMetadata && pageKind === "excerpt" && node.matches("footer, .excerpt-source > figcaption")) {
      const citation = doc.createElement("p");
      if (languagePattern.test(node.getAttribute("lang") || "")) citation.setAttribute("lang", node.getAttribute("lang"));
      for (const child of node.childNodes) copy(child, citation, omitTitle, collectResources);
      attribution.appendChild(citation);
      return;
    }
    if (collectResources && node.matches(".mermaid-diagram, mjx-container")) {
      const kind = node.matches("mjx-container") ? "math" : "mermaid";
      const inline = kind === "math" && !node.hasAttribute("display");
      const placeholder = doc.createElement(inline ? "span" : "div");
      const id = String(resources.length);
      placeholder.setAttribute("data-share-resource", id);
      // Count formulas once, using their accessible representation. Diagrams
      // are atomic media, like photos: their graphics are outside the prose
      // budget, which must not vary with the live diagram's loading state.
      placeholder.textContent = kind === "math"
        ? node.querySelector("mjx-assistive-mml")?.textContent || node.textContent || ""
        : "";
      resources.push({ id, kind, inline, node });
      parent.appendChild(placeholder);
      return;
    }
    const tag = node.tagName.toLowerCase();
    const isEmphasisSpan = tag === "span" && node.classList.contains("text-emphasis");
    const target = contentTags.has(tag) || isEmphasisSpan ? doc.createElement(tag) : parent;
    if (target !== parent) {
      const classes = Array.from(node.classList).filter(name => contentClasses.has(name));
      if (tag === "strong" && node.closest?.(".excerpt-entry") && !node.querySelector?.(".text-emphasis")) classes.push("text-emphasis");
      if (classes.length) target.setAttribute("class", [...new Set(classes)].join(" "));
      if (languagePattern.test(node.getAttribute("lang") || "")) target.setAttribute("lang", node.getAttribute("lang"));
      for (const attr of tag === "ol" ? ["start"] : tag === "li" ? ["value"] : []) {
        if (/^-?\d+$/.test(node.getAttribute(attr) ?? "")) target.setAttribute(attr, node.getAttribute(attr));
      }
      if (tag === "ol" && node.hasAttribute("reversed")) target.setAttribute("reversed", "");
      if (tag === "td" || tag === "th") {
        const alignment = node.style?.textAlign || node.getAttribute("align");
        if (["left", "center", "right"].includes(alignment)) target.setAttribute("data-share-align", alignment);
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
    for (const child of node.childNodes) copy(child, target, omitTitle, collectResources);
  }
  const titleOutput = doc.createElement("div");
  if (titleNode) for (const child of titleNode.childNodes) copy(child, titleOutput, false, false);
  for (const child of source.childNodes) copy(child, output, true);
  const totalCharacters = countShareCharacters(output.textContent);
  const truncated = options.limit > 0 && totalCharacters > options.limit;
  if (truncated) truncateShareContent(output, options.limit);
  const retained = new Set([...output.querySelectorAll("[data-share-resource]"), ...metadata.querySelectorAll("[data-share-resource]"), ...attribution.querySelectorAll("[data-share-resource]")].map(node => node.getAttribute("data-share-resource")));
  return {
    title: pageKind === "excerpt" ? "" : titleOutput.textContent.trim() || String(fallbackTitle),
    html: output.innerHTML, metadataHtml: metadata.innerHTML, attributionHtml: attribution.innerHTML,
    totalCharacters, characterCount: countShareCharacters(output.textContent), truncated,
    resources: resources.filter(resource => retained.has(resource.id))
  };
}

function truncateShareContent(root, limit) {
  let remaining = limit;
  let stopped = false;
  // Keep complete structural units. Ordinary prose may end at a nearby sentence
  // boundary; HTML is never sliced and Unicode graphemes are never split.
  function visit(node) {
    if (stopped) { node.remove(); return; }
    if (node.nodeType === 3) {
      const characters = graphemes(node.textContent || "");
      let used = 0;
      let end = characters.length;
      for (let index = 0; index < characters.length; index++) {
        if (/\S/u.test(characters[index]) && ++used > remaining) { end = index; break; }
      }
      if (end < characters.length) {
        const prefix = characters.slice(0, end);
        const boundary = prefix.findLastIndex(char => /[。！？.!?]/u.test(char));
        if (boundary >= 0 && countShareCharacters(prefix.slice(boundary + 1).join("")) <= 120) end = boundary + 1;
        node.textContent = characters.slice(0, end).join("").trimEnd();
        stopped = true;
      }
      remaining -= countShareCharacters(node.textContent || "");
      return;
    }
    if (node.nodeType !== 1) return;
    if (node.matches("img, hr, br")) return;
    const count = countShareCharacters(node.textContent || "");
    const atomicFigure = node.matches("figure") && node.querySelector("img, [data-share-resource]");
    if (atomicFigure || node.matches("pre, table, [data-share-resource], h1, h2, h3, h4, h5, h6")) {
      if (count > remaining) { node.remove(); stopped = true; }
      else remaining -= count;
      return;
    }
    for (const child of Array.from(node.childNodes)) visit(child);
    if (!node.textContent.trim() && !node.querySelector("img, hr, [data-share-resource]")) node.remove();
  }
  for (const child of Array.from(root.childNodes)) visit(child);
  // A cutoff before a large block must not leave an orphaned section heading.
  function trimEnd(parent) {
    while (parent.lastChild) {
      const last = parent.lastChild;
      if (last.nodeType === 3 && !last.textContent.trim()) { last.remove(); continue; }
      if (last.nodeType !== 1) break;
      if (last.matches("h1, h2, h3, h4, h5, h6, hr, .custom-block-title")) { last.remove(); continue; }
      if (last.matches("div, blockquote, ul, ol, li, details")) {
        trimEnd(last);
        if (!last.textContent.trim() && !last.querySelector("img, [data-share-resource]")) { last.remove(); continue; }
      }
      break;
    }
  }
  trimEnd(root);
}
