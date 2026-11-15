import { test, expect } from '@playwright/test';
import { flagEmoji } from '../../src/lib/flags';
import { buildDataset } from '../../src/data/edition/build';
import { editionSnapshotSchema } from '../../src/data/edition/types';
import { loadEditionSnapshot } from '../../src/data/edition/source';
import { getEdition } from '../../src/data/registry';

// Dados de TESTE: não são o resultado de nenhum torneio real.
const snap = (extra: Record<string, unknown> = {}) => ({
  generatedAt: '2026-11-04T22:00:00Z',
  teams: [
    { code: 'BRA', name: 'Brasil', group: 'A' },
    { code: 'FRA', name: 'França', group: 'A' },
    { code: 'ZZZ', name: 'Time Novo', group: 'B' },
  ],
  groups: [
    {
      name: 'B',
      standings: [
        {
          code: 'ZZZ',
          played: 1,
          won: 1,
          drawn: 0,
          lost: 0,
          goalsFor: 2,
          goalsAgainst: 0,
          goalDifference: 2,
          points: 3,
        },
      ],
    },
    {
      name: 'A',
      standings: [
        {
          code: 'FRA',
          played: 1,
          won: 1,
          drawn: 0,
          lost: 0,
          goalsFor: 3,
          goalsAgainst: 1,
          goalDifference: 2,
          points: 3,
        },
        {
          code: 'BRA',
          played: 1,
          won: 0,
          drawn: 0,
          lost: 1,
          goalsFor: 1,
          goalsAgainst: 3,
          goalDifference: -2,
          points: 0,
        },
      ],
    },
  ],
  matches: [
    {
      id: 2,
      date: '2026-06-12',
      time: '18:00',
      teamA: 'FRA',
      teamB: 'BRA',
      scoreA: 3,
      scoreB: 1,
      group: 'A',
      stadium: 'E1',
      city: 'C1',
      stage: 'Fase de Grupos',
    },
    {
      id: 1,
      date: '2026-06-11',
      time: '16:00',
      teamA: 'ZZZ',
      teamB: 'ZZZ',
      scoreA: null,
      scoreB: null,
      group: 'B',
      stadium: 'E2',
      city: 'C2',
      stage: 'Fase de Grupos',
    },
    {
      id: 3,
      date: '2026-06-12',
      time: '21:00',
      teamA: 'BRA',
      teamB: 'FRA',
      scoreA: null,
      scoreB: null,
      group: 'A',
      stadium: 'E1',
      city: 'C1',
      stage: 'Fase de Grupos',
    },
  ],
  ...extra,
});

const base = () => getEdition('copa', '2026')!.data;

test('bandeiras: código conhecido, subdivisão do Reino Unido e desconhecido', () => {
  expect(flagEmoji('BRA')).toBe('🇧🇷');
  expect(flagEmoji('usa')).toBe('🇺🇸');
  expect(flagEmoji('SCO')).toBe('🏴󠁧󠁢󠁳󠁣󠁴󠁿');
  expect(flagEmoji('ENG')).toBe('🏴󠁧󠁢󠁥󠁮󠁧󠁿');
  expect(flagEmoji('XXX')).toBe('🏳️');
});

test('arquivo válido é aceito e inválido é recusado', () => {
  expect(editionSnapshotSchema.safeParse(snap()).success).toBe(true);
  expect(
    editionSnapshotSchema.safeParse({ ...snap(), groups: [] }).success,
  ).toBe(false);
  expect(
    editionSnapshotSchema.safeParse({ ...snap(), matches: [{ id: 1 }] })
      .success,
  ).toBe(false);
});

test('grupos do arquivo vêm em ordem alfabética', () => {
  const ds = buildDataset(base(), editionSnapshotSchema.parse(snap()));
  expect(ds.groups).toEqual(['A', 'B']);
});

test('classificação segue a ordem do arquivo e usa os nomes dos times', () => {
  const ds = buildDataset(base(), editionSnapshotSchema.parse(snap()));
  const rows = ds.getGroupStandings('A');
  expect(rows.map((r) => r.team)).toEqual(['França', 'Brasil']);
  expect(rows[0].points).toBe(3);
  expect(rows[1].goalDifference).toBe(-2);
  expect(ds.getGroupStandings('Z')).toEqual([]);
});

test('jogos por grupo e por data; datas únicas e ordenadas', () => {
  const ds = buildDataset(base(), editionSnapshotSchema.parse(snap()));
  expect(ds.getMatchesByGroup('A').map((m) => m.id)).toEqual([2, 3]);
  expect(ds.getMatchesByDate('2026-06-12').map((m) => m.id)).toEqual([2, 3]);
  expect(ds.getMatchDates()).toEqual(['2026-06-11', '2026-06-12']);
});

test('seleção que só existe no arquivo fica sem ranking e confederação; a conhecida mantém', () => {
  const ds = buildDataset(base(), editionSnapshotSchema.parse(snap()));
  const novo = ds.getTeamByCode('ZZZ')!;
  expect(novo.fifaRanking).toBe(0);
  expect(novo.confederation).toBe('');
  expect(novo.flag).toBe('🏳️');
  expect(ds.getTeamByCode('BRA')!.confederation).toBe('CONMEBOL');
  expect(ds.getTeamByCode('BRA')!.flag).toBe('🇧🇷');
});

test('o que o arquivo não traz é mantido', () => {
  const b = base();
  const ds = buildDataset(b, editionSnapshotSchema.parse(snap()));
  expect(ds.stadiums).toBe(b.stadiums);
  expect(ds.bracketMatches).toBe(b.bracketMatches);
  expect(ds.confederations).toBe(b.confederations);
  expect(ds.getSquad).toBe(b.getSquad);
});

test('carregador: 404, erro de rede e conteúdo inválido dão null; arquivo válido é lido', async () => {
  const real = globalThis.fetch;
  try {
    const stub = (impl: () => Promise<Response>) =>
      ((globalThis as { fetch: unknown }).fetch = impl);
    stub(async () => new Response('x', { status: 404 }));
    expect(await loadEditionSnapshot('copa', '2026')).toBeNull();
    stub(async () => {
      throw new TypeError('offline');
    });
    expect(await loadEditionSnapshot('copa', '2026')).toBeNull();
    stub(async () => new Response('<html></html>', { status: 200 }));
    expect(await loadEditionSnapshot('copa', '2026')).toBeNull();
    stub(
      async () => new Response(JSON.stringify({ groups: 1 }), { status: 200 }),
    );
    expect(await loadEditionSnapshot('copa', '2026')).toBeNull();
    let url = '';
    stub(async () => new Response(JSON.stringify(snap()), { status: 200 }));
    (globalThis as { fetch: unknown }).fetch = async (u: string) => {
      url = u;
      return new Response(JSON.stringify(snap()), { status: 200 });
    };
    expect((await loadEditionSnapshot('copa', '2026'))?.matches).toHaveLength(
      3,
    );
    expect(url).toBe('/data/editions/copa-2026.json');
  } finally {
    (globalThis as { fetch: unknown }).fetch = real;
  }
});
