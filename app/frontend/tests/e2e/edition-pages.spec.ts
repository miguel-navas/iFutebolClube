import { test, expect } from '../fixtures';

test.describe('visão geral da edição', () => {
  test('contagem regressiva antes do início', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-05-01T12:00:00-03:00') });
    await page.goto('/copa/2026');
    const cd = page.getByTestId('countdown');
    await expect(cd).toBeVisible();
    const values = await cd.locator('.tabular-nums').allInnerTexts();
    expect(values).toHaveLength(4);
    for (const v of values) expect(v).toMatch(/^\d{2,}$/);
  });

  test('sem contagem regressiva depois do início', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-07-01T12:00:00-03:00') });
    await page.goto('/copa/2026');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByTestId('countdown')).toHaveCount(0);
  });

  test('números vêm do conjunto de dados', async ({ page }) => {
    await page.goto('/copa/2026');
    await expect(page.getByTestId('stat-Edição')).toContainText('23ª');
    await expect(page.getByTestId('stat-Seleções')).toContainText('48');
    await expect(page.getByTestId('stat-Grupos')).toContainText('12');
    await expect(page.getByTestId('stat-Cidades')).toContainText('16');
  });
});

test.describe('grupos e seleções', () => {
  test('grupos: 12 cartões de 4 seleções', async ({ page }) => {
    await page.goto('/copa/2026/grupos');
    const cards = page.getByTestId('group-card');
    await expect(cards).toHaveCount(12);
    for (const i of [0, 11])
      await expect(cards.nth(i).locator('tbody tr')).toHaveCount(4);
  });

  test('seleções: 48 cartões; abrir e voltar', async ({ page }) => {
    await page.goto('/copa/2026/selecoes');
    await expect(page.getByTestId('team-card')).toHaveCount(48);
    await page.getByTestId('team-card').first().click();
    await expect(page).toHaveURL(/\/copa\/2026\/selecoes\/[^/]+$/);
    await page.getByRole('link', { name: /Voltar para Seleções/ }).click();
    await expect(page).toHaveURL(/\/copa\/2026\/selecoes$/);
  });
});

test.describe('eliminatórias e estádios', () => {
  test('estádios: resumo por país e 16 cartões', async ({ page }) => {
    await page.goto('/copa/2026/estadios');
    await expect(
      page.getByRole('heading', { name: 'Estádios & Cidades-Sede' }),
    ).toBeVisible();
    const summary = page.getByTestId('country-summary');
    await expect(summary).toHaveCount(3);
    await expect(summary.nth(0)).toContainText('11 estádios');
    await expect(summary.nth(1)).toContainText('3 estádios');
    await expect(summary.nth(2)).toContainText('2 estádios');
    await expect(page.getByTestId('stadium-card')).toHaveCount(16);
  });

  test('eliminatórias: abre direto e mostra a chave com a final', async ({ page }) => {
    await page.goto('/copa/2026/eliminatorias');
    await expect(page.getByRole('heading', { name: 'Fase Eliminatória' })).toBeVisible();
    await expect(page.getByTestId('bracket-final')).toBeVisible();
  });

  test('estádios abre direto pelo endereço e sobrevive ao recarregar', async ({ page }) => {
    await page.goto('/copa/2026/estadios');
    await expect(page.getByRole('heading', { name: 'Estádios & Cidades-Sede' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Estádios & Cidades-Sede' })).toBeVisible();
    await expect(page.getByTestId('stadium-card')).toHaveCount(16);
  });
});
