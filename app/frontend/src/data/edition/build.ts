import type { EditionDataset } from '@/data/registry';
import type { BracketMatch, GroupStanding, Team } from '@/data/worldCupData';
import { flagEmoji } from '@/lib/flags';
import type { FifaRanking } from '@/data/stats/fifa';
import type { EditionSnapshot } from './types';

/** Confederação e posição no ranking da FIFA vêm do ranking oficial; sem ele, ficam como estavam. */
export function withFifaRanking(
  teams: Team[],
  fifa: FifaRanking | null | undefined,
): Team[] {
  if (!fifa) return teams;
  const byCode = new Map(fifa.teams.map((r) => [r.code, r]));
  return teams.map((t) => {
    const r = byCode.get(t.code);
    return {
      ...t,
      confederation: r?.confederation || t.confederation,
      fifaRanking: r ? r.rank : 0,
    };
  });
}

/** Monta os dados da edição a partir do arquivo exportado, mantendo o que o arquivo não traz. */
export function buildDataset(
  base: EditionDataset,
  snap: EditionSnapshot,
): EditionDataset {
  const baseByCode = new Map(base.teams.map((t) => [t.code, t]));
  const teams: Team[] = snap.teams.map((t) => {
    const known = baseByCode.get(t.code);
    return {
      name: t.name,
      code: t.code,
      flag: flagEmoji(t.code),
      confederation: known?.confederation ?? '',
      fifaRanking: known?.fifaRanking ?? 0,
      group: t.group,
    };
  });
  const byCode = new Map(teams.map((t) => [t.code, t]));
  const groups = snap.groups.map((g) => g.name).sort();
  const matches = snap.matches;
  const knockouts: BracketMatch[] = matches
    .filter((m) => !m.group)
    .map((m) => ({
      id: String(m.id),
      matchId: m.id,
      round: m.stage,
      teamA: m.teamA,
      teamB: m.teamB,
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      penaltiesA: m.penaltiesA ?? null,
      penaltiesB: m.penaltiesB ?? null,
      date: m.date,
      stadium: m.stadium,
    }));

  const getGroupStandings = (group: string): GroupStanding[] =>
    (snap.groups.find((g) => g.name === group)?.standings ?? []).map((s) => ({
      team: byCode.get(s.code)?.name ?? s.code,
      code: s.code,
      flag: byCode.get(s.code)?.flag ?? flagEmoji(s.code),
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      goalDifference: s.goalDifference,
      points: s.points,
    }));

  return {
    ...base,
    teams,
    groups,
    matches,
    bracketMatches: knockouts.length > 0 ? knockouts : base.bracketMatches,
    getGroupStandings,
    getTeamByCode: (code) => byCode.get(code),
    getMatchesByGroup: (group) => matches.filter((m) => m.group === group),
    getMatchesByDate: (date) => matches.filter((m) => m.date === date),
    getMatchDates: () => [...new Set(matches.map((m) => m.date))].sort(),
  };
}
