import { test, expect } from '../fixtures';

test.describe('Copa do Mundo no celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('mostra a lista de edições e não baixa o mapa', async ({ page }) => {
    const pedidos: string[] = [];
    page.on('request', (r) => pedidos.push(r.url()));
    await page.goto('/copa');
    await expect(page.getByTestId('host-edition-list')).toBeVisible();
    await expect(page.getByTestId('wc-map')).toHaveCount(0);
    await expect(page.getByTestId('host-edition-featured')).toContainText('Copa 2026');
    // 22 outras edições (1930 a 2022)
    await expect(page.getByTestId('host-edition-card')).toHaveCount(22);
    expect(pedidos.some((u) => u.includes('countries-50m'))).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test('edições sem dados aparecem apagadas e sem link', async ({ page }) => {
    await page.goto('/copa');
    const antiga = page.getByTestId('host-edition-card').filter({ hasText: '1930' });
    await expect(antiga).toContainText('Uruguai');
    await expect(antiga).toContainText('em breve');
    await expect(antiga).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId('flag-missing')).toHaveCount(0);
  });

  test('a edição em destaque abre a Copa 2026', async ({ page }) => {
    await page.goto('/copa');
    await page.getByTestId('host-edition-featured').click();
    await expect(page).toHaveURL(/\/copa\/2026$/);
  });

  test('"Ver no mapa" carrega o mapa só quando tocado', async ({ page }) => {
    await page.goto('/copa');
    await expect(page.getByTestId('wc-map')).toHaveCount(0);
    await page.getByTestId('show-map').click();
    await expect(page.getByTestId('wc-map')).toBeVisible();
    await expect(page.getByTestId('show-map')).toHaveCount(0);
  });
});

test.describe('Copa do Mundo no computador', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('continua mostrando o mapa, sem a lista', async ({ page }) => {
    await page.goto('/copa');
    await expect(page.getByTestId('wc-map')).toBeVisible();
    await expect(page.getByTestId('host-edition-list')).toHaveCount(0);
  });
});
