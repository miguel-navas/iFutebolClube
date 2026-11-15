// Dados de TESTE: jogadores e lances inventados, não são de nenhum jogo real.
const p = (
  id: number,
  number: number,
  name: string,
  starter: boolean,
  extra = {},
) => ({
  id,
  number,
  name,
  position: null,
  captain: false,
  starter,
  ...extra,
});

export const detailFixture = (extra: Record<string, unknown> = {}) => ({
  referee: 'Árbitro Teste',
  attendance: 54321,
  penalties: null,
  teams: {
    A: {
      code: 'BRA',
      coach: 'Técnico Alfa',
      formation: '4-3-3',
      players: [
        p(1, 1, 'Goleiro Alfa', true),
        p(9, 9, 'Atacante Alfa', true, { captain: true }),
        p(10, 10, 'Meia Alfa', true),
        p(12, 12, 'Reserva Alfa', false),
        p(13, 13, 'Banco Alfa', false),
      ],
    },
    B: {
      code: 'FRA',
      coach: 'Técnico Beta',
      formation: '4-4-2',
      players: [
        p(21, 1, 'Goleiro Beta', true),
        p(29, 9, 'Atacante Beta', true),
        p(30, 4, 'Zagueiro Beta', true),
        p(32, 14, 'Reserva Beta', false),
      ],
    },
  },
  events: [
    {
      type: 'sub',
      side: 'A',
      minute: '70',
      order: 70,
      out: { id: 9, name: 'Atacante Alfa' },
      in: { id: 12, name: 'Reserva Alfa' },
    },
    {
      type: 'goal',
      side: 'A',
      minute: '30',
      order: 30,
      player: { id: 9, name: 'Atacante Alfa' },
      assist: { id: 10, name: 'Meia Alfa' },
      kind: 'normal',
    },
    {
      type: 'card',
      side: 'B',
      minute: '45+2',
      order: 45.02,
      player: { id: 30, name: 'Zagueiro Beta' },
      color: 'yellow',
    },
    {
      type: 'card',
      side: 'B',
      minute: '46',
      order: 46,
      player: { id: 29, name: 'Atacante Beta' },
      color: 'red',
    },
    {
      type: 'card',
      side: 'A',
      minute: '80',
      order: 80,
      player: { id: 10, name: 'Meia Alfa' },
      color: 'second-yellow',
    },
    {
      type: 'goal',
      side: 'B',
      minute: '45',
      order: 45,
      player: { id: 29, name: 'Atacante Beta' },
      assist: null,
      kind: 'penalty',
    },
    {
      type: 'goal',
      side: 'A',
      minute: '88',
      order: 88,
      player: { id: 30, name: 'Zagueiro Beta' },
      assist: null,
      kind: 'own',
    },
  ],
  ...extra,
});

// Elenco de TESTE: 26 jogadores inventados (ids 1..26), técnico inventado.
const POS = ['Goleiro', 'Defensor', 'Meio-campista', 'Atacante'];
export const squadFixture = (extra: Record<string, unknown> = {}) => ({
  coach: { name: 'Técnico Alfa', matches: 3 },
  players: Array.from({ length: 26 }, (_, i) => ({
    id: i + 1,
    number: i + 1,
    name: `Jogador Teste ${String(i + 1).padStart(2, '0')}`,
    position: i === 25 ? null : POS[i % 4],
    birthDate: i === 8 ? '2000-06-01' : null,
    photo: null,
    games: i === 8 ? 3 : 0,
    starts: i === 8 ? 2 : 0,
    goals: i === 8 ? 2 : 0,
    assists: i === 8 ? 1 : 0,
    yellow: i === 8 ? 1 : 0,
    red: 0,
    ...(i === 8
      ? {
          career: { games: 14, goals: 5, scope: 'selecao' },
          clubs: ['Clube Teste A (2015–2020)', 'Clube Teste B (2020–)'],
          profileSource: 'Wikipédia',
        }
      : {}),
    ...(i === 9 ? { career: { games: 7, goals: 1, scope: 'copas' } } : {}),
  })),
  ...extra,
});
