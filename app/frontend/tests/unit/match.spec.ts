import { test, expect } from '@playwright/test';
import {
  matchDetailSchema,
  minuteKey,
  timeline,
  markersByPlayer,
} from '../../src/data/match/types';
import { loadMatchDetail } from '../../src/data/match/source';
import { detailFixture } from '../fixtures-match';

const parse = (extra = {}) => matchDetailSchema.parse(detailFixture(extra));

test.describe('minutos e ordem', () => {
  test('45+2 vem depois do 45 e antes do 46', () => {
    expect(minuteKey('45+2')).toBeGreaterThan(minuteKey('45'));
    expect(minuteKey('45+2')).toBeLessThan(minuteKey('46'));
    expect(minuteKey('90+3')).toBeGreaterThan(minuteKey('90'));
  });

  test('a linha do tempo sai em ordem de acontecimento', () => {
    const minutes = timeline(parse().events).map((e) => e.minute);
    expect(minutes).toEqual(['30', '45', '45+2', '46', '70', '80', '88']);
  });

  test('pênaltis da disputa ficam fora da linha do tempo', () => {
    const d = parse({
      events: [
        ...detailFixture().events,
        {
          type: 'goal',
          side: 'A',
          minute: '120',
          order: 1000,
          player: { id: 9, name: 'Atacante Alfa' },
          kind: 'shootout',
        },
      ],
    });
    expect(timeline(d.events)).toHaveLength(7);
  });
});

test.describe('marcadores por jogador', () => {
  const m = markersByPlayer(parse().events);

  test('titular que fez gol e saiu', () => {
    const a = m.get(9)!;
    expect(a.goals).toEqual([{ minute: '30', kind: 'normal' }]);
    expect(a.offMinute).toBe('70');
    expect(a.onMinute).toBeNull();
  });

  test('reserva que entrou', () => {
    expect(m.get(12)!.onMinute).toBe('70');
  });

  test('jogador sem lances não tem marcador', () => {
    expect(m.get(1)).toBeUndefined();
  });

  test('gol contra fica no jogador que o fez', () => {
    expect(m.get(30)!.goals).toEqual([{ minute: '88', kind: 'own' }]);
  });
});

test.describe('carregamento', () => {
  const orig = globalThis.fetch;
  test.afterEach(() => {
    globalThis.fetch = orig;
  });
  const reply = (r: Partial<Response> & { json?: () => Promise<unknown> }) => {
    globalThis.fetch = (async () => r) as unknown as typeof fetch;
  };

  test('404 devolve null', async () => {
    reply({ ok: false });
    expect(await loadMatchDetail('copa', '2026', 1)).toBeNull();
  });

  test('HTML no lugar do JSON devolve null', async () => {
    reply({
      ok: true,
      json: async () => {
        throw new Error('x');
      },
    });
    expect(await loadMatchDetail('copa', '2026', 1)).toBeNull();
  });

  test('formato inválido devolve null', async () => {
    reply({ ok: true, json: async () => ({ events: 'x' }) });
    const err = console.error;
    console.error = () => {};
    try {
      expect(await loadMatchDetail('copa', '2026', 1)).toBeNull();
    } finally {
      console.error = err;
    }
  });

  test('arquivo válido volta lido', async () => {
    reply({ ok: true, json: async () => detailFixture() });
    const d = await loadMatchDetail('copa', '2026', 1);
    expect(d?.events).toHaveLength(7);
  });
});
