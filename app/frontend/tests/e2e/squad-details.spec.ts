import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { detailFixture, squadFixture } from '../fixtures-match';

// Dados de TESTE: não são o resultado de nenhum torneio real.
const standing = (code: string) => ({
  code,
  played: 1,
  won: 0,
  drawn: 1,
  lost: 0,
  goalsFor: 1,
  goalsAgainst: 1,
  goalDifference: 0,
  points: 1,
});
const snapshot = {
  generatedAt: '2026-11-04T22:00:00Z',
  teams: [
    { code: 'BRA', name: 'Brasil', group: 'A' },
    { code: 'FRA', name: 'França', group: 'A' },
  ],
  groups: [{ name: 'A', standings: [standing('BRA'), standing('FRA')] }],
  matches: [
    {
      id: 1,
      date: '2026-06-11',
      time: '16:00',
      teamA: 'BRA',
      teamB: 'FRA',
      scoreA: 2,
      scoreB: 2,
      group: 'A',
      stadium: 'Estádio Teste',
      city: 'Cidade Teste',
      stage: 'Fase de Grupos',
    },
  ],
};
const json = (body: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

async function setup(page: Page, opts: { squad?: unknown | 'missing' } = {}) {
  await page.route('**/data/editions/copa-2026.json', (r) =>
    r.fulfill(json(snapshot)),
  );
  await page.route('**/data/editions/copa-2026/matches/1.json', (r) =>
    r.fulfill(json(detailFixture())),
  );
  await page.route('**/data/editions/copa-2026/teams/BRA.json', (r) =>
    opts.squad === 'missing'
      ? r.fulfill({ status: 404, body: 'x' })
      : r.fulfill(json(opts.squad ?? squadFixture())),
  );
}

test.describe('página da seleção', () => {
  test('mostra os 26 jogadores, agrupados, e o técnico', async ({ page }) => {
    await setup(page);
    await page.goto('/copa/2026/selecoes/BRA');
    await expect(page.getByTestId('squad-player')).toHaveCount(26);
    await expect(page.getByTestId('squad-count')).toHaveText('26');
    await expect(page.getByRole('heading', { name: 'Goleiros' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Defensores' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Meio-campistas' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Atacantes' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Sem posição' }),
    ).toBeVisible();
    await expect(page.getByTestId('coach-name')).toHaveText('Técnico Alfa');
    await expect(page.getByTestId('team-coach')).toContainText('3 jogos');
  });

  test('janela do jogador com idade, números da Copa e iniciais', async ({
    page,
  }) => {
    await setup(page);
    await page.goto('/copa/2026/selecoes/BRA');
    await page
      .getByTestId('squad-player')
      .filter({ hasText: 'Jogador Teste 09' })
      .click();
    const modal = page.getByTestId('player-modal');
    await expect(modal.getByTestId('player-name')).toHaveText(
      'Jogador Teste 09',
    );
    await expect(modal).toContainText('26 anos');
    await expect(modal.getByTestId('edition-Jogos')).toContainText('3');
    await expect(modal.getByTestId('edition-Gols')).toContainText('2');
    await expect(modal.getByTestId('edition-Assistências')).toContainText('1');
    await expect(modal.getByTestId('edition-Amarelos')).toContainText('1');
    await expect(modal.getByTestId('player-initials')).toBeVisible();
    await expect(modal.getByText('Jogos pela Seleção')).toBeVisible();
    await expect(modal.getByText('Gols pela Seleção')).toBeVisible();
    await expect(
      modal.getByTestId('player-stat').filter({ hasText: 'Jogos pela Seleção' }),
    ).toContainText('14');
    await expect(
      modal.getByTestId('player-stat').filter({ hasText: 'Gols pela Seleção' }),
    ).toContainText('5');
    await expect(modal).toContainText('Clubes na Carreira');
    await expect(modal).toContainText('Clube Teste A (2015–2020)');
    await expect(modal.getByTestId('player-source')).toContainText('Wikipédia');
    await expect(modal.getByText('Atual')).toBeVisible();
    await expect(modal.getByTestId('player-edition')).toBeVisible();
  });

  test('jogador sem total nem clubes não mostra esses blocos', async ({
    page,
  }) => {
    await setup(page);
    await page.goto('/copa/2026/selecoes/BRA');
    await page
      .getByTestId('squad-player')
      .filter({ hasText: 'Jogador Teste 11' })
      .click();
    const modal = page.getByTestId('player-modal');
    await expect(modal.getByTestId('player-edition')).toBeVisible();
    await expect(modal).not.toContainText('Clubes na Carreira');
    await expect(modal).not.toContainText('Jogos em Copas');
  });

  test('jogador com totais só de Copas usa o rótulo "em Copas" e sem fonte', async ({
    page,
  }) => {
    await setup(page);
    await page.goto('/copa/2026/selecoes/BRA');
    await page
      .getByTestId('squad-player')
      .filter({ hasText: 'Jogador Teste 10' })
      .click();
    const modal = page.getByTestId('player-modal');
    await expect(
      modal.getByTestId('player-stat').filter({ hasText: 'Jogos em Copas' }),
    ).toContainText('7');
    await expect(modal.getByText('Gols em Copas')).toBeVisible();
    await expect(modal.getByTestId('player-source')).toHaveCount(0);
  });

  test('fecha com o botão, com o fundo e com Escape', async ({ page }) => {
    await setup(page);
    await page.goto('/copa/2026/selecoes/BRA');
    const card = page.getByTestId('squad-player').first();
    await card.click();
    await page.getByTestId('player-close').click();
    await expect(page.getByTestId('player-modal')).toHaveCount(0);
    await card.click();
    await page
      .getByTestId('player-backdrop')
      .click({ position: { x: 5, y: 5 } });
    await expect(page.getByTestId('player-modal')).toHaveCount(0);
    await card.click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('player-modal')).toHaveCount(0);
  });

  test('sem arquivo de elenco mostra o elenco embutido e nenhum técnico', async ({
    page,
  }) => {
    await setup(page, { squad: 'missing' });
    await page.goto('/copa/2026/selecoes/BRA');
    await expect(page.getByTestId('squad-player').first()).toBeVisible();
    expect(await page.getByTestId('squad-player').count()).toBeLessThan(26);
    await expect(page.getByTestId('team-coach')).toHaveCount(0);
  });
});

test.describe('página do jogo: abrir jogador', () => {
  test('clicar numa escalação abre a janela com os dados do elenco', async ({
    page,
  }) => {
    await setup(page);
    await page.goto('/copa/2026/jogos/1');
    await page
      .getByTestId('lineup-A')
      .locator('[data-player-id="9"]')
      .getByTestId('player-open')
      .click();
    const modal = page.getByTestId('player-modal');
    await expect(modal.getByTestId('player-name')).toHaveText(
      'Jogador Teste 09',
    );
    await expect(modal).toContainText('Brasil');
    await expect(modal.getByTestId('edition-Gols')).toContainText('2');
  });

  test('clicar num nome nos lances abre a janela', async ({ page }) => {
    await setup(page);
    await page.goto('/copa/2026/jogos/1');
    await page
      .getByTestId('event')
      .first()
      .getByTestId('player-open')
      .first()
      .click();
    await expect(page.getByTestId('player-modal')).toBeVisible();
    await expect(page.getByTestId('player-name')).toHaveText(
      'Jogador Teste 09',
    );
  });

  test('sem arquivo de elenco usa os dados da escalação', async ({ page }) => {
    await setup(page, { squad: 'missing' });
    await page.goto('/copa/2026/jogos/1');
    await page
      .getByTestId('lineup-A')
      .locator('[data-player-id="10"]')
      .getByTestId('player-open')
      .click();
    const modal = page.getByTestId('player-modal');
    await expect(modal.getByTestId('player-name')).toHaveText('Meia Alfa');
    await expect(modal).toContainText('#10');
    await expect(modal.getByTestId('player-edition')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);
  });

  test('janela cabe no celular sem rolagem horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await setup(page);
    await page.goto('/copa/2026/jogos/1');
    await page
      .getByTestId('lineup-A')
      .locator('[data-player-id="9"]')
      .getByTestId('player-open')
      .click();
    await expect(page.getByTestId('player-modal')).toBeVisible();
    const over = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(over).toBeLessThanOrEqual(0);
  });
});
