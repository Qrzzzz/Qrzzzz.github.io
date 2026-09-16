// Intercept only actual Mermaid fences; nested examples remain ordinary code.
export function mermaidPlugin(markdown) {
  const fence = markdown.renderer.rules.fence;
  markdown.renderer.rules.fence = (tokens, index, ...args) => {
    const token = tokens[index];
    if (token.info.trim() !== "mermaid") return fence(tokens, index, ...args);
    const source = markdown.utils.escapeHtml(JSON.stringify(token.content));
    return `<MermaidDiagram :source="${source}" />\n`;
  };
}
