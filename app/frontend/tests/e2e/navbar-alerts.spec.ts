import { test, expect } from '../fixtures';

test.describe('barra de navegação', () => {
  test('mostra a edição, lista só edições disponíveis e liga ao hub', async ({ page }) => {
    await page.goto('/copa/2026/grupos');
    await expect(page.getByTestId('edition-label')).toHaveText('World Cup 2026');
    const options = page.getByLabel('Edição').locator('option');
    await expect(options).toHaveCount(23);
    await expect(options.first()).toHaveText('2026');
    await page.getByTestId('hub-link').click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('item da seção atual fica ativo', async ({ page }) => {
    await page.goto('/copa/2026/jogos');
    const nav = page.locator('nav');
    await expect(nav.getByRole('link', { name: 'Jogos' }).first()).toHaveClass(/text-\[#D4AF37\]/);
    await expect(nav.getByRole('link', { name: 'Grupos' }).first()).not.toHaveClass(/bg-\[#D4AF37\]\/15/);
  });

  test('seleção de equipe mantém Seleções ativo', async ({ page }) => {
    await page.goto('/copa/2026/selecoes/BRA');
    await expect(page.locator('nav').getByRole('link', { name: 'Seleções' }).first()).toHaveClass(/bg-\[#D4AF37\]\/15/);
  });

  test('menu móvel abre e fecha', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/copa/2026');
    await expect(page.locator('nav.sticky').getByRole('link', { name: 'Jogos', exact: true })).toHaveCount(0);
    await page.locator('nav.sticky').getByRole('button', { name: 'Abrir menu' }).click();
    await expect(page.locator('nav.sticky').getByRole('link', { name: 'Jogos', exact: true })).toBeVisible();
    await page.locator('nav.sticky').getByRole('button', { name: 'Fechar menu' }).click();
    await expect(page.locator('nav.sticky').getByRole('link', { name: 'Jogos', exact: true })).toHaveCount(0);
  });
});

test.describe('alertas por edição', () => {
  test('alerta ativado sobrevive ao recarregar', async ({ page }) => {
    await page.goto('/copa/2026/jogos');
    await page.getByTitle('Ativar alerta').first().click();
    await expect(page.getByTitle('Remover alerta')).toHaveCount(1);
    await page.reload();
    await expect(page.getByTitle('Remover alerta')).toHaveCount(1);
    const stored = await page.evaluate(() => localStorage.getItem('alerts:copa:2026'));
    expect(JSON.parse(stored!)).toHaveLength(1);
  });

  test('alertas da chave antiga são migrados uma vez', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('wc2026_alerts', JSON.stringify(['1', '2']));
    });
    await page.goto('/copa/2026/jogos');
    await expect(page.getByTitle('Remover alerta')).toHaveCount(2);
    const state = await page.evaluate(() => ({
      old: localStorage.getItem('wc2026_alerts'),
      next: localStorage.getItem('alerts:copa:2026'),
    }));
    expect(state.old).toBeNull();
    expect(JSON.parse(state.next!)).toEqual(['1', '2']);
  });

  test('o sino mostra 9+ com dez alertas', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('alerts:copa:2026', JSON.stringify(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']));
    });
    await page.goto('/copa/2026');
    await expect(page.getByTestId('bell')).toContainText('9+');
  });
});
