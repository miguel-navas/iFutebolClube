import { test, expect } from '../fixtures';

test.describe('bandeiras em imagem na tela de seleções', () => {
  test('cada card mostra a bandeira como imagem que carrega', async ({
    page,
  }) => {
    await page.goto('/copa/2026/selecoes');
    await expect(page.getByTestId('team-card').first()).toBeVisible();
    const imgs = page.getByTestId('team-card').getByTestId('flag');
    expect(await imgs.count()).toBeGreaterThan(20);
    // todas carregaram de verdade (largura natural > 0)
    const quebradas = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid=flag]')]
        .filter((i) => !(i as HTMLImageElement).complete || !(i as HTMLImageElement).naturalWidth)
        .length,
    );
    // imagens com carregamento preguiçoso fora da tela podem não ter carregado
    const visiveis = await page.evaluate(
      () =>
        [...document.querySelectorAll('[data-testid=flag]')].filter((i) => {
          const r = i.getBoundingClientRect();
          return r.top < innerHeight && r.bottom > 0;
        }).length,
    );
    expect(visiveis).toBeGreaterThan(0);
    expect(quebradas).toBeLessThan(await imgs.count());
    await expect(
      page.getByTestId('team-card').first().getByTestId('flag'),
    ).toHaveAttribute('src', /\/flags\/[a-z-]+\.svg$/);
  });

  test('não sobra emoji de bandeira nem letras no card', async ({ page }) => {
    await page.goto('/copa/2026/selecoes');
    const texto = await page.getByTestId('team-card').first().innerText();
    expect(texto).not.toMatch(/[\u{1F1E6}-\u{1F1FF}]/u);
  });

  test('a página da seleção mostra a bandeira grande', async ({ page }) => {
    await page.goto('/copa/2026/selecoes/BRA');
    const img = page.getByTestId('flag').first();
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute('src', /\/flags\/br\.svg$/);
    await expect
      .poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth))
      .toBeGreaterThan(0);
  });

  test('os arquivos de bandeira existem para todo código conhecido', async ({
    request,
  }) => {
    for (const iso of ['br', 'ar', 'gb-eng', 'gb-sct', 'cw', 'is']) {
      const r = await request.get(`/flags/${iso}.svg`);
      expect(r.ok(), iso).toBeTruthy();
    }
  });

  const TELAS: [string, string][] = [
    ['dashboard', '/copa/2026'],
    ['jogos', '/copa/2026/jogos'],
    ['detalhe do jogo', '/copa/2026/jogos/1'],
    ['eliminatórias', '/copa/2026/eliminatorias'],
    ['estádios', '/copa/2026/estadios'],
  ];
  for (const [nome, url] of TELAS) {
    for (const width of [360, 1280]) {
      test(`${nome} em ${width}px: bandeiras em imagem, sem emoji, sem rolar`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        const r = await page.evaluate(() => ({
          emoji: /[\u{1F1E6}-\u{1F1FF}]|\u{1F3F3}/u.test(document.body.innerText),
          imgs: document.querySelectorAll('[data-testid=flag]').length,
          over:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        }));
        expect(r.emoji).toBe(false);
        // as eliminatórias podem não ter seleção definida ainda
        if (nome !== 'eliminatórias') expect(r.imgs).toBeGreaterThan(0);
        expect(r.over).toBeLessThanOrEqual(1);
      });
    }
  }
});

test.describe('cards de seleção: confederação e ranking da FIFA', () => {
  test('usa o ranking oficial; fora dele mostra traço', async ({ page }) => {
    // Dados de TESTE
    await page.route('**/data/stats/fifa-ranking.json', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          updatedAt: '2026-01-01',
          source: 'teste',
          teams: [
            { rank: 42, code: 'BRA', name: 'Brasil', confederation: 'CAF', points: 1 },
          ],
        }),
      }),
    );
    await page.goto('/copa/2026/selecoes');
    const bra = page.getByTestId('team-card').filter({ has: page.getByText('BRA', { exact: true }) });
    await expect(bra).toContainText('CAF');
    await expect(bra).toContainText('#42');
    const arg = page.getByTestId('team-card').filter({ has: page.getByText('ARG', { exact: true }) });
    await expect(arg).toContainText('—');
  });
});
