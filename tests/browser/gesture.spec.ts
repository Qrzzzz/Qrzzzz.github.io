import { test, expect } from "@playwright/test";

test("the home gesture yields to a pull, leaves links fixed and settles completely", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const stage = page.locator(".gesture-stage");
  await expect(stage).toHaveAttribute("data-gesture-ready", "true");
  const ink = page.locator(".home-gesture__ink");
  const original = await ink.getAttribute("d");
  const link = await page.locator(".home-entry--library").boundingBox();
  const anchor = await ink.evaluate((element: SVGPathElement) => {
    const p = element.getPointAtLength(element.getTotalLength() * .16);
    const r = element.ownerSVGElement!.getBoundingClientRect();
    return { x: p.x + r.left, y: p.y + r.top };
  });
  await page.mouse.move(anchor.x, anchor.y);
  await page.mouse.down();
  await page.mouse.move(anchor.x + 150, anchor.y + 65, { steps: 10 });
  await expect(stage).toHaveAttribute("data-gesture-state", "dragging");
  await expect.poll(() => ink.getAttribute("d")).not.toBe(original);
  expect(await page.locator(".home-entry--library").boundingBox()).toEqual(link);
  await page.mouse.up();
  await page.mouse.move(1350, 30);
  await expect(stage).toHaveAttribute("data-gesture-state", "idle");
  await expect(ink).toHaveAttribute("d", original!);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.move(anchor.x, anchor.y);
  await page.mouse.down();
  await page.mouse.move(anchor.x + 100, anchor.y + 50);
  await page.mouse.up();
  await expect(ink).toHaveAttribute("d", original!);
});

test("touch can pull the line and then scroll a document normally", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto("/");
  const stage = page.locator(".gesture-stage");
  await expect(stage).toHaveAttribute("data-gesture-ready", "true");
  const ink = page.locator(".home-gesture__ink");
  const original = await ink.getAttribute("d");
  const anchor = await ink.evaluate((element: SVGPathElement) => {
    const p = element.getPointAtLength(element.getTotalLength() * .18);
    const r = element.ownerSVGElement!.getBoundingClientRect();
    return { x: p.x + r.left, y: p.y + r.top };
  });
  const cdp = await context.newCDPSession(page);
  const touch = (type: string, x: number, y: number) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }] });
  await touch("touchStart", anchor.x, anchor.y);
  await touch("touchMove", anchor.x + 55, anchor.y + 70);
  await expect(stage).toHaveAttribute("data-gesture-state", "dragging");
  await expect.poll(() => ink.getAttribute("d")).not.toBe(original);
  await touch("touchEnd", 0, 0);
  await expect(stage).toHaveAttribute("data-gesture-state", "idle");
  await expect(ink).toHaveAttribute("d", original!);
  expect(await page.evaluate(() => scrollY)).toBe(0);

  await page.goto("/notes/identity-v-custom-room-legitimacy.html");
  const line = page.locator(".reading-rail");
  const readCoordinate = () => line.evaluate((element) =>
    Number(element.getAttribute("data-progress")) * element.getBoundingClientRect().height
  );
  await expect(line).toHaveAttribute("data-progress", /\d/);
  const before = Number(await line.getAttribute("data-progress"));
  await touch("touchStart", 300, 710);
  for (const y of [640, 540, 420, 300]) await touch("touchMove", 300, y);
  await touch("touchEnd", 0, 0);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  await expect.poll(async () => Number(await line.getAttribute("data-progress"))).toBeGreaterThan(before);
  // Returning to earlier text keeps the furthest read body coordinate.
  const read = await readCoordinate();
  await expect.poll(() => page.evaluate(async () => {
    window.scrollTo(0, 0);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return scrollY;
  })).toBe(0);
  await expect.poll(readCoordinate).toBeGreaterThanOrEqual(read - 1);
  await page.getByRole("button", { name: "On this page", exact: true }).click();
  await page.getByRole("link", { name: "基本概念", exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/#基本概念|#%E5%9F%BA/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(async () => Number(await line.getAttribute("data-progress"))).toBeGreaterThanOrEqual(before);
  await context.close();
});

test("phone, landscape, tablet and desktop retain all destinations without horizontal overflow", async ({ page }) => {
  for (const width of [320, 390, 680, 768, 844, 1080, 1440]) {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
    for (const route of ["/", "/library/", "/projects/"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${route} at ${width}px`).toBeLessThanOrEqual(1);
    }
  }
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  for (const name of [/^Library \d+$/, /^Projects \d+$/]) {
    const link = page.getByRole("link", { name, exact: true });
    const r = await link.boundingBox();
    expect(r!.x).toBeGreaterThanOrEqual(0);
    expect(r!.x + r!.width).toBeLessThanOrEqual(320);
    expect(r!.height).toBeGreaterThanOrEqual(44);
  }
});
