import { test, expect } from '@playwright/test';

for (const width of [320, 390, 844, 1440]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`MathJax baseline ${width}px ${theme}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: width === 844 ? 390 : 900 });
      await page.addInitScript(theme => localStorage.setItem('vitepress-theme-appearance', theme), theme);
      await page.goto('/excerpts/2026-09-28-02.html');
      expect(await page.locator('html').evaluate(el => el.classList.contains('dark'))).toBe(theme === 'dark');
      const article = page.locator('#excerpt-2026-09-28-02');
      await expect(article.locator('mjx-container')).toHaveCount(8);
      await expect(article.locator('blockquote mjx-container')).toHaveCount(3);
      await expect(article.locator('[data-mjx-error], merror, pre')).toHaveCount(0);
      const inline = article.locator('mjx-container:not([display="true"])').first();
      expect(await inline.evaluate(el => getComputedStyle(el).verticalAlign)).toBe('baseline');
      expect(await inline.evaluate(el => getComputedStyle(el).overflowX)).toBe('visible');
      expect(await inline.locator('svg').evaluate(el => getComputedStyle(el).verticalAlign)).not.toBe('0px');
      const color = await inline.evaluate(el => getComputedStyle(el).color);
      expect(color).toBe(await inline.evaluate(el => getComputedStyle(el.parentElement!).color));
      const displays = article.locator('mjx-container[display="true"]');
      for (const formula of await displays.all()) {
        await expect(formula).toBeVisible();
        const geometry = await formula.evaluate(el => {
          const style = getComputedStyle(el);
          el.scrollLeft = el.scrollWidth;
          return { client: el.clientWidth, scroll: el.scrollWidth, left: el.scrollLeft,
            overflow: style.overflowX, margin: parseFloat(style.marginTop), font: parseFloat(style.fontSize) };
        });
        expect(geometry.overflow).toBe('auto');
        expect(geometry.margin).toBeGreaterThanOrEqual(geometry.font);
        if (geometry.scroll > geometry.client) expect(geometry.left).toBeGreaterThan(0);
        await formula.evaluate(el => { el.scrollLeft = 0; });
      }
      if (width === 320) {
        expect(await displays.evaluateAll(els => els.some(el => el.scrollWidth > el.clientWidth))).toBe(true);
      }
      await displays.first().focus();
      await expect(displays.first()).toBeFocused();
      await displays.first().evaluate(el => (el as HTMLElement).blur());
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: `output/playwright/math-${width}-${theme}.png`, fullPage: true });
      expect(errors).toEqual([]);
    });
  }
}

test('server output includes accessible formulas without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/excerpts/2026-09-28-02.html');
  await expect(page.locator('mjx-container > svg')).toHaveCount(8);
  await expect(page.locator('mjx-assistive-mml math')).toHaveCount(8);
  await expect(page.locator('mjx-container').first()).toBeVisible();
  await context.close();
});
