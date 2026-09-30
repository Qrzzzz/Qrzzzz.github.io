import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createMarkdownRenderer } from 'vitepress';

const markdown = await createMarkdownRenderer(process.cwd());
const fixture = markdown.render(readFileSync('tests/fixtures/share-image-longform.md', 'utf8'));

for (const theme of ['light', 'dark'] as const) {
  test(`semantic information blocks survive the ${theme} PNG export and theme changes`, async ({ page }) => {
    test.setTimeout(90000);
    await page.addInitScript(theme => {
      localStorage.setItem('vitepress-theme-appearance', theme);
      // Hold the actual export while inspecting its rebuilt DOM, then let the
      // real font loading and modern-screenshot rendering finish normally.
      const state = window as any;
      const gate = new Promise<void>(resolve => { state.releaseExportFonts = resolve; });
      const load = document.fonts.load.bind(document.fonts);
      document.fonts.load = async (...args) => {
        const fonts = await load(...args);
        await gate;
        return fonts;
      };
    }, theme);
    await page.goto('/excerpts/2026-09-28-02.html');
    await expect(page.getByRole('button', { name: 'Export article image', exact: true })).toBeVisible();
    await page.locator('.vp-doc').evaluate((el, html) => { el.innerHTML = html; }, fixture);
    await page.getByRole('button', { name: 'Export article image', exact: true }).click();
    const host = page.locator('.share-image-longform');
    await expect(host.locator('.custom-block')).toHaveCount(4);
    await expect(host.locator('.custom-block-title')).toHaveCount(4);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    expect(await host.evaluate(el => el.closest('.vp-doc'))).toBeNull();
    await expect(host).toContainText('LONGFORM_END_全文保留');
    await expect(host.locator('button, .lang, .shiki, .line, .header-anchor')).toHaveCount(0);

    const inspect = () => host.evaluate(el => {
      const root = el.getBoundingClientRect();
      const rgba = (color: string) => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        return Array.from(ctx.getImageData(0, 0, 1, 1).data);
      };
      return {
        width: root.width,
        height: Math.ceil(Math.max(el.scrollHeight, root.height)),
        blocks: Array.from(el.querySelectorAll('.custom-block')).map(block => {
          const style = getComputedStyle(block);
          const rect = block.getBoundingClientRect();
          const title = block.querySelector('.custom-block-title')!;
          const token = block.classList.contains('info') ? '--share-content-muted'
            : block.classList.contains('tip') ? '--share-success'
            : block.classList.contains('warning') ? '--share-warning' : '--share-danger';
          const accent = style.getPropertyValue(token).trim();
          const surface = style.getPropertyValue('--share-content-surface').trim();
          const probe = document.createElement('div');
          probe.style.backgroundColor = `color-mix(in srgb, ${accent} ${token === '--share-content-muted' ? 6 : 7}%, ${surface})`;
          document.body.appendChild(probe);
          const expectedBackground = rgba(getComputedStyle(probe).backgroundColor);
          probe.remove();
          return {
            type: token, borderWidth: style.borderLeftWidth, borderStyle: style.borderLeftStyle,
            text: rgba(style.color), expectedText: rgba(style.getPropertyValue('--share-text').trim()),
            bodyText: Array.from(block.querySelectorAll(':scope > p:not(.custom-block-title), strong, li'))
              .map(node => rgba(getComputedStyle(node).color)),
            inline: Array.from(block.querySelectorAll('code, a')).map(node => ({
              color: rgba(getComputedStyle(node).color),
              expected: rgba(style.getPropertyValue(node.tagName === 'A' ? '--share-link' : '--share-text').trim())
            })),
            border: rgba(style.borderLeftColor), title: rgba(getComputedStyle(title).color), accent: rgba(accent),
            background: rgba(style.backgroundColor), expectedBackground,
            borderPoint: [Math.floor((rect.left - root.left + 1) * 2), Math.floor((rect.top - root.top + 20) * 2)],
            backgroundPoint: [Math.floor((rect.right - root.left - 10) * 2), Math.floor((rect.top - root.top + 12) * 2)]
          };
        })
      };
    });
    const before = await inspect();
    for (const block of before.blocks) {
      expect(block.borderWidth).toBe('3px');
      expect(block.borderStyle).toBe('solid');
      expect(block.border).toEqual(block.accent);
      expect(block.title).toEqual(block.accent);
      expect(block.background).toEqual(block.expectedBackground);
      expect(block.text).toEqual(block.expectedText);
      for (const color of block.bodyText) expect(color).toEqual(block.expectedText);
      for (const inline of block.inline) expect(inline.color).toEqual(inline.expected);
    }
    await page.evaluate(() => document.documentElement.classList.toggle('dark'));
    expect(await inspect()).toEqual(before);
    await page.evaluate(() => (window as any).releaseExportFonts());
    await expect(page.getByRole('button', { name: 'Copy image to clipboard' })).toBeVisible({ timeout: 60000 });
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download image', exact: true }).click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();
    const png = readFileSync(path!);
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(before.height * 2);
    expect(before.height).toBeGreaterThan(720);
    const pixels = await page.evaluate(async ({ base64, blocks }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      return blocks.map(block => ({
        border: Array.from(ctx.getImageData(block.borderPoint[0], block.borderPoint[1], 1, 1).data),
        background: Array.from(ctx.getImageData(block.backgroundPoint[0], block.backgroundPoint[1], 1, 1).data)
      }));
    }, { base64: png.toString('base64'), blocks: before.blocks });
    pixels.forEach((pixel, index) => {
      for (const property of ['border', 'background'] as const) {
        pixel[property].forEach((value, channel) => {
          expect(Math.abs(value - before.blocks[index][property][channel])).toBeLessThanOrEqual(2);
        });
      }
    });
    await download.saveAs(`output/playwright/share-blocks-${theme}.png`);
  });
}
