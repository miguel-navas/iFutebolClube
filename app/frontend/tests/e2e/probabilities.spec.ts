import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const calibration = [
  { bin: '20-30%', n: 40, predicted: 0.25, observed: 0.2 },
  { bin: '40-50%', n: 10, predicted: 0.45, observed: 0.5 },
];

const file = {
  model: {
    name: 'Elo + gols por Poisson',
    description: 'Rating Elo e gols por Poisson.',
    params: { simulations: 1000 },
    limitations: ['Chaveamento simplificado.'],
  },
  validation: {
    targetPp: 5,
    edition: { label: 'Copa 2026', matches: 104, errorPp: 7.2, noiseMedianPp: 4.4, noiseP90Pp: 6.6 },
    pooled: { label: 'Copas 2006 a 2026', matches: 424, errorPp: 4.5, noiseMedianPp: 2.3, noiseP90Pp: 3.5 },
    byType: [
      { label: 'Eliminatórias', matches: 2500, errorPp: 1.4, noiseMedianPp: 0.9, noiseP90Pp: 1.4 },
      { label: 'Amistosos', matches: 1642, errorPp: 2.4, noiseMedianPp: 1.2, noiseP90Pp: 1.8 },
    ],
    accuracy: 0.615,
    brier: 0.55,
    brierBaseline: 0.6667,
    championName: 'Espanha',
    calibration,
  },
  stages: ['16-avos', 'Campeã'],
  teams: [
    { code: 'BRA', name: 'Brasil', group: 'C', rating: 1728, probs: [0.94, 0.1], reached: 1 },
    { code: 'ESP', name: 'Espanha', group: 'H', rating: 1632, probs: [0.88, 0.04], reached: 2 },
    { code: 'NED', name: 'Holanda', group: 'F', rating: 1794, probs: [0.95, 0.19], reached: 1 },
  ],
  matches: [{ id: 1, teamA: 'MEX', teamB: 'RSA', pA: 0.46, pD: 0.26, pB: 0.28, result: 'A' }],
};

async function setup(page: Page, body: unknown = file) {
  await page.route('**/data/editions/copa-2026/probabilities.json', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }),
  );
  await page.goto('/copa/2026/probabilidades');
}

test.describe('tela de probabilidades', () => {
  test('Nations League: abre em vencer o grupo, sem destaque dourado', async ({ page }) => {
    const nl = {
      ...file,
      edition: { competition: 'nations-league', year: '2027' },
      validation: { ...file.validation, championName: undefined, edition: { ...file.validation.edition, label: 'Nations League 2026/27' } },
      stages: ['Vencer o grupo', 'Top 2'],
      teams: [
        { code: 'FRA', name: 'França', group: 'A1', rating: 1900, probs: [0.7, 0.97], reached: null },
        { code: 'ITA', name: 'Itália', group: 'A1', rating: 1850, probs: [0.2, 0.5], reached: null },
      ],
    };
    await page.route('**/data/editions/nations-league-2027/probabilities.json', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(nl) }),
    );
    await page.goto('/nations-league/2027/probabilidades');
    await expect(page.getByTestId('prob-row').first()).toContainText('França');
    await expect(page.getByTestId('prob-row').first()).toContainText('70%');
    await expect(page.getByText('Calibração (Nations League 2026/27)')).toBeVisible();
  });

  test('sem arquivo: mostra o aviso e nenhuma lista', async ({ page }) => {
    await page.goto('/copa/2026/probabilidades');
    await expect(page.getByTestId('prob-missing')).toBeVisible();
    await expect(page.getByTestId('prob-list')).toHaveCount(0);
  });

  test('menu tem Probabilidades e leva à tela', async ({ page }) => {
    await page.goto('/copa/2026');
    await page.locator('nav').getByRole('link', { name: 'Probabilidades' }).first().click();
    await expect(page).toHaveURL(/\/copa\/2026\/probabilidades$/);
  });

  test('lista todas as seleções por chance de ser campeã e destaca a campeã real', async ({ page }) => {
    await setup(page);
    await expect(page.getByTestId('prob-row')).toHaveCount(3);
    await expect(page.getByTestId('prob-row').first()).toContainText('Holanda');
    await expect(page.getByTestId('prob-row').first()).toContainText('19%');
  });

  test('trocar a fase reordena a lista', async ({ page }) => {
    await setup(page);
    await page.getByTestId('prob-stage').selectOption({ label: '16-avos' });
    await expect(page.getByTestId('prob-row').first()).toContainText('Holanda');
    await expect(page.getByTestId('prob-row').nth(1)).toContainText('Brasil');
  });

  test('mostra a validação e a tabela de calibração', async ({ page }) => {
    await setup(page);
    await expect(page.getByTestId('prob-validation')).toContainText('4,5 pontos');
    await expect(page.getByTestId('prob-calibration').locator('tbody tr')).toHaveCount(2);
  });

  test('mostra o erro por tipo de competição', async ({ page }) => {
    await setup(page);
    await expect(page.getByTestId('prob-by-type').locator('tbody tr')).toHaveCount(2);
    await expect(page.getByTestId('prob-by-type')).toContainText('Eliminatórias');
  });

  test('Nations League tem a seção no menu', async ({ page }) => {
    await page.goto('/nations-league/2027');
    await expect(page.locator('nav').getByRole('link', { name: 'Probabilidades' }).first()).toBeVisible();
  });
});
