import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

// Dados de TESTE: não são o resultado de nenhum torneio real.
const snapshot = (extra: Record<string, unknown> = {}) => ({
  generatedAt: '2026-11-04T22:00:00Z',
  teams: [
    { code: 'BRA', name: 'Brasil', group: 'A' },
    { code: 'FRA', name: 'França', group: 'A' },
    { code: 'ARG', name: 'Argentina', group: 'A' },
    { code: 'XXX', name: 'Time Sem Bandeira', group: 'A' },
    { code: 'ESP', name: 'Espanha', group: 'B' },
    { code: 'ITA', name: 'Itália', group: 'B' },
  ],
  groups: [
    {
      name: 'A',
      standings: [
        {
          code: 'FRA',
          played: 2,
          won: 2,
          drawn: 0,
          lost: 0,
          goalsFor: 5,
          goalsAgainst: 1,
          goalDifference: 4,
          points: 6,
        },
        {
          code: 'BRA',
          played: 2,
          won: 1,
          drawn: 0,
          lost: 1,
          goalsFor: 3,
          goalsAgainst: 3,
          goalDifference: 0,
          points: 3,
        },
        {
          code: 'ARG',
          played: 2,
          won: 0,
          drawn: 1,
          lost: 1,
          goalsFor: 1,
          goalsAgainst: 3,
          goalDifference: -2,
          points: 1,
        },
        {
          code: 'XXX',
          played: 2,
          won: 0,
          drawn: 1,
          lost: 1,
          goalsFor: 1,
          goalsAgainst: 3,
          goalDifference: -2,
          points: 1,
        },
      ],
    },
    {
      name: 'B',
      standings: [
        {
          code: 'ESP',
          played: 1,
          won: 1,
          drawn: 0,
          lost: 0,
          goalsFor: 2,
          goalsAgainst: 0,
          goalDifference: 2,
          points: 3,
        },
        {
          code: 'ITA',
          played: 1,
          won: 0,
          drawn: 0,
          lost: 1,
          goalsFor: 0,
          goalsAgainst: 2,
          goalDifference: -2,
          points: 0,
        },
      ],
    },
  ],
  matches: [
    {
      id: 1,
      date: '2026-06-11',
      time: '16:00',
      teamA: 'BRA',
      teamB: 'FRA',
      scoreA: 2,
      scoreB: 1,
      group: 'A',
      stadium: 'Estádio Teste',
      city: 'Cidade Teste',
      stage: 'Fase de Grupos',
    },
    {
      id: 2,
      date: '2026-06-12',
      time: '18:00',
      teamA: 'ARG',
      teamB: 'XXX',
      scoreA: null,
      scoreB: null,
      group: 'A',
      stadium: 'Estádio Dois',
      city: 'Cidade Dois',
      stage: 'Fase de Grupos',
    },
    {
      id: 3,
      date: '2026-06-12',
      time: '21:00',
      teamA: 'ESP',
      teamB: 'ITA',
      scoreA: 2,
      scoreB: 0,
      group: 'B',
      stadium: 'Estádio Três',
      city: 'Cidade Três',
      stage: 'Fase de Grupos',
    },
  ],
  ...extra,
});

async function mockSnapshot(page: Page, body: unknown, delayMs = 0) {
  await page.route('**/data/editions/copa-2026.json', async (route) => {
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill(
      typeof body === 'string'
        ? { status: 200, contentType: 'text/html', body }
        : {
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(body),
          },
    );
  });
}

test.describe('dados da edição vindos do arquivo', () => {
  test('grupos, filtros e classificação do arquivo', async ({ page }) => {
    await mockSnapshot(page, snapshot());
    await page.goto('/copa/2026/grupos');
    await expect(page.getByTestId('group-card')).toHaveCount(2);
    await expect(
      page.getByRole('button', { name: /^Grupo [A-Z]$/ }),
    ).toHaveText(['Grupo A', 'Grupo B']);

    const rows = page.getByTestId('group-card').first().locator('tbody tr');
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0)).toContainText('França');
    await expect(rows.nth(0)).toContainText('6'); // pontos
    await expect(rows.nth(1)).toContainText('Brasil');
    await expect(rows.nth(3)).toContainText('Time Sem Bandeira');
    await expect(page.getByTestId('group-card').first()).toContainText(
      '2 jogos',
    );
  });

  test('tabela do grupo mostra só o nome, sem bandeira antes', async ({
    page,
  }) => {
    await mockSnapshot(page, snapshot());
    await page.goto('/copa/2026/grupos');
    const rows = page.getByTestId('group-card').first().locator('tbody tr');
    await expect(rows.nth(1)).toContainText('Brasil');
    await expect(rows.nth(1)).not.toContainText('🇧🇷');
    await expect(rows.nth(3)).toContainText('Time Sem Bandeira');
    await expect(rows.nth(3)).not.toContainText('🏳️');
  });

  test('lista de jogos do grupo mostra o placar e a página do jogo mostra "Encerrado"', async ({
    page,
  }) => {
    await mockSnapshot(page, snapshot());
    await page.goto('/copa/2026/grupos');
    await page.getByTestId('group-matches-toggle-A').click();
    const first = page
      .getByTestId('group-matches-A')
      .getByTestId('group-match')
      .first();
    await expect(first).toContainText('2 - 1');
    await expect(
      page.getByTestId('group-matches-A').getByTestId('group-match').nth(1),
    ).toContainText('18:00');
    await first.click();
    await expect(page).toHaveURL(/\/copa\/2026\/jogos\/1$/);
    await expect(page.getByTestId('match-center')).toHaveText('2 - 1');
    await expect(page.getByTestId('match-status')).toHaveText('Encerrado');
    await expect(page.getByTestId('match-team-a')).toContainText('Brasil');
    await expect(page.getByTestId('match-team-b')).toContainText('França');
    await expect(page.getByTestId('match-fact-stadium')).toContainText(
      'Estádio Teste',
    );
  });

  test('o endereço do jogo abre direto com os dados do arquivo', async ({
    page,
  }) => {
    await mockSnapshot(page, snapshot());
    await page.goto('/copa/2026/jogos/3');
    await expect(page.getByTestId('match-team-a')).toContainText('Espanha');
    await expect(page.getByTestId('match-center')).toHaveText('2 - 0');
  });

  test('as outras páginas da edição continuam abrindo', async ({ page }) => {
    await mockSnapshot(page, snapshot());
    for (const path of [
      '/copa/2026',
      '/copa/2026/jogos',
      '/copa/2026/selecoes',
      '/copa/2026/eliminatorias',
    ]) {
      await page.goto(path);
      await expect(page.locator('nav').first()).toBeVisible();
      await expect(page.getByTestId('edition-loading')).toHaveCount(0);
    }
  });

  test('mostra "Carregando" enquanto busca e depois a página', async ({
    page,
  }) => {
    await mockSnapshot(page, snapshot(), 800);
    await page.goto('/copa/2026/grupos');
    await expect(page.getByTestId('edition-loading')).toBeVisible();
    await expect(page.getByTestId('group-card')).toHaveCount(2);
    await expect(page.getByTestId('edition-loading')).toHaveCount(0);
  });
});

test.describe('arquivo ausente ou inválido', () => {
  test('arquivo ausente (404): dados embutidos, 12 grupos, sem erro', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/copa/2026/grupos');
    await expect(page.getByTestId('group-card')).toHaveCount(12);
    expect(errors).toEqual([]);
  });

  test('conteúdo que não é JSON (página HTML do site): dados embutidos', async ({
    page,
  }) => {
    await mockSnapshot(page, '<!doctype html><html></html>');
    await page.goto('/copa/2026/grupos');
    await expect(page.getByTestId('group-card')).toHaveCount(12);
  });

  test('JSON fora do formato: dados embutidos', async ({ page }) => {
    await mockSnapshot(page, { groups: 'x' });
    await page.goto('/copa/2026/grupos');
    await expect(page.getByTestId('group-card')).toHaveCount(12);
  });
});
