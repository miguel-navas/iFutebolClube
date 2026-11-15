import { z } from 'zod';

const scorer = z.object({
  player: z.string().min(1),
  team: z.string().min(1),
  goals: z.number().int().nonnegative(),
});

const biggestWin = z.object({
  home: z.string().min(1),
  away: z.string().min(1),
  score: z.string().regex(/^\d+-\d+$/),
});

const edition = z.object({
  year: z.number().int(),
  label: z.string().min(1),
  host: z.string().min(1),
  champion: z.string().min(1).nullable(),
  runnerUp: z.string().min(1).nullable(),
  teams: z.number().int().nonnegative().nullable(),
  matches: z.number().int().nonnegative().nullable(),
  goals: z.number().int().nonnegative().nullable(),
  attendanceTotal: z.number().int().nonnegative().nullable(),
  attendanceAverage: z.number().nonnegative().nullable(),
  topScorers: z.array(scorer),
  biggestWin: biggestWin.nullable(),
});

const rankingRow = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  /** Vazio quando a seleção não está na tabela de confederações. */
  confederation: z.string(),
  titles: z.number().int().nonnegative(),
  participations: z.number().int().nonnegative(),
  played: z.number().int().nonnegative(),
  won: z.number().int().nonnegative(),
  drawn: z.number().int().nonnegative(),
  lost: z.number().int().nonnegative(),
  goalsFor: z.number().int().nonnegative(),
  goalsAgainst: z.number().int().nonnegative(),
  points: z.number().int().nonnegative(),
});

const stadium = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  capacity: z.number().int().positive().optional(),
});

const nextEdition = z.object({
  year: z.number().int(),
  label: z.string().min(1),
  hosts: z.array(z.string().min(1)).min(1),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  teams: z.number().int().positive().optional(),
  stadiums: z.array(stadium).default([]),
});

export const worldCupStatsSchema = z.object({
  generatedAt: z.string().datetime({ offset: true }),
  editions: z.array(edition).min(1),
  nextEdition: nextEdition.nullable().default(null),
  ranking: z.array(rankingRow).default([]),
});

export type RankingRow = z.infer<typeof rankingRow>;
export type TopScorer = z.infer<typeof scorer>;
export type BiggestWin = z.infer<typeof biggestWin>;
export type EditionStats = z.infer<typeof edition>;
export type Stadium = z.infer<typeof stadium>;
export type NextEdition = z.infer<typeof nextEdition>;
export type WorldCupStats = z.infer<typeof worldCupStatsSchema>;
