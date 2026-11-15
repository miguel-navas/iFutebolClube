import { test, expect } from '@playwright/test';
import { withFifaRanking } from '../../src/data/edition/build';
import type { Team } from '../../src/data/worldCupData';

// Dados de TESTE.
const team = (code: string, confederation = '', fifaRanking = 0): Team => ({
  name: `Time ${code}`,
  code,
  flag: '',
  confederation,
  fifaRanking,
  group: 'A',
});
const fifa = {
  updatedAt: '2026-01-01',
  source: '',
  teams: [
    { rank: 5, code: 'AAA', name: 'A', confederation: 'AFC', points: 1 },
    { rank: 9, code: 'BBB', name: 'B', confederation: 'CAF', points: 1 },
  ],
};

test('confederação e posição vêm do ranking oficial', () => {
  const r = withFifaRanking([team('AAA'), team('BBB', 'UEFA', 77)], fifa);
  expect(r[0]).toMatchObject({ confederation: 'AFC', fifaRanking: 5 });
  expect(r[1]).toMatchObject({ confederation: 'CAF', fifaRanking: 9 });
});

test('seleção fora do ranking: posição 0 e confederação mantida', () => {
  const r = withFifaRanking([team('ZZZ', 'OFC', 12)], fifa);
  expect(r[0]).toMatchObject({ confederation: 'OFC', fifaRanking: 0 });
});

test('sem o arquivo do ranking nada muda', () => {
  const t = [team('AAA', 'UEFA', 3)];
  expect(withFifaRanking(t, null)).toBe(t);
  expect(withFifaRanking(t, undefined)).toBe(t);
});
