import type { EditionDataset } from '@/data/registry';
import type { BracketMatch, GroupStanding, Stadium, Team } from '@/data/worldCupData';
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

type SnapMatch = EditionSnapshot['matches'][number];

/**
 * Confrontos de ida e volta (rodada terminada em "(ida)" / "(volta)") viram um só jogo no chaveamento:
 * placar agregado, com os pênaltis da volta. Jogos de rodada única passam sem mudança.
 */
function juntaIdaVolta(knock: SnapMatch[]): SnapMatch[] {
  const re = /\s*\((ida|volta)\)\s*$/i;
  const pares = new Map<string, SnapMatch[]>();
  const saida: SnapMatch[] = [];
  for (const m of knock) {
    if (!re.test(m.stage)) {
      saida.push(m);
      continue;
    }
    const chave = `${m.stage.replace(re, '')}|${[m.teamA, m.teamB].sort().join('|')}`;
    pares.set(chave, [...(pares.get(chave) ?? []), m]);
  }
  for (const [chave, jogos] of pares) {
    const rodada = chave.split('|')[0];
    const [ida, volta] = [...jogos].sort((x, y) => x.date.localeCompare(y.date) || x.id - y.id);
    if (!volta) {
      saida.push({ ...ida, stage: rodada });
      continue;
    }
    const gols = (m: SnapMatch, time: string) => (m.teamA === time ? m.scoreA : m.scoreB);
    const soma = (time: string) => (gols(ida, time) ?? 0) + (gols(volta, time) ?? 0);
    const pen = (time: string) => (volta.teamA === time ? volta.penaltiesA : volta.penaltiesB) ?? null;
    const jogou = ida.scoreA !== null && volta.scoreA !== null;
    saida.push({
      ...volta,
      stage: rodada,
      teamA: ida.teamA,
      teamB: ida.teamB,
      scoreA: jogou ? soma(ida.teamA) : null,
      scoreB: jogou ? soma(ida.teamB) : null,
      penaltiesA: pen(ida.teamA),
      penaltiesB: pen(ida.teamB),
    });
  }
  return saida;
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
  const knockouts: BracketMatch[] = juntaIdaVolta(matches.filter((m) => !m.group))
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

  // Edições antigas não têm a lista de sedes: monta a partir dos jogos (nome e cidade, sem país/capacidade).
  const stadiums: Stadium[] =
    base.stadiums.length > 0
      ? base.stadiums
      : [...new Map(matches.filter((m) => m.stadium).map((m) => [`${m.stadium}|${m.city}`, m])).values()]
          .map((m) => ({ name: m.stadium, city: m.city, country: '', capacity: 0, image: '🏟️', lat: 0, lng: 0 }))
          .sort((a, b) => a.name.localeCompare(b.name));

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
    stadiums,
    bracketMatches: knockouts.length > 0 ? knockouts : base.bracketMatches,
    getGroupStandings,
    getTeamByCode: (code) => byCode.get(code),
    getMatchesByGroup: (group) => matches.filter((m) => m.group === group),
    getMatchesByDate: (date) => matches.filter((m) => m.date === date),
    getMatchDates: () => [...new Set(matches.map((m) => m.date))].sort(),
  };
}
