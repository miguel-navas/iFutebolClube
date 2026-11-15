import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import {
  STAT_KEYS,
  barWidths,
  formatStat,
  possession,
} from '../../src/data/match/stats';
import { matchDetailSchema } from '../../src/data/match/types';

// Valores inventados para teste.
test.describe('estatísticas do jogo', () => {
  test('posse: converte 0–1 em %, e o resto fica em disputa', () => {
    expect(possession({ Possession: 0.6 }, { Possession: 0.32 })).toEqual({
      a: 60,
      b: 32,
      contested: 8,
    });
  });

  test('posse: sem um dos lados devolve null; nunca fica negativa', () => {
    expect(possession({ Possession: 0.6 }, {})).toBeNull();
    expect(
      possession({ Possession: 0.6 }, { Possession: 0.6 })?.contested,
    ).toBe(0);
  });

  test('barras: o maior valor ocupa a barra toda; zero e zero não desenha', () => {
    expect(barWidths(20, 2)).toEqual({ a: 100, b: 10 });
    expect(barWidths(0, 0)).toEqual({ a: 0, b: 0 });
    expect(barWidths(1, 0)).toEqual({ a: 100, b: 0 });
  });

  test('formatos', () => {
    expect(formatStat(20)).toBe('20');
    expect(formatStat(2.5172, 'dec')).toBe('2,52');
    expect(formatStat(148020.3, 'km')).toBe('148,0 km');
    expect(formatStat(32.65, 'kmh')).toBe('32,6 km/h');
  });

  test('chaves exportadas: posse e sem repetidas', () => {
    expect(STAT_KEYS).toContain('Possession');
    expect(new Set(STAT_KEYS).size).toBe(STAT_KEYS.length);
  });

  test('schema: stats é opcional e vira null', () => {
    const base = {
      teams: {
        A: { code: 'AAA', players: [] },
        B: { code: 'BBB', players: [] },
      },
      events: [],
    };
    expect(matchDetailSchema.parse(base).stats).toBeNull();
    expect(
      matchDetailSchema.parse({ ...base, stats: { A: { Goals: 1 }, B: {} } })
        .stats?.A.Goals,
    ).toBe(1);
    expect(
      matchDetailSchema.safeParse({
        ...base,
        stats: { A: { Goals: 'x' }, B: {} },
      }).success,
    ).toBe(false);
  });
});

test('schema: ranking é opcional e as listas vazias viram []', () => {
  const base = {
    teams: { A: { code: 'AAA', players: [] }, B: { code: 'BBB', players: [] } },
    events: [],
  };
  expect(matchDetailSchema.parse(base).ranking).toBeNull();
  const r = matchDetailSchema.parse({
    ...base,
    ranking: { attack: [{ name: 'X Teste', side: 'A', rank: 1, score: 5.5 }] },
  }).ranking;
  expect(r?.attack[0].score).toBe(5.5);
  expect(r?.goalkeepers).toEqual([]);
  expect(
    matchDetailSchema.safeParse({
      ...base,
      ranking: { attack: [{ name: 'X', side: 'C', rank: 1, score: 1 }] },
    }).success,
  ).toBe(false);
});

test('a lista de estatísticas do exportador é igual à do site', () => {
  const py = readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../../scripts/export-edition.py',
    ),
    'utf-8',
  );
  const bloco = py.match(/ESTATISTICAS_SITE = \[([\s\S]*?)\]/)?.[1] ?? '';
  const chaves = [...bloco.matchAll(/"(\w+)"/g)].map((m) => m[1]);
  expect([...chaves].sort()).toEqual([...STAT_KEYS].sort());
});
