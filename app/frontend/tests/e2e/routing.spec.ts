import { test, expect } from '../fixtures';

test.describe('rotas por edição', () => {
  test('/copa/2026 mostra a visão geral', async ({ page }) => {
    await page.goto('/copa/2026');
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText('Copa do Mundo');
  });

  test('edição sem dados mostra aviso com link para a competição', async ({ page }) => {
    await page.goto('/copa/1970');
    await expect(page.getByRole('heading', { name: 'Edição não encontrada' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver edições disponíveis' })).toHaveAttribute('href', '/copa');
  });

  test('competição desconhecida mostra página não encontrada', async ({ page }) => {
    await page.goto('/xyz');
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
    await page.goto('/xyz/2026');
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  });
});

test.describe('redirecionamentos de endereços antigos', () => {
  const cases: [string, string, string][] = [
    ['/matches', '/copa/2026/jogos', 'Calendário de Jogos'],
    ['/groups', '/copa/2026/grupos', 'Fase de Grupos'],
    ['/teams', '/copa/2026/selecoes', 'Seleções'],
    ['/teams/BRA', '/copa/2026/selecoes/BRA', 'Brasil'],
    ['/bracket', '/copa/2026/eliminatorias', 'Fase Eliminatória'],
    ['/stadiums', '/copa/2026/estadios', 'Estádios & Cidades-Sede'],
  ];
  for (const [from, to, heading] of cases) {
    test(`${from} -> ${to}`, async ({ page }) => {
      await page.goto(from);
      await expect(page).toHaveURL(new RegExp(`${to}$`));
      await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(heading);
    });
  }
});
