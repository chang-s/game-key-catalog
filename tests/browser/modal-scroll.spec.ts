import { expect, type Locator, type Page, test } from '@playwright/test';

type ViewportCase = {
  name: string;
  width: number;
  height: number;
  mobile: boolean;
};

const viewports: ViewportCase[] = [
  { name: 'mobile-355', width: 355, height: 740, mobile: true },
  { name: 'mobile-498x750', width: 498, height: 750, mobile: true },
  { name: 'mobile-700', width: 700, height: 760, mobile: true },
  { name: 'desktop-handoff-701', width: 701, height: 760, mobile: false },
  { name: 'desktop-1280', width: 1280, height: 900, mobile: false },
];

type ScrollMetrics = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  maxScroll: number;
};

const gameTitles = {
  short: /Kiln Fired Up Edition/i,
  medium: /Halo: Campaign Evolved/i,
  long: /Diablo IV: Lord of Hatred/i,
};

test.beforeEach(async ({ page }) => {
  await page.route('https://static.cloudflareinsights.com/**', route => route.fulfill({ status: 204, body: '' }));
});

async function openCatalog(page: Page, viewport: ViewportCase) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Search games' })).toBeVisible();
  await expect(page.locator('.grid .card').first()).toBeVisible();
}

async function openGameDialog(page: Page, title: RegExp) {
  await page.getByRole('textbox', { name: 'Search games' }).fill('');
  await page.getByRole('textbox', { name: 'Search games' }).fill(title.source.replaceAll('\\', '').replace('/i', ''));
  const card = page.getByRole('button', { name: new RegExp(`View details for .*${title.source}`, 'i') }).first();
  if (await card.count()) {
    await card.click();
  } else {
    await page.getByRole('button', { name: /View details for/i }).filter({ hasText: title }).first().click();
  }
  await expect(page.locator('dialog[open]')).toBeVisible();
}

async function closeDialog(page: Page) {
  await page.locator('dialog[open]').getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
}

function dialogScroller(page: Page): Locator {
  return page.locator('dialog .dialog-main');
}

async function metrics(scroller: Locator): Promise<ScrollMetrics> {
  return scroller.evaluate(el => ({
    scrollTop: el.scrollTop,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    maxScroll: Math.max(0, el.scrollHeight - el.clientHeight),
  }));
}

async function wheelWithin(locator: Locator, deltaY: number) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  await locator.page().mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await locator.page().mouse.wheel(0, deltaY);
}

async function expectStableRepeatedScroll(scroller: Locator) {
  const initial = await metrics(scroller);
  if (initial.maxScroll <= 2) {
    await expect(scroller.locator('.dialog-actions, .dialog-main-body')).toBeVisible();
    return;
  }

  const downward: number[] = [];
  for (let index = 0; index < 6; index++) {
    await wheelWithin(scroller, 420);
    await scroller.page().waitForTimeout(80);
    downward.push((await metrics(scroller)).scrollTop);
  }

  for (let index = 1; index < downward.length; index++) {
    expect(downward[index], `scrollTop should not jump backward while scrolling down: ${downward.join(', ')}`)
      .toBeGreaterThanOrEqual(downward[index - 1] - 2);
  }
  expect(Math.max(...downward)).toBeGreaterThan(0);

  await scroller.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await scroller.page().waitForTimeout(100);
  const bottom = await metrics(scroller);
  expect(bottom.maxScroll - bottom.scrollTop).toBeLessThanOrEqual(3);

  const upward: number[] = [];
  for (let index = 0; index < 5; index++) {
    await wheelWithin(scroller, -420);
    await scroller.page().waitForTimeout(80);
    upward.push((await metrics(scroller)).scrollTop);
  }
  for (let index = 1; index < upward.length; index++) {
    expect(upward[index], `scrollTop should not jump forward while scrolling up: ${upward.join(', ')}`)
      .toBeLessThanOrEqual(upward[index - 1] + 2);
  }

  await scroller.evaluate(el => { el.scrollTop = 0; });
  await scroller.page().waitForTimeout(100);
  expect((await metrics(scroller)).scrollTop).toBeLessThanOrEqual(1);
}

for (const viewport of viewports) {
  test(`modal scroll remains stable for long content at ${viewport.name}`, async ({ page }) => {
    await openCatalog(page, viewport);
    await openGameDialog(page, gameTitles.long);
    const scroller = dialogScroller(page);
    await expectStableRepeatedScroll(scroller);

    if (viewport.mobile) {
      const before = await metrics(scroller);
      if (before.maxScroll > 20) {
        await wheelWithin(scroller, 500);
        await page.waitForTimeout(150);
        await expect(page.locator('dialog')).toHaveClass(/header-collapsed/);
      }
    }

    await closeDialog(page);
    await openGameDialog(page, gameTitles.long);
    expect((await metrics(dialogScroller(page))).scrollTop).toBeLessThanOrEqual(1);
    await closeDialog(page);
  });

  test(`short and medium dialogs keep sane layout at ${viewport.name}`, async ({ page }) => {
    await openCatalog(page, viewport);

    await openGameDialog(page, gameTitles.short);
    const shortMetrics = await metrics(dialogScroller(page));
    expect(shortMetrics.clientHeight).toBeGreaterThan(120);
    expect(shortMetrics.scrollTop).toBeLessThanOrEqual(1);
    await expect(page.getByRole('button', { name: 'Request key' })).toBeVisible();
    await closeDialog(page);

    await openGameDialog(page, gameTitles.medium);
    const mediumScroller = dialogScroller(page);
    const before = await metrics(mediumScroller);
    if (before.maxScroll > 2) {
      await expectStableRepeatedScroll(mediumScroller);
    }
    await closeDialog(page);
  });
}

test('request-key flow preserves modal scrollability at 498 x 750', async ({ page }) => {
  await openCatalog(page, { name: 'mobile-498x750', width: 498, height: 750, mobile: true });
  await openGameDialog(page, gameTitles.long);
  const scroller = dialogScroller(page);
  await scroller.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await page.getByRole('radio', { name: /Steam, 1 available/i }).click();
  await page.getByRole('button', { name: 'Request key' }).click();
  await expect(page.getByRole('button', { name: 'Copy request' })).toBeVisible();
  await expectStableRepeatedScroll(scroller);
  await page.locator('dialog[open]').getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Request key' })).toBeEnabled();
  await closeDialog(page);
});

test('desktop modal scrolls independently from the page', async ({ page }) => {
  await openCatalog(page, { name: 'desktop-1280', width: 1280, height: 900, mobile: false });
  await openGameDialog(page, gameTitles.long);
  const bodyTop = await page.evaluate(() => document.scrollingElement?.scrollTop ?? 0);
  await expectStableRepeatedScroll(dialogScroller(page));
  expect(await page.evaluate(() => document.scrollingElement?.scrollTop ?? 0)).toBe(bodyTop);
  await closeDialog(page);
});
