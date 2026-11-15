import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { basePlayers, fillerPlayers } from '../fixtures-playerstats';

async function setup(page: Page, players = basePlayers()) {
  await page.route('**/data/editions/copa-2026/player-stats.json', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ players }),
    }),
  );
  await page.goto('/copa/2026/jogadores');
}

const names = async (page: Page) => {
  await expect(page.getByTestId('pstat-row').first()).toBeVisible();
  return page.getByTestId('pstat-name').allTextContents();
};

test.describe('tela de estatísticas dos jogadores', () => {
  test('sem arquivo: mostra o aviso e nenhuma tabela', async ({ page }) => {
    await page.goto('/copa/2026/jogadores');
    await expect(page.getByTestId('pstat-missing')).toBeVisible();
    await expect(page.getByTestId('pstat-table')).toHaveCount(0);
  });

  test('menu tem Jogadores e leva à tela', async ({ page }) => {
    await page.goto('/copa/2026');
    await page
      .locator('nav')
      .getByRole('link', { name: 'Jogadores' })
      .first()
      .click();
    await expect(page).toHaveURL(/\/copa\/2026\/jogadores$/);
  });

  test('artilheiro: ordem por gols e assistências, com os números', async ({
    page,
  }) => {
    await setup(page);
    expect((await names(page)).slice(0, 3)).toEqual([
      'Zagueiro Delta',
      'Meia Beta',
      'Atacante Alfa',
    ]);
    const first = page.getByTestId('pstat-row').first();
    await expect(first.locator('[data-col="goals"]')).toHaveText('6');
    await expect(page.getByTestId('pstat-count')).toHaveText('5 jogadores');
  });

  test('busca por nome, sem acento', async ({ page }) => {
    await setup(page);
    await page.getByTestId('player-search').fill('jose munoz');
    await expect(page.getByTestId('pstat-row')).toHaveCount(1);
    await expect(page.getByTestId('pstat-name')).toHaveText('José Muñoz Teste');
    await expect(page.getByTestId('pstat-count')).toHaveText('1 jogador');
    await page.getByTestId('player-search').fill('nenhum');
    await expect(page.getByTestId('pstat-empty')).toBeVisible();
  });

  test('filtro de equipe lista só as equipes do arquivo', async ({ page }) => {
    await setup(page);
    await expect(page.getByTestId('player-team')).toBeVisible();
    const options = await page
      .getByTestId('player-team')
      .locator('option')
      .allTextContents();
    expect(options[0]).toBe('Todas as equipes');
    expect(options).toHaveLength(3); // todas + 2 seleções
    await page.getByTestId('player-team').selectOption('FRA');
    await expect(page.getByTestId('pstat-row')).toHaveCount(3);
    await page.getByTestId('player-search').fill('goleiro');
    await expect(page.getByTestId('pstat-row')).toHaveCount(1);
  });

  test('abas trocam as colunas; goleiro mostra só goleiros', async ({
    page,
  }) => {
    await setup(page);
    await page.getByTestId('pstat-tab-ataque').click();
    await expect(page.getByTestId('pstat-sort-xg')).toBeVisible();
    await expect(page.getByTestId('pstat-sort-goals')).toHaveCount(0);
    const alfa = page
      .getByTestId('pstat-row')
      .filter({ hasText: 'Atacante Alfa' });
    await expect(alfa.locator('[data-col="conversion"]')).toHaveText('25');
    await expect(alfa.locator('[data-col="xg"]')).toHaveText('4,00');
    await page.getByTestId('pstat-tab-goleiro').click();
    await expect(page.getByTestId('pstat-row')).toHaveCount(1);
    await expect(page.getByTestId('pstat-name')).toHaveText('Goleiro Gama');
    await page.getByTestId('pstat-tab-fisico').click();
    await expect(
      page
        .getByTestId('pstat-row')
        .filter({ hasText: 'Atacante Alfa' })
        .locator('[data-col="top-speed"]'),
    ).toHaveText('33,46');
  });

  test('clicar no título da coluna ordena, e de novo inverte', async ({
    page,
  }) => {
    await setup(page);
    await page.getByTestId('pstat-sort-minutes').click();
    expect((await names(page))[0]).toBe('Goleiro Gama'); // mais minutos
    await page.getByTestId('pstat-sort-minutes').click();
    expect((await names(page))[0]).toBe('Zagueiro Delta'); // menos minutos
  });

  test('glossário: abre, mostra a explicação de cada coluna da aba', async ({
    page,
  }) => {
    await setup(page);
    await expect(page.getByTestId('pstat-glossary')).toHaveCount(0);
    await page.getByTestId('pstat-glossary-toggle').click();
    await expect(page.getByTestId('pstat-glossary-item')).toHaveCount(3);
    await page.getByTestId('pstat-tab-ataque').click();
    await expect(page.getByTestId('pstat-glossary-item')).toHaveCount(10);
    await expect(page.getByTestId('pstat-glossary')).toContainText(
      'Gols esperados (xG)',
    );
    await page.getByTestId('pstat-glossary-toggle').click();
    await expect(page.getByTestId('pstat-glossary')).toHaveCount(0);
  });

  test('pagina de 20 em 20 e continua a numeração', async ({ page }) => {
    await setup(page, [...basePlayers(), ...fillerPlayers(70)]);
    await expect(page.getByTestId('pstat-row')).toHaveCount(20);
    await expect(page.getByTestId('pstat-prev')).toBeDisabled();
    await page.getByTestId('pstat-next').click();
    await expect(page.getByTestId('pstat-row')).toHaveCount(20);
    await expect(page.getByTestId('pstat-range')).toContainText('21–40');
    await expect(
      page.getByTestId('pstat-row').first().locator('td').first(),
    ).toHaveText('21');
    await page.getByTestId('pstat-page').last().click();
    await expect(page.getByTestId('pstat-next')).toBeDisabled();
    // trocar o filtro volta para a primeira página
    await page.getByTestId('player-search').fill('a');
    await expect(page.getByTestId('pstat-range')).toContainText('1–');
  });

  test('celular: a página não rola na horizontal (a tabela rola dentro dela)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await setup(page);
    // no celular as abas viram um campo de lista
    await page.getByTestId('pstat-tab-select').selectOption('movimentacao');
    const over = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(over).toBeLessThanOrEqual(0);
  });
});
