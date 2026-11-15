import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { detailFixture, squadFixture } from '../fixtures-match';

// Dados de TESTE: não são o resultado de nenhum torneio real.
const json = (body: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});
const ed = (year: number) => ({
  year,
  label: `Copa ${year}`,
  host: 'País Teste',
  champion: 'Campeã Teste',
  runnerUp: 'Vice Teste',
  teams: 32,
  matches: 64,
  goals: 160,
  attendanceTotal: 3000000,
  attendanceAverage: 46875,
  topScorers: [{ player: 'Artilheiro Teste', team: 'Campeã Teste', goals: 8 }],
  biggestWin: { home: 'A', away: 'B', score: '7-0' },
});
const statsSnapshot = (extra: Record<string, unknown> = {}) => ({
  generatedAt: '2026-11-01T12:00:00Z',
  editions: [ed(2018), ed(2022)],
  nextEdition: null,
  ...extra,
});
const mockStats = (page: Page, body: unknown) =>
  page.route('**/data/stats/copa.json', (r) => r.fulfill(json(body)));
const standing = (code: string) => ({
  code,
  played: 1,
  won: 1,
  drawn: 0,
  lost: 0,
  goalsFor: 1,
  goalsAgainst: 0,
  goalDifference: 1,
  points: 3,
});
const m = (id: number, extra: Record<string, unknown>) => ({
  id,
  date: '2026-07-01',
  time: '16:00',
  teamA: 'BRA',
  teamB: 'FRA',
  scoreA: 1,
  scoreB: 1,
  group: '',
  stadium: 'Estádio Teste',
  city: 'Cidade Teste',
  stage: 'Oitavas de final',
  ...extra,
});
const edition = {
  generatedAt: '2026-11-04T22:00:00Z',
  teams: [
    { code: 'BRA', name: 'Brasil', group: 'A' },
    { code: 'FRA', name: 'França', group: 'A' },
  ],
  groups: [{ name: 'A', standings: [standing('BRA'), standing('FRA')] }],
  matches: [
    m(1, { group: 'A', stage: 'Fase de Grupos', scoreA: 2, scoreB: 0 }),
    m(10, { stage: 'Oitavas de final', penaltiesA: 4, penaltiesB: 3 }),
    m(11, { stage: 'Final', scoreA: 3, scoreB: 2, date: '2026-07-19' }),
    m(12, { stage: 'Semifinal', scoreA: 2, scoreB: 0, date: '2026-07-14' }),
  ],
};

async function setup(page: Page) {
  await page.route('**/data/editions/copa-2026.json', (r) =>
    r.fulfill(json(edition)),
  );
  await page.route('**/data/editions/copa-2026/matches/10.json', (r) =>
    r.fulfill(json(detailFixture({ id: 10 }))),
  );
  await page.route('**/data/editions/copa-2026/teams/BRA.json', (r) =>
    r.fulfill(json(squadFixture())),
  );
}

test.describe('eliminatórias', () => {
  test('monta a chave em árvore e leva ao jogo', async ({ page }) => {
    await setup(page);
    await page.goto('/copa/2026/eliminatorias');
    await expect(page.getByTestId('bracket-tree')).toBeVisible();
    const left = page.locator('[data-testid=bracket-column][data-side=left]');
    const right = page.locator('[data-testid=bracket-column][data-side=right]');
    await expect(left).toHaveCount(3);
    await expect(right).toHaveCount(3);
    await expect(left.nth(0)).toHaveAttribute('data-round', 'Oitavas de final');
    await expect(left.nth(2)).toHaveAttribute('data-round', 'Semifinal');
    // espelhado: a semifinal fica junto ao centro dos dois lados
    await expect(right.nth(0)).toHaveAttribute('data-round', 'Semifinal');
    await expect(right.nth(2)).toHaveAttribute(
      'data-round',
      'Oitavas de final',
    );
    await expect(page.getByTestId('bracket-final')).toContainText('Brasil');
    await expect(page.getByTestId('bracket-final')).toContainText('3');
    await expect(page.getByTestId('bracket-match')).toHaveCount(3);
    await expect(page.getByTestId('bracket-slot-empty').first()).toBeVisible();
    const pens = page.getByTestId('bracket-match').filter({ hasText: /\(4\)/ });
    await expect(pens).toHaveCount(1);
    await pens.click();
    await expect(page).toHaveURL(/\/copa\/2026\/jogos\/10$/);
    await expect(page.getByTestId('match-penalties')).toContainText('4');
    await page.getByTestId('match-back').click();
    await expect(page).toHaveURL(/eliminatorias/);
  });
});

test.describe('largura da chave', () => {
  test('usa toda a largura disponível e não corta a tela', async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width: 1920, height: 1000 });
    await page.goto('/copa/2026/eliminatorias');
    await expect(page.getByTestId('bracket-page')).toHaveAttribute(
      'data-layout',
      'full',
    );
    const tree = await page.getByTestId('bracket-tree').boundingBox();
    const area = await page.getByTestId('bracket-page').boundingBox();
    expect(tree!.width).toBeGreaterThan(area!.width - 110);
    expect(area!.width).toBeGreaterThan(1500);
    const overflow = await page
      .getByTestId('bracket-tree')
      .evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('em tela estreita a chave rola na horizontal', async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width: 600, height: 900 });
    await page.goto('/copa/2026/eliminatorias');
    const overflow = await page
      .getByTestId('bracket-tree')
      .evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeGreaterThan(0);
  });

  test('a aba de estádios continua contida', async ({ page }) => {
    await setup(page);
    await page.goto('/copa/2026/estadios');
    await expect(page.getByTestId('bracket-page')).toHaveAttribute(
      'data-layout',
      'contained',
    );
  });
});

test.describe('janela do jogador', () => {
  test('rola só a lista de clubes, com o título fora', async ({ page }) => {
    const clubs = Array.from(
      { length: 30 },
      (_, i) => `Clube Teste ${i + 1} (${1990 + i}–${1991 + i})`,
    );
    const squad = squadFixture();
    const p = squad.players.find((x: { id: number }) => x.id === 9)!;
    (p as { clubs: string[] }).clubs = clubs;
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.route('**/data/editions/copa-2026.json', (r) =>
      r.fulfill(json(edition)),
    );
    await page.route('**/data/editions/copa-2026/teams/BRA.json', (r) =>
      r.fulfill(json(squad)),
    );
    await page.goto('/copa/2026/selecoes/BRA');
    await page
      .getByTestId('squad-player')
      .filter({ hasText: 'Jogador Teste 09' })
      .click();
    const list = page.getByTestId('clubs-list');
    await expect(list).toBeVisible();
    const info = await list.evaluate((el) => ({
      scroll: el.scrollHeight > el.clientHeight,
    }));
    expect(info.scroll).toBe(true);
    const outer = await page
      .getByTestId('player-modal')
      .locator('div.overflow-y-auto')
      .first()
      .evaluate((el) =>
        el.classList.contains('max-h-[90vh]')
          ? el.scrollHeight - el.clientHeight
          : -1,
      );
    expect(outer).toBeLessThanOrEqual(0);
    const title = await page.getByTestId('clubs-title').boundingBox();
    const box = await list.boundingBox();
    expect(title!.y + title!.height).toBeLessThanOrEqual(box!.y + 1);
    await list.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await expect(page.getByTestId('clubs-title')).toBeVisible();
  });
});

test.describe('ranking na página inicial', () => {
  const row = (
    code: string,
    name: string,
    confederation: string,
    points: number,
  ) => ({
    code,
    name,
    confederation,
    titles: 1,
    participations: 3,
    played: 10,
    won: 5,
    drawn: 2,
    lost: 3,
    goalsFor: 12,
    goalsAgainst: 8,
    points,
  });
  const ranking = [
    row('AAA', 'Time Um', 'UEFA', 30),
    row('BBB', 'Time Dois', 'CONMEBOL', 28),
    row('CCC', 'Time Três', 'UEFA', 20),
    row('DDD', 'Time Quatro', '', 10),
  ];

  test('filtra por confederação e recalcula a posição', async ({ page }) => {
    await mockStats(page, statsSnapshot({ ranking }));
    await page.goto('/');
    const rows = page.getByTestId('ranking-row');
    await expect(rows).toHaveCount(4);
    await expect(page.getByTestId('ranking-filter-AFC')).toHaveCount(0);
    await page.getByTestId('ranking-filter-UEFA').click();
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(1)).toContainText('Time Três');
    await expect(rows.nth(1).locator('td').first()).toHaveText('2');
    await page.getByTestId('ranking-filter-Geral').click();
    await expect(rows).toHaveCount(4);
  });

  test('celular: a confederação vira um campo de lista e filtra igual', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockStats(page, statsSnapshot({ ranking }));
    await page.goto('/');
    const rows = page.getByTestId('ranking-row');
    await expect(rows).toHaveCount(4);
    await expect(page.getByTestId('ranking-filter-UEFA')).toBeHidden();
    await page.getByTestId('ranking-filter-select').selectOption('UEFA');
    await expect(rows).toHaveCount(2);
    await page.getByTestId('ranking-filter-select').selectOption('Geral');
    await expect(rows).toHaveCount(4);
  });

  test('sem ranking no arquivo, a seção não aparece', async ({ page }) => {
    await mockStats(page, statsSnapshot());
    await page.goto('/');
    await expect(page.getByTestId('edition-dashboard')).toBeVisible();
    await expect(page.getByTestId('ranking-section')).toHaveCount(0);
  });

  test('pagina de 10 em 10 e continua a numeração', async ({ page }) => {
    const many = Array.from({ length: 15 }, (_, i) =>
      row(`T${i}`, `Time ${i}`, 'UEFA', 100 - i),
    );
    await mockStats(page, statsSnapshot({ ranking: many }));
    await page.goto('/');
    await expect(page.getByTestId('ranking-row')).toHaveCount(10);
    await expect(page.getByTestId('ranking-prev')).toBeDisabled();
    await page.getByTestId('ranking-next').click();
    await expect(page.getByTestId('ranking-row')).toHaveCount(5);
    await expect(page.getByTestId('ranking-range')).toContainText('11–15 de 15');
    await expect(
      page.getByTestId('ranking-row').first().locator('td').first(),
    ).toHaveText('11');
    await expect(page.getByTestId('ranking-next')).toBeDisabled();
  });
});

test.describe('ranking da FIFA', () => {
  const fifa = (n = 12) => ({
    updatedAt: '2026-10-07',
    source: 'Fonte Teste',
    teams: Array.from({ length: n }, (_, i) => ({
      rank: i + 1,
      code: `F${String(i).padStart(2, '0')}`,
      name: `Seleção ${i + 1}`,
      confederation: i % 3 === 0 ? 'UEFA' : i % 3 === 1 ? 'CAF' : '',
      points: 2000 - i * 10.5,
    })),
  });
  const mockFifa = (page: Page, body: unknown) =>
    page.route('**/data/stats/fifa-ranking.json', (r) => r.fulfill(json(body)));

  test('abre no ranking da FIFA, com data e filtro de confederação', async ({
    page,
  }) => {
    await mockStats(page, statsSnapshot());
    await mockFifa(page, fifa());
    await page.goto('/');
    await expect(page.getByTestId('fifa-table')).toBeVisible();
    await expect(page.getByTestId('ranking-note')).toContainText(
      '07 de outubro de 2026',
    );
    await expect(page.getByTestId('fifa-row')).toHaveCount(10);
    await page.getByTestId('ranking-filter-CAF').click();
    const rows = page.getByTestId('fifa-row');
    await expect(rows).toHaveCount(4);
    await expect(rows.first().locator('td').first()).toHaveText('1');
    // a posição mundial continua visível dentro do filtro
    await expect(rows.first()).toContainText('2º');
    await expect(rows.first()).toContainText('1.989,50');
  });

  test('alterna para o ranking em Copas quando os dois existem', async ({
    page,
  }) => {
    await mockStats(
      page,
      statsSnapshot({
        ranking: [
          {
            code: 'AAA',
            name: 'Time Um',
            confederation: 'UEFA',
            titles: 1,
            participations: 2,
            played: 5,
            won: 3,
            drawn: 1,
            lost: 1,
            goalsFor: 6,
            goalsAgainst: 3,
            points: 10,
          },
        ],
      }),
    );
    await mockFifa(page, fifa());
    await page.goto('/');
    await page.getByTestId('ranking-mode-copas').click();
    await expect(page.getByTestId('ranking-table')).toBeVisible();
    await expect(page.getByTestId('fifa-table')).toHaveCount(0);
    await page.getByTestId('ranking-mode-fifa').click();
    await expect(page.getByTestId('fifa-table')).toBeVisible();
  });

  test('só com o ranking da FIFA, sem o seletor', async ({ page }) => {
    await mockStats(page, statsSnapshot());
    await mockFifa(page, fifa(3));
    await page.goto('/');
    await expect(page.getByTestId('fifa-row')).toHaveCount(3);
    await expect(page.getByTestId('ranking-mode-copas')).toHaveCount(0);
  });

  test('arquivo inválido é ignorado', async ({ page }) => {
    await mockStats(page, statsSnapshot());
    await mockFifa(page, { updatedAt: 'x', teams: [] });
    await page.goto('/');
    await expect(page.getByTestId('edition-dashboard')).toBeVisible();
    await expect(page.getByTestId('ranking-section')).toHaveCount(0);
  });
});

test.describe('navegação entre as etapas', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('celular: a chave rola de lado, as setas trocam a etapa e a barra fica fixa na rolagem vertical', async ({ page }) => {
    await setup(page);
    await page.goto('/copa/2026/eliminatorias');
    const atual = page.getByTestId('bracket-current');
    await expect(atual).toHaveText('Oitavas de final');
    await expect(page.getByTestId('bracket-prev')).toBeDisabled();
    const arvore = page.getByTestId('bracket-tree');
    const altura0 = Number(await arvore.getAttribute('data-height'));
    await page.getByTestId('bracket-next').click();
    await expect(atual).toHaveText('Quartas de final');
    await expect.poll(async () => Number(await arvore.getAttribute('data-height'))).toBeLessThan(altura0);
    await page.getByTestId('bracket-next').click();
    await expect(atual).toHaveText('Semifinal');
    await page.getByTestId('bracket-next').click();
    await expect(atual).toHaveText('Final');
    await expect(page.getByTestId('bracket-next')).toBeDisabled();
    await expect(page.getByTestId('bracket-final')).toBeVisible();
    await page.waitForTimeout(500);
    expect(await page.getByTestId('bracket-final').evaluate((el) => { const r = el.getBoundingClientRect(); return r.top > 0 && r.bottom < window.innerHeight && r.left >= 0 && r.right <= window.innerWidth; })).toBe(true);
    await page.getByTestId('bracket-prev').click();
    await expect(atual).toHaveText('Semifinal');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const nav = page.getByTestId('bracket-nav');
    expect(await nav.evaluate((el) => getComputedStyle(el).position)).toBe('sticky');
  });
});

test.describe('chave no computador', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('é espelhada, com a final no centro e sem as setas do celular', async ({ page }) => {
    await setup(page);
    await page.goto('/copa/2026/eliminatorias');
    await expect(page.getByTestId('bracket-center')).toBeVisible();
    await expect(page.getByTestId('bracket-final')).toBeVisible();
    await expect(page.getByTestId('bracket-nav')).toHaveCount(0);
    await expect(page.locator('[data-testid=bracket-column][data-side=right]')).toHaveCount(3);
  });
});
