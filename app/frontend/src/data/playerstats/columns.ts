import type { PlayerRow } from './types';

export type Fmt = 'int' | 'dec' | 'pct' | 'mult' | 'min';

export interface Column {
  id: string;
  label: string;
  /** Explicação para o glossário. */
  desc: string;
  fmt: Fmt;
  get: (p: PlayerRow) => number;
}

export interface StatTab {
  id: string;
  label: string;
  columns: Column[];
  /** Só jogadores dessas posições (goleiros, por exemplo). */
  only?: PlayerRow['position'][];
}

const s = (p: PlayerRow, k: string) => p.stats[k] ?? 0;
const col = (
  id: string,
  label: string,
  desc: string,
  key: string,
  fmt: Fmt = 'int',
): Column => ({
  id,
  label,
  desc,
  fmt,
  get: (p) => s(p, key),
});
const ratio = (
  id: string,
  label: string,
  desc: string,
  num: string,
  den: string,
): Column => ({
  id,
  label,
  desc,
  fmt: 'pct',
  get: (p) => (s(p, den) > 0 ? (s(p, num) / s(p, den)) * 100 : 0),
});

const goals = col(
  'goals',
  'Gols',
  'Vezes em que o jogador colocou a bola na rede do adversário.',
  'Goals',
);
const assists = col(
  'assists',
  'Assistências',
  'Último passe ou toque antes de um companheiro marcar o gol.',
  'Assists',
);

export const STAT_TABS: StatTab[] = [
  {
    id: 'artilheiro',
    label: 'Artilheiro',
    columns: [
      goals,
      assists,
      col(
        'minutes',
        'Minutos jogados',
        'Tempo total em campo, do início do jogo ou da entrada como substituto até a saída, a expulsão ou o fim da partida.',
        'TimePlayed',
        'min',
      ),
    ],
  },
  {
    id: 'ataque',
    label: 'Ataque',
    columns: [
      assists,
      col(
        'on-target',
        'Finalizações certas',
        'Finalizações que vão no gol: entre as traves e o travessão, inclusive as que viram gol ou exigem defesa.',
        'AttemptAtGoalOnTarget',
      ),
      col(
        'shots',
        'Finalizações',
        'Total de chutes ao gol, certos e errados, inclusive os bloqueados e os defendidos.',
        'AttemptAtGoal',
      ),
      ratio(
        'conversion',
        'Conversão (%)',
        'Porcentagem das finalizações do jogador que viram gol.',
        'Goals',
        'AttemptAtGoal',
      ),
      col(
        'inside',
        'Chutes na área',
        'Finalizações feitas de dentro da grande área.',
        'AttemptAtGoalInsideThePenaltyArea',
      ),
      col(
        'outside',
        'Chutes fora da área',
        'Finalizações feitas de fora da grande área.',
        'AttemptAtGoalOutsideThePenaltyArea',
      ),
      col(
        'headers',
        'Cabeceios a gol',
        'Finalizações de cabeça.',
        'HeadedAttemptAtGoal',
      ),
      col(
        'xg',
        'Gols esperados (xG)',
        'Modelo que estima a chance de cada finalização virar gol, considerando local, tipo do chute, tipo de assistência e pressão defensiva.',
        'XG',
        'dec',
      ),
      {
        id: 'xg-eff',
        label: 'Eficiência no xG',
        desc: 'Gols divididos pelos gols esperados: acima de 1x o jogador converteu mais do que o esperado pelas chances que teve.',
        fmt: 'mult',
        get: (p) => (s(p, 'XG') > 0 ? s(p, 'Goals') / s(p, 'XG') : 0),
      },
      col(
        'corners',
        'Escanteios',
        'Escanteios cobrados pelo jogador.',
        'Corners',
      ),
    ],
  },
  {
    id: 'distribuicao',
    label: 'Distribuição',
    columns: [
      col('passes', 'Passes', 'Total de passes tentados.', 'Passes'),
      ratio(
        'pass-acc',
        'Precisão dos passes (%)',
        'Porcentagem dos passes que chegaram a um companheiro.',
        'PassesCompleted',
        'Passes',
      ),
      col(
        'crosses',
        'Cruzamentos',
        'Bolas levantadas para a área a partir das laterais.',
        'Crosses',
      ),
      ratio(
        'cross-acc',
        'Precisão dos cruzamentos (%)',
        'Porcentagem dos cruzamentos que chegaram a um companheiro.',
        'CrossesCompleted',
        'Crosses',
      ),
      col(
        'linebreaks',
        'Rupturas da linha defensiva',
        'Tentativas de passe que superam a linha defensiva do adversário.',
        'LinebreaksAttemptedDefensiveLine',
      ),
      ratio(
        'linebreak-acc',
        'Precisão das rupturas (%)',
        'Porcentagem das tentativas de ruptura da linha defensiva que deram certo.',
        'LinebreaksAttemptedDefensiveLineCompleted',
        'LinebreaksAttemptedDefensiveLine',
      ),
      col(
        'switches',
        'Inversões de jogo',
        'Passes longos que levam a bola de um lado do campo para o outro.',
        'AttemptedSwitchesOfPlay',
      ),
      ratio(
        'switch-acc',
        'Precisão das inversões (%)',
        'Porcentagem das inversões de jogo que deram certo.',
        'CompletedSwitchesOfPlay',
        'AttemptedSwitchesOfPlay',
      ),
    ],
  },
  {
    id: 'defesa',
    label: 'Defesa',
    columns: [
      col(
        'own-goals',
        'Gols contra',
        'Gols marcados pelo jogador na própria meta.',
        'OwnGoals',
      ),
      col(
        'turnovers',
        'Perdas de bola forçadas',
        'Vezes em que a pressão do jogador fez o adversário perder a bola.',
        'ForcedTurnovers',
      ),
      col(
        'pressures',
        'Pressões defensivas',
        'Ações de pressão sobre o adversário que está com a bola.',
        'DefensivePressuresApplied',
      ),
      col(
        'direct-pressures',
        'Pressões diretas',
        'Pressões aplicadas diretamente sobre quem tem a bola, perto o bastante para forçar o erro.',
        'DirectDefensivePressuresApplied',
      ),
    ],
  },
  {
    id: 'disciplina',
    label: 'Disciplina',
    columns: [
      col(
        'fouls',
        'Faltas cometidas',
        'Faltas marcadas contra o jogador.',
        'FoulsAgainst',
      ),
      col(
        'fouled',
        'Faltas sofridas',
        'Faltas que o jogador sofreu do adversário.',
        'FoulsFor',
      ),
      col(
        'yellow',
        'Cartões amarelos',
        'Advertências recebidas.',
        'YellowCards',
      ),
      col('red', 'Cartões vermelhos', 'Expulsões diretas.', 'RedCards'),
      col(
        'indirect-red',
        'Vermelhos indiretos',
        'Expulsões pelo segundo cartão amarelo.',
        'IndirectRedCards',
      ),
      col(
        'offsides',
        'Impedimentos',
        'Vezes em que o jogador foi flagrado em posição de impedimento.',
        'Offsides',
      ),
    ],
  },
  {
    id: 'goleiro',
    label: 'Goleiro',
    only: ['GO'],
    columns: [
      col(
        'saves',
        'Defesas',
        'Finalizações no gol que o goleiro defendeu.',
        'GoalkeeperSaves',
      ),
      col(
        'gk-inside',
        'Ações dentro da área',
        'Ações defensivas do goleiro dentro da grande área.',
        'GoalkeeperDefensiveActionsInsidePenaltyArea',
      ),
      col(
        'gk-outside',
        'Ações fora da área',
        'Ações defensivas do goleiro fora da grande área, como saídas para cortar a bola.',
        'GoalkeeperDefensiveActionsOutsidePenaltyArea',
      ),
    ],
  },
  {
    id: 'movimentacao',
    label: 'Movimentação',
    columns: [
      col(
        'offers',
        'Pedidos de bola',
        'Movimentos do jogador para se oferecer a um companheiro que está com a bola.',
        'OffersToReceiveTotal',
      ),
      col(
        'offers-behind',
        'Pedidos atrás',
        'Pedidos de bola por trás da linha defensiva adversária.',
        'OffersToReceiveInBehind',
      ),
      col(
        'offers-between',
        'Pedidos entre linhas',
        'Pedidos de bola entre as linhas do adversário.',
        'OffersToReceiveInBetween',
      ),
      col(
        'offers-front',
        'Pedidos na frente',
        'Pedidos de bola à frente das linhas do adversário.',
        'OffersToReceiveInFront',
      ),
      col(
        'offers-inside',
        'Pedidos dentro da forma coletiva',
        'Pedidos de bola feitos dentro da estrutura coletiva da equipe.',
        'OffersToReceiveInside',
      ),
      col(
        'offers-outside',
        'Pedidos fora da forma coletiva',
        'Pedidos de bola feitos fora da estrutura coletiva da equipe.',
        'OffersToReceiveOutside',
      ),
      col(
        'rec-behind',
        'Recepções atrás',
        'Bolas recebidas por trás da linha defensiva adversária.',
        'ReceptionsInBehind',
      ),
      col(
        'rec-between',
        'Recepções entre linhas',
        'Bolas recebidas entre as linhas defensiva e de meio-campo do adversário.',
        'ReceptionsBetweenMidfieldAndDefensiveLine',
      ),
      col(
        'rec-pressure',
        'Recepções sob pressão',
        'Bolas recebidas com um adversário pressionando.',
        'ReceptionsUnderPressure',
      ),
      col(
        'involvements',
        'Participações',
        'Total de ações do jogador com a bola, como passes, domínios, conduções e finalizações.',
        'NumberOfInvolvements',
      ),
    ],
  },
  {
    id: 'fisico',
    label: 'Físico',
    columns: [
      col(
        'top-speed',
        'Velocidade máxima (km/h)',
        'Maior velocidade que o jogador atingiu em um jogo da edição.',
        'TopSpeed',
        'dec',
      ),
      col(
        'speed-runs',
        'Corridas em alta velocidade',
        'Corridas em alta velocidade, abaixo do ritmo de arrancada.',
        'SpeedRuns',
      ),
      col(
        'sprints',
        'Arrancadas',
        'Corridas na velocidade máxima, mantidas por alguns segundos.',
        'Sprints',
      ),
      col(
        'distance',
        'Distância total (m)',
        'Soma da distância percorrida em todos os jogos.',
        'TotalDistance',
        'int',
      ),
    ],
  },
];

/** Todas as estatísticas lidas das colunas (a exportação grava só estas). */
export const PLAYER_STAT_KEYS: string[] = [
  ...new Set([
    'Goals',
    'Assists',
    'TimePlayed',
    'AttemptAtGoalOnTarget',
    'AttemptAtGoal',
    'AttemptAtGoalInsideThePenaltyArea',
    'AttemptAtGoalOutsideThePenaltyArea',
    'HeadedAttemptAtGoal',
    'XG',
    'Corners',
    'Passes',
    'PassesCompleted',
    'Crosses',
    'CrossesCompleted',
    'LinebreaksAttemptedDefensiveLine',
    'LinebreaksAttemptedDefensiveLineCompleted',
    'AttemptedSwitchesOfPlay',
    'CompletedSwitchesOfPlay',
    'OwnGoals',
    'ForcedTurnovers',
    'DefensivePressuresApplied',
    'DirectDefensivePressuresApplied',
    'FoulsAgainst',
    'FoulsFor',
    'YellowCards',
    'RedCards',
    'IndirectRedCards',
    'Offsides',
    'GoalkeeperSaves',
    'GoalkeeperDefensiveActionsInsidePenaltyArea',
    'GoalkeeperDefensiveActionsOutsidePenaltyArea',
    'OffersToReceiveTotal',
    'OffersToReceiveInBehind',
    'OffersToReceiveInBetween',
    'OffersToReceiveInFront',
    'OffersToReceiveInside',
    'OffersToReceiveOutside',
    'ReceptionsInBehind',
    'ReceptionsBetweenMidfieldAndDefensiveLine',
    'ReceptionsUnderPressure',
    'NumberOfInvolvements',
    'TopSpeed',
    'SpeedRuns',
    'Sprints',
    'TotalDistance',
  ]),
];

export function formatValue(v: number, fmt: Fmt): string {
  switch (fmt) {
    case 'dec':
      return v.toFixed(2).replace('.', ',');
    case 'pct':
      return String(Math.round(v));
    case 'mult':
      return `${v === 0 ? '0' : v.toFixed(1).replace('.', ',')}x`;
    default:
      return String(Math.round(v));
  }
}

/** Sem acento e em minúsculas, para comparar nomes na busca. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export interface ViewOptions {
  tab: StatTab;
  team: string;
  query: string;
  /** Coluna para ordenar; `null` usa a ordem padrão da aba. */
  sortBy: string | null;
  desc: boolean;
}

/** Linhas da tabela: filtradas por equipe e nome, e ordenadas. A posição é o índice + 1. */
export function buildRows(players: PlayerRow[], o: ViewOptions): PlayerRow[] {
  const q = normalize(o.query);
  const rows = players.filter(
    (p) =>
      (!o.tab.only || o.tab.only.includes(p.position)) &&
      (o.team === '' || p.team === o.team) &&
      (q === '' || normalize(p.name).includes(q)),
  );
  const cols = o.tab.columns;
  const main = o.sortBy ? cols.find((c) => c.id === o.sortBy) : cols[0];
  const primary = main ?? cols[0];
  const dir = o.sortBy ? (o.desc ? -1 : 1) : -1;
  const minutes = (p: PlayerRow) => s(p, 'TimePlayed');
  return [...rows].sort((a, b) => {
    const d = (primary.get(a) - primary.get(b)) * dir;
    if (d) return d;
    if (!o.sortBy) {
      // Ordem padrão: desempata pela 2ª coluna (maior primeiro) e depois por menos minutos.
      const second = cols[1];
      if (second) {
        const e = second.get(b) - second.get(a);
        if (e) return e;
      }
    }
    return minutes(a) - minutes(b) || a.name.localeCompare(b.name, 'pt-BR');
  });
}
