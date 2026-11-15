import { test, expect } from '../fixtures';

// Usa os dados embutidos (a fixture responde 404 aos arquivos exportados).
const PAGES: [string, string][] = [
  ['início', '/'],
  ['competição', '/copa-do-mundo'],
  ['edição', '/copa/2026'],
  ['jogos', '/copa/2026/jogos'],
  ['grupos', '/copa/2026/grupos'],
  ['seleções', '/copa/2026/selecoes'],
  ['seleção', '/copa/2026/selecoes/BRA'],
  ['jogadores', '/copa/2026/jogadores'],
  ['eliminatórias', '/copa/2026/eliminatorias'],
  ['estádios', '/copa/2026/estadios'],
];
const WIDTHS = [360, 768, 1280, 1920];

for (const [nome, url] of PAGES) {
  for (const width of WIDTHS) {
    test(`${nome} em ${width}px não rola na horizontal`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      const over = await page.evaluate(() => {
        // Só vale a página; chaves largas rolam dentro do próprio quadro.
        const d = document.documentElement;
        const scrollers = [...document.querySelectorAll('*')].filter(
          (e) =>
            getComputedStyle(e).overflowX === 'auto' ||
            getComputedStyle(e).overflowX === 'scroll',
        );
        const tree = document.querySelector('[data-testid=bracket-tree]');
        return {
          page: d.scrollWidth - d.clientWidth,
          inScroller: scrollers.some((e) => e.contains(tree)),
        };
      });
      expect(over.page).toBeLessThanOrEqual(1);
    });
  }
}

test.describe('largura útil em tela grande', () => {
  for (const [nome, url] of PAGES.filter(
    ([n]) => !['início', 'competição'].includes(n),
  )) {
    test(`${nome} ocupa a largura ao lado do menu`, async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1000 });
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      const largura = await page.evaluate(() => {
        const alvo = [...document.querySelectorAll('[class*="2xl:px-12"]')]
          .map((e) => e.getBoundingClientRect().width)
          .sort((a, b) => b - a)[0];
        return alvo ?? 0;
      });
      // viewport 1920 menos o menu lateral (≤ 300px)
      expect(largura).toBeGreaterThan(1920 - 320);
    });
  }

  test('início usa a largura toda', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1000 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const w = await page.evaluate(
      () => document.querySelector('main')?.getBoundingClientRect().width ?? 0,
    );
    expect(w).toBeGreaterThan(1920 - 320);
  });
});

test.describe('tela de grupos', () => {
  for (const width of [360, 768, 1280, 1920]) {
    test(`cards sem barra de rolagem em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/copa/2026/grupos');
      await expect(page.getByTestId('group-card').first()).toBeVisible();
      const sobras = await page.evaluate(
        () =>
          [...document.querySelectorAll('[data-testid=group-card] *')].filter(
            (e) => {
              const o = getComputedStyle(e).overflowX;
              return (
                (o === 'auto' || o === 'scroll') &&
                e.scrollWidth > e.clientWidth + 1
              );
            },
          ).length,
      );
      expect(sobras).toBe(0);
    });
  }

  test('nome da seleção sem letras de bandeira antes', async ({ page }) => {
    await page.goto('/copa/2026/grupos');
    const card = page.getByTestId('group-card').first();
    const linha = card.locator('tbody tr').first();
    // 1ª coluna é a posição; a 2ª começa direto no nome
    const texto = (await linha.locator('td').nth(1).innerText()).trim();
    expect(texto).toMatch(/^[\p{L}]{3,}/u);
    expect(texto).not.toMatch(/^[A-Z]{2}\s/);
    await expect(card.locator('td span.text-lg')).toHaveCount(0);
  });
});
