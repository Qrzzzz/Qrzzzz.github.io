import { SHARE_IMAGE_FORMAT } from "./shareImageRuntime.mjs";

// Every export starts as a portrait. Compact prose reflows into a narrower
// reading column; explicit verse lines are measured to preserve their breaks.
// Rich articles retain the full width and grow beyond the portrait minimum.
export function fitShareImageLayout(element: HTMLElement) {
  const body = element.querySelector<HTMLElement>(".share-image-longform__body");
  if (!body || !element.classList.contains("is-untitled")) return;
  if (Array.from(body.querySelectorAll("*")).some(node =>
    !["P", "BLOCKQUOTE", "FIGURE", "BR", "STRONG", "EM", "SPAN", "A", "CITE"].includes(node.tagName))) return;
  const characters = Array.from(body.textContent?.replace(/\s/g, "") || "").length;
  const paragraphs = Array.from(body.querySelectorAll<HTMLElement>("p"));
  const lines = paragraphs.length + body.querySelectorAll("br").length;
  if (!characters || characters > 240 || !lines || lines > 8) return;

  if (!body.querySelector("br") && paragraphs.length === 1) {
    element.style.setProperty("--share-image-width", characters <= 12 ? "360px" : "420px");
    element.style.fontSize = characters <= 36 ? "34px" : characters <= 140 ? "28px" : "26px";
    return;
  }

  const baseFontSize = parseFloat(getComputedStyle(body).fontSize);
  const probe = body.cloneNode(true) as HTMLElement;
  probe.style.cssText = "position:absolute;visibility:hidden;width:max-content;max-width:none;white-space:nowrap;";
  body.after(probe);
  let longest: number;
  try {
    longest = Math.max(...Array.from(probe.querySelectorAll<HTMLElement>("p"), p => {
      p.style.width = "max-content";
      return p.getBoundingClientRect().width;
    }));
  } finally { probe.remove(); }
  // 80px outer padding, plus the quote's 21px inset and a rounding allowance.
  const inset = body.querySelector("blockquote") ? 24 : 0;
  const available = SHARE_IMAGE_FORMAT.width - 80 - inset;
  if (!Number.isFinite(longest) || longest <= 0 || longest > available) return;
  const target = characters <= 36 && lines <= 2 ? 34 : characters <= 140 ? 28 : 26;
  const fontSize = Math.max(26, Math.min(target, Math.floor(available / longest * baseFontSize)));
  const width = Math.min(SHARE_IMAGE_FORMAT.width, Math.max(360, Math.ceil(longest * fontSize / baseFontSize + 80 + inset)));
  element.style.setProperty("--share-image-width", `${width}px`);
  element.style.fontSize = `${fontSize}px`;
}
