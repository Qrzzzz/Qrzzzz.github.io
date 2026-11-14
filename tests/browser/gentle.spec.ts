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

test("poem cursor keeps blinking through the reading interval", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-home-poem]")).toHaveAttribute("data-phase", "holding", { timeout: 20000 });
  await expect(page.locator("[data-home-poem]")).toHaveAttribute("data-cursor", "blinking");
  const cursor = page.locator(".home-poem__cursor");
  expect(await cursor.evaluate(element => element.getAnimations().some(animation => animation.effect?.getTiming().iterations === Infinity))).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("[data-home-poem]")).toHaveAttribute("data-cursor", "typing");
});

test("imported poems show their own model and announcement on home and 404", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => { Math.random = () => .999999; });
  for (const path of ["/", "/404.html"]) {
    await page.goto(path);
    await expect(page.locator("[data-home-poem]")).toHaveAttribute("data-poem-id", "contributed-100");
    const author = page.locator(".home-poetry [data-poem-author]");
    await expect(author).toHaveText("Claude Opus 4.6");
    await expect(author).toHaveAttribute("href", "https://www.anthropic.com/news/claude-opus-4-6");
    await expect(page.locator(".home-poem__live")).not.toBeEmpty();
  }
});
