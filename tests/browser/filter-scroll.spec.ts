import { expect, type Locator, type Page, test } from '@playwright/test';

const filterViewports = [
  { name: 'mobile-355', width: 355, height: 740 },
  { name: 'mobile-498x750', width: 498, height: 750 },
  { name: 'mobile-700', width: 700, height: 760 },
  { name: 'desktop-handoff-701', width: 701, height: 760 },
  { name: 'desktop-1280', width: 1280, height: 900 },
];

test.beforeEach(async ({ page }) => {
  await page.route('https://static.cloudflareinsights.com/**', route => route.fulfill({ status: 204, body: '' }));
});

async function openCatalog(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Filters' })).toBeVisible();
}

function filterScroller(page: Page): Locator {
  return page.locator('.filter-panel-scroll');
}

async function scrollMetrics(scroller: Locator) {
  return scroller.evaluate(el => ({
    scrollTop: el.scrollTop,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    maxScroll: Math.max(0, el.scrollHeight - el.clientHeight),
  }));
}

async function expectLastFilterReachable(page: Page) {
  const scroller = filterScroller(page);
  const lastRow = scroller.locator('.check-row').last();
  await expect(lastRow).toHaveCount(1);
  await scroller.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await page.waitForTimeout(100);

  const metrics = await scrollMetrics(scroller);
  expect(metrics.maxScroll - metrics.scrollTop).toBeLessThanOrEqual(3);

  const [rowBox, scrollerBox] = await Promise.all([lastRow.boundingBox(), scroller.boundingBox()]);
  expect(rowBox).not.toBeNull();
  expect(scrollerBox).not.toBeNull();
  const rowBottom = rowBox!.y + rowBox!.height;
  const scrollerBottom = scrollerBox!.y + scrollerBox!.height;
  expect(rowBottom).toBeLessThanOrEqual(scrollerBottom + 2);
}

for (const viewport of filterViewports) {
  test(`filter popup scrolls to final option and reopens at ${viewport.name}`, async ({ page }) => {
    await openCatalog(page, viewport.width, viewport.height);
    const button = page.getByRole('button', { name: 'Filters' });
    await button.click();
    await expect(page.getByRole('dialog', { name: 'Advanced filters' })).toBeVisible();
    await expectLastFilterReachable(page);
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('dialog', { name: 'Advanced filters' })).toHaveCount(0);

    await button.click();
    await expect(page.getByRole('dialog', { name: 'Advanced filters' })).toBeVisible();
    expect((await scrollMetrics(filterScroller(page))).scrollTop).toBeLessThanOrEqual(1);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Advanced filters' })).toHaveCount(0);
    await expect(button).toBeFocused();
  });
}
