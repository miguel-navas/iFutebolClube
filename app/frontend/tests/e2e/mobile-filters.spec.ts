import { test, expect } from '../fixtures';
import { basePlayers } from '../fixtures-playerstats';

test.describe('filtros em lista no celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('Jogos: grupo e data viram dois campos e os botões somem', async ({ page }) => {
    await page.goto('/copa/2026/jogos');
    await expect(page.getByTestId('match-filters-mobile')).toBeVisible();
    // nenhum botão de filtro visível (só os de alerta dos jogos podem existir)
    await expect(page.getByRole('button', { name: 'Todas as datas' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Todos', exact: true })).toHaveCount(0);

    const total = await page.getByTestId('match-link').count();
    await page.getByTestId('filter-group').selectOption('A');
    const doGrupo = await page.getByTestId('match-link').count();
    expect(doGrupo).toBeGreaterThan(0);
    expect(doGrupo).toBeLessThan(total);

    await page.getByTestId('filter-date').selectOption({ index: 1 });
    expect(await page.getByTestId('match-link').count()).toBeLessThanOrEqual(doGrupo);
  });

  test('Seleções: confederação e grupo filtram os cartões', async ({ page }) => {
    await page.goto('/copa/2026/selecoes');
    await expect(page.getByTestId('team-filters-mobile')).toBeVisible();
    const total = await page.getByTestId('team-card').count();
    await page.getByTestId('filter-group').selectOption('A');
    await expect(page.getByTestId('team-card')).toHaveCount(4);
    await page.getByTestId('filter-group').selectOption('Todos');
    await expect(page.getByTestId('team-card')).toHaveCount(total);
    await page.getByTestId('filter-conf').selectOption({ index: 1 });
    expect(await page.getByTestId('team-card').count()).toBeLessThan(total);
  });

  test('Jogadores: as abas viram um campo "Estatística"', async ({ page }) => {
    await page.route('**/data/editions/copa-2026/player-stats.json', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ players: basePlayers() }) }),
    );
    await page.goto('/copa/2026/jogadores');
    await expect(page.getByTestId('pstat-row').first()).toBeVisible();
    await expect(page.getByTestId('pstat-tab-ataque')).toBeHidden();
    await page.getByTestId('pstat-tab-select').selectOption('defesa');
    await expect(page.getByTestId('pstat-table')).toBeVisible();
    await expect(page.getByTestId('pstat-tab-select')).toHaveValue('defesa');
  });

  test('sem rolagem horizontal nas três telas', async ({ page }) => {
    for (const rota of ['jogos', 'selecoes', 'jogadores']) {
      await page.goto(`/copa/2026/${rota}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), rota).toBe(true);
    }
  });
});

test.describe('filtros em botões no computador', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('os campos de lista ficam escondidos', async ({ page }) => {
    await page.goto('/copa/2026/jogos');
    await expect(page.getByTestId('match-filters-mobile')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Todas as datas' })).toBeVisible();
    await page.goto('/copa/2026/selecoes');
    await expect(page.getByTestId('team-filters-mobile')).toBeHidden();
  });
});

test.describe('filtros em lista no celular: grupos e ranking', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('Grupos: o campo "Grupo" substitui os botões', async ({ page }) => {
    await page.goto('/copa/2026/grupos');
    await expect(page.getByTestId('group-filter-mobile')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Grupo A', exact: true })).toHaveCount(0);
    const total = await page.getByTestId('group-card').count();
    expect(total).toBeGreaterThan(1);
    await page.getByTestId('filter-group').selectOption('B');
    await expect(page.getByTestId('group-card')).toHaveCount(1);
    await page.getByTestId('filter-group').selectOption('Todos');
    await expect(page.getByTestId('group-card')).toHaveCount(total);
  });
});
