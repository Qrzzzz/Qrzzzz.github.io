// Self-contained: VitePress serializes MiniSearch options for the default theme.
export function tokenizeSearch(text) {
  const value = String(text).normalize("NFKC").toLowerCase();
  const words = Array.from(new Intl.Segmenter("zh", { granularity: "word" }).segment(value))
    .filter(part => part.isWordLike).map(part => part.segment);
  return [...new Set([...words, ...(value.match(/[a-z0-9][a-z0-9._-]*/g) ?? [])])];
}

export function rankSearchResults(results, limit = 8) {
  const pages = new Map();
  for (const result of results) {
    const page = String(result.id).split("#")[0];
    const score = result.score * (page.includes("/docs/releases/") ? 0.65 : 1);
    if (!pages.has(page) || pages.get(page).score < score) pages.set(page, { ...result, score });
  }
  return [...pages.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

export function createSearchLoader() {
  const loads = new Map();
  return (key, load) => {
    if (!loads.has(key)) {
      loads.set(key, Promise.resolve().then(load).catch(error => { loads.delete(key); throw error; }));
    }
    return loads.get(key);
  };
}
