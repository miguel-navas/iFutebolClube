import { test, expect } from '../fixtures';
import {
  listCompetitions,
  getCompetition,
  listAvailableEditions,
  getEdition,
} from '../../src/data/registry';

test('registro tem as três competições', () => {
  expect(listCompetitions().map((c) => c.slug)).toEqual(['copa', 'eurocopa', 'nations-league']);
  expect(getCompetition('copa')?.name).toBe('Copa do Mundo');
});

test('apenas a Copa e a Nations League têm edição disponível', () => {
  expect(listAvailableEditions('copa').map((e) => e.year)).toEqual(['2026']);
  expect(listAvailableEditions('eurocopa')).toHaveLength(0);
  expect(listAvailableEditions('nations-league').map((e) => e.year)).toEqual(['2027']);
});

test('edição desconhecida não retorna nada', () => {
  expect(getEdition('copa', '1970')).toBeUndefined();
  expect(getEdition('xyz', '2026')).toBeUndefined();
  const e = getEdition('copa', '2026')!;
  expect(e.number).toBe(23);
  expect(e.data.teams).toHaveLength(48);
  expect(e.finalVenue?.stadium).toBe('MetLife Stadium');
});
