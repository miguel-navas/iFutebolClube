import { test, expect } from '@playwright/test';
import { loadWorldCupStats } from '../../src/data/stats/source';
import {
  goalsPerMatch,
  latestEdition,
  upcomingEdition,
} from '../../src/data/stats/derive';
import { worldCupStatsSchema } from '../../src/data/stats/types';

// Dados de TESTE: não são estatísticas reais e nunca são publicados em public/.
const edition = (year: number, extra: Record<string, unknown> = {}) => ({
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
  ...extra,
});
const file = (extra: Record<string, unknown> = {}) => ({
  generatedAt: '2026-11-01T12:00:00Z',
  editions: [edition(2018), edition(2022)],
  nextEdition: null,
  ...extra,
});

const stubFetch = (impl: () => Promise<Response>) => {
  (globalThis as { fetch: unknown }).fetch = impl;
};
const realFetch = globalThis.fetch;
test.afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = realFetch;
});

test('arquivo válido é lido', async () => {
  stubFetch(async () => new Response(JSON.stringify(file()), { status: 200 }));
  const stats = await loadWorldCupStats();
  expect(stats?.editions).toHaveLength(2);
  expect(stats?.nextEdition).toBeNull();
});

test('404 devolve null', async () => {
  stubFetch(async () => new Response('nope', { status: 404 }));
  expect(await loadWorldCupStats()).toBeNull();
});

test('falha de rede devolve null', async () => {
  stubFetch(async () => {
    throw new TypeError('offline');
  });
  expect(await loadWorldCupStats()).toBeNull();
});

test('arquivo inválido devolve null', async () => {
  stubFetch(
    async () =>
      new Response(JSON.stringify({ editions: 'x' }), { status: 200 }),
  );
  expect(await loadWorldCupStats()).toBeNull();
  stubFetch(async () => new Response('<html>', { status: 200 }));
  expect(await loadWorldCupStats()).toBeNull();
});

test('números ausentes são aceitos como null', () => {
  const parsed = worldCupStatsSchema.parse(
    file({
      editions: [
        edition(2022, {
          attendanceTotal: null,
          attendanceAverage: null,
          biggestWin: null,
        }),
      ],
    }),
  );
  expect(parsed.editions[0].attendanceTotal).toBeNull();
});

test('gols por jogo é derivado com uma casa', () => {
  expect(goalsPerMatch({ goals: 172, matches: 64 })).toBe(2.7);
  expect(goalsPerMatch({ goals: null, matches: 64 })).toBeNull();
  expect(goalsPerMatch({ goals: 10, matches: 0 })).toBeNull();
});

test('última edição é a de maior ano, em qualquer ordem', () => {
  const stats = worldCupStatsSchema.parse(
    file({ editions: [edition(2022), edition(2014), edition(2018)] }),
  );
  expect(latestEdition(stats).year).toBe(2022);
});

test('próxima edição só vale se o ano for maior que o da última', () => {
  const next = {
    year: 2030,
    label: 'Copa 2030',
    hosts: ['Marrocos', 'Espanha', 'Portugal'],
  };
  const ok = worldCupStatsSchema.parse(file({ nextEdition: next }));
  expect(upcomingEdition(ok)?.year).toBe(2030);
  expect(upcomingEdition(ok)?.stadiums).toEqual([]);
  const old = worldCupStatsSchema.parse(
    file({ nextEdition: { ...next, year: 2022 } }),
  );
  expect(upcomingEdition(old)).toBeNull();
  expect(upcomingEdition(worldCupStatsSchema.parse(file()))).toBeNull();
});

test('ranking: opcional (padrão vazio) e validado quando presente', () => {
  const base = {
    generatedAt: '2026-11-01T12:00:00Z',
    editions: [edition(2022)],
    nextEdition: null,
  };
  expect(worldCupStatsSchema.parse(base).ranking).toEqual([]);
  const row = {
    code: 'AAA',
    name: 'Time Teste',
    confederation: '',
    titles: 0,
    participations: 1,
    played: 3,
    won: 1,
    drawn: 1,
    lost: 1,
    goalsFor: 3,
    goalsAgainst: 3,
    points: 4,
  };
  expect(
    worldCupStatsSchema.parse({ ...base, ranking: [row] }).ranking,
  ).toHaveLength(1);
  expect(
    worldCupStatsSchema.safeParse({
      ...base,
      ranking: [{ ...row, points: -1 }],
    }).success,
  ).toBe(false);
});

test('ranking FIFA: valida o formato do arquivo', async () => {
  const { fifaRankingSchema } = await import('../../src/data/stats/fifa');
  const team = {
    rank: 1,
    code: 'AAA',
    name: 'Time Teste',
    confederation: '',
    points: 1500.25,
  };
  expect(
    fifaRankingSchema.safeParse({ updatedAt: '2026-10-07', teams: [team] })
      .success,
  ).toBe(true);
  expect(
    fifaRankingSchema.safeParse({ updatedAt: '2026-10-07', teams: [] }).success,
  ).toBe(false);
  expect(
    fifaRankingSchema.safeParse({
      updatedAt: '2026-10-07',
      teams: [{ ...team, rank: 0 }],
    }).success,
  ).toBe(false);
});
