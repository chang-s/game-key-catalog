import { expect, type Page, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://static.cloudflareinsights.com/**', route => route.fulfill({ status: 204, body: '' }));
});

async function openCatalog(page: Page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Search games' })).toBeVisible();
}

async function openDiabloDialog(page: Page) {
  await page.getByRole('textbox', { name: 'Search games' }).fill('Diablo IV: Lord of Hatred');
  const card = page.getByRole('button', { name: /View details for Diablo IV: Lord of Hatred/i }).first();
  await card.click();
  await expect(page.locator('dialog[open]')).toBeVisible();
  return card;
}

test('game dialog moves focus inside on open and restores focus after Escape', async ({ page }) => {
  await openCatalog(page);
  const card = await openDiabloDialog(page);
  await expect(page.locator('dialog[open]')).toContainText('Diablo IV: Lord of Hatred');
  await expect(page.locator('dialog[open]').getByRole('button', { name: 'Close', exact: true })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(card).toBeFocused();
});

test('game dialog restores focus to its opener after close button dismissal', async ({ page }) => {
  await openCatalog(page);
  const card = await openDiabloDialog(page);
  await page.locator('dialog[open]').getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(card).toBeFocused();
});

test('filter dialog traps keyboard focus and restores focus after Escape', async ({ page }) => {
  await openCatalog(page);
  const button = page.getByRole('button', { name: 'Filters' });
  await button.click();
  const dialog = page.getByRole('dialog', { name: 'Advanced filters' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog.getByRole('checkbox').first()).toBeFocused();

  await dialog.getByRole('button', { name: 'Done' }).focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close filters' })).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Done' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(button).toBeFocused();
});
