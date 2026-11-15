import { test, expect } from '../fixtures';

const file = {
  since: 1930,
  sources: 'Histórico de teste.',
  teams: [
    { code: 'BRA', name: 'Brasil', history: 'Brazil' },
    { code: 'GER', name: 'Alemanha', history: 'Germany' },
    { code: 'ARG', name: 'Argentina', history: 'Argentina' },
    { code: 'ESP', name: 'Espanha', history: 'Spain' },
  ],
  tournaments: ['Friendly', 'FIFA World Cup'],
  matches: [
    ['2011-08-10', 'GER', 'BRA', 2, 2, 'amistoso', 0],
    ['2014-07-08', 'BRA', 'GER', 1, 7, 'copa', 1],
    ['2018-03-27', 'GER', 'BRA', 0, 1, 'amistoso', 0],
  ],
  copa: [
    ['2002-06-30', 'GER', 'BRA', 1, 1, 0, 0, 0, 0, 0, 0, 1],
    ['2014-07-08', 'BRA', 'GER', 1, 0, 0, 1, 1, 0, 0, 0, 1],
  ],
  penaltis: [
    ['2014-07-08', 'BRA', 'GER', 1, 0],
    ['2018-03-27', 'GER', 'BRA', 0, 2],
  ],
  games: [
    ['GER', 'BRA', { AttemptAtGoal: 12, FoulsCommitted: 9, Possession: 0.6 }, { AttemptAtGoal: 10, Corners: 4, Possession: 0.4 }, 'copa'],
  ],
};

async function setup(page: import('@playwright/test').Page, url = '/copa/2026/comparacao') {
  await page.route('**/data/comparison/h2h.json', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(file) }),
  );
  await page.goto(url);
}

test.describe('comparação entre seleções', () => {
  test('sem arquivo: mostra o aviso', async ({ page }) => {
    await page.route('**/data/comparison/h2h.json', (r) => r.fulfill({ status: 404, body: '' }));
    await page.goto('/copa/2026/comparacao');
    await expect(page.getByTestId('cmp-missing')).toBeVisible();
  });

  test('Brasil x Alemanha: vitórias, empates e total, de cada lado', async ({ page }) => {
    await setup(page, '/copa/2026/comparacao?a=BRA&b=GER');
    await expect(page.getByTestId('cmp-total')).toHaveText('3');
    await expect(page.getByTestId('cmp-wins-a')).toHaveText('1'); // 2018: Brasil 1 x 0
    await expect(page.getByTestId('cmp-draws')).toHaveText('1');
    await expect(page.getByTestId('cmp-wins-b')).toHaveText('1'); // 2014: Alemanha 7 x 1
    await expect(page.getByTestId('cmp-meetings').locator('li').first()).toContainText('27/03/2018');
  });

  test('botões por tipo de competição filtram só os jogos entre as duas seleções', async ({ page }) => {
    await setup(page, '/copa/2026/comparacao?a=BRA&b=GER');
    await expect(page.getByTestId('cmp-kind-todos')).toContainText('(3)');
    await page.getByTestId('cmp-kind-amistoso').click();
    await expect(page.getByTestId('cmp-total')).toHaveText('2');
    await expect(page.getByTestId('cmp-wins-a')).toHaveText('1');
    await expect(page.getByTestId('cmp-wins-b')).toHaveText('0');
    await expect(page.getByTestId('cmp-meetings').locator('li')).toHaveCount(2);
    await page.getByTestId('cmp-kind-copa').click();
    await expect(page.getByTestId('cmp-total')).toHaveText('1');
    await expect(page.getByTestId('cmp-wins-b')).toHaveText('1');
    await expect(page.getByTestId('cmp-kind-liga')).toHaveCount(0);
  });

  test('gráfico do confronto: gols marcados são inteiros só dos jogos entre as duas', async ({ page }) => {
    await setup(page, '/copa/2026/comparacao?a=BRA&b=GER');
    const gols = page.getByTestId('cmp-h2h-bars').getByTestId('cmp-bar-row').filter({ hasText: 'Gols marcados' });
    await expect(gols).toContainText('4'); // Brasil: 2 + 1 + 1
    await expect(gols).toContainText('9'); // Alemanha: 2 + 7 + 0
  });

  test('cartões e pênaltis: só jogos de Copa, e some ao filtrar outro tipo', async ({ page }) => {
    await setup(page, '/copa/2026/comparacao?a=BRA&b=GER');
    const rows = page.getByTestId('cmp-h2h-bars').getByTestId('cmp-bar-row');
    await expect(rows.filter({ hasText: 'Cartões amarelos' })).toContainText('2'); // Brasil: 1 + 1
    await expect(rows.filter({ hasText: 'Cartões vermelhos' })).toContainText('1'); // Alemanha: 1
    await expect(rows.filter({ hasText: 'Pênaltis' })).toContainText('3'); // Brasil: 1 (Copa) + 2 (amistoso)
    await expect(page.getByTestId('cmp-copa-note')).toContainText('os 2 jogos');
    await page.getByTestId('cmp-kind-amistoso').click();
    await expect(rows.filter({ hasText: 'Cartões amarelos' })).toContainText('—');
    await expect(rows.filter({ hasText: 'Pênaltis' })).toContainText('2');
    await page.getByTestId('cmp-kind-copa').click();
    await expect(rows.filter({ hasText: 'Pênaltis' })).toContainText('1');
  });

  test('trocar as seleções recalcula; sem confronto avisa', async ({ page }) => {
    await setup(page, '/copa/2026/comparacao?a=BRA&b=GER');
    await page.getByTestId('cmp-b').selectOption('ARG');
    await expect(page.getByTestId('cmp-h2h')).toContainText('não se enfrentaram');
  });

  test('estatísticas só dos jogos entre as duas: soma do confronto, "—" para o lado sem dado', async ({ page }) => {
    await setup(page, '/copa/2026/comparacao?a=BRA&b=GER');
    const row = (t: string) => page.getByTestId('cmp-stat-row').filter({ hasText: t });
    await expect(row('Chutes').first()).toContainText('10'); // Brasil
    await expect(row('Chutes').first()).toContainText('12'); // Alemanha
    await expect(row('Faltas cometidas')).toContainText('—');
    await expect(row('Escanteios')).toContainText('4');
    await expect(row('Posse de bola')).toContainText('40%');
    await expect(row('Posse de bola')).toContainText('60%');
    await expect(row('Impedimentos')).toContainText('—');
    await expect(page.getByTestId('cmp-stats-note')).toContainText('o 1 jogo');
  });

  test('estatísticas dos jogos seguem o filtro de competição', async ({ page }) => {
    await setup(page, '/copa/2026/comparacao?a=BRA&b=GER');
    await expect(page.getByTestId('cmp-stat-row').first()).toBeVisible();
    await page.getByTestId('cmp-kind-amistoso').click();
    await expect(page.getByTestId('cmp-stat-row').filter({ hasText: 'Chutes' }).first()).toContainText('—');
    await page.getByTestId('cmp-kind-copa').click();
    await expect(page.getByTestId('cmp-stat-row').first()).toBeVisible();
    await expect(page.getByTestId('cmp-h2h-bars').getByTestId('cmp-bar-row').filter({ hasText: 'Disputas' })).toHaveCount(0);
  });

  test('sem jogo coletado entre as duas: sem confronto: nenhuma linha, só aviso', async ({ page }) => {
    await setup(page, '/copa/2026/comparacao?a=BRA&b=ARG');
    await expect(page.getByTestId('cmp-stat-row')).toHaveCount(0);
    await expect(page.getByTestId('cmp-stats-note')).toContainText('apenas o placar');
  });

  test('menu tem Comparação e funciona também na Nations League', async ({ page }) => {
    await setup(page, '/nations-league/2027');
    await page.locator('nav').getByRole('link', { name: 'Comparação' }).first().click();
    await expect(page).toHaveURL(/\/nations-league\/2027\/comparacao$/);
    await expect(page.getByTestId('comparison-page')).toBeVisible();
  });

  test('Nations League: só as seleções da edição; Copa: todas do histórico', async ({ page }) => {
    await page.route('**/data/editions/nations-league-2027.json', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          generatedAt: '2026-11-14T12:00:00Z',
          teams: [
            { code: 'ESP', name: 'Espanha', group: 'A1' },
            { code: 'GER', name: 'Alemanha', group: 'A1' },
          ],
          groups: [{ name: 'A1', standings: [] }],
          matches: [],
        }),
      }),
    );
    await setup(page, '/nations-league/2027/comparacao');
    const opcoes = page.getByTestId('cmp-a').locator('option');
    await expect(opcoes.filter({ hasText: 'Espanha' })).toHaveCount(1);
    await expect(opcoes.filter({ hasText: 'Brasil' })).toHaveCount(0);
    await page.goto('/copa/2026/comparacao');
    await expect(page.getByTestId('cmp-a').locator('option').filter({ hasText: 'Brasil' })).toHaveCount(1);
  });
});
