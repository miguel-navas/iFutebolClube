import { test, expect } from '@playwright/test';

test('endereço de edição abre direto e ao atualizar', async ({ page }) => {
  await page.goto('/copa/2026/jogos');
  await expect(page.getByRole('heading', { name: 'Calendário de Jogos' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Calendário de Jogos' })).toBeVisible();
});

test('endereço antigo redireciona no site compilado', async ({ page }) => {
  await page.goto('/teams/BRA');
  await expect(page).toHaveURL(/\/copa\/2026\/selecoes\/BRA$/);
});
