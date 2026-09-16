let queue: Promise<unknown> = Promise.resolve();
let sequence = 0;
export const diagramTasks = new Map<HTMLElement, Promise<void>>();

export function renderDiagram(source: string, dark: boolean, palette: CSSStyleDeclaration) {
  const colors = {
    primaryColor: palette.getPropertyValue("--site-surface").trim(),
    primaryTextColor: palette.getPropertyValue("--site-text").trim(),
    primaryBorderColor: palette.getPropertyValue("--site-line-strong").trim(),
    lineColor: palette.getPropertyValue("--site-text-muted").trim(),
    background: palette.getPropertyValue("--site-canvas").trim()
  };
  const task = queue.then(async () => {
    const { default: mermaid } = await import("mermaid");
    await document.fonts.ready;
    mermaid.initialize({
      startOnLoad: false, securityLevel: "strict", suppressErrorRendering: true,
      theme: "base", htmlLabels: false,
      secure: ["secure", "securityLevel", "startOnLoad", "maxTextSize", "maxEdges", "htmlLabels", "flowchart"],
      maxTextSize: 50000, maxEdges: 500,
      flowchart: { htmlLabels: false },
      themeVariables: { ...colors, darkMode: dark, fontFamily: "sans-serif" }
    });
    const result = await mermaid.render(`site-mermaid-${++sequence}`, source);
    const parsed = new DOMParser().parseFromString(result.svg, "image/svg+xml");
    const svg = parsed.documentElement;
    const width = Number(svg.getAttribute("viewBox")?.split(/[ ,]+/)[2]);
    if (Number.isFinite(width) && width > 0) svg.setAttribute("style", `${svg.getAttribute("style") || ""};min-width:${Math.min(width, 720)}px`);
    return { ...result, svg: new XMLSerializer().serializeToString(svg) };
  });
  queue = task.catch(() => {});
  return task;
}

// Only locally rendered diagram snapshots bypass the general article URL filter.
export async function prepareMermaidImages(source: HTMLElement | null) {
  const images = new Map<Element, { src: string; alt: string }>();
  if (!source) return images;
  for (;;) {
    const tasks = [...diagramTasks].filter(([element]) => source.contains(element)).map(([, task]) => task);
    if (!tasks.length) break;
    await Promise.all(tasks);
  }
  for (const element of source.querySelectorAll<HTMLElement>(".mermaid-diagram")) {
    const svg = element.querySelector(".mermaid-diagram__canvas svg");
    if (!svg) throw new Error("A diagram is not ready for export");
    const clone = svg.cloneNode(true) as SVGElement;
    const viewBox = svg.getAttribute("viewBox")?.split(/[ ,]+/).map(Number);
    if (!viewBox || viewBox.length !== 4 || !viewBox.every(Number.isFinite) || viewBox[2] <= 0 || viewBox[3] <= 0) throw new Error("Invalid diagram dimensions");
    const width = Math.min(2160, Math.max(1080, viewBox[2]));
    const height = Math.ceil(width * viewBox[3] / viewBox[2]);
    if (height > 16000) throw new Error("Diagram is too tall to export");
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    clone.style.maxWidth = "none";
    clone.style.minWidth = "0";
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }));
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable");
      context.drawImage(image, 0, 0, width, height);
      images.set(element, { src: canvas.toDataURL("image/png"), alt: svg.querySelector("title")?.textContent || "Mermaid 图表" });
    } finally { URL.revokeObjectURL(url); }
  }
  return images;
}
