import { test, expect } from '../fixtures';

test.describe('observações das Copas antigas', () => {
  test('1950: visão geral e eliminatórias explicam o grupo final', async ({ page }) => {
    await page.goto('/copa/1950');
    await expect(page.getByTestId('edition-notes')).toContainText('fase final em grupo');
    await page.goto('/copa/1950/eliminatorias');
    await expect(page.getByTestId('edition-notes')).toContainText('Não houve final');
  });

  test('1934: eliminatórias informam que não há aba Grupos', async ({ page }) => {
    await page.goto('/copa/1934/eliminatorias');
    await expect(page.getByTestId('edition-notes')).toContainText('não existe a aba Grupos');
  });

  test('2026 não mostra observações', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('edition-notes')).toHaveCount(0);
  });
});

test.describe('resultado final no dashboard', () => {
  test('mostra pódio, artilheiro e gols do summary.json', async ({ page }) => {
    await page.route('**/data/editions/copa-1970/summary.json', (route) =>
      route.fulfill({
        json: {
          champion: 'BRA', runnerUp: 'ITA', third: 'FRG', fourth: 'URU',
          topScorers: [{ name: 'Gerd MUELLER', team: 'FRG', goals: 10 }],
          totalGoals: 95, matches: 32,
        },
      }),
    );
    await page.goto('/copa/1970');
    await expect(page.getByTestId('podio-Campeão')).toContainText('BRA');
    await expect(page.getByTestId('podio-2º lugar')).toContainText('ITA');
    await expect(page.getByTestId('podio-4º lugar')).toContainText('URU');
    await expect(page.getByTestId('artilheiro')).toContainText('Gerd MUELLER');
    await expect(page.getByTestId('total-gols')).toContainText('95');
  });
});
