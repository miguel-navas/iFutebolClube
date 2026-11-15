import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import {
  PLAYER_STAT_KEYS,
  STAT_TABS,
  buildRows,
  formatValue,
  normalize,
} from '../../src/data/playerstats/columns';
import { playerStatsSchema } from '../../src/data/playerstats/types';
import { basePlayers } from '../fixtures-playerstats';

const tab = (id: string) => STAT_TABS.find((t) => t.id === id)!;
const view = (id: string, over = {}) =>
  buildRows(basePlayers(), {
    tab: tab(id),
    team: '',
    query: '',
    sortBy: null,
    desc: true,
    ...over,
  });

test.describe('estatísticas dos jogadores', () => {
  test('ordem padrão do artilheiro: gols, depois assistências', () => {
    const names = view('artilheiro').map((p) => p.name);
    expect(names.slice(0, 3)).toEqual([
      'Zagueiro Delta',
      'Meia Beta',
      'Atacante Alfa',
    ]);
  });

  test('filtra por equipe', () => {
    expect(view('artilheiro', { team: 'FRA' }).map((p) => p.id)).toEqual([
      5, 4, 3,
    ]);
  });

  test('busca por nome ignora acento e maiúsculas', () => {
    expect(
      view('artilheiro', { query: 'jose munoz' }).map((p) => p.id),
    ).toEqual([4]);
    expect(view('artilheiro', { query: 'ALFA' }).map((p) => p.id)).toEqual([1]);
    expect(view('artilheiro', { query: 'zzz' })).toEqual([]);
    expect(normalize('  José MUÑOZ ')).toBe('jose munoz');
  });

  test('aba de goleiros só tem goleiros', () => {
    expect(view('goleiro').map((p) => p.id)).toEqual([3]);
  });

  test('ordenar por uma coluna, nos dois sentidos', () => {
    const asc = view('artilheiro', { sortBy: 'minutes', desc: false }).map(
      (p) => p.id,
    );
    expect(asc[0]).toBe(5); // 300 min
    const desc = view('artilheiro', { sortBy: 'minutes', desc: true }).map(
      (p) => p.id,
    );
    expect(desc[0]).toBe(3); // 630 min
  });

  test('colunas calculadas', () => {
    const [alfa] = basePlayers();
    const col = (t: string, id: string) =>
      tab(t).columns.find((c) => c.id === id)!;
    expect(col('ataque', 'conversion').get(alfa)).toBe(25); // 5 gols / 20 chutes
    expect(col('distribuicao', 'pass-acc').get(alfa)).toBe(80);
    expect(col('ataque', 'xg-eff').get(alfa)).toBe(1.25);
    // sem chutes não divide por zero
    expect(col('ataque', 'conversion').get(basePlayers()[3])).toBe(0);
  });

  test('formatos', () => {
    expect(formatValue(2.344, 'dec')).toBe('2,34');
    expect(formatValue(79.6, 'pct')).toBe('80');
    expect(formatValue(1.5, 'mult')).toBe('1,5x');
    expect(formatValue(0, 'mult')).toBe('0x');
    expect(formatValue(769.4, 'min')).toBe('769');
  });

  test('toda coluna tem rótulo e explicação', () => {
    for (const t of STAT_TABS)
      for (const c of t.columns) {
        expect(c.label.length).toBeGreaterThan(2);
        expect(c.desc.length).toBeGreaterThan(10);
      }
  });

  test('schema: aceita e rejeita', () => {
    expect(
      playerStatsSchema.parse({ players: basePlayers() }).players,
    ).toHaveLength(5);
    expect(
      playerStatsSchema.safeParse({
        players: [{ id: 1, name: 'X', team: 'BRA', stats: { Goals: 'x' } }],
      }).success,
    ).toBe(false);
    expect(
      playerStatsSchema.parse({
        players: [{ id: 1, name: 'X', team: 'BRA', stats: {} }],
      }).players[0].position,
    ).toBeNull();
  });

  test('a lista de estatísticas do exportador é igual à do site', () => {
    const py = readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../../../scripts/export-edition.py',
      ),
      'utf-8',
    );
    const bloco = py.match(/ESTATISTICAS_JOGADOR = \[([\s\S]*?)\]/)?.[1] ?? '';
    const chaves = [...bloco.matchAll(/"(\w+)"/g)].map((m) => m[1]);
    expect([...chaves].sort()).toEqual([...PLAYER_STAT_KEYS].sort());
  });
});
