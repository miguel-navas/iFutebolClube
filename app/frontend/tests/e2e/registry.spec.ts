import { test, expect } from '../fixtures';
import {
  listCompetitions,
  getCompetition,
  listAvailableEditions,
  getEdition,
} from '../../src/data/registry';

test('registro tem as quatro competições', () => {
  expect(listCompetitions().map((c) => c.slug)).toEqual(['copa', 'eurocopa', 'nations-league', 'libertadores']);
  expect(getCompetition('copa')?.name).toBe('Copa do Mundo');
});

test('Copa, Eurocopa e Nations League têm edições disponíveis', () => {
  const copas = listAvailableEditions('copa').map((e) => e.year);
  expect(copas).toHaveLength(23);
  expect(copas[0]).toBe('2026');
  expect(copas[22]).toBe('1930');
  expect(getEdition('copa', '1950')?.poster).toBe('/posters/copa-1950.jpg');
  expect(getEdition('copa', '2022')?.poster).toBe('/posters/copa-2022.jpg');
  expect(getEdition('copa', '2026')?.poster).toBe('/posters/copa-2026.jpg');
  const euro = listAvailableEditions('eurocopa').map((e) => e.year);
  expect(euro).toHaveLength(17);
  expect(euro[0]).toBe('2024');
  expect(euro[16]).toBe('1960');
  // até 1976 não houve fase de grupos na fase final
  expect(getEdition('eurocopa', '1976')?.sections).not.toContain('grupos');
  expect(getEdition('eurocopa', '1980')?.sections).toContain('grupos');
  expect(getEdition('eurocopa', '1960')?.sections).toContain('eliminatorias');
  expect(getEdition('nations-league', '2027')?.sections).toContain('eliminatorias');
  expect(listAvailableEditions('libertadores')).toHaveLength(15);
  expect(getEdition('libertadores', '2025')?.sections).toContain('grupos');
  expect(getEdition('libertadores', '2025')?.sections).not.toContain('jogadores');
  expect(listAvailableEditions('nations-league').map((e) => e.year)).toEqual(['2027', '2025', '2023', '2021', '2019']);
});

test('edição desconhecida não retorna nada', () => {
  expect(getEdition('copa', '1900')).toBeUndefined();
  expect(getEdition('xyz', '2026')).toBeUndefined();
  const e = getEdition('copa', '2026')!;
  expect(e.number).toBe(23);
  expect(e.data.teams).toHaveLength(48);
  expect(e.finalVenue?.stadium).toBe('MetLife Stadium');
});
