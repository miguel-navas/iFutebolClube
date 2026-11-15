import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { detailFixture } from '../fixtures-match';

// Dados de TESTE: não são o resultado de nenhum torneio real.
const snapshot = {
  generatedAt: '2026-11-04T22:00:00Z',
  teams: [
    { code: 'BRA', name: 'Brasil', group: 'A' },
    { code: 'FRA', name: 'França', group: 'A' },
  ],
  groups: [{ name: 'A', standings: [] }],
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

const STATS = {
  A: {
    Possession: 0.6,
    AttemptAtGoal: 20,
    AttemptAtGoalOnTarget: 12,
    Goals: 1,
    XG: 2.5,
    TotalDistance: 148000,
    TopSpeed: 32.6,
  },
  B: {
    Possession: 0.32,
    AttemptAtGoal: 2,
    AttemptAtGoalOnTarget: 0,
    Goals: 0,
    XG: 0.07,
    TotalDistance: 142000,
    TopSpeed: 33.7,
  },
};

const RANKING = {
  attack: [
    { name: 'Atacante Alfa', side: 'A', rank: 1, score: 6.2 },
    { name: 'Atacante Beta', side: 'B', rank: 2, score: 5.1 },
  ],
  defense: [{ name: 'Zagueiro Beta', side: 'B', rank: 1, score: 7 }],
  creativity: [],
  goalkeepers: [{ name: 'Goleiro Alfa', side: 'A', rank: 1, score: 8.04 }],
};

async function setup(page: Page, extra: Record<string, unknown> = {}) {
  await page.route('**/data/editions/copa-2026.json', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(snapshot),
    }),
  );
  await page.route('**/data/editions/copa-2026/matches/1.json', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(detailFixture(extra)),
    }),
  );
  await page.goto('/copa/2026/jogos/1');
}

test.describe('aba Estatísticas', () => {
  test('sem estatísticas no arquivo: não há abas e a tela é a de sempre', async ({
    page,
  }) => {
    await setup(page);
    await expect(page.getByTestId('match-lineups')).toBeVisible();
    await expect(page.getByTestId('match-tabs')).toHaveCount(0);
  });

  test('com estatísticas: abas, e a aba mostra os números dos dois times', async ({
    page,
  }) => {
    await setup(page, { stats: STATS });
    await expect(page.getByTestId('match-tabs')).toBeVisible();
    await expect(page.getByTestId('match-lineups')).toBeVisible();
    await page.getByTestId('match-tab-stats').click();
    await expect(page.getByTestId('match-stats')).toBeVisible();
    await expect(page.getByTestId('match-lineups')).toHaveCount(0);
    await expect(page.getByTestId('stat-a-Possession')).toHaveText('60%');
    await expect(page.getByTestId('stat-b-Possession')).toHaveText('32%');
    await expect(page.getByTestId('stat-contested')).toHaveText(
      '8% em disputa',
    );
    await expect(page.getByTestId('stat-a-AttemptAtGoal')).toHaveText('20');
    await expect(page.getByTestId('stat-b-AttemptAtGoal')).toHaveText('2');
    await expect(page.getByTestId('stat-a-XG')).toHaveText('2,50');
    await expect(page.getByTestId('stat-a-TotalDistance')).toHaveText(
      '148,0 km',
    );
  });

  test('só aparecem as linhas que têm valor nos dois lados', async ({
    page,
  }) => {
    await setup(page, { stats: STATS });
    await page.getByTestId('match-tab-stats').click();
    await expect(page.getByTestId('stat-row-Goals')).toBeVisible();
    await expect(page.getByTestId('stat-row-Corners')).toHaveCount(0);
    await expect(page.getByTestId('stat-group-defesa')).toHaveCount(0);
  });

  test('barras: o maior valor enche a metade; voltar à aba do jogo', async ({
    page,
  }) => {
    await setup(page, { stats: STATS });
    await page.getByTestId('match-tab-stats').click();
    const w = (id: string) =>
      page
        .getByTestId(id)
        .evaluate(
          (el) =>
            (el as HTMLElement).getBoundingClientRect().width /
            (el.parentElement as HTMLElement).getBoundingClientRect().width,
        );
    expect(await w('stat-bar-a-AttemptAtGoal')).toBeCloseTo(1, 1);
    expect(await w('stat-bar-b-AttemptAtGoal')).toBeCloseTo(0.1, 1);
    await page.getByTestId('match-tab-jogo').click();
    await expect(page.getByTestId('match-lineups')).toBeVisible();
    await expect(page.getByTestId('match-stats')).toHaveCount(0);
  });

  test('em tela de celular não rola na horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await setup(page, { stats: STATS });
    await page.getByTestId('match-tab-stats').click();
    const over = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(over).toBeLessThanOrEqual(0);
  });

  test('melhores do jogo: listas por categoria, com posição, lado e nota', async ({
    page,
  }) => {
    await setup(page, { stats: STATS, ranking: RANKING });
    await page.getByTestId('match-tab-stats').click();
    await expect(page.getByTestId('match-ranking')).toBeVisible();
    const ataque = page.getByTestId('ranking-attack');
    await expect(ataque.getByTestId('ranking-player')).toHaveCount(2);
    await expect(ataque.getByTestId('ranking-player').first()).toContainText(
      'Atacante Alfa',
    );
    await expect(ataque.getByTestId('ranking-player').first()).toContainText(
      '6,2',
    );
    await expect(ataque.getByTestId('ranking-player').nth(1)).toHaveAttribute(
      'data-side',
      'B',
    );
    await expect(page.getByTestId('ranking-goalkeepers')).toContainText('8,0');
    await expect(page.getByTestId('ranking-creativity')).toHaveCount(0);
  });

  test('só ranking, sem estatísticas: a aba existe e mostra os melhores', async ({
    page,
  }) => {
    await setup(page, { ranking: RANKING });
    await page.getByTestId('match-tab-stats').click();
    await expect(page.getByTestId('match-ranking')).toBeVisible();
    await expect(page.getByTestId('stat-group-gol')).toHaveCount(0);
  });

  test('sem ranking: a aba de estatísticas não mostra o bloco', async ({
    page,
  }) => {
    await setup(page, { stats: STATS });
    await page.getByTestId('match-tab-stats').click();
    await expect(page.getByTestId('match-ranking')).toHaveCount(0);
  });
});
