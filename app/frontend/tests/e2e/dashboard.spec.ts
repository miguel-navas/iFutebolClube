import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

// Dados de TESTE: não são estatísticas reais e nunca são publicados em public/.
const edition = (year: number, extra: Record<string, unknown> = {}) => ({
  year,
  label: `Copa ${year}`,
  host: `Sede ${year}`,
  champion: `Campeã ${year}`,
  runnerUp: `Vice ${year}`,
  teams: 32,
  matches: 64,
  goals: 172,
  attendanceTotal: 3404252,
  attendanceAverage: 53191,
  topScorers: [
    { player: `Artilheiro A ${year}`, team: `Campeã ${year}`, goals: 8 },
    { player: `Artilheiro B ${year}`, team: 'Outra', goals: 6 },
  ],
  biggestWin: { home: 'Time X', away: 'Time Y', score: '7-0' },
  ...extra,
});

export const snapshot = (extra: Record<string, unknown> = {}) => ({
  generatedAt: '2026-11-01T12:00:00Z',
  editions: [edition(2014), edition(2018), edition(2022)],
  nextEdition: null,
  ...extra,
});

export async function mockStats(page: Page, body: unknown | null) {
  await page.route('**/data/stats/copa.json', (route) =>
    body === null
      ? route.fulfill({ status: 404, body: 'not found' })
      : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }),
  );
}

test('abre na última edição com todos os números', async ({ page }) => {
  await mockStats(page, snapshot());
  await page.goto('/');
  const dash = page.getByTestId('edition-dashboard');
  await expect(dash).toHaveAttribute('data-year', '2022');
  await expect(page.getByTestId('dashboard-title')).toHaveText('Copa 2022');
  await expect(page.getByTestId('dashboard-host')).toContainText('Sede 2022');
  await expect(page.getByTestId('dashboard-champion')).toHaveText('Campeã 2022');
  await expect(page.getByTestId('dashboard-runner-up')).toHaveText('Vice 2022');
  await expect(page.getByTestId('tile-teams')).toContainText('32');
  await expect(page.getByTestId('tile-matches')).toContainText('64');
  await expect(page.getByTestId('tile-goals')).toContainText('172');
  await expect(page.getByTestId('tile-goals-per-match')).toContainText('2,7');
  await expect(page.getByTestId('tile-attendance-total')).toContainText('3.404.252');
  await expect(page.getByTestId('tile-attendance-average')).toContainText('53.191');
  await expect(page.getByTestId('scorer')).toHaveCount(2);
  await expect(page.getByTestId('scorer').first()).toContainText('Artilheiro A 2022');
  await expect(page.getByTestId('biggest-win')).toContainText('Time X 7 x 0 Time Y');
});

test('última edição vale mesmo com o arquivo fora de ordem', async ({ page }) => {
  await mockStats(page, snapshot({ editions: [edition(2018), edition(2022), edition(2014)] }));
  await page.goto('/');
  await expect(page.getByTestId('edition-dashboard')).toHaveAttribute('data-year', '2022');
});

test('número ausente vira traço e não afeta os outros', async ({ page }) => {
  await mockStats(
    page,
    snapshot({
      editions: [edition(2022, { attendanceTotal: null, attendanceAverage: null, biggestWin: null, topScorers: [] })],
    }),
  );
  await page.goto('/');
  await expect(page.getByTestId('tile-attendance-total')).toContainText('—');
  await expect(page.getByTestId('tile-attendance-average')).toContainText('—');
  await expect(page.getByTestId('tile-goals')).toContainText('172');
  await expect(page.getByTestId('biggest-win-empty')).toBeVisible();
  await expect(page.getByTestId('scorers-empty')).toBeVisible();
});

test('sem arquivo mostra "Estatísticas em breve" e os links continuam', async ({ page }) => {
  await mockStats(page, null);
  await page.goto('/');
  await expect(page.getByTestId('stats-soon')).toHaveText('Estatísticas em breve');
  await expect(page.getByTestId('competition-copa')).toBeVisible();
  await expect(page.getByTestId('side-menu')).toBeVisible();
});

test.describe('seletor de anos', () => {
  test('lista os anos, do mais recente ao mais antigo, com o atual marcado', async ({ page }) => {
    await mockStats(page, snapshot());
    await page.goto('/');
    const buttons = page.getByTestId('year-selector').getByRole('button');
    await expect(buttons).toHaveText(['2022', '2018', '2014']);
    await expect(page.getByTestId('year-2022')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('year-2014')).toHaveAttribute('aria-pressed', 'false');
  });

  test('escolher 2014 troca o painel, marca o ano e registra no endereço', async ({ page }) => {
    await mockStats(page, snapshot());
    await page.goto('/');
    await page.getByTestId('year-2014').click();
    await expect(page).toHaveURL(/\?ano=2014$/);
    await expect(page.getByTestId('dashboard-title')).toHaveText('Copa 2014');
    await expect(page.getByTestId('dashboard-champion')).toHaveText('Campeã 2014');
    await expect(page.getByTestId('year-2014')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('year-2022')).toHaveAttribute('aria-pressed', 'false');
  });

  test('voltar para o ano mais recente', async ({ page }) => {
    await mockStats(page, snapshot());
    await page.goto('/?ano=2014');
    await expect(page.getByTestId('dashboard-title')).toHaveText('Copa 2014');
    await page.getByTestId('year-2022').click();
    await expect(page.getByTestId('dashboard-title')).toHaveText('Copa 2022');
  });

  test('o endereço com o ano abre direto naquela Copa e o botão Voltar funciona', async ({ page }) => {
    await mockStats(page, snapshot());
    await page.goto('/');
    await page.getByTestId('year-2018').click();
    await expect(page.getByTestId('dashboard-title')).toHaveText('Copa 2018');
    await page.goBack();
    await expect(page.getByTestId('dashboard-title')).toHaveText('Copa 2022');
  });

  for (const ano of ['1999', 'abc', '2030']) {
    test(`ano inválido (${ano}) mostra a última edição`, async ({ page }) => {
      await mockStats(page, snapshot());
      await page.goto(`/?ano=${ano}`);
      await expect(page.getByTestId('dashboard-title')).toHaveText('Copa 2022');
      await expect(page.getByTestId('year-2022')).toHaveAttribute('aria-pressed', 'true');
    });
  }

  test('sem arquivo não há seletor', async ({ page }) => {
    await mockStats(page, null);
    await page.goto('/');
    await expect(page.getByTestId('stats-soon')).toBeVisible();
    await expect(page.getByTestId('year-selector')).toHaveCount(0);
  });
});

test.describe('próxima Copa', () => {
  const next = (extra: Record<string, unknown> = {}) => ({
    year: 2030,
    label: 'Copa 2030',
    hosts: ['País Um', 'País Dois'],
    startDate: '2999-06-08',
    endDate: '2999-07-07',
    teams: 48,
    stadiums: [
      { name: 'Estádio Alfa', city: 'Cidade A', country: 'País Um', capacity: 80000 },
      { name: 'Estádio Beta', city: 'Cidade B', country: 'País Dois' },
    ],
    ...extra,
  });

  test('definida: mostra sede, datas, seleções, estádios e contagem', async ({ page }) => {
    await mockStats(page, snapshot({ nextEdition: next() }));
    await page.goto('/');
    const block = page.getByTestId('next-edition');
    await expect(block).toBeVisible();
    await expect(page.getByTestId('next-title')).toHaveText('Copa 2030');
    await expect(page.getByTestId('next-hosts')).toContainText('País Um · País Dois');
    await expect(page.getByTestId('next-dates')).toContainText('8 de jun. de 2999');
    await expect(page.getByTestId('next-dates')).toContainText('7 de jul. de 2999');
    await expect(page.getByTestId('next-teams')).toContainText('48 seleções');
    await expect(page.getByTestId('next-countdown')).toBeVisible();
    await expect(page.getByTestId('next-stadium')).toHaveCount(2);
    await expect(page.getByTestId('next-stadium').first()).toContainText('Estádio Alfa');
    await expect(page.getByTestId('next-stadium').first()).toContainText('Cidade A, País Um');
    await expect(page.getByTestId('next-stadium').first()).toContainText('80.000 lugares');
    await expect(page.getByTestId('next-stadium').nth(1)).toContainText('Cidade B, País Dois');
    // fica acima do dashboard
    const y = async (id: string) => (await page.getByTestId(id).boundingBox())!.y;
    expect(await y('next-edition')).toBeLessThan(await y('edition-dashboard'));
  });

  test('sem data de início: mostra o que se sabe e nenhuma contagem', async ({ page }) => {
    await mockStats(page, snapshot({ nextEdition: next({ startDate: undefined, endDate: undefined }) }));
    await page.goto('/');
    await expect(page.getByTestId('next-edition')).toBeVisible();
    await expect(page.getByTestId('next-hosts')).toBeVisible();
    await expect(page.getByTestId('next-dates')).toHaveCount(0);
    await expect(page.getByTestId('next-countdown')).toHaveCount(0);
  });

  test('sem estádios: não mostra a lista', async ({ page }) => {
    await mockStats(page, snapshot({ nextEdition: next({ stadiums: [] }) }));
    await page.goto('/');
    await expect(page.getByTestId('next-edition')).toBeVisible();
    await expect(page.getByTestId('next-stadiums')).toHaveCount(0);
  });

  test('não definida: o bloco não aparece', async ({ page }) => {
    await mockStats(page, snapshot({ nextEdition: null }));
    await page.goto('/');
    await expect(page.getByTestId('edition-dashboard')).toBeVisible();
    await expect(page.getByTestId('next-edition')).toHaveCount(0);
  });

  test('ano não maior que o da última edição é ignorado', async ({ page }) => {
    await mockStats(page, snapshot({ nextEdition: next({ year: 2022 }) }));
    await page.goto('/');
    await expect(page.getByTestId('next-edition')).toHaveCount(0);
  });

  test('o bloco continua ao trocar de ano e não há rolagem horizontal no celular', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await mockStats(page, snapshot({ nextEdition: next() }));
    await page.goto('/?ano=2014');
    await expect(page.getByTestId('next-edition')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('data de geração', () => {
  test('mostra "Dados de" com a data do arquivo', async ({ page }) => {
    await mockStats(page, snapshot());
    await page.goto('/');
    await expect(page.getByTestId('stats-generated-at')).toHaveText('Dados de 01/11/2026');
  });

  test('sem arquivo não há linha de data', async ({ page }) => {
    await mockStats(page, null);
    await page.goto('/');
    await expect(page.getByTestId('stats-soon')).toBeVisible();
    await expect(page.getByTestId('stats-generated-at')).toHaveCount(0);
  });
});
