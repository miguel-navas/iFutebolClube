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

test.describe('fotos dos estádios', () => {
  test('Copa 2026: cartão e janela mostram a foto com o crédito', async ({ page }) => {
    await page.route('**/estadios/estadios.json', (route) =>
      route.fulfill({
        json: {
          'metlife-stadium-nova-york-nova-jersey': {
            name: 'MetLife Stadium', city: 'Nova York/Nova Jersey',
            photos: [
              { file: 'estadios/metlife.jpg', author: 'Fulano', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:X.jpg' },
              { file: 'estadios/metlife-2.jpg', author: 'Beltrano', license: 'CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:Y.jpg' },
            ],
            description: 'O MetLife Stadium é um estádio localizado em East Rutherford, Nova Jersey, inaugurado em 2010.',
            descriptionLang: 'pt', descriptionSource: 'https://pt.wikipedia.org/wiki/MetLife_Stadium', lat: 40.8135, lon: -74.0745,
          },
        },
      }),
    );
    await page.route('**/estadios/metlife*.jpg', (route) =>
      route.fulfill({ contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64') }),
    );
    await page.goto('/copa/2026/estadios');
    await expect(page.getByTestId('stadium-card-photo')).toHaveCount(1);
    await page.getByTestId('stadium-card').filter({ hasText: 'MetLife Stadium' }).click();
    await expect(page.getByTestId('stadium-photo')).toBeVisible();
    await expect(page.getByText('Foto: Fulano · CC BY-SA 4.0')).toBeVisible();
    await page.getByTestId('stadium-thumb').nth(1).click();
    await expect(page.getByText('Foto: Beltrano · CC BY 2.0')).toBeVisible();
    await expect(page.getByTestId('stadium-description')).toContainText('East Rutherford');
    await expect(page.getByTestId('stadium-about')).toContainText('Localização');
  });
});
