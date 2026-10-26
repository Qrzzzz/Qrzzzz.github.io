// Paint a separate inline layer so a wrapping title gets one stroke per line.
// Preserve the original heading, anchor and inline Markdown semantics.
export function headingFeedbackPlugin(markdown) {
  const renderToken = (tokens, index, options, _env, renderer) => renderer.renderToken(tokens, index, options);
  const open = markdown.renderer.rules.heading_open ?? renderToken;
  const close = markdown.renderer.rules.heading_close ?? renderToken;
  const important = token => token.tag === "h1" || token.tag === "h2";
  markdown.renderer.rules.heading_open = (...args) =>
    `${open(...args)}${important(args[0][args[1]]) ? '<span class="heading-feedback">' : ''}`;
  markdown.renderer.rules.heading_close = (...args) =>
    `${important(args[0][args[1]]) ? '</span>' : ''}${close(...args)}`;
}
