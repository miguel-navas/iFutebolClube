import { test, expect } from '../fixtures';

const T = (code: string, name: string) => ({ code, name, group: 'A' });
const M = (id: number, a: string, b: string, sa: number | null, sb: number | null, rodada: number) => ({
  id, date: `2026-02-${String(id).padStart(2, '0')}`, time: '20:00', teamA: a, teamB: b, scoreA: sa, scoreB: sb,
  group: 'A', stadium: '', city: '', stage: `Rodada ${rodada}`, penaltiesA: null, penaltiesB: null,
});
const st = (code: string, p: number, pts: number) => ({
  code, played: p, won: pts / 3, drawn: 0, lost: p - pts / 3, goalsFor: 3, goalsAgainst: 1, goalDifference: 2, points: pts,
});

const snapshot = {
  generatedAt: '2026-11-19T00:00:00+00:00',
  teams: [T('BRA_FLAMENGO', 'Flamengo'), T('BRA_PALMEIRAS', 'Palmeiras')],
  groups: [{ name: 'A', standings: [st('BRA_FLAMENGO', 2, 6), st('BRA_PALMEIRAS', 2, 3)] }],
  matches: [M(1, 'BRA_FLAMENGO', 'BRA_PALMEIRAS', 2, 1, 1), M(2, 'BRA_PALMEIRAS', 'BRA_FLAMENGO', null, null, 2)],
};

test.describe('Brasileirão Série A', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/data/editions/brasileirao-2026.json', (r) => r.fulfill({ json: snapshot }));
  });

  test('classificação é uma tabela única, sem bandeiras', async ({ page }) => {
    await page.goto('/brasileirao/2026/grupos');
    await expect(page.getByRole('heading', { name: 'Classificação' })).toBeVisible();
    await expect(page.getByTestId('group-card')).toHaveCount(1);
    await expect(page.getByText('Flamengo').first()).toBeVisible();
    await expect(page.getByTestId('flag')).toHaveCount(0);
  });

  test('sem eliminatórias nem jogadores no menu', async ({ page }) => {
    await page.goto('/brasileirao/2026');
    await expect(page.getByRole('link', { name: 'Eliminatórias' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Jogadores' })).toHaveCount(0);
  });
});
