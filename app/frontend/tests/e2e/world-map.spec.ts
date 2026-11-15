import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const ball = (page: Page, country: string) => page.locator(`.wc-ball[aria-label^="${country}:"]`);
const card = (page: Page) => page.getByTestId('wc-card');

async function openMap(page: Page) {
  await page.goto('/copa');
  await expect(page.locator('.wc-ball')).toHaveCount(19);
}

test.describe('mapa da Copa', () => {
  test('fundo azul-marinho, países preenchidos com contorno claro e sem serviço de tiles', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (r) => {
      if (!r.url().startsWith('http://localhost')) external.push(r.url());
    });
    const geo = page.waitForResponse('**/countries-50m.geojson');
    await openMap(page);
    expect((await geo).ok()).toBe(true);

    const bg = await page.getByTestId('wc-map').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgb(11, 18, 32)');

    await expect
      .poll(async () =>
        page.locator('.leaflet-overlay-pane canvas').evaluate((c: HTMLCanvasElement) => {
          const ctx = c.getContext('2d')!;
          const { data } = ctx.getImageData(0, 0, c.width, c.height);
          const near = (i: number, r: number, g: number, b: number) =>
            Math.abs(data[i] - r) < 14 && Math.abs(data[i + 1] - g) < 14 && Math.abs(data[i + 2] - b) < 14;
          let land = 0;
          let border = 0;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 200) continue;
            if (near(i, 24, 35, 61)) land++;
            else if (near(i, 71, 86, 119)) border++;
          }
          return land > 2000 && border > 0;
        }),
      )
      .toBe(true);

    expect(external.filter((u) => /tile|carto|openstreetmap|mapbox/i.test(u))).toEqual([]);
  });

  test('um marcador por país sede (19) e um cartão com os anos', async ({ page }) => {
    await openMap(page);
    for (const c of ['México', 'Japão', 'Coreia do Sul', 'Alemanha', 'Brasil']) await expect(ball(page, c)).toHaveCount(1);

    await ball(page, 'Brasil').hover();
    await expect(card(page)).toContainText('Brasil');
    await expect(card(page).locator('.wc-year')).toHaveText([/1950/, /2014/]);

    await ball(page, 'México').hover();
    await expect(card(page).locator('.wc-year')).toHaveText([/1970/, /1986/, /2026/]);

    await ball(page, 'Japão').hover();
    await expect(card(page).locator('.wc-year')).toHaveText([/2002/]);
    await ball(page, 'Alemanha').hover();
    await expect(card(page).locator('.wc-year')).toHaveText([/1974/, /2006/]);
  });

  test('o cartão continua aberto quando o mouse passa do marcador para ele', async ({ page }) => {
    await openMap(page);
    await ball(page, 'Brasil').hover();
    await expect(card(page)).toBeVisible();
    await card(page).locator('.wc-year').first().hover();
    await page.waitForTimeout(500);
    await expect(card(page)).toBeVisible();
    await page.mouse.move(5, 5);
    await expect(card(page)).toHaveCount(0);
  });

  test('ano com dados abre a edição; sem dados não faz nada', async ({ page }) => {
    await openMap(page);
    await ball(page, 'México').hover();
    const off = card(page).locator('.wc-year[data-year="1970"]');
    await expect(off).toHaveAttribute('aria-disabled', 'true');
    await expect(off).toContainText('Em breve');
    await off.click({ force: true });
    await expect(page).toHaveURL(/\/copa$/);

    await ball(page, 'Estados Unidos').hover();
    await card(page).locator('.wc-year[data-year="2026"]').click();
    await expect(page).toHaveURL(/\/copa\/2026$/);
  });

  test('teclado: foco mostra o cartão, Enter entra nele e abre a edição', async ({ page }) => {
    await openMap(page);
    await expect(ball(page, 'México')).toHaveAccessibleName('México: 1970, 1986, 2026');

    await ball(page, 'Brasil').focus();
    await expect(card(page)).toContainText('Brasil');
    await expect(card(page)).toContainText('Em breve');

    await ball(page, 'México').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.wc-year:focus')).toContainText('2026');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/copa\/2026$/);
  });

  test('Escape fecha o cartão e devolve o foco ao marcador', async ({ page }) => {
    await openMap(page);
    await ball(page, 'México').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.wc-year:focus')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(card(page)).toHaveCount(0);
    await expect(ball(page, 'México')).toBeFocused();
  });

  test('roda do mouse só dá zoom depois do clique; zoom separa a Europa', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 520 });
    await openMap(page);
    const map = page.getByTestId('wc-map');
    const box = (await map.boundingBox())!;

    const initialZoom = await map.getAttribute('data-zoom');
    await page.mouse.move(box.x + box.width / 2, box.y + 200);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(400);
    await expect(map).toHaveAttribute('data-zoom', initialZoom!); // antes do clique a roda não dá zoom

    await page.mouse.click(box.x + 25, box.y + box.height / 2); // oceano, sem marcador
    const italy = (await ball(page, 'Itália').boundingBox())!;
    await page.mouse.move(italy.x + italy.width / 2, italy.y + italy.height / 2);
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(120);
    }
    await expect.poll(async () => Number(await map.getAttribute('data-zoom'))).toBeGreaterThanOrEqual(5);

    const rects = [];
    for (const c of ['Itália', 'Suíça', 'França', 'Alemanha']) rects.push({ c, r: (await ball(page, c).boundingBox())! });
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].r;
        const b = rects[j].r;
        const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
        expect(overlap, `${rects[i].c} x ${rects[j].c}`).toBe(false);
      }
    }
  });
});

test.describe('integração com a página da Copa', () => {
  test('anos ativos nos cartões = edições da lista', async ({ page }) => {
    await openMap(page);
    const active = new Set<string>();
    for (const b of await page.locator('.wc-ball').all()) {
      await b.focus();
      for (const y of await card(page).locator('.wc-year[data-available="true"]').all()) active.add((await y.getAttribute('data-year'))!);
    }
    const listed = await page
      .locator('[data-testid^="edition-"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.replace('edition-', '')).sort());
    expect([...active].sort()).toEqual(listed);
  });

  test('edição sem dados aparece no cartão, mas não no hub, na lista nem no seletor', async ({ page }) => {
    await openMap(page);
    await ball(page, 'México').focus();
    await expect(card(page).locator('.wc-year[data-year="1970"]')).toHaveAttribute('data-available', 'false');
    await expect(page.getByTestId('edition-1970')).toHaveCount(0);

    await page.goto('/');
    await expect(page.getByTestId('competition-copa')).not.toContainText('1970');

    await page.goto('/copa/2026');
    await expect(page.getByLabel('Edição').locator('option[value="1970"]')).toHaveCount(0);
  });

  test('página sem rolagem horizontal em tablet (mapa) e celular (lista)', async ({ page }) => {
    for (const width of [820, 390]) {
      await page.setViewportSize({ width, height: 900 });
      if (width === 390) {
        await page.goto('/copa'); // no celular a página mostra a lista de edições, não o mapa
        await expect(page.getByTestId('host-edition-list')).toBeVisible();
      } else {
        await openMap(page);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), `largura ${width}`).toBe(false);
    }
  });
});
