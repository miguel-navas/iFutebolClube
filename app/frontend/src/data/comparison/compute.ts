import type { ComparisonFile } from './types';

export interface Meeting {
  date: string;
  /** Gols de cada seleção comparada (A e B), na ordem da comparação, não do mandante. */
  goalsA: number;
  goalsB: number;
  tournament: string;
  kind: string;
}

export interface HeadToHead {
  total: number;
  winsA: number;
  draws: number;
  winsB: number;
  goalsA: number;
  goalsB: number;
  /** Mais recentes primeiro. */
  meetings: Meeting[];
}

/** Tipos de competição (classe do histórico) na ordem dos botões. */
export const KINDS: { key: string; label: string }[] = [
  { key: 'copa', label: 'Copa do Mundo' },
  { key: 'continental', label: 'Torneios continentais' },
  { key: 'eliminatoria', label: 'Eliminatórias' },
  { key: 'liga', label: 'Nations League' },
  { key: 'amistoso', label: 'Amistosos' },
  { key: 'outro', label: 'Outros' },
];

/** Números inteiros do confronto, só com os jogos entre as duas seleções. */
export interface PairStats {
  games: number;
  winsA: number;
  draws: number;
  winsB: number;
  goalsA: number;
  goalsB: number;
  /** Jogos em que a seleção não sofreu gol. */
  cleanA: number;
  cleanB: number;
  /** Jogos em que a seleção marcou pelo menos um gol. */
  scoredA: number;
  scoredB: number;
}

export function pairStats(meetings: Meeting[], kind: string | null): PairStats {
  const r: PairStats = {
    games: 0, winsA: 0, draws: 0, winsB: 0, goalsA: 0, goalsB: 0, cleanA: 0, cleanB: 0, scoredA: 0, scoredB: 0,
  };
  for (const m of meetings) {
    if (kind && m.kind !== kind) continue;
    r.games += 1;
    r.goalsA += m.goalsA;
    r.goalsB += m.goalsB;
    if (m.goalsA > m.goalsB) r.winsA += 1;
    else if (m.goalsA < m.goalsB) r.winsB += 1;
    else r.draws += 1;
    if (m.goalsB === 0) r.cleanA += 1;
    if (m.goalsA === 0) r.cleanB += 1;
    if (m.goalsA > 0) r.scoredA += 1;
    if (m.goalsB > 0) r.scoredB += 1;
  }
  return r;
}

export function headToHead(file: ComparisonFile, a: string, b: string): HeadToHead {
  const r: HeadToHead = { total: 0, winsA: 0, draws: 0, winsB: 0, goalsA: 0, goalsB: 0, meetings: [] };
  for (const [date, home, away, gh, ga, kind, t] of file.matches) {
    if (!((home === a && away === b) || (home === b && away === a))) continue;
    const goalsA = home === a ? gh : ga;
    const goalsB = home === a ? ga : gh;
    r.total += 1;
    r.goalsA += goalsA;
    r.goalsB += goalsB;
    if (goalsA > goalsB) r.winsA += 1;
    else if (goalsA < goalsB) r.winsB += 1;
    else r.draws += 1;
    r.meetings.push({ date, goalsA, goalsB, tournament: file.tournaments[t] ?? '', kind });
  }
  r.meetings.reverse();
  return r;
}

/** Estatísticas mostradas na comparação: chave no arquivo, rótulo e formato. */
export const STAT_ROWS: { key: string; label: string; percent?: boolean }[] = [  // `percent`: porcentagem média; as demais são totais
  { key: 'Goals', label: 'Gols marcados' },
  { key: 'GoalsConceded', label: 'Gols sofridos' },
  { key: 'AttemptAtGoal', label: 'Chutes' },
  { key: 'AttemptAtGoalOnTarget', label: 'Chutes no gol' },
  { key: 'Possession', label: 'Posse de bola', percent: true },
  { key: 'Corners', label: 'Escanteios' },
  { key: 'FoulsCommitted', label: 'Faltas cometidas' },
  { key: 'YellowCards', label: 'Cartões amarelos' },
  { key: 'RedCards', label: 'Cartões vermelhos' },
  { key: 'Offsides', label: 'Impedimentos' },
  { key: 'Passes', label: 'Passes' },
  { key: 'PassesCompleted', label: 'Passes certos' },
  { key: 'Crosses', label: 'Cruzamentos' },
  { key: 'Tackles', label: 'Desarmes' },
  { key: 'GoalkeeperSaves', label: 'Defesas do goleiro' },
];

/** Cartões e pênaltis dos jogos entre as duas seleções em Copas do Mundo (o histórico geral só tem placar). */
export interface CopaPairStats {
  games: number;
  yellowA: number;
  yellowB: number;
  redA: number;
  redB: number;
  penA: number;
  penB: number;
  shootoutWinsA: number;
  shootoutWinsB: number;
}

export function copaPairStats(file: ComparisonFile, a: string, b: string): CopaPairStats {
  const r: CopaPairStats = {
    games: 0, yellowA: 0, yellowB: 0, redA: 0, redB: 0, penA: 0, penB: 0, shootoutWinsA: 0, shootoutWinsB: 0,
  };
  for (const [, home, away, yh, ya, rh, ra, ph, pa, sh, sa, detalhes] of file.copa) {
    if (!detalhes) continue;
    if (!((home === a && away === b) || (home === b && away === a))) continue;
    const dir = home === a;
    r.games += 1;
    r.yellowA += dir ? yh : ya;
    r.yellowB += dir ? ya : yh;
    r.redA += dir ? rh : ra;
    r.redB += dir ? ra : rh;
    r.penA += dir ? ph : pa;
    r.penB += dir ? pa : ph;
    const shootA = dir ? sh : sa;
    const shootB = dir ? sa : sh;
    if (shootA > shootB) r.shootoutWinsA += 1;
    else if (shootB > shootA) r.shootoutWinsB += 1;
  }
  return r;
}

/** Estatísticas somadas só nos jogos entre as duas seleções que o site coleta (Copa 2026 e Nations League). */
export interface PairGameStats {
  games: number;
  /** Total de cada estatística por seleção (a posse é a porcentagem média). */
  a: Record<string, number>;
  b: Record<string, number>;
}

export function pairGameStats(file: ComparisonFile, a: string, b: string, kind: string | null): PairGameStats {
  const r: PairGameStats = { games: 0, a: {}, b: {} };
  const posse = { a: [] as number[], b: [] as number[] };
  for (const [home, away, sh, sa, tipo] of file.games) {
    if (kind && tipo !== kind) continue;
    if (!((home === a && away === b) || (home === b && away === a))) continue;
    const dir = home === a;
    r.games += 1;
    const lado = (v: Record<string, number>, alvo: Record<string, number>, p: number[]) => {
      for (const [k, x] of Object.entries(v)) {
        if (k === 'Possession') p.push(x);
        else alvo[k] = (alvo[k] ?? 0) + x;
      }
    };
    lado(dir ? sh : sa, r.a, posse.a);
    lado(dir ? sa : sh, r.b, posse.b);
  }
  const media = (p: number[]) => p.reduce((x, y) => x + y, 0) / p.length;
  if (posse.a.length) r.a.Possession = media(posse.a);
  if (posse.b.length) r.b.Possession = media(posse.b);
  return r;
}

/** Pênaltis convertidos no tempo de jogo nos jogos entre as duas seleções, conforme o tipo de competição. */
export function pairPenalties(file: ComparisonFile, a: string, b: string, kind: string | null): { a: number; b: number } {
  const r = { a: 0, b: 0 };
  const tipo = new Map<string, string>();
  for (const [date, home, away, , , k] of file.matches) {
    if ((home === a && away === b) || (home === b && away === a)) tipo.set(date, k);
  }
  for (const [date, home, away, ph, pa] of file.penaltis) {
    if (!((home === a && away === b) || (home === b && away === a))) continue;
    if (kind && tipo.get(date) !== kind) continue;
    r.a += home === a ? ph : pa;
    r.b += home === a ? pa : ph;
  }
  return r;
}
