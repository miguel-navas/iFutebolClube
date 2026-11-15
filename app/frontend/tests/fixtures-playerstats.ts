// Dados de TESTE: jogadores e números inventados, não são de nenhum torneio real.
type Pos = 'GO' | 'DF' | 'MC' | 'AT' | null;
export const pstat = (
  id: number,
  name: string,
  team: string,
  position: Pos,
  stats: Record<string, number>,
) => ({ id, name, team, position, stats });

export const basePlayers = () => [
  pstat(1, 'Atacante Alfa', 'BRA', 'AT', {
    Goals: 5,
    Assists: 2,
    TimePlayed: 400,
    AttemptAtGoal: 20,
    AttemptAtGoalOnTarget: 10,
    XG: 4,
    Passes: 100,
    PassesCompleted: 80,
    YellowCards: 1,
    TopSpeed: 33.456,
    TotalDistance: 41000,
  }),
  pstat(2, 'Meia Beta', 'BRA', 'MC', {
    Goals: 5,
    Assists: 3,
    TimePlayed: 500,
    AttemptAtGoal: 10,
    AttemptAtGoalOnTarget: 5,
    XG: 5,
  }),
  pstat(3, 'Goleiro Gama', 'FRA', 'GO', {
    GoalkeeperSaves: 20,
    GoalkeeperDefensiveActionsInsidePenaltyArea: 30,
    TimePlayed: 630,
  }),
  pstat(4, 'José Muñoz Teste', 'FRA', 'DF', {
    Goals: 1,
    Assists: 0,
    TimePlayed: 600,
    ForcedTurnovers: 12,
  }),
  pstat(5, 'Zagueiro Delta', 'FRA', 'DF', {
    Goals: 6,
    Assists: 0,
    TimePlayed: 300,
    XG: 4,
  }),
];

/** Muitos jogadores de uma mesma seleção, para testar "Mostrar mais". */
export const fillerPlayers = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    pstat(1000 + i, `Reserva ${String(i + 1).padStart(3, '0')}`, 'BRA', 'MC', {
      Goals: 0,
      Assists: 0,
      TimePlayed: 10 + i,
      Passes: 1000 - i,
    }),
  );
