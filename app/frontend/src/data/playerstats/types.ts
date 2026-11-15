import { z } from 'zod';

export const positions = ['GO', 'DF', 'MC', 'AT'] as const;
export type PositionCode = (typeof positions)[number];

/** Um jogador com os totais da edição (soma dos jogos; velocidade máxima é o maior valor). */
export const playerStatsSchema = z.object({
  generatedAt: z.string().optional(),
  players: z.array(
    z.object({
      id: z.number().int(),
      name: z.string().min(1),
      /** Código da seleção (o mesmo de `teams` da edição). */
      team: z.string().min(1),
      position: z.enum(positions).nullable().default(null),
      stats: z.record(z.string(), z.number()),
    }),
  ),
});

export type PlayerStatsFile = z.infer<typeof playerStatsSchema>;
export type PlayerRow = PlayerStatsFile['players'][number];
