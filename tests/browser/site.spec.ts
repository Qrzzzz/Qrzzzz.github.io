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

test("full article export offers clipboard copy and a dynamic-height PNG download", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/notes/why-this-site.html");
  const downloads: string[] = [];
  page.on("download", download => downloads.push(download.suggestedFilename()));
  await page.getByRole("button", { name: "导出全文长图", exact: true }).click();
  const copy = page.getByRole("button", { name: "复制到剪贴板", exact: true });
  await expect(copy).toBeFocused();
  expect(downloads).toHaveLength(0);
  await copy.click();
  await expect(page.getByRole("status")).toContainText("全文长图已复制到剪贴板");
  const clipboard = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    const blob = await item.getType("image/png");
    const bitmap = await createImageBitmap(blob);
    const result = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return result;
  });
  expect(clipboard.width).toBe(1080);
  expect(clipboard.height).toBeGreaterThan(1440);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载图片", exact: true }).click();
  const file = await (await download).path();
  const image = readFileSync(file!);
  expect(image.subarray(1, 4).toString()).toBe("PNG");
  expect(image.readUInt32BE(16)).toBe(1080);
  expect(image.readUInt32BE(20)).toBeGreaterThan(1440);
  expect(image.readUInt32BE(20)).toBe(clipboard.height);
  await expect(page.getByRole("status")).toContainText("全文长图已下载");
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "write", { configurable: true, value: () => Promise.reject(new DOMException("Denied", "NotAllowedError")) });
  });
  await copy.click();
  await expect(page.getByRole("status")).toContainText("请重试或下载图片");
  await expect(page.getByRole("button", { name: "下载图片", exact: true })).toBeEnabled();
});
