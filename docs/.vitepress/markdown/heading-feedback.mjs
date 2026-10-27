// Paint a separate inline layer so a wrapping title can be measured without splitting its text.
// Preserve the original heading, anchor and inline Markdown semantics.
export function headingFeedbackPlugin(markdown) {
  const renderToken = (tokens, index, options, _env, renderer) => renderer.renderToken(tokens, index, options);
  const open = markdown.renderer.rules.heading_open ?? renderToken;
  const close = markdown.renderer.rules.heading_close ?? renderToken;
  const important = (tokens, index, _options, env) =>
    !env?.siteSearchRender && (tokens[index].tag === "h1" || tokens[index].tag === "h2");
  markdown.renderer.rules.heading_open = (...args) =>
    `${open(...args)}${important(...args) ? '<span class="heading-feedback">' : ''}`;
  markdown.renderer.rules.heading_close = (...args) =>
    `${important(...args) ? '</span>' : ''}${close(...args)}`;
}
