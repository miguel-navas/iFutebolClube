import { z } from 'zod';

const side = z.enum(['A', 'B']);
const person = z.object({
  id: z.number().int().nullable(),
  name: z.string().min(1),
});
const base = {
  side,
  /** Minuto para exibir, como "45+2" (sem apóstrofo). */
  minute: z.string().regex(/^\d{1,3}(\+\d{1,2})?$/),
  /** Chave numérica de ordenação criada pela exportação (desempata minutos iguais). */
  order: z.number(),
};

export const goalKinds = ['normal', 'penalty', 'own', 'shootout'] as const;
export type GoalKind = (typeof goalKinds)[number];
export const cardColors = ['yellow', 'red', 'second-yellow'] as const;
export type CardColor = (typeof cardColors)[number];

const eventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('goal'),
    ...base,
    player: person,
    assist: person.nullable().default(null),
    kind: z.enum(goalKinds).default('normal'),
  }),
  z.object({
    type: z.literal('card'),
    ...base,
    player: person,
    color: z.enum(cardColors),
  }),
  z.object({ type: z.literal('sub'), ...base, out: person, in: person }),
]);

const playerSchema = z.object({
  id: z.number().int(),
  number: z.number().int().nullable(),
  name: z.string().min(1),
  position: z.string().nullable().default(null),
  captain: z.boolean().default(false),
  starter: z.boolean(),
});

const teamSchema = z.object({
  code: z.string().min(1),
  coach: z.string().nullable().default(null),
  formation: z.string().nullable().default(null),
  players: z.array(playerSchema),
});

/** Estatísticas oficiais da FIFA: valores por nome de estatística, para cada lado. */
const statsSchema = z.object({
  A: z.record(z.string(), z.number()),
  B: z.record(z.string(), z.number()),
});

const rankedPlayer = z.object({
  name: z.string().min(1),
  side,
  rank: z.number().int().positive(),
  score: z.number(),
});

/** Melhores do jogo (power ranking da FIFA): até 5 por lista, a melhor posição primeiro. */
const rankingSchema = z.object({
  attack: z.array(rankedPlayer).default([]),
  defense: z.array(rankedPlayer).default([]),
  creativity: z.array(rankedPlayer).default([]),
  goalkeepers: z.array(rankedPlayer).default([]),
});

export const matchDetailSchema = z.object({
  referee: z.string().nullable().default(null),
  attendance: z.number().int().nonnegative().nullable().default(null),
  penalties: z
    .object({
      a: z.number().int().nonnegative(),
      b: z.number().int().nonnegative(),
    })
    .nullable()
    .default(null),
  teams: z.object({ A: teamSchema, B: teamSchema }),
  events: z.array(eventSchema),
  /** Ausente quando a FIFA não tem estatísticas do jogo. */
  stats: statsSchema.nullable().default(null),
  /** Ausente quando a FIFA não tem o power ranking do jogo (só jogos recentes). */
  ranking: rankingSchema.nullable().default(null),
});

export type MatchDetail = z.infer<typeof matchDetailSchema>;
export type MatchEvent = MatchDetail['events'][number];
export type DetailPlayer = z.infer<typeof playerSchema>;
export type Side = z.infer<typeof side>;

/** "45+2" → 45.02 (fica depois do 45 e antes do 46). */
export function minuteKey(minute: string): number {
  const [base, added = '0'] = minute.split('+');
  return Number(base) + Number(added) / 100;
}

/** Eventos do jogo em ordem de acontecimento, sem os pênaltis da disputa. */
export function timeline(events: MatchEvent[]): MatchEvent[] {
  return events
    .filter((e) => !(e.type === 'goal' && e.kind === 'shootout'))
    .map((e, i) => ({ e, i }))
    .sort(
      (x, y) =>
        minuteKey(x.e.minute) - minuteKey(y.e.minute) ||
        x.e.order - y.e.order ||
        x.i - y.i,
    )
    .map(({ e }) => e);
}

export function shootoutGoals(events: MatchEvent[]) {
  return events
    .filter((e) => e.type === 'goal' && e.kind === 'shootout')
    .sort((x, y) => x.order - y.order);
}

export interface PlayerMarkers {
  goals: { minute: string; kind: GoalKind }[];
  cards: { minute: string; color: CardColor }[];
  offMinute: string | null;
  onMinute: string | null;
}

/** Marcadores de cada jogador (por id), tirados dos eventos. */
export function markersByPlayer(
  events: MatchEvent[],
): Map<number, PlayerMarkers> {
  const map = new Map<number, PlayerMarkers>();
  const get = (id: number | null) => {
    if (id === null) return null;
    let m = map.get(id);
    if (!m) {
      m = { goals: [], cards: [], offMinute: null, onMinute: null };
      map.set(id, m);
    }
    return m;
  };
  for (const e of timeline(events)) {
    if (e.type === 'goal')
      get(e.player.id)?.goals.push({ minute: e.minute, kind: e.kind });
    else if (e.type === 'card')
      get(e.player.id)?.cards.push({ minute: e.minute, color: e.color });
    else {
      const out = get(e.out.id);
      if (out) out.offMinute = e.minute;
      const inn = get(e.in.id);
      if (inn) inn.onMinute = e.minute;
    }
  }
  return map;
}
