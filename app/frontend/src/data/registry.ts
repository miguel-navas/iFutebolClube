// Registro único de competições e edições disponíveis.
// Uma edição está disponível exatamente quando consta aqui com dataset.
import * as wc2026 from './worldCupData';
import { getSquad, type Player } from './playersData';

export type { Player };

export type SectionKey =
  | 'overview'
  | 'jogos'
  | 'grupos'
  | 'selecoes'
  | 'jogadores'
  | 'probabilidades'
  | 'comparacao'
  | 'eliminatorias'
  | 'estadios';

export interface EditionDataset {
  teams: wc2026.Team[];
  groups: string[];
  matches: wc2026.Match[];
  stadiums: wc2026.Stadium[];
  bracketMatches: wc2026.BracketMatch[];
  confederations: typeof wc2026.confederations;
  getGroupStandings: typeof wc2026.getGroupStandings;
  getTeamByCode: typeof wc2026.getTeamByCode;
  getMatchesByGroup: typeof wc2026.getMatchesByGroup;
  getMatchesByDate: typeof wc2026.getMatchesByDate;
  getMatchDates: typeof wc2026.getMatchDates;
  getSquad: typeof getSquad;
}

export interface Edition {
  competition: string;
  year: string;
  label: string;
  number: number;
  opensAt?: string; // ISO com fuso (opcional: nem toda edição tem data de abertura fixa)
  /** Textos do cabeçalho do dashboard. Ausente = padrão da Copa do Mundo 2026. */
  hero?: {
    title: string;
    highlight: string;
    description: string;
    /** Sedes exibidas no selo; null = sem selo. */
    hosts: { code: string; name: string }[] | null;
    footer: string;
    subtitle: string;
  };
  finalVenue: { stadium: string; date: string } | null;
  sections: SectionKey[];
  /** Há um arquivo exportado (`data/editions/<competição>-<ano>.json`) com dados desta edição. */
  snapshot?: boolean;
  data: EditionDataset;
}

export interface Competition {
  slug: string;
  name: string;
  editions: Edition[];
}

const worldCup2026: Edition = {
  competition: 'copa',
  year: '2026',
  label: 'World Cup 2026',
  number: 23,
  opensAt: '2026-06-11T20:00:00-04:00',
  finalVenue: { stadium: 'MetLife Stadium', date: '2026-07-19' },
  sections: [
    'overview',
    'jogos',
    'grupos',
    'selecoes',
    'jogadores',
    'probabilidades',
    'comparacao',
    'eliminatorias',
    'estadios',
  ],
  snapshot: true,
  data: {
    teams: wc2026.teams,
    groups: wc2026.groups,
    matches: wc2026.matches,
    stadiums: wc2026.stadiums,
    bracketMatches: wc2026.bracketMatches,
    confederations: wc2026.confederations,
    getGroupStandings: wc2026.getGroupStandings,
    getTeamByCode: wc2026.getTeamByCode,
    getMatchesByGroup: wc2026.getMatchesByGroup,
    getMatchesByDate: wc2026.getMatchesByDate,
    getMatchDates: wc2026.getMatchDates,
    getSquad,
  },
};

/** Edição sem dados próprios: tudo vem do arquivo exportado (`data/editions/<competição>-<ano>.json`). */
function emptyDataset(): EditionDataset {
  return {
    teams: [],
    groups: [],
    matches: [],
    stadiums: [],
    bracketMatches: [],
    confederations: wc2026.confederations,
    getGroupStandings: () => [],
    getTeamByCode: () => undefined,
    getMatchesByGroup: () => [],
    getMatchesByDate: () => [],
    getMatchDates: () => [],
    getSquad: () => [], // sem elenco de exemplo: o elenco real vem do arquivo da edição
  };
}

// Nations League 2026/27. O ano da edição (2027) é o ano UEFA da temporada, o mesmo do banco.
const nationsLeague2027: Edition = {
  competition: 'nations-league',
  year: '2027',
  label: 'Nations League 2026/27',
  number: 5,
  hero: {
    title: 'UEFA Nations League',
    highlight: '2026/27',
    description: 'Acompanhe jogos, grupos, classificação e seleções das Ligas A, B, C e D da Nations League.',
    hosts: null,
    footer: '⚽ UEFA Nations League 2026/27 · Setembro - Novembro de 2026',
    subtitle: 'Fase de Grupos · Setembro - Novembro 2026 · Clique no 🔔 para ativar alertas',
  },
  finalVenue: null,
  sections: ['overview', 'jogos', 'grupos', 'selecoes', 'jogadores', 'probabilidades', 'comparacao'],
  snapshot: true,
  data: emptyDataset(),
};

const competitions: Competition[] = [
  { slug: 'copa', name: 'Copa do Mundo', editions: [worldCup2026] },
  { slug: 'eurocopa', name: 'Eurocopa', editions: [] },
  { slug: 'nations-league', name: 'UEFA Nations League', editions: [nationsLeague2027] },
];

export function listCompetitions(): Competition[] {
  return competitions;
}

export function getCompetition(slug: string): Competition | undefined {
  return competitions.find((c) => c.slug === slug);
}

/** Edições disponíveis, da mais recente para a mais antiga. */
export function listAvailableEditions(slug: string): Edition[] {
  const c = getCompetition(slug);
  if (!c) return [];
  return [...c.editions].sort((a, b) => Number(b.year) - Number(a.year));
}

export function getEdition(slug: string, year: string): Edition | undefined {
  return getCompetition(slug)?.editions.find((e) => e.year === year);
}
