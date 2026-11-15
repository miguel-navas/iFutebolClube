import { z } from 'zod';

const errorBlock = z.object({
  label: z.string(),
  matches: z.number().int(),
  errorPp: z.number(),
  noiseMedianPp: z.number(),
  noiseP90Pp: z.number(),
});

/** Arquivo `data/editions/<competição>-<ano>/probabilities.json`. */
export const probabilitiesSchema = z.object({
  generatedAt: z.string().optional(),
  model: z.object({
    name: z.string(),
    description: z.string(),
    params: z.object({ simulations: z.number().int() }).passthrough(),
    limitations: z.array(z.string()),
  }),
  validation: z.object({
    targetPp: z.number(),
    edition: errorBlock,
    pooled: errorBlock,
    /** Mesma medida por tipo de competição (jogos que o ajuste do modelo não viu). */
    byType: z.array(errorBlock).default([]),
    accuracy: z.number(),
    brier: z.number(),
    brierBaseline: z.number(),
    championName: z.string().optional(),
    calibration: z.array(
      z.object({
        bin: z.string(),
        n: z.number().int(),
        predicted: z.number(),
        observed: z.number(),
      }),
    ),
  }),
  /** Nome de cada fase de `teams[].probs` (sem a fase de grupos). */
  stages: z.array(z.string()),
  teams: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      group: z.string().nullable(),
      rating: z.number(),
      /** Chance de chegar a cada fase de `stages` (a última é ser campeã). */
      probs: z.array(z.number()),
      /** Fase realmente alcançada: 0 = caiu na fase de grupos; 1 = 16-avos … `stages.length` = campeã. */
      reached: z.number().int().nullable().default(null),
    }),
  ),
  matches: z.array(
    z.object({
      id: z.number().int(),
      teamA: z.string(),
      teamB: z.string(),
      pA: z.number(),
      pD: z.number(),
      pB: z.number(),
      result: z.enum(['A', 'D', 'B']).nullable().default(null),
    }),
  ),
});

export type ProbabilitiesFile = z.infer<typeof probabilitiesSchema>;
