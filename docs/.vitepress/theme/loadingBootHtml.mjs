/** Keep the boot screen independent of the render-blocking application stylesheet. */
export function prepareLoadingHtml(html, loaderSource, tokensSource) {
  const loaderCss = loaderSource.match(/<style scoped>([\s\S]*?)<\/style>/)?.[1];
  if (!loaderCss) throw new Error('Missing loading screen styles');
  const tokenBlocks = [...tokensSource.matchAll(/(:root|\.dark)\s*\{([^}]+)\}/g)]
    .map(([, selector, declarations]) => {
      const needed = declarations.match(/--site-(?:canvas|accent|text(?:-muted)?|font-(?:mono|sans|reading))\s*:[^;]+;/g) ?? [];
      return `${selector}{${needed.join('')}}`;
    }).join('\n');
  const css = loaderCss.replace(/:global\(([^)]+)\)/g, '$1');
  const early = ['sync-initial-theme-color', 'site-loading-bootstrap'].map(id => {
    const pattern = new RegExp(`<script\\b[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?<\\/script>`);
    const script = html.match(pattern)?.[0];
    if (!script) throw new Error(`Missing boot script: ${id}`);
    html = html.replace(script, '');
    return script;
  });
  // Without JavaScript the original stylesheet remains blocking and SSR stays readable.
  html = html.replace(/<link\b[^>]*\brel="[^"]*stylesheet[^"]*"[^>]*>/g, link => {
    const asyncLink = link.replace(/>$/, ' data-site-boot-style media="print" onload="this.media=\'all\';this.dataset.siteStyleReady=\'true\';document.dispatchEvent(new Event(\'site-loading-style-ready\'))" onerror="this.dataset.siteStyleReady=\'true\';document.dispatchEvent(new Event(\'site-loading-style-ready\'))">');
    return `${asyncLink}<noscript>${link}</noscript>`;
  });
  const critical = `<style id="site-loading-critical">${tokenBlocks}\n${css}\nhtml.site-boot-loading body{visibility:hidden}html.site-boot-loading .site-loading--boot{visibility:visible}</style>`;
  return html.replace('<head>', `<head>${early[0]}${critical}${early[1]}`);
}
