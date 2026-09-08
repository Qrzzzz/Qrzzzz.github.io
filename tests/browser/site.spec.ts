import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("search is lazy, finds Chinese words and navigates with the keyboard", async ({ page }) => {
  const indexes: string[] = [];
  page.on("request", request => { if (request.url().includes("@localSearchIndexroot")) indexes.push(request.url()); });
  await page.goto("/", { waitUntil: "networkidle" });
  expect(indexes).toHaveLength(0);
  await page.getByRole("button", { name: "Search the site", exact: true }).click();
  const search = page.getByRole("combobox", { name: "Search the site" });
  await search.fill("野心");
  await expect(page.getByRole("listbox")).toContainText("巨大野心");
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

test("full article export produces a dynamic-height PNG", async ({ page }) => {
  await page.goto("/notes/why-this-site.html");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出全文长图", exact: true }).click();
  const file = await (await download).path();
  const image = readFileSync(file!);
  expect(image.subarray(1, 4).toString()).toBe("PNG");
  expect(image.readUInt32BE(16)).toBe(1080);
  expect(image.readUInt32BE(20)).toBeGreaterThan(1440);
  await expect(page.getByRole("status")).toContainText("全文长图已下载");
});
