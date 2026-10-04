import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { createReadingRailPlan } from "../../docs/.vitepress/theme/readingRailGeometry.mjs";
import { readingGesture } from "../../docs/.vitepress/theme/gestureGeometry.mjs";

const article = "/notes/deepseek-restraint-and-ambition.html";

test("desktop knots form behind the 88% endpoint and reverse without isolated strokes", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(article);
  const rail = page.locator(".reading-rail"), ink = rail.locator("path");
  await expect(ink).toHaveAttribute("data-mode", "knots");
  await expect(rail).not.toHaveAttribute("data-knot-count", "0");
  const dimensions = await rail.evaluate(element => ({
    height: element.getBoundingClientRect().height,
    width: element.getBoundingClientRect().width,
    viewportHeight: innerHeight,
    safeTop: (document.querySelector(".VPNav")?.getBoundingClientRect().bottom ?? 64) + 32
  }));
  const plan = createReadingRailPlan({ ...dimensions, seed: "notes/deepseek-restraint-and-ambition.md" });
  const knot = plan.knots[0];
  expect(knot).toBeTruthy();
  const setPosition = async (position: number) => {
    await rail.evaluate((element, value) => {
      const body = element.parentElement!.querySelector(".main")!.getBoundingClientRect();
      window.scrollTo(0, scrollY + value + body.top - innerHeight * .88);
    }, position);
    await expect.poll(() => rail.evaluate(element => {
      const bottom = getComputedStyle(element).clipPath.match(/inset\(0px 0px ([\d.]+)px(?: 0px)?\)/);
      return element.getBoundingClientRect().height - Number(bottom?.[1]);
    })).toBeCloseTo(position, 0);
  };
  const checkFront = async () => {
    const result = await rail.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const inset = getComputedStyle(element).clipPath.match(/inset\(0px 0px ([\d.]+)px(?: 0px)?\)/)!;
      const position = rect.height - Number(inset[1]);
      const path = element.querySelector("path")!;
      const length = path.getTotalLength();
      let crossings = 0, previous = path.getPointAtLength(0);
      for (let distance = 4; distance <= length + 4; distance += 4) {
        const point = path.getPointAtLength(Math.min(distance, length));
        if (previous.y <= position && point.y > position) crossings++;
        if (previous.y > position && point.y <= position) crossings++;
        previous = point;
      }
      return { endpoint: rect.top + position, desired: innerHeight * .88, crossings, overflow: document.documentElement.scrollWidth - innerWidth };
    });
    expect(result.endpoint).toBeCloseTo(result.desired, 0);
    expect(result.crossings).toBe(1);
    expect(result.overflow).toBeLessThanOrEqual(1);
  };
  await setPosition(knot.end + knot.lead);
  const flat = await ink.getAttribute("d");
  for (const fraction of [.25, .5, 1]) {
    await setPosition(knot.end + knot.lead + knot.formation * fraction);
    await checkFront();
  }
  expect(await ink.getAttribute("d")).not.toBe(flat);
  await setPosition(knot.end + knot.lead + knot.formation * .5);
  await mkdir("output/reading-rail", { recursive: true });
  await page.screenshot({ path: "output/reading-rail/desktop-forming.png" });
  await setPosition(knot.end + knot.lead);
  await expect(ink).toHaveAttribute("d", flat!);
  await setPosition(knot.start + knot.height / 2);
  await checkFront();
  await page.getByRole("link", { name: "Library", exact: true }).first().click();
  await expect(page).toHaveURL(/\/library\//);
  await page.goBack();
  await expect(page).toHaveURL(/deepseek-restraint/);
  await expect(ink).toHaveAttribute("data-mode", "knots");
  await checkFront();
  expect(errors).toEqual([]);
});

test("phones, reduced motion and resizing preserve the original wave", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(article);
  const rail = page.locator(".reading-rail"), ink = rail.locator("path");
  const checkWave = async () => {
    await expect(ink).toHaveAttribute("data-mode", "wave");
    await expect(rail).toHaveAttribute("data-knot-count", "0");
    await expect.poll(async () => {
      const size = await rail.boundingBox();
      return await ink.getAttribute("d") === readingGesture(size!.height, size!.width);
    }).toBe(true);
  };
  for (const width of [390, 844, 959]) {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
    await checkWave();
    const initial = await ink.getAttribute("d");
    await page.evaluate(() => window.scrollTo(0, 1800));
    await expect(ink).toHaveAttribute("d", initial!);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(ink).toHaveAttribute("data-mode", "knots");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await checkWave();
  await page.setViewportSize({ width: 1080, height: 720 });
  await checkWave();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(ink).toHaveAttribute("data-mode", "knots");
  await page.setViewportSize({ width: 390, height: 844 });
  await checkWave();
  await mkdir("output/reading-rail", { recursive: true });
  await page.screenshot({ path: "output/reading-rail/mobile-wave.png" });
  expect(errors).toEqual([]);
});
