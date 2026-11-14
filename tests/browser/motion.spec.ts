import { test, expect, type Locator } from "@playwright/test";

async function progress(heading: Locator) {
  return heading.evaluate(element => {
    const strokes = [...element.querySelectorAll<HTMLElement>(".heading-marker-stroke")];
    const width = strokes.reduce((sum, stroke) => sum + parseFloat(stroke.style.width), 0);
    const painted = strokes.reduce((sum, stroke) =>
      sum + parseFloat(stroke.style.width) * new DOMMatrix(getComputedStyle(stroke).transform).a, 0);
    return width ? painted / width : 0;
  });
}

test("multiline markers retract, survive re-entry and clean up after leaving", async ({ page }) => {
  await page.goto("/library/");
  const heading = page.locator(".catalog-header h1");
  await heading.evaluate(element => {
    element.style.maxWidth = "4ch";
    element.style.overflowWrap = "anywhere";
  });
  await heading.hover({ force: true });
  await expect.poll(() => heading.locator(".heading-marker-stroke").count()).toBeGreaterThan(1);
  await expect.poll(() => progress(heading)).toBeCloseTo(1);
  await heading.locator(".heading-marker-stroke").first().evaluate(stroke => stroke.setAttribute("data-probe", "original"));
  await page.mouse.move(0, 0);
  await expect(heading.locator('[data-probe="original"]')).toHaveCount(1);
  await heading.hover({ force: true });
  await expect(heading.locator('[data-probe="original"]')).toHaveCount(1);
  expect(await progress(heading)).toBeGreaterThan(0);
  await expect.poll(() => progress(heading)).toBeCloseTo(1);
  await page.mouse.move(0, 0);
  await expect(heading.locator(".heading-marker-stroke")).toHaveCount(0);
});

test("individual letter weights return without an exit overshoot", async ({ page }) => {
  await page.goto("/");
  const word = page.locator(".home-entry--projects .variable-proximity");
  await word.hover();
  await expect.poll(() => word.evaluate(element =>
    element.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length
  )).toBe(0);
  const weight = () => word.evaluate(element => {
    const letters = element.querySelectorAll(".proximity-letter");
    const css = getComputedStyle(letters[Math.floor(letters.length / 2)]);
    return Number(css.fontVariationSettings.split(" ").at(-1));
  });
  const before = await weight();
  expect(before).toBeGreaterThan(400);
  await page.mouse.move(0, 0);
  expect(await weight()).toBeLessThanOrEqual(before);
  await expect.poll(weight).toBeCloseTo(400);
});

test("search selection fades when query changes and can resume midway", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search the site", exact: true }).click();
  const input = page.getByRole("combobox", { name: "Search the site" });
  await input.fill("野心");
  await expect(page.getByRole("listbox")).toContainText("巨大野心", { timeout: 20000 });
  await input.press("ArrowDown");
  const marker = page.locator(".inline-search-selection");
  await expect.poll(() => marker.evaluate(element => Number(getComputedStyle(element).opacity))).toBe(1);
  await input.fill("野心 ");
  expect(await marker.evaluate(element => element.getAnimations().some(animation =>
    animation instanceof CSSTransition && animation.transitionProperty === "opacity" && animation.playState === "running"
  ))).toBe(true);
  await input.press("ArrowDown");
  await expect.poll(() => marker.evaluate(element => Number(getComputedStyle(element).opacity))).toBe(1);
});

test("loading fades out inertly without holding up navigation", async ({ page }) => {
  await page.goto("/library/");
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/assets/notes_*.js", async route => { await gate; await route.continue(); });
  try {
    await page.locator('.library-result[href^="/notes/"]').first().evaluate(element => (element as HTMLAnchorElement).click());
    const loading = page.locator(".site-loading");
    await expect.poll(() => loading.evaluate(element => Number(getComputedStyle(element).opacity))).toBe(1);
    const exit = await loading.evaluateHandle(element => {
      const state = { seen: false, inert: false };
      const observer = new MutationObserver(() => {
        if (element.classList.contains("site-loading-leave-active")) {
          state.seen = true;
          state.inert = (element as HTMLElement).inert;
        }
      });
      observer.observe(element, { attributes: true });
      return { state, disconnect: () => observer.disconnect() };
    });
    release();
    await expect(loading).toHaveCount(0);
    expect(await exit.evaluate(value => { value.disconnect(); return value.state; })).toEqual({ seen: true, inert: true });
    await exit.dispose();
    await expect(page.locator(".vp-doc")).toBeVisible();
  } finally { release(); }
});

test("keyboard focus keeps its marker and reduced motion dismisses it immediately", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/library/");
  const heading = page.locator(".catalog-header h1");
  await heading.evaluate(element => element.setAttribute("tabindex", "0"));
  await heading.focus();
  await expect(heading.locator(".heading-marker-stroke")).toHaveCount(1);
  await page.mouse.move(0, 0);
  await expect(heading.locator(".heading-marker-stroke")).toHaveCount(1);
  await heading.evaluate(element => (element as HTMLElement).blur());
  await expect(heading.locator(".heading-marker-stroke")).toHaveCount(0);
});
