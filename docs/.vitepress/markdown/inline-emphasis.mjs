// Keep the painted inline text separate from the semantic <strong> box.
// Raw HTML and component labels deliberately do not opt into this decoration.
export function inlineEmphasisPlugin(markdown) {
  const renderToken = (tokens, index, options, _env, renderer) =>
    renderer.renderToken(tokens, index, options);
  const renderOpen = markdown.renderer.rules.strong_open ?? renderToken;
  const renderClose = markdown.renderer.rules.strong_close ?? renderToken;

  markdown.renderer.rules.strong_open = (...args) =>
    `${renderOpen(...args)}<span class="text-emphasis">`;
  markdown.renderer.rules.strong_close = (...args) =>
    `</span>${renderClose(...args)}`;
}
