import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const toggle = (page: Page) => page.getByTestId('side-menu-toggle');
const near = (a: number, b: number, tol = 2) => Math.abs(a - b) <= tol;

test.describe('menu lateral', () => {
  test('Copa: início, três competições, Copa destacada e a edição 2026', async ({ page }) => {
    await page.goto('/copa');
    const menu = page.getByTestId('side-menu');
    await expect(menu.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/');
    for (const slug of ['copa', 'eurocopa', 'nations-league']) await expect(page.getByTestId(`menu-competition-${slug}`)).toBeVisible();
    await expect(page.getByTestId('menu-competition-copa')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('menu-competition-eurocopa')).not.toHaveAttribute('aria-current', 'page');
    await expect(menu.getByTestId('edition-2026')).toBeVisible();
    await expect(menu.getByTestId('menu-em-breve')).toHaveCount(0);
  });

  test('clicar na competição aberta recolhe as edições e clicar de novo abre', async ({ page }) => {
    await page.goto('/eurocopa');
    const link = page.getByTestId('menu-competition-eurocopa');
    await expect(page.getByTestId('edition-2024')).toBeVisible();
    await link.click();
    await expect(page.locator('[data-testid^="edition-"]')).toHaveCount(0);
    await expect(link).toHaveAttribute('aria-expanded', 'false');
    await link.click();
    await expect(page.getByTestId('edition-2024')).toBeVisible();
    // trocar de competição abre a outra normalmente
    await page.getByTestId('menu-competition-nations-league').click();
    await expect(page).toHaveURL(/\/nations-league$/);
    await expect(page.getByTestId('edition-2027')).toBeVisible();
  });

  test('Eurocopa lista as edições e não mostra "Em breve"', async ({ page }) => {
    await page.goto('/eurocopa');
    await expect(page.getByTestId('menu-em-breve')).toHaveCount(0);
    await expect(page.locator('[data-testid^="edition-"]')).toHaveCount(17);
    await expect(page.getByTestId('edition-2024')).toBeVisible();
  });

  test('recolher esconde os links, mantém o botão, e o estado sobrevive ao recarregar', async ({ page }) => {
    await page.goto('/copa');
    await expect(toggle(page)).toHaveAccessibleName('Fechar menu');
    await toggle(page).click();
    await expect(toggle(page)).toHaveAccessibleName('Abrir menu');
    await expect(toggle(page)).toBeVisible();
    await expect(page.locator('#side-menu a')).toHaveCount(0);

    await page.reload();
    await expect(toggle(page)).toHaveAccessibleName('Abrir menu');
    await expect(page.locator('#side-menu a')).toHaveCount(0);

    await toggle(page).click();
    await expect(page.getByTestId('menu-competition-copa')).toBeVisible();
  });

  test('menu recolhido não entra na navegação por teclado', async ({ page }) => {
    await page.goto('/copa');
    await toggle(page).click();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('#side-menu'))).toBe(false);
    }
  });

  test('padrão por largura: aberto no desktop, fechado no celular', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/copa');
    await expect(toggle(page)).toHaveAccessibleName('Abrir menu');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(toggle(page)).toHaveAccessibleName('Fechar menu');
  });
});

test.describe('mapa em tela cheia', () => {
  test('ocupa a área ao lado do menu, sem rolagem, e cresce ao recolher', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/copa');
    await expect(page.locator('.wc-ball')).toHaveCount(19);
    const map = page.getByTestId('wc-map');
    const menuWidth = (await page.getByTestId('side-menu').boundingBox())!.width;

    const open = (await map.boundingBox())!;
    expect(near(open.x, menuWidth)).toBe(true);
    expect(near(open.width, 1280 - menuWidth)).toBe(true);
    expect(near(open.height, 800)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    const ballOffset = async () => {
      const m = (await map.boundingBox())!;
      const b = (await page.locator('.wc-ball[aria-label^="Brasil:"]').boundingBox())!;
      return { dx: b.x + b.width / 2 - (m.x + m.width / 2), dy: b.y + b.height / 2 - (m.y + m.height / 2) };
    };
    const zoomOf = async () => Number(await map.getAttribute('data-zoom'));
    const before = await ballOffset();
    const zoomBefore = await zoomOf();

    await toggle(page).click();
    await expect.poll(async () => Math.round((await map.boundingBox())!.width)).toBe(1280);
    const closed = (await map.boundingBox())!;
    expect(near(closed.x, 0)).toBe(true);
    expect(near(closed.height, 800)).toBe(true);

    // o mapa pode ampliar para cobrir a área maior; o marcador acompanha o país na mesma proporção
    const scale = 2 ** ((await zoomOf()) - zoomBefore);
    const after = await ballOffset();
    expect(near(after.dx, before.dx * scale, 4)).toBe(true);
    expect(near(after.dy, before.dy * scale, 4)).toBe(true);
  });
});

test.describe('menu na tela inicial', () => {
  test('tela inicial tem menu lateral com Início destacado e as três competições', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 800 });
    await page.addInitScript(() => localStorage.removeItem('ifc:side-menu-open'));
    await page.goto('/');
    await expect(page.getByTestId('side-menu')).toBeVisible();
    await expect(page.getByTestId('menu-home')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId(/^menu-competition-/)).toHaveCount(3);
    await expect(page.getByTestId('competition-copa')).toBeVisible();
  });

  test('recolher na tela inicial mantém o botão e a escolha vale em /copa', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 800 });
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.removeItem('ifc:side-menu-open');
        sessionStorage.setItem('seeded', '1');
      }
    });
    await page.goto('/');
    await page.getByTestId('side-menu-toggle').click();
    await expect(page.getByTestId('menu-home')).toHaveCount(0);
    await expect(page.getByTestId('side-menu-toggle')).toBeVisible();
    await page.goto('/copa');
    await expect(page.getByTestId('menu-home')).toHaveCount(0);
  });
});
