/** Keep SSR styled and readable independently of application startup. */
export function prepareLoadingHtml(html) {
  html = html.replace(/<link\b[^>]*\brel="[^"]*stylesheet[^"]*"[^>]*>/g, link => {
    if (!link.includes('data-site-fonts')) return link;
    const fallback = link.replace('media="print"', 'media="all"').replace(/ onload="[^"]*"/, '');
    return `${link}<noscript>${fallback}</noscript>`;
  });
  const theme = /<script\b[^>]*\bid="sync-initial-theme-color"[^>]*>[\s\S]*?<\/script>/;
  const script = html.match(theme)?.[0];
  return script ? html.replace(theme, '').replace('<head>', `<head>${script}`) : html;
}
