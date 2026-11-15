import { test, expect } from '../fixtures';

test('a página inicial abre', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).not.toBeEmpty();
});
