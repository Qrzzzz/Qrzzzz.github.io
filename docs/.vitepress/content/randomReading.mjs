function readingPath(url) {
  return url.split(/[?#]/, 1)[0].replace(/\.html$/, "").replace(/\/$/, "");
}

export function randomReadingUrls(items) {
  return [...new Set(items
    .filter(item => (item.kind === "article" || item.kind === "excerpt") &&
      /^\/(?:notes|excerpts)\/.+/.test(item.url) &&
      !/^\/(?:notes|excerpts)\/index(?:\.html)?$/.test(item.url))
    .map(item => item.url))];
}

export function pickRandomReadingUrl(items, previousUrl = "", random = Math.random) {
  const urls = randomReadingUrls(items);
  const candidates = urls.filter(url => readingPath(url) !== readingPath(previousUrl));
  const pool = candidates.length ? candidates : urls;
  if (!pool.length) return undefined;
  return pool[Math.min(pool.length - 1, Math.floor(Math.max(0, random()) * pool.length))];
}
