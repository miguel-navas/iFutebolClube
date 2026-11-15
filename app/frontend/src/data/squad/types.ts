import { z } from 'zod';

const nonNeg = z.number().int().nonnegative();

export const squadPlayerSchema = z.object({
  id: z.number().int(),
  number: z.number().int().nullable().default(null),
  name: z.string().min(1),
  position: z.string().nullable().default(null),
  birthDate: z.string().date().nullable().default(null),
  photo: z.string().url().nullable().default(null),
  games: nonNeg.default(0),
  starts: nonNeg.default(0),
  goals: nonNeg.default(0),
  assists: nonNeg.default(0),
  yellow: nonNeg.default(0),
  red: nonNeg.default(0),
  /** Total em todas as Copas do banco (não só nesta edição). */
  career: z
    .object({
      games: nonNeg,
      goals: nonNeg,
      /** `selecao`: jogos e gols pela seleção; `copas`: só os das Copas do banco. */
      scope: z.enum(['selecao', 'copas']).default('copas'),
    })
    .nullable()
    .default(null),
  clubs: z.array(z.string().min(1)).default([]),
  /** De onde vêm clubes e totais da seleção (ex.: "Wikipédia"). */
  profileSource: z.string().nullable().default(null),
});

export const teamSquadSchema = z.object({
  coach: z
    .object({ name: z.string().min(1), matches: nonNeg.default(0) })
    .nullable()
    .default(null),
  players: z.array(squadPlayerSchema),
});

export type TeamSquad = z.infer<typeof teamSquadSchema>;
export type SquadPlayer = z.infer<typeof squadPlayerSchema>;

/** Idade completa em `reference` (AAAA-MM-DD) para quem nasceu em `birthDate`. */
export function ageAt(
  birthDate: string | null,
  reference: string,
): number | null {
  if (!birthDate) return null;
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ry, rm, rd] = reference.split('-').map(Number);
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) age -= 1;
  return age >= 0 && age < 100 ? age : null;
}
