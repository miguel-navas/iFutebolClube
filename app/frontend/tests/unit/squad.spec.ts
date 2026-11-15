import { test, expect } from '@playwright/test';
import { ageAt, teamSquadSchema } from '../../src/data/squad/types';
import { loadTeamSquad } from '../../src/data/squad/source';
import { initials } from '../../src/data/squad/view';
import { squadFixture } from '../fixtures-match';

test('idade completa na data de referência', () => {
  expect(ageAt('2000-06-01', '2026-06-11')).toBe(26);
  expect(ageAt('2000-06-12', '2026-06-11')).toBe(25);
  expect(ageAt(null, '2026-06-11')).toBeNull();
});

test('iniciais do nome', () => {
  expect(initials('Jogador Teste 09')).toBe('JT');
  expect(initials('Pelé')).toBe('P');
});

test('elenco de teste é válido e completo', () => {
  expect(teamSquadSchema.parse(squadFixture()).players).toHaveLength(26);
});

test.describe('carregamento', () => {
  const orig = globalThis.fetch;
  test.afterEach(() => {
    globalThis.fetch = orig;
  });
  const reply = (r: unknown) => {
    globalThis.fetch = (async () => r) as unknown as typeof fetch;
  };
  test('404 devolve null', async () => {
    reply({ ok: false });
    expect(await loadTeamSquad('copa', '2026', 'BRA')).toBeNull();
  });
  test('formato inválido devolve null', async () => {
    reply({ ok: true, json: async () => ({ players: 'x' }) });
    const err = console.error;
    console.error = () => {};
    try {
      expect(await loadTeamSquad('copa', '2026', 'BRA')).toBeNull();
    } finally {
      console.error = err;
    }
  });
  test('arquivo válido volta lido', async () => {
    reply({ ok: true, json: async () => squadFixture() });
    expect((await loadTeamSquad('copa', '2026', 'BRA'))?.coach?.name).toBe(
      'Técnico Alfa',
    );
  });
});
