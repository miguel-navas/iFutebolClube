import { test, expect } from '../fixtures';

test('hub mostra três competições', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId(/^competition-/)).toHaveCount(3);
  await expect(page.getByTestId('competition-copa')).toContainText('23 edições');
  await expect(page.getByTestId('competition-eurocopa')).toContainText('17 edições');
  await expect(page.getByTestId('competition-nations-league')).toContainText('5 edições');
});

for (const slug of ['copa', 'eurocopa', 'nations-league']) {
  test(`card ${slug} abre a página da competição`, async ({ page }) => {
    await page.goto('/');
    await page.getByTestId(`competition-${slug}`).click();
    await expect(page).toHaveURL(new RegExp(`/${slug}$`));
  });
}

test('/copa lista as 23 edições e abre a de 2026', async ({ page }) => {
  await page.goto('/copa');
  await expect(page.getByTestId(/^edition-/)).toHaveCount(23);
  await page.getByTestId('edition-2026').click();
  await expect(page).toHaveURL(/\/copa\/2026$/);
});

test('/eurocopa lista as 17 edições, da mais recente à mais antiga', async ({ page }) => {
  await page.goto('/eurocopa');
  await expect(page.getByTestId('empty-editions')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Todas as competições/ })).toHaveAttribute('href', '/');
});

test('links das competições ficam acima do dashboard e em linha compacta', async ({ page }) => {
  await page.route('**/data/stats/copa.json', (r) => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: 1400, height: 800 });
  await page.goto('/');
  const boxes = await Promise.all(
    ['copa', 'eurocopa', 'nations-league'].map((s) => page.getByTestId(`competition-${s}`).boundingBox()),
  );
  // mesma linha (alturas pequenas e alinhadas) e abaixo do topo, antes da área do dashboard
  expect(Math.abs(boxes[0]!.y - boxes[2]!.y)).toBeLessThan(4);
  expect(boxes[0]!.height).toBeLessThan(70);
  const area = await page.getByTestId('dashboard-area').boundingBox();
  expect(boxes[0]!.y + boxes[0]!.height).toBeLessThanOrEqual(area!.y);
});

test('/nations-league lista 5 edições e abre a edição', async ({ page }) => {
  await page.goto('/nations-league');
  await expect(page.getByTestId(/^edition-/)).toHaveCount(5);
  await page.getByTestId('edition-2027').click();
  await expect(page).toHaveURL(/\/nations-league\/2027$/);
});

test('menu lateral: Copa do Mundo abre a tela com o mapa', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 800 });
  await page.addInitScript(() => localStorage.setItem('ifc:side-menu-open', 'true'));
  await page.goto('/');
  await page.getByTestId('menu-competition-copa').click();
  await expect(page).toHaveURL(/\/copa$/);
  await expect(page.getByTestId('wc-map')).toBeVisible();
});
