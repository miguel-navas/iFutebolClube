import { test, expect } from '../fixtures';

const GROUPS = '/copa/2026/grupos';

test.describe('Jogos do grupo (botão)', () => {
  test('todas as listas começam fechadas, com a contagem no botão', async ({ page }) => {
    await page.goto(GROUPS);
    await expect(page.getByTestId('group-card')).toHaveCount(12);
    const toggle = page.getByTestId('group-matches-toggle-A');
    await expect(toggle).toContainText('Jogos do grupo');
    await expect(toggle).toContainText('(6)');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('group-match')).toHaveCount(0);
  });

  test('abre e fecha só o grupo clicado', async ({ page }) => {
    await page.goto(GROUPS);
    await page.getByTestId('group-matches-toggle-A').click();
    await expect(page.getByTestId('group-matches-toggle-A')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('group-matches-A').getByTestId('group-match')).toHaveCount(6);
    await expect(page.getByTestId('group-matches-B')).toHaveCount(0);

    await page.getByTestId('group-matches-toggle-B').click();
    await expect(page.getByTestId('group-matches-A')).toBeVisible();
    await expect(page.getByTestId('group-matches-B')).toBeVisible();

    await page.getByTestId('group-matches-toggle-A').click();
    await expect(page.getByTestId('group-matches-A')).toHaveCount(0);
    await expect(page.getByTestId('group-matches-B')).toBeVisible();
    await expect(page.getByTestId('group-matches-toggle-A')).toHaveAttribute('aria-expanded', 'false');
  });

  test('Enter e Espaço abrem e fecham a lista', async ({ page }) => {
    await page.goto(GROUPS);
    const toggle = page.getByTestId('group-matches-toggle-A');
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('group-matches-A')).toBeVisible();
    await page.keyboard.press('Space');
    await expect(page.getByTestId('group-matches-A')).toHaveCount(0);
  });

  test('o contador do cabeçalho do cartão continua', async ({ page }) => {
    await page.goto(GROUPS);
    await expect(page.getByTestId('group-card').first()).toContainText('6 jogos');
  });

  test('clicar num jogo abre a página dele', async ({ page }) => {
    await page.goto(GROUPS);
    await page.getByTestId('group-matches-toggle-A').click();
    await page.getByTestId('group-matches-A').getByTestId('group-match').first().click();
    await expect(page).toHaveURL(/\/copa\/2026\/jogos\/1$/);
    await expect(page.getByTestId('match-detail')).toHaveAttribute('data-match-id', '1');
  });
});

test.describe('Página do jogo', () => {
  test('jogo 1: times, horário, status, fase, data, estádio e cidade', async ({ page }) => {
    await page.goto('/copa/2026/jogos/1');
    await expect(page.getByTestId('match-team-a')).toContainText('Estados Unidos');
    await expect(page.getByTestId('match-team-b')).toContainText('Marrocos');
    await expect(page.getByTestId('match-center')).toHaveText('20:00');
    await expect(page.getByTestId('match-status')).toHaveText('Não iniciado');
    await expect(page.getByTestId('match-heading')).toContainText('Fase de Grupos · Grupo A');
    await expect(page.getByTestId('match-fact-date')).toContainText('11 de junho de 2026');
    await expect(page.getByTestId('match-fact-time')).toContainText('20:00');
    await expect(page.getByTestId('match-fact-stadium')).toContainText('MetLife Stadium');
    await expect(page.getByTestId('match-fact-city')).toContainText('Nova York');
  });

  test('o endereço abre direto e sobrevive ao recarregar', async ({ page }) => {
    await page.goto('/copa/2026/jogos/2');
    await page.reload();
    await expect(page.getByTestId('match-team-a')).toContainText('Escócia');
    await expect(page.getByTestId('match-fact-stadium')).toContainText('AT&T Stadium');
  });

  test('link de volta leva à fase de grupos da mesma edição', async ({ page }) => {
    await page.goto('/copa/2026/jogos/1');
    await page.getByTestId('match-back').click();
    await expect(page).toHaveURL(/\/copa\/2026\/grupos$/);
  });

  test('clicar num time abre a página da seleção', async ({ page }) => {
    await page.goto('/copa/2026/jogos/1');
    await page.getByTestId('match-team-a').click();
    await expect(page).toHaveURL(/\/copa\/2026\/selecoes\/USA$/);
  });

  for (const id of ['9999', 'abc', '0', '1.5']) {
    test(`número inválido ou inexistente (${id}) mostra "Jogo não encontrado"`, async ({ page }) => {
      await page.goto(`/copa/2026/jogos/${id}`);
      await expect(page.getByTestId('match-not-found')).toContainText('Jogo não encontrado');
      await page.getByRole('link', { name: /Ver a fase de grupos/ }).click();
      await expect(page).toHaveURL(/\/copa\/2026\/grupos$/);
    });
  }

  test('sem rolagem horizontal no celular', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/copa/2026/jogos/5');
    await expect(page.getByTestId('match-detail')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('o calendário de jogos continua em /jogos', async ({ page }) => {
    await page.goto('/copa/2026/jogos');
    await expect(page.getByRole('heading', { name: 'Calendário de Jogos' })).toBeVisible();
  });
});

test.describe('menu lateral e links de jogos nas páginas da edição', () => {
  for (const sec of ['', '/jogos', '/grupos', '/selecoes', '/jogos/1']) {
    test(`menu lateral presente em /copa/2026${sec}`, async ({ page }) => {
      await page.goto(`/copa/2026${sec}`);
      await expect(page.getByTestId('menu-home')).toBeVisible();
    });
  }

  test('"Próximos Jogos" da visão geral abre o jogo', async ({ page }) => {
    await page.goto('/copa/2026');
    await page.getByTestId('match-link').first().click();
    await expect(page).toHaveURL(/\/copa\/2026\/jogos\/\d+$/);
    await expect(page.getByTestId('match-detail')).toBeVisible();
  });

  test('calendário da aba Jogos abre o jogo, e o sino não navega', async ({ page }) => {
    await page.goto('/copa/2026/jogos');
    await page.getByTitle('Ativar alerta').first().click();
    await expect(page).toHaveURL(/\/copa\/2026\/jogos$/);
    await page.getByTestId('match-link').first().click();
    await expect(page).toHaveURL(/\/copa\/2026\/jogos\/\d+$/);
  });

  test('página da seleção: cada jogo da seleção abre o jogo', async ({ page }) => {
    await page.goto('/copa/2026/selecoes/BRA');
    await page.getByTestId('team-match-link').first().click();
    await expect(page).toHaveURL(/\/copa\/2026\/jogos\/\d+$/);
    await expect(page.getByTestId('match-detail')).toBeVisible();
  });
});
