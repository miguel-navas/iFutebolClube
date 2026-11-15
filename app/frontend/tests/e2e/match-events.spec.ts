import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { detailFixture } from '../fixtures-match';

// Dados de TESTE: não são o resultado de nenhum torneio real.
const team = (code: string, name: string, group: string) => ({
  code,
  name,
  group,
});
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
const snapshot = (scoreA: number | null, scoreB: number | null) => ({
  generatedAt: '2026-11-04T22:00:00Z',
  teams: [team('BRA', 'Brasil', 'A'), team('FRA', 'França', 'A')],
  groups: [{ name: 'A', standings: [standing('BRA'), standing('FRA')] }],
  matches: [
    {
      id: 1,
      date: '2026-06-11',
      time: '16:00',
      teamA: 'BRA',
      teamB: 'FRA',
      scoreA,
      scoreB,
      group: 'A',
      stadium: 'Estádio Teste',
      city: 'Cidade Teste',
      stage: 'Fase de Grupos',
    },
  ],
});

async function setup(
  page: Page,
  opts: { scored?: boolean; detail?: unknown | 'missing' | 'invalid' } = {},
) {
  const scored = opts.scored ?? true;
  await page.route('**/data/editions/copa-2026.json', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(scored ? snapshot(2, 2) : snapshot(null, null)),
    }),
  );
  await page.route('**/data/editions/copa-2026/matches/1.json', (r) => {
    if (opts.detail === 'missing') return r.fulfill({ status: 404, body: 'x' });
    if (opts.detail === 'invalid')
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"events":"x"}',
      });
    return r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(opts.detail ?? detailFixture()),
    });
  });
  await page.goto('/copa/2026/jogos/1');
}

test.describe('linha do tempo', () => {
  test('lances em ordem, cada um no lado do seu time e com o minuto', async ({
    page,
  }) => {
    await setup(page);
    const rows = page.getByTestId('event');
    await expect(rows).toHaveCount(7);
    expect(
      await rows.evaluateAll((els) =>
        els.map((e) => e.getAttribute('data-minute')),
      ),
    ).toEqual(['30', '45', '45+2', '46', '70', '80', '88']);
    await expect(rows.nth(0)).toHaveAttribute('data-side', 'A');
    await expect(rows.nth(1)).toHaveAttribute('data-side', 'B');
    // lado A à esquerda, lado B à direita
    const box = async (i: number) =>
      (await rows
        .nth(i)
        .getByTestId(/event-/)
        .boundingBox())!;
    expect((await box(0)).x).toBeLessThan((await box(1)).x);
  });

  test('gol mostra artilheiro, assistência, pênalti e gol contra', async ({
    page,
  }) => {
    await setup(page);
    const rows = page.getByTestId('event');
    await expect(rows.nth(0)).toContainText('Atacante Alfa');
    await expect(rows.nth(0)).toContainText('Assistência: Meia Alfa');
    await expect(
      rows.nth(0).getByRole('img', { name: 'Gol', exact: true }),
    ).toBeVisible();
    await expect(rows.nth(1)).toContainText('(pênalti)');
    await expect(
      rows.nth(1).getByRole('img', { name: 'Gol de pênalti' }),
    ).toBeVisible();
    await expect(rows.nth(6)).toContainText('(contra)');
    await expect(
      rows.nth(6).getByRole('img', { name: 'Gol contra' }),
    ).toBeVisible();
  });

  test('três tipos de cartão com ícone próprio', async ({ page }) => {
    await setup(page);
    const rows = page.getByTestId('event');
    await expect(
      rows.nth(2).getByRole('img', { name: 'Cartão amarelo' }),
    ).toBeVisible();
    await expect(
      rows.nth(3).getByRole('img', { name: 'Cartão vermelho' }),
    ).toBeVisible();
    await expect(
      rows.nth(5).getByRole('img', { name: /Segundo amarelo/ }),
    ).toBeVisible();
  });

  test('substituição: quem sai em cima, quem entra embaixo, com o minuto', async ({
    page,
  }) => {
    await setup(page);
    const sub = page.getByTestId('event').nth(4);
    await expect(sub).toHaveAttribute('data-minute', '70');
    await expect(sub.getByTestId('sub-out')).toContainText('Atacante Alfa');
    await expect(sub.getByTestId('sub-in')).toContainText('Reserva Alfa');
    const out = (await sub.getByTestId('sub-out').boundingBox())!;
    const inn = (await sub.getByTestId('sub-in').boundingBox())!;
    expect(out.y).toBeLessThan(inn.y);
    await expect(
      sub.getByTestId('sub-out').getByRole('img', { name: 'Jogador que sai' }),
    ).toBeVisible();
    await expect(
      sub.getByTestId('sub-in').getByRole('img', { name: 'Jogador que entra' }),
    ).toBeVisible();
    await expect(sub).toContainText("70'");
  });
});

test.describe('escalações', () => {
  test('formação, técnico, titulares e reservas com camisa e capitão', async ({
    page,
  }) => {
    await setup(page);
    const a = page.getByTestId('lineup-A');
    await expect(a).toContainText('Brasil');
    await expect(a.getByTestId('formation')).toContainText('4-3-3');
    await expect(a.getByTestId('coach')).toContainText('Técnico Alfa');
    await expect(a.getByRole('heading', { name: 'Titulares' })).toBeVisible();
    await expect(a.getByRole('heading', { name: 'Reservas' })).toBeVisible();
    await expect(a.getByTestId('lineup-player')).toHaveCount(5);
    await expect(a.locator('[data-player-id="9"]')).toContainText('9');
    await expect(
      a.locator('[data-player-id="9"]').getByTestId('captain'),
    ).toBeVisible();
  });

  test("titular que fez gol e saiu: ícone de gol com 30' e de saída com 70'", async ({
    page,
  }) => {
    await setup(page);
    const row = page.getByTestId('lineup-A').locator('[data-player-id="9"]');
    await expect(row.getByTestId('mark-goal')).toContainText("30'");
    await expect(row.getByTestId('mark-off')).toContainText("70'");
  });

  test('reserva que entrou mostra o ícone de entrada com o minuto', async ({
    page,
  }) => {
    await setup(page);
    await expect(
      page
        .getByTestId('lineup-A')
        .locator('[data-player-id="12"]')
        .getByTestId('mark-on'),
    ).toContainText("70'");
  });

  test('jogador sem lances não tem ícones', async ({ page }) => {
    await setup(page);
    const row = page.getByTestId('lineup-A').locator('[data-player-id="1"]');
    await expect(row.getByRole('img')).toHaveCount(0);
  });

  test('cartões aparecem ao lado do jogador, com o minuto', async ({
    page,
  }) => {
    await setup(page);
    await expect(
      page
        .getByTestId('lineup-B')
        .locator('[data-player-id="30"]')
        .getByTestId('mark-card'),
    ).toContainText("45+2'");
  });
});

test.describe('legenda e informações', () => {
  test('legenda lista os oito ícones e explica o minuto', async ({ page }) => {
    await setup(page);
    const legend = page.getByTestId('match-legend');
    await expect(legend.getByTestId('legend-item')).toHaveCount(8);
    for (const name of [
      'Gol',
      'Gol de pênalti',
      'Gol contra',
      'Cartão amarelo',
      'Cartão vermelho',
      'Segundo amarelo (expulsão)',
      'Jogador que sai',
      'Jogador que entra',
    ]) {
      await expect(
        legend.getByRole('img', { name, exact: true }),
      ).toBeVisible();
    }
    await expect(legend).toContainText('minuto');
  });

  test('legenda fica abaixo das escalações', async ({ page }) => {
    await setup(page);
    const l = (await page.getByTestId('lineups').boundingBox())!;
    const g = (await page.getByTestId('match-legend').boundingBox())!;
    expect(g.y).toBeGreaterThan(l.y + l.height - 1);
  });

  test('árbitro e público', async ({ page }) => {
    await setup(page);
    await expect(page.getByTestId('match-fact-referee')).toContainText(
      'Árbitro Teste',
    );
    await expect(page.getByTestId('match-fact-attendance')).toContainText(
      '54.321',
    );
  });

  test('disputa de pênaltis com resultado e batedores', async ({ page }) => {
    await setup(page, {
      detail: detailFixture({
        penalties: { a: 4, b: 3 },
        events: [
          ...detailFixture().events,
          {
            type: 'goal',
            side: 'A',
            minute: '120',
            order: 1001,
            player: { id: 10, name: 'Meia Alfa' },
            kind: 'shootout',
          },
          {
            type: 'goal',
            side: 'B',
            minute: '120',
            order: 1002,
            player: { id: 29, name: 'Atacante Beta' },
            kind: 'shootout',
          },
        ],
      }),
    });
    await expect(page.getByTestId('shootout-score')).toHaveText('4 x 3');
    await expect(page.getByTestId('shootout-goal')).toHaveCount(2);
    await expect(page.getByTestId('event')).toHaveCount(7); // fora da linha do tempo
  });

  test('sem disputa de pênaltis não há a seção', async ({ page }) => {
    await setup(page);
    await expect(page.getByTestId('match-shootout')).toHaveCount(0);
  });
});

test.describe('sem detalhe', () => {
  for (const detail of ['missing', 'invalid'] as const) {
    test(`detalhe ${detail}: página normal e aviso`, async ({ page }) => {
      await setup(page, { detail });
      await expect(page.getByTestId('match-center')).toHaveText('2 - 2');
      await expect(page.getByTestId('match-detail-missing')).toBeVisible();
      await expect(page.getByTestId('timeline')).toHaveCount(0);
      await expect(page.getByTestId('match-legend')).toHaveCount(0);
    });
  }

  test('jogo sem placar: mensagem e sem linha do tempo', async ({ page }) => {
    await setup(page, { scored: false, detail: 'missing' });
    await expect(page.getByTestId('match-not-played')).toContainText(
      'depois que o jogo começar',
    );
    await expect(page.getByTestId('timeline')).toHaveCount(0);
  });

  test('jogo sem lances: aviso na lista', async ({ page }) => {
    await setup(page, { detail: detailFixture({ events: [] }) });
    await expect(page.getByTestId('timeline-empty')).toBeVisible();
  });
});

test('sem rolagem horizontal no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await setup(page);
  await expect(page.getByTestId('lineups')).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const a = (await page.getByTestId('lineup-A').boundingBox())!;
  const b = (await page.getByTestId('lineup-B').boundingBox())!;
  expect(b.y).toBeGreaterThan(a.y + a.height - 1); // empilhadas
});

test('detalhe do jogo: lances e escalações têm a mesma altura', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await setup(page);
  const right = page.getByTestId('match-lineups');
  await expect(right).toBeVisible();
  const a = await page.getByTestId('match-left').boundingBox();
  const b = await right.boundingBox();
  expect(a && b && Math.abs(a.height - b.height) < 2).toBe(true);
});
