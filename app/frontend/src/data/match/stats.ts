/** Estatísticas exibidas na aba "Estatísticas" (nomes da API da FIFA) e como mostrar cada uma. */
export type StatFormat = 'int' | 'dec' | 'dec1' | 'km' | 'kmh';

export interface StatDef {
  key: string;
  label: string;
  format?: StatFormat;
}

export interface StatGroup {
  id: string;
  title: string;
  stats: StatDef[];
}

export const STAT_GROUPS: StatGroup[] = [
  {
    id: 'gol',
    title: 'Gols',
    stats: [
      { key: 'Goals', label: 'Total' },
      { key: 'GoalsConceded', label: 'Sofridos' },
      { key: 'GoalsInsideThePenaltyArea', label: 'Dentro da grande área' },
      { key: 'GoalsOutsideThePenaltyArea', label: 'Fora da área' },
      { key: 'Assists', label: 'Assistências' },
    ],
  },
  {
    id: 'chutes',
    title: 'Chutes',
    stats: [
      { key: 'AttemptAtGoal', label: 'Total' },
      { key: 'AttemptAtGoalOnTarget', label: 'No gol' },
      { key: 'AttemptAtGoalOffTarget', label: 'Para fora' },
      { key: 'AttemptAtGoalBlocked', label: 'Bloqueados' },
      {
        key: 'AttemptAtGoalInsideThePenaltyArea',
        label: 'Dentro da grande área',
      },
      { key: 'AttemptAtGoalOutsideThePenaltyArea', label: 'Fora da área' },
      { key: 'XG', label: 'Gols esperados (xG)', format: 'dec' },
    ],
  },
  {
    id: 'passes',
    title: 'Passes e progressão',
    stats: [
      { key: 'Passes', label: 'Passes' },
      { key: 'PassesCompleted', label: 'Passes certos' },
      { key: 'Crosses', label: 'Cruzamentos' },
      { key: 'CrossesCompleted', label: 'Cruzamentos certos' },
      { key: 'AttemptedBallProgressions', label: 'Progressões tentadas' },
      { key: 'CompletedBallProgressions', label: 'Progressões concluídas' },
    ],
  },
  {
    id: 'defesa',
    title: 'Defesa',
    stats: [
      { key: 'DefensivePressuresApplied', label: 'Pressões defensivas' },
      { key: 'ForcedTurnovers', label: 'Perdas de bola forçadas' },
      { key: 'Tackles', label: 'Desarmes' },
      { key: 'GoalkeeperSaves', label: 'Defesas do goleiro' },
    ],
  },
  {
    id: 'disciplina',
    title: 'Bola parada e disciplina',
    stats: [
      { key: 'Corners', label: 'Escanteios' },
      { key: 'Offsides', label: 'Impedimentos' },
      { key: 'FoulsCommitted', label: 'Faltas cometidas' },
      { key: 'YellowCards', label: 'Cartões amarelos' },
      { key: 'RedCards', label: 'Cartões vermelhos' },
    ],
  },
  {
    id: 'fisico',
    title: 'Físico',
    stats: [
      { key: 'TotalDistance', label: 'Distância total', format: 'km' },
      { key: 'TopSpeed', label: 'Velocidade máxima', format: 'kmh' },
    ],
  },
];

/** Todas as chaves usadas (a exportação grava só estas). */
export const STAT_KEYS = [
  'Possession',
  ...STAT_GROUPS.flatMap((g) => g.stats.map((s) => s.key)),
];

export function formatStat(value: number, format: StatFormat = 'int'): string {
  switch (format) {
    case 'dec':
      return value.toFixed(2).replace('.', ',');
    case 'dec1':
      return value.toFixed(1).replace('.', ',');
    case 'km':
      return `${(value / 1000).toFixed(1).replace('.', ',')} km`;
    case 'kmh':
      return `${value.toFixed(1).replace('.', ',')} km/h`;
    default:
      return String(Math.round(value));
  }
}

export interface Possession {
  a: number;
  b: number;
  /** Bola em disputa: o que sobra de 100%. */
  contested: number;
}

/** Posse de bola em % inteiros (a API manda 0–1). Null se faltar um dos lados. */
export function possession(
  a: Record<string, number>,
  b: Record<string, number>,
): Possession | null {
  if (typeof a.Possession !== 'number' || typeof b.Possession !== 'number')
    return null;
  const pa = Math.round(a.Possession * 100);
  const pb = Math.round(b.Possession * 100);
  return { a: pa, b: pb, contested: Math.max(0, 100 - pa - pb) };
}

/** Largura (0–100) da barra de cada lado, em relação ao maior valor da linha. */
export function barWidths(a: number, b: number): { a: number; b: number } {
  const max = Math.max(a, b);
  if (max <= 0) return { a: 0, b: 0 };
  return { a: (a / max) * 100, b: (b / max) * 100 };
}
