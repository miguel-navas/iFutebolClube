import { z } from 'zod';

const matchSchema = z.object({
  id: z.number().int().positive(),
  date: z.string().date(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  teamA: z.string().min(1),
  teamB: z.string().min(1),
  scoreA: z.number().int().nonnegative().nullable(),
  scoreB: z.number().int().nonnegative().nullable(),
  group: z.string(),
  stadium: z.string(),
  city: z.string(),
  stage: z.string().min(1),
  /** Disputa de pênaltis (só quando houve). */
  penaltiesA: z.number().int().nonnegative().nullable().optional(),
  penaltiesB: z.number().int().nonnegative().nullable().optional(),
});

const standingSchema = z.object({
  code: z.string().min(1),
  played: z.number().int().nonnegative(),
  won: z.number().int().nonnegative(),
  drawn: z.number().int().nonnegative(),
  lost: z.number().int().nonnegative(),
  goalsFor: z.number().int().nonnegative(),
  goalsAgainst: z.number().int().nonnegative(),
  goalDifference: z.number().int(),
  points: z.number().int().nonnegative(),
});

export const editionSnapshotSchema = z.object({
  generatedAt: z.string().datetime({ offset: true }),
  teams: z
    .array(
      z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        group: z.string(),
      }),
    )
    .min(1),
  groups: z
    .array(
      z.object({ name: z.string().min(1), standings: z.array(standingSchema) }),
    )
    .min(1),
  matches: z.array(matchSchema),
});

export type EditionSnapshot = z.infer<typeof editionSnapshotSchema>;
