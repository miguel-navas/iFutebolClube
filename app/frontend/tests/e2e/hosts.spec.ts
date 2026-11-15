import { test, expect } from '../fixtures';
import { getHostEditions, getHostCountry, getHostMarkers } from '../../src/data/worldCupHosts';

test('23 edições e 26 sedes', () => {
  const editions = getHostEditions();
  expect(editions).toHaveLength(23);
  expect(editions.flatMap((e) => e.hosts)).toHaveLength(26);
});

test('códigos como em Edicoes.Sede', () => {
  const byYear = Object.fromEntries(getHostEditions().map((e) => [e.year, e.hosts]));
  expect(byYear['1974']).toEqual(['FRG']);
  expect(byYear['1954']).toEqual(['SUI']);
  expect(byYear['1962']).toEqual(['CHI']);
  expect(byYear['1966']).toEqual(['ENG']);
  expect(byYear['2006']).toEqual(['GER']);
  expect(byYear['2010']).toEqual(['RSA']);
  expect(byYear['2002']).toEqual(['JPN', 'KOR']);
  expect(byYear['2026']).toEqual(['CAN', 'MEX', 'USA']);
  for (const e of getHostEditions()) for (const code of e.hosts) expect(getHostCountry(code), code).toBeDefined();
});

test('México: 1970, 1986 e 2026 em um marcador', () => {
  const mexico = getHostMarkers().find((m) => m.name === 'México');
  expect(mexico?.years).toEqual(['1970', '1986', '2026']);
});

test('2002 tem Japão e Coreia do Sul', () => {
  const names = (y: string) =>
    getHostMarkers()
      .filter((m) => m.years.includes(y))
      .map((m) => m.name)
      .sort();
  expect(names('2002')).toEqual(['Coreia do Sul', 'Japão']);
});

test('1974 (Alemanha Ocidental) fica no mesmo ponto da Alemanha atual', () => {
  expect(getHostCountry('FRG')!.anchor).toEqual(getHostCountry('GER')!.anchor);
  const germany = getHostMarkers().find((m) => m.name === 'Alemanha');
  expect(germany?.years).toEqual(['1974', '2006']);
});

test('um marcador por país atual (20 países sede)', () => {
  expect(getHostMarkers()).toHaveLength(19);
});
