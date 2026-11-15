import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { sameStadium } from '../../src/data/stadiumAliases';
import { stadiums } from '../../src/data/worldCupData';

test('todo estádio do arquivo da Copa 2026 corresponde a uma sede da lista', () => {
  const edicao = JSON.parse(readFileSync('public/data/editions/copa-2026.json', 'utf8'));
  const nomes = [...new Set<string>(edicao.matches.map((m: { stadium: string }) => m.stadium))];
  expect(nomes.length).toBe(16);
  for (const n of nomes) {
    const sedes = stadiums.filter((s) => sameStadium(n, s.name));
    expect(sedes, `sem sede para "${n}"`).toHaveLength(1);
  }
});

test('nomes iguais continuam casando e nomes diferentes não', () => {
  expect(sameStadium('Lumen Field', 'Lumen Field')).toBe(true);
  expect(sameStadium('Seattle Stadium', 'Lumen Field')).toBe(true);
  expect(sameStadium('Seattle Stadium', 'SoFi Stadium')).toBe(false);
});
