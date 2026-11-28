import { test, expect } from "@playwright/test";

test("rapid Library filters settle without ghosts or inaccessible results", async ({ page }) => {
  await page.goto("/library/");
  const input = page.getByRole("searchbox", { name: "Search the Library" });
  await input.fill("野心");
  await input.fill("山");
  await input.fill("野心");
  await expect(page.locator(".library-result:not([inert])")).toContainText(["野心"]);
  await expect(page.locator(".library-results [inert]")).toHaveCount(0);
  await input.fill("impossible-query-no-results");
  await expect(page.getByRole("status")).toContainText("No results");
  await expect(page.locator(".library-results [inert]")).toHaveCount(0);
  await input.fill("");
  await expect.poll(() => page.locator(".library-result:not([inert])").count()).toBeGreaterThan(1);
});

test("Random feedback restores its label and never prevents navigation", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.addEventListener("click", event => {
    if ((event.target as Element).closest('a[href$="/random.html"], a[href$="/random"]')) {
      document.body.dataset.randomAnimated = String(Boolean(document.querySelector("[data-random-feedback]")));
    }
  }, true));
  const link = page.getByRole("link", { name: "Random", exact: true });
  await link.click();
  await expect(page).toHaveURL(/\/(?:excerpts|notes)\//);
  await expect(page.locator("body")).toHaveAttribute("data-random-animated", "true");
  await expect(page.locator("[data-random-feedback]")).toHaveCount(0);
  await expect(link).toHaveText("Random");
});

test("poems wave into place, pause, and fade without deleting their text", async ({ page }) => {
  await page.goto("/");
  const poem = page.locator("[data-home-poem]");
  const output = page.locator("[data-poem-text]");
  await expect(poem).toHaveAttribute("data-phase", "revealing");
  const full = await output.textContent();
  expect(await output.locator("span span").count()).toBeGreaterThan(1);
  expect(await output.evaluate(element => element.getAnimations({ subtree: true }).some(animation => animation.playState === "running"))).toBe(true);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  expect(await output.evaluate(element => element.getAnimations({ subtree: true }).every(animation => animation.playState === "paused"))).toBe(true);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(poem).toHaveAttribute("data-phase", "holding", { timeout: 15000 });
  await expect(output).toHaveText(full!);
  await expect(page.locator(".home-poem__cursor")).toHaveCount(0);
  const entries = page.getByRole("navigation", { name: "Primary destinations" });
  const entriesTop = (await entries.boundingBox())!.y;
  const before = await poem.getAttribute("data-poem-id");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(poem).toHaveAttribute("data-phase", "fading");
  await expect(output).toHaveText(full!);
  await expect(poem).not.toHaveAttribute("data-poem-id", before!);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(poem).toHaveAttribute("data-phase", "holding");
  expect(await output.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  expect((await entries.boundingBox())!.y).toBeCloseTo(entriesTop, 0);
});

test("imported poems show their own model and announcement on home and 404", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => { Math.random = () => .999999; });
  for (const path of ["/", "/404.html"]) {
    await page.goto(path);
    await expect(page.locator("[data-home-poem]")).toHaveAttribute("data-poem-id", "contributed-150");
    const author = page.locator(".home-poetry [data-poem-author]");
    await expect(author).toHaveText("Gemini 4 Neon");
    await expect(author).toHaveAttribute("href", "https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-neon/");
    await expect(page.locator(".home-poem__live")).not.toBeEmpty();
  }
});

test("slow loading recovery fades in without moving the poem on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/library/");
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/assets/notes_*.js", async route => { await gate; await route.continue(); });
  try {
    await page.locator('.library-result[href^="/notes/"]').first().evaluate(element => (element as HTMLAnchorElement).click());
    const composition = page.locator(".site-loading__composition");
    await expect(composition).toBeVisible();
    const before = await composition.boundingBox();
    const controls = page.locator("[data-loading-recovery]");
    await expect(controls).toBeVisible({ timeout: 9000 });
    await expect(controls).not.toHaveAttribute("inert");
    expect(await composition.boundingBox()).toEqual(before);
    const bounds = await controls.boundingBox();
    expect(bounds!.y).toBeGreaterThan(before!.y);
    await page.getByRole("button", { name: "Continue reading", exact: true }).click();
    await expect(page.locator(".site-loading")).toHaveCount(0);
  } finally { release(); }
});

test("excerpt pager animates in the selected direction and respects reduced motion", async ({ page }) => {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.matches(".excerpt-entry") && Array.isArray(frames)) {
        document.body.dataset.excerptFrom = String(frames[0].transform);
      }
      return animate.call(this, frames, options);
    };
  });
  await page.goto("/excerpts/2026-10-21-04.html");
  async function turn(direction: "prev" | "next") {
    // Preload the destination so the navigation exercises the fast path.
    const link = page.locator(`.pager-link.${direction}`);
    const href = (await link.getAttribute("href"))!;
    await link.evaluate(async (anchor: HTMLAnchorElement) => {
      const path = anchor.pathname.slice(1).replace(/\.html$/, "").replaceAll("/", "_") + ".md";
      const hashes = (window as Window & { __VP_HASH_MAP__: Record<string, string> }).__VP_HASH_MAP__;
      await import(`/assets/${path}.${hashes[path]}.js`);
    });
    await link.click();
    await expect(page).toHaveURL(new RegExp(href.replace(/\.html$/, "") + "(?:\\.html)?$"));
  }
  await turn("next");
  await expect(page.locator("body")).toHaveAttribute("data-excerpt-from", /^translateX\([1-9]/);
  await turn("prev");
  await expect(page.locator("body")).toHaveAttribute("data-excerpt-from", /^translateX\(-/);
  await page.evaluate(() => delete document.body.dataset.excerptFrom);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await turn("next");
  await expect(page.locator("body")).not.toHaveAttribute("data-excerpt-from");
});
