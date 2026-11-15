import { z } from 'zod';

const fifaRow = z.object({
  rank: z.number().int().positive(),
  code: z.string().min(1),
  name: z.string().min(1),
  /** Vazio quando a confederação não é conhecida. */
  confederation: z.string(),
  points: z.number().nonnegative(),
});

export const fifaRankingSchema = z.object({
  /** Data da última atualização oficial (AAAA-MM-DD). */
  updatedAt: z.string().min(1),
  source: z.string().default(''),
  teams: z.array(fifaRow).min(1),
});

export type FifaRankingRow = z.infer<typeof fifaRow>;
export type FifaRanking = z.infer<typeof fifaRankingSchema>;

const URL_FIFA = `${import.meta.env?.BASE_URL ?? '/'}data/stats/fifa-ranking.json`;

/** Ranking masculino da FIFA (arquivo estático). Devolve `null` se não existir ou for inválido. */
export async function loadFifaRanking(): Promise<FifaRanking | null> {
  let res: Response;
  try {
    res = await fetch(URL_FIFA, { headers: { Accept: 'application/json' } });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  try {
    const parsed = fifaRankingSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
