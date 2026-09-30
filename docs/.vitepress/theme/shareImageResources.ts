import { renderDiagram } from "./mermaidRuntime";
import { SHARE_IMAGE_FORMAT, withExportTimeout } from "./shareImageRuntime.mjs";

type ShareResource = { id: string; kind: string; inline: boolean; node: HTMLElement };

// Rasterize only known, locally generated SVGs. Arbitrary article SVG/HTML never
// bypasses the semantic allowlist, and each snapshot owns its temporary URL.
async function rasterizeSvg(svg: SVGElement, width: number, height: number, color: string) {
  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(Math.ceil(width * 2)));
  clone.setAttribute("height", String(Math.ceil(height * 2)));
  clone.style.cssText = `color:${color};max-width:none;min-width:0;`;
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.src = url;
    await withExportTimeout(image.decode());
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * 2);
    canvas.height = Math.ceil(height * 2);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally { URL.revokeObjectURL(url); }
}

export async function prepareShareResources(resources: ShareResource[], palette: Record<string, string>, dark: boolean, isCurrent: () => boolean) {
  const images = new Map<string, HTMLImageElement>();
  const frozenPalette = { getPropertyValue: (token: string) => palette[token.replace("--site-", "--share-")] || "" };
  for (const resource of resources) {
    if (!isCurrent()) return images;
    let svg: SVGElement;
    let width: number;
    let height: number;
    let baseline = 0;
    if (resource.kind === "mermaid") {
      const source = resource.node.querySelector("code")?.textContent;
      if (!source) throw new Error("Diagram source is unavailable");
      // Render retained diagrams from their source with the click-time palette;
      // a theme change on the live page cannot alter the export's diagram colors.
      const result = await withExportTimeout(renderDiagram(source, dark, frozenPalette));
      if (!isCurrent()) return images;
      svg = new DOMParser().parseFromString(result.svg, "image/svg+xml").documentElement as unknown as SVGElement;
      const box = svg.getAttribute("viewBox")?.split(/[ ,]+/).map(Number);
      if (!box || box.length !== 4 || !box.every(Number.isFinite) || box[2] <= 0 || box[3] <= 0) throw new Error("Invalid diagram dimensions");
      width = Math.min(SHARE_IMAGE_FORMAT.width - 80, box[2]);
      height = width * box[3] / box[2];
    } else {
      const math = resource.node.querySelector<SVGElement>("svg");
      if (!math) throw new Error("Formula is unavailable");
      svg = math;
      const style = getComputedStyle(math);
      const ratio = 17 / (parseFloat(style.fontSize) || 17);
      const rect = math.getBoundingClientRect();
      width = rect.width * ratio;
      height = rect.height * ratio;
      baseline = (parseFloat(style.verticalAlign) || 0) * ratio;
    }
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || width * 2 > 16000 || height * 2 > 16000) throw new Error("Diagram or formula is too large to export");
    const color = resource.node.closest("blockquote") ? palette["--share-content-muted"] : palette["--share-text"];
    const image = document.createElement("img");
    image.src = await rasterizeSvg(svg, width, height, color);
    if (!isCurrent()) return images;
    image.alt = resource.kind === "math"
      ? resource.node.querySelector("mjx-assistive-mml")?.textContent || "Formula"
      : svg.querySelector("title")?.textContent || "Diagram";
    image.className = resource.kind === "math" ? `share-math${resource.inline ? " share-math--inline" : ""}` : "share-diagram";
    image.style.width = `${width}px`;
    if (resource.inline) image.style.verticalAlign = `${baseline}px`;
    images.set(resource.id, image);
  }
  return images;
}

export function embedShareResources(html: string, images: Map<string, HTMLImageElement>) {
  const root = document.createElement("div");
  root.innerHTML = html; // Only the semantic document produced by our allowlist.
  for (const placeholder of root.querySelectorAll("[data-share-resource]")) {
    const image = images.get(placeholder.getAttribute("data-share-resource")!);
    if (!image) throw new Error("An export resource is unavailable");
    placeholder.replaceWith(image.cloneNode(true));
  }
  return root.innerHTML;
}

export async function loadShareImageAssets(element: HTMLElement) {
  if (element.querySelector("img:not([src])")) throw new Error("An article image uses an unsupported URL");
  const text = element.textContent || "";
  const style = getComputedStyle(element);
  const families = ["--share-font-reading", "--share-font-sans", "--share-font-mono"].map(token => style.getPropertyValue(token).trim());
  await withExportTimeout(Promise.all(families.flatMap(family => [400, 700, 750].map(weight => document.fonts.load(`${weight} 17px ${family}`, text)))));
  await withExportTimeout(Promise.all(Array.from(element.querySelectorAll<HTMLImageElement>("img[src]")).map(image => image.decode())));
}

export async function createShareQrCode(href: string) {
  const { create, toDataURL } = await withExportTimeout(import("qrcode"));
  const options = { errorCorrectionLevel: "M" as const, margin: 4, color: { dark: "#172439", light: "#ffffff" } };
  const modules = create(href, options).modules.size + options.margin * 2;
  // Integer pixels per module in the final 2x PNG, including the quiet zone.
  const scale = Math.max(2, Math.floor(176 / modules));
  return { src: await toDataURL(href, { ...options, scale }), size: modules * scale / SHARE_IMAGE_FORMAT.scale };
}
