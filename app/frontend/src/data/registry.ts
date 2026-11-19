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
  /** Pôster da edição (exibido no cabeçalho); ausente = taça padrão. */
  poster?: string;
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
  poster: '/posters/copa-2026.jpg',
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

// Copas do Mundo anteriores (1930-2022): tudo vem do arquivo exportado (`copa-<ano>.json`).
// Os pôsteres ficam em public/posters (há de 1930 a 2026).
const COPAS_ANTIGAS: { year: number; hosts: string; poster: boolean; groups: boolean }[] = [
  { year: 1930, hosts: 'Uruguai', poster: true, groups: true },
  { year: 1934, hosts: 'Itália', poster: true, groups: false },
  { year: 1938, hosts: 'França', poster: true, groups: false },
  { year: 1950, hosts: 'Brasil', poster: true, groups: true },
  { year: 1954, hosts: 'Suíça', poster: true, groups: true },
  { year: 1958, hosts: 'Suécia', poster: true, groups: true },
  { year: 1962, hosts: 'Chile', poster: true, groups: true },
  { year: 1966, hosts: 'Inglaterra', poster: true, groups: true },
  { year: 1970, hosts: 'México', poster: true, groups: true },
  { year: 1974, hosts: 'Alemanha Ocidental', poster: true, groups: true },
  { year: 1978, hosts: 'Argentina', poster: true, groups: true },
  { year: 1982, hosts: 'Espanha', poster: true, groups: true },
  { year: 1986, hosts: 'México', poster: true, groups: true },
  { year: 1990, hosts: 'Itália', poster: true, groups: true },
  { year: 1994, hosts: 'Estados Unidos', poster: true, groups: true },
  { year: 1998, hosts: 'França', poster: true, groups: true },
  { year: 2002, hosts: 'Coreia do Sul e Japão', poster: true, groups: true },
  { year: 2006, hosts: 'Alemanha', poster: true, groups: true },
  { year: 2010, hosts: 'África do Sul', poster: true, groups: true },
  { year: 2014, hosts: 'Brasil', poster: true, groups: true },
  { year: 2018, hosts: 'Rússia', poster: true, groups: true },
  { year: 2022, hosts: 'Catar', poster: true, groups: true },
];

function copaAntiga(c: (typeof COPAS_ANTIGAS)[number], i: number): Edition {
  return {
    competition: 'copa',
    year: String(c.year),
    label: `World Cup ${c.year}`,
    number: i + 1,
    poster: c.poster ? `/posters/copa-${c.year}.jpg` : undefined,
    hero: {
      title: 'Copa do Mundo',
      highlight: String(c.year),
      description: `Jogos, classificação, seleções e elencos da Copa do Mundo de ${c.year}, com sede em: ${c.hosts}.`,
      hosts: null,
      footer: `⚽ Copa do Mundo ${c.year} · ${c.hosts}`,
      subtitle: `Copa do Mundo ${c.year} · ${c.hosts}`,
    },
    finalVenue: null,
    sections: c.groups
      ? ['overview', 'jogos', 'grupos', 'selecoes', 'eliminatorias', 'estadios']
      : ['overview', 'jogos', 'selecoes', 'eliminatorias', 'estadios'],
    snapshot: true,
    data: emptyDataset(),
  };
}

const copasAntigas: Edition[] = COPAS_ANTIGAS.map(copaAntiga);

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
  sections: ['overview', 'jogos', 'grupos', 'selecoes', 'jogadores', 'eliminatorias', 'probabilidades', 'comparacao'],
  snapshot: true,
  data: emptyDataset(),
};

// Nations League anteriores (2018/19 em diante). O ano é o ano UEFA da temporada: 2019 = 2018/19.
// Só entram aqui as edições já coletadas (scripts/coletar-nations-league-historico.bat) e exportadas.
const NL_ANTIGAS = [2019, 2021, 2023, 2025];

function nationsLeagueAntiga(year: number): Edition {
  const temporada = `${year - 1}/${String(year).slice(2)}`;
  return {
    competition: 'nations-league',
    year: String(year),
    label: `Nations League ${temporada}`,
    number: (year - 2019) / 2 + 1,
    hero: {
      title: 'UEFA Nations League',
      highlight: temporada,
      description: `Jogos, grupos, classificação e seleções das Ligas A, B, C e D da Nations League ${temporada}.`,
      hosts: null,
      footer: `⚽ UEFA Nations League ${temporada}`,
      subtitle: `Nations League ${temporada}`,
    },
    finalVenue: null,
    sections: ['overview', 'jogos', 'grupos', 'selecoes', 'jogadores', 'eliminatorias'],
    snapshot: true,
    data: emptyDataset(),
  };
}

// Eurocopa (fase final): 1960-2024. Tudo vem do arquivo exportado (`eurocopa-<ano>.json`).
// Até 1976 o torneio final foi só semifinais, 3º lugar e final, então essas edições não têm "Grupos".
// A edição "2020" foi disputada em 2021 (nome oficial da UEFA).
const EUROCOPA_ANOS = [1960, 1964, 1968, 1972, 1976, 1980, 1984, 1988, 1992, 1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024];

function eurocopaEdition(year: number, number: number): Edition {
  const jogadasEm = year === 2020 ? 2021 : year;
  return {
    competition: 'eurocopa',
    year: String(year),
    label: `Euro ${year}`,
    number,
    hero: {
      title: 'Eurocopa',
      highlight: String(year),
      description: `Jogos, classificação, seleções e jogadores da Eurocopa de ${year}.`,
      hosts: null,
      footer: `⚽ Eurocopa ${year} · Disputada em ${jogadasEm}`,
      subtitle: `Eurocopa ${year} · Disputada em ${jogadasEm}`,
    },
    finalVenue: null,
    sections: year >= 1980
      ? ['overview', 'jogos', 'grupos', 'selecoes', 'jogadores', 'eliminatorias']
      : ['overview', 'jogos', 'selecoes', 'jogadores', 'eliminatorias'],
    snapshot: true,
    data: emptyDataset(),
  };
}

const eurocopaEditions: Edition[] = EUROCOPA_ANOS.map((ano, i) => eurocopaEdition(ano, i + 1));

// Copa Libertadores (2012 em diante), a partir do openfootball: só jogos e placares, sem elencos nem estádios.
// A de 2026 está em andamento e pode estar incompleta.
const LIBERTADORES_ANOS = Array.from({ length: 15 }, (_, i) => 2012 + i);

function libertadoresEdition(year: number): Edition {
  return {
    competition: 'libertadores',
    year: String(year),
    label: `Libertadores ${year}`,
    number: year - 2011,
    hero: {
      title: 'Copa Libertadores',
      highlight: String(year),
      description: `Jogos, grupos e fase eliminatória da Copa Libertadores da América de ${year}.`,
      hosts: null,
      footer: `⚽ Copa Libertadores ${year}`,
      subtitle: `Copa Libertadores ${year}`,
    },
    finalVenue: null,
    sections: ['overview', 'jogos', 'grupos', 'eliminatorias'],
    snapshot: true,
    data: emptyDataset(),
  };
}

const libertadoresEditions: Edition[] = LIBERTADORES_ANOS.map(libertadoresEdition);

const competitions: Competition[] = [
  { slug: 'copa', name: 'Copa do Mundo', editions: [...copasAntigas, worldCup2026] },
  { slug: 'eurocopa', name: 'Eurocopa', editions: eurocopaEditions },
  { slug: 'nations-league', name: 'UEFA Nations League', editions: [...NL_ANTIGAS.map(nationsLeagueAntiga), nationsLeague2027] },
  { slug: 'libertadores', name: 'Copa Libertadores', editions: libertadoresEditions },
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
