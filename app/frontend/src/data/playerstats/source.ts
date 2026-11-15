import { playerStatsSchema, type PlayerStatsFile } from './types';

/**
 * Lê as estatísticas dos jogadores da edição (`data/editions/<competição>-<ano>/player-stats.json`).
 * Devolve `null` se o arquivo não existir ou não tiver o formato esperado.
 */
export async function loadPlayerStats(
  competition: string,
  year: string,
): Promise<PlayerStatsFile | null> {
  const base = import.meta.env?.BASE_URL ?? '/';
  let res: Response;
  try {
    res = await fetch(
      `${base}data/editions/${competition}-${year}/player-stats.json`,
      { headers: { Accept: 'application/json' } },
    );
  } catch {
    return null;
  }
  if (!res.ok) return null;
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return null;
  }
  const parsed = playerStatsSchema.safeParse(body);
  if (!parsed.success) {
    console.error(
      '[player-stats] arquivo fora do formato esperado',
      parsed.error.issues.slice(0, 3),
    );
    return null;
  }
  return parsed.data;
}
