import { teamSquadSchema, type TeamSquad } from './types';

/** Lê o elenco de uma seleção (`data/editions/<competição>-<ano>/teams/<CÓDIGO>.json`). */
export async function loadTeamSquad(
  competition: string,
  year: string,
  code: string,
): Promise<TeamSquad | null> {
  const base = import.meta.env?.BASE_URL ?? '/';
  let res: Response;
  try {
    res = await fetch(
      `${base}data/editions/${competition}-${year}/teams/${encodeURIComponent(code)}.json`,
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
  const parsed = teamSquadSchema.safeParse(body);
  if (!parsed.success) {
    console.error(
      '[squad] arquivo fora do formato esperado',
      parsed.error.issues.slice(0, 3),
    );
    return null;
  }
  return parsed.data;
}
