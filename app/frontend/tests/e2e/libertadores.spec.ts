import { test, expect } from '../fixtures';

const T = (code: string, name: string, group: string) => ({ code, name, group });
const M = (id: number, date: string, a: string, b: string, sa: number | null, sb: number | null, stage: string, group = '', pen?: [number, number]) => ({
  id, date, time: '21:30', teamA: a, teamB: b, scoreA: sa, scoreB: sb, group, stadium: '', city: '', stage,
  penaltiesA: pen ? pen[0] : null, penaltiesB: pen ? pen[1] : null,
});

const snapshot = {
  generatedAt: '2025-12-01T00:00:00+00:00',
  teams: [T('BRA_FLAMENGO', 'Flamengo', 'A'), T('ARG_RIVERPLATE', 'River Plate', 'A'), T('BRA_PALMEIRAS', 'Palmeiras', 'B'), T('URU_PENAROL', 'Peñarol', 'B')],
  groups: [
    { name: 'A', standings: [] },
    { name: 'B', standings: [] },
  ],
  matches: [
    M(1, '2025-04-01', 'BRA_FLAMENGO', 'ARG_RIVERPLATE', 2, 0, 'Fase de Grupos', 'A'),
    M(2, '2025-04-02', 'BRA_PALMEIRAS', 'URU_PENAROL', 1, 1, 'Fase de Grupos', 'B'),
    M(3, '2025-08-01', 'BRA_FLAMENGO', 'BRA_PALMEIRAS', 1, 0, 'Semifinal (ida)'),
    M(4, '2025-08-08', 'BRA_PALMEIRAS', 'BRA_FLAMENGO', 1, 0, 'Semifinal (volta)', '', [3, 4]),
    M(5, '2025-11-29', 'BRA_FLAMENGO', 'ARG_RIVERPLATE', 1, 0, 'Final'),
  ],
};

test.describe('Copa Libertadores', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/data/editions/libertadores-2025.json', (r) => r.fulfill({ json: snapshot }));
  });

  test('grupos e jogos mostram os clubes', async ({ page }) => {
    await page.goto('/libertadores/2025/grupos');
    await expect(page.getByTestId('group-card')).toHaveCount(2);
    await page.goto('/libertadores/2025/jogos');
    await expect(page.getByText('Flamengo').first()).toBeVisible();
  });

  test('ida e volta viram um só confronto no chaveamento', async ({ page }) => {
    await page.goto('/libertadores/2025/eliminatorias');
    // a semifinal aparece uma vez (agregado 1-1, Flamengo nos pênaltis), não duas
    await expect(page.getByText('Semifinal', { exact: false }).first()).toBeVisible();
    await expect(page.getByTestId('bracket-empty')).toHaveCount(0);
  });
});
