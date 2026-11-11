import { test, expect } from "@playwright/test";

test("Library preloads only visible destinations and reuses them on a direct click", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  const requests: string[] = [];
  page.on("request", r => { if (/\/assets\/(?:notes|excerpts|prompt-collection)_[^/]+\.md\.[^.]+\.js$/.test(r.url())) requests.push(r.url()); });
  await page.goto("/library/");
  await page.getByRole("button", { name: "Articles", exact: true }).click();
  const article = page.locator('.library-result[href*="/notes/"]').first();
  const href = (await article.getAttribute("href"))!;
  const filename = href.slice(1).replace(/\.html$/, '').replaceAll('/', '_') + '.md.';
  await expect.poll(() => requests.filter(url => url.includes(filename)).length).toBe(1);
  // Wait for the actual prefetched response, not merely the inserted link.
  await expect.poll(() => page.evaluate(name => performance.getEntriesByType('resource').some(e => e.name.includes(name)), filename)).toBe(true);
  const visible = await page.locator('.library-result').evaluateAll(es => es.filter(e => { const r=e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }).length);
  expect(requests.length).toBeLessThanOrEqual(visible + 1);
  await article.evaluate(el => (el as HTMLAnchorElement).click());
  await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
  await expect(page.locator('.library-results')).toHaveCount(0);
  expect(requests.filter(url => url.includes(filename))).toHaveLength(1);
});

test("slow article navigation shows the original full-screen poem only until ready", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }));
  await page.goto('/library/');
  await expect(page.locator('.site-loading')).toHaveCount(0);
  const article = page.locator('.library-result[href*="/notes/"]').first();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/notes_*.js', async route => { await gate; await route.continue(); });
  try {
    await article.evaluate(el => (el as HTMLAnchorElement).click());
    const loading = page.locator('.site-loading');
    await expect(loading).toBeVisible();
    await expect(loading.locator('[data-poem-player]')).toBeVisible();
    expect(await loading.evaluate(el => { const r=el.getBoundingClientRect(); return r.width===innerWidth && r.height===innerHeight; })).toBe(true);
  } finally { release(); }
  await expect(page.locator('.site-loading')).toHaveCount(0);
  await expect(page.locator('.library-results')).toHaveCount(0);
});

test("server-rendered reading remains available while application JS is stalled", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/assets/app.*.js", async route => { await gate; await route.continue(); });
  try {
    await page.goto("/library/", { waitUntil: "commit" });
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator(".library-result").first()).toBeVisible();
    expect(await page.locator("body").evaluate(el => getComputedStyle(el).visibility)).toBe("visible");
    await expect(page.locator(".site-loading")).toHaveCount(0);
  } finally { release(); }
  await page.waitForLoadState("domcontentloaded");
});

test("late layout CSS never reveals an unstyled reading surface", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/assets/style.*.css", async route => { await gate; await route.continue(); });
  try {
    await page.goto("/library/", { waitUntil: "commit" });
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => performance.getEntriesByType("paint").length)).toBe(0);
  } finally { release(); }
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("main")).toBeVisible();
});

test("home destinations start navigation without an animation timer", async ({ page }) => {
  await page.goto("/");
  const delay = await page.evaluate(async () => {
    const start = performance.now();
    const changed = new Promise<number>(resolve => {
      const original = history.pushState;
      history.pushState = function (...args) {
        history.pushState = original;
        original.apply(this, args);
        resolve(performance.now() - start);
      };
    });
    (document.querySelector(".home-entry--library") as HTMLAnchorElement).click();
    return changed;
  });
  expect(delay).toBeLessThan(400);
  await expect(page).toHaveURL(/\/library\/$/);
});

test("mobile documentation sources occupy a readable row across layout breakpoints", async ({ page }) => {
  await page.goto("/projects/lyrics-card-generator/docs/");
  for (const width of [320, 390, 639, 640, 680, 681, 767]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => document.fonts.ready);
    const entries = page.locator(".content-index:not(.project-catalog) .content-index-row");
    expect(await entries.count()).toBeGreaterThan(0);
    for (const entry of await entries.all()) {
      const source = entry.locator(".content-index-summary");
      await expect(source).toBeVisible();
      const row = (await entry.boundingBox())!;
      const title = (await entry.locator(".content-index-title").boundingBox())!;
      const summary = (await source.boundingBox())!;
      expect(summary.width, `source width at ${width}px`).toBeGreaterThanOrEqual(row.width - 1);
      expect(summary.y, `source follows title at ${width}px`).toBeGreaterThanOrEqual(title.y + title.height);
      expect(summary.height, `source must not become a vertical strip at ${width}px`).toBeLessThan(120);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});

test("search is lazy, finds Chinese words and navigates with the keyboard", async ({ page }) => {
  const indexes: string[] = [];
  page.on("request", request => { if (request.url().includes("/search-index/root.json")) indexes.push(request.url()); });
  await page.goto("/", { waitUntil: "networkidle" });
  expect(indexes).toHaveLength(0);
  await page.getByRole("button", { name: "Search the site", exact: true }).click();
  const search = page.getByRole("combobox", { name: "Search the site" });
  await search.fill("野心");
  await expect(page.getByRole("listbox")).toContainText("巨大野心", { timeout: 20000 });
  expect(indexes).toHaveLength(1);
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(page).toHaveURL(/deepseek-restraint-and-ambition/);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
});

test("Library filtering, browser history and URL restoration agree", async ({ page }) => {
  await page.goto("/library/");
  await page.getByRole("searchbox", { name: "Search the Library" }).fill("野心");
  await expect(page).toHaveURL(/q=/);
  await page.getByRole("button", { name: "Articles", exact: true }).click();
  await expect(page).toHaveURL(/type=article/);
  await expect(page.locator(".library-results .library-result")).toHaveCount(1);
  await page.goBack();
  await expect(page.getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("searchbox", { name: "Search the Library" })).toHaveValue("野心");
  await page.goForward();
  await page.reload();
  await expect(page.getByRole("button", { name: "Articles", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("top navigation underline glides between the four desktop destinations", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/library/");
  const marker = page.locator(".top-nav-marker");
  const library = page.getByRole("link", { name: "Library", exact: true });
  const projects = page.getByRole("link", { name: "Projects", exact: true });

  await expect(marker).toHaveClass(/is-ready/);
  await expect(marker).toHaveClass(/is-visible/);
  const libraryTransform = await marker.evaluate(element => (element as HTMLElement).style.transform);

  await projects.hover();
  await expect.poll(() => marker.evaluate(element => (element as HTMLElement).style.transform)).not.toBe(libraryTransform);
  const projectsTransform = await marker.evaluate(element => (element as HTMLElement).style.transform);

  await page.getByRole("button", { name: "Search the site", exact: true }).hover();
  await expect.poll(() => marker.evaluate(element => (element as HTMLElement).style.transform)).toBe(libraryTransform);

  await projects.click();
  await expect(page).toHaveURL(/\/projects\/$/);
  await expect.poll(() => marker.evaluate(element => (element as HTMLElement).style.transform)).toBe(projectsTransform);
  expect(await marker.evaluate(element => getComputedStyle(element).transitionProperty)).toContain("transform");
});

test("Library filter underline glides between choices and returns to the active filter", async ({ page }) => {
  await page.goto("/library/");
  const marker = page.locator(".library-filter-marker");
  const articles = page.getByRole("button", { name: "Articles", exact: true });

  await expect(marker).toHaveClass(/is-ready/);
  const allTransform = await marker.evaluate(element => (element as HTMLElement).style.transform);

  await articles.hover();
  await expect.poll(() => marker.evaluate(element => (element as HTMLElement).style.transform)).not.toBe(allTransform);
  const articlesTransform = await marker.evaluate(element => (element as HTMLElement).style.transform);

  await page.locator(".library-stats").hover();
  await expect.poll(() => marker.evaluate(element => (element as HTMLElement).style.transform)).toBe(allTransform);

  await articles.click();
  await expect.poll(() => marker.evaluate(element => (element as HTMLElement).style.transform)).toBe(articlesTransform);
  expect(await marker.evaluate(element => getComputedStyle(element).transitionProperty)).toContain("transform");
});

test("Library emphasis marker appears once and glides between entries", async ({ page }) => {
  await page.goto("/library/");
  const entries = page.locator(".library-result");
  const marker = page.locator(".library-result-marker");

  await entries.nth(0).hover();
  await expect(marker).toHaveClass(/is-active/);
  const firstY = await marker.evaluate(element =>
    element.style.getPropertyValue("--library-marker-y")
  );

  await entries.nth(1).hover();
  await expect(marker).toHaveClass(/is-active/);
  const secondY = await marker.evaluate(element =>
    element.style.getPropertyValue("--library-marker-y")
  );

  expect(firstY).not.toBe(secondY);
  await page.getByRole("searchbox", { name: "Search the Library" }).hover();
  await expect(marker).not.toHaveClass(/is-active/);
});

test("mobile navigation restores focus and releases background across breakpoints", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Mobile navigation" });
  await menu.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Docs", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(menu).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".VPContent")).not.toHaveAttribute("inert");
  await expect(menu).toBeFocused();
  await menu.click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".VPContent")).not.toHaveAttribute("inert");
  await expect(page.locator(".VPNavScreen")).toHaveCount(0);
});

test("theme and language survive client navigation; tools keep their separate origin path", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await page.goto("/tools/");
  await expect(page.locator('.content-index a')).toHaveAttribute("href", "https://qrzzzz.github.io/password-generator/");
  await expect(page.locator('.content-index a')).toHaveAttribute("target", "_self");
  await page.locator('.NavActions button[role="switch"]').click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("link", { name: "Library", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveClass(/dark/);
});
