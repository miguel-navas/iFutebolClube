import { z } from 'zod';

/** Arquivo `data/comparison/h2h.json`: jogos desde 1930 entre as seleções do site e médias de jogo. */
export const comparisonSchema = z.object({
  generatedAt: z.string().optional(),
  since: z.number().int(),
  sources: z.string().optional(),
  teams: z.array(z.object({ code: z.string(), name: z.string(), history: z.string() })),
  tournaments: z.array(z.string()),
  /** [data, seleção A (mandante), seleção B, gols A, gols B, classe, índice do torneio] */
  matches: z.array(z.tuple([z.string(), z.string(), z.string(), z.number(), z.number(), z.string(), z.number()])),
  /** Cartões e pênaltis dos jogos de Copa do Mundo: [data, A, B, amarelos A, B, vermelhos A, B, pênaltis A, B, disputa A, B, detalhes] */
  copa: z
    .array(
      z.tuple([
        z.string(), z.string(), z.string(),
        z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number(),
      ]),
    )
    .default([]),
  /** Pênaltis convertidos no tempo de jogo, só dos jogos que tiveram: [data, A, B, pênaltis A, pênaltis B]. */
  penaltis: z.array(z.tuple([z.string(), z.string(), z.string(), z.number(), z.number()])).default([]),
  /** Estatísticas de cada jogo coletado no site: [A, B, valores de A, valores de B, tipo de competição]. */
  games: z
    .array(
      z.tuple([z.string(), z.string(), z.record(z.string(), z.number()), z.record(z.string(), z.number()), z.string()]),
    )
    .default([]),
});

export type ComparisonFile = z.infer<typeof comparisonSchema>;
