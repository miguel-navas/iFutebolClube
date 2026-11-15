import { test, expect } from '@playwright/test';
import {
  buildTreeLayout,
  roundRank,
  winnerCode,
} from '../../src/components/bracket/layout';
import type { BracketMatch } from '../../src/data/worldCupData';

// Dados de TESTE: não são o resultado de nenhum torneio real.
const m = (
  id: number,
  round: string,
  a: string | null,
  b: string | null,
  sa: number | null,
  sb: number | null,
  date: string,
  extra: Partial<BracketMatch> = {},
): BracketMatch => ({
  id: String(id),
  matchId: id,
  round,
  teamA: a,
  teamB: b,
  scoreA: sa,
  scoreB: sb,
  date,
  stadium: 'Estádio Teste',
  ...extra,
});

test('roundRank reconhece as fases', () => {
  expect(roundRank('Final')).toBe(6);
  expect(roundRank('Disputa do terceiro lugar')).toBe(5);
  expect(roundRank('Bronze final')).toBe(5);
  expect(roundRank('Match for third place')).toBe(5);
  expect(roundRank('Disputa do 3.º lugar')).toBe(5);
  expect(roundRank('Semifinal')).toBe(4);
  expect(roundRank('Quartas de final')).toBe(3);
  expect(roundRank('Oitavas de final')).toBe(2);
  expect(roundRank('16 avos de final')).toBe(1);
  expect(roundRank('Fase estranha')).toBe(0);
});

test('winnerCode usa o placar e depois os pênaltis', () => {
  expect(winnerCode(m(1, 'Final', 'AAA', 'BBB', 2, 1, '2026-07-01'))).toBe(
    'AAA',
  );
  expect(
    winnerCode(
      m(2, 'Final', 'AAA', 'BBB', 1, 1, '2026-07-01', {
        penaltiesA: 3,
        penaltiesB: 4,
      }),
    ),
  ).toBe('BBB');
  expect(
    winnerCode(m(3, 'Final', 'AAA', 'BBB', 1, 1, '2026-07-01')),
  ).toBeNull();
  expect(
    winnerCode(m(4, 'Final', 'AAA', 'BBB', null, null, '2026-07-01')),
  ).toBeNull();
});

test('a árvore coloca cada semifinal do lado do finalista que ela produziu', () => {
  // A semifinal do T4 tem id e data menores: pela data ela viria primeiro.
  const matches = [
    m(1, 'Semifinal', 'T3', 'T4', 0, 1, '2026-07-08'),
    m(2, 'Semifinal', 'T1', 'T2', 2, 0, '2026-07-09'),
    m(3, 'Final', 'T1', 'T4', 1, 0, '2026-07-19'),
    m(4, 'Disputa do terceiro lugar', 'T2', 'T3', 2, 1, '2026-07-18'),
  ];
  const t = buildTreeLayout(matches);
  expect(t.final?.id).toBe('3');
  expect(t.third?.id).toBe('4');
  expect(t.columns).toHaveLength(1);
  expect(t.columns[0].left[0]?.id).toBe('2');
  expect(t.columns[0].right[0]?.id).toBe('1');
});

test('fases ausentes viram vagas vazias e a árvore parte da primeira fase', () => {
  const t = buildTreeLayout([
    m(1, 'Oitavas de final', 'T1', 'T2', 1, 0, '2026-07-01'),
  ]);
  expect(t.columns.map((c) => c.rank)).toEqual([2, 3, 4]);
  expect(t.columns[0].left).toHaveLength(4);
  expect(t.columns[0].right).toHaveLength(4);
  expect(t.columns[1].left).toHaveLength(2);
  expect(t.columns[2].left).toHaveLength(1);
  const real = [...t.columns[0].left, ...t.columns[0].right].filter(Boolean);
  expect(real).toHaveLength(1);
  expect(t.final).toBeNull();
});

test('quartas ligam às oitavas pelo vencedor, nos dois lados', () => {
  const matches = [
    m(1, 'Oitavas de final', 'A1', 'A2', 1, 0, '2026-07-01'),
    m(2, 'Oitavas de final', 'B1', 'B2', 1, 0, '2026-07-01'),
    m(3, 'Oitavas de final', 'C1', 'C2', 1, 0, '2026-07-02'),
    m(4, 'Oitavas de final', 'D1', 'D2', 1, 0, '2026-07-02'),
    // quarta liga C e A (ordem cruzada em relação às oitavas)
    m(5, 'Quartas de final', 'C1', 'A1', 1, 0, '2026-07-05'),
    m(6, 'Quartas de final', 'B1', 'D1', 1, 0, '2026-07-05'),
  ];
  const t = buildTreeLayout(matches);
  const oit = t.columns[0];
  const ids = (s: (BracketMatch | null)[]) => s.map((x) => x?.id ?? null);
  // sem semifinal conhecida, a ordem vem da quarta: C antes de A, depois B e D
  expect(ids([...oit.left, ...oit.right]).slice(0, 4)).toEqual([
    '3',
    '1',
    '2',
    '4',
  ]);
});

test('"Bronze final" é o 3º lugar e a Final fica no centro', () => {
  const t = buildTreeLayout([
    m(1, 'Semifinal', 'T1', 'T2', 0, 2, '2026-07-14'),
    m(2, 'Semifinal', 'T3', 'T4', 1, 2, '2026-07-15'),
    m(3, 'Bronze final', 'T1', 'T3', 4, 6, '2026-07-18'),
    m(4, 'Final', 'T2', 'T4', 1, 0, '2026-07-19'),
  ]);
  expect(t.final?.id).toBe('4');
  expect(t.third?.id).toBe('3');
  expect(t.columns[0].left[0]?.id).toBe('1');
  expect(t.columns[0].right[0]?.id).toBe('2');
});

test('com dois jogos "final" vale o mais recente', () => {
  const t = buildTreeLayout([
    m(1, 'Final', 'T1', 'T2', 1, 0, '2026-07-18'),
    m(2, 'Final', 'T3', 'T4', 1, 0, '2026-07-19'),
  ]);
  expect(t.final?.id).toBe('2');
});
