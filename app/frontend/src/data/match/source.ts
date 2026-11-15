import { matchDetailSchema, type MatchDetail } from './types';

/**
 * Lê o detalhe de um jogo (`data/editions/<competição>-<ano>/matches/<id>.json`).
 * Devolve `null` se o arquivo não existir ou não tiver o formato esperado.
 */
export async function loadMatchDetail(
  competition: string,
  year: string,
  id: number,
): Promise<MatchDetail | null> {
  const base = import.meta.env?.BASE_URL ?? '/';
  let res: Response;
  try {
    res = await fetch(
      `${base}data/editions/${competition}-${year}/matches/${id}.json`,
      {
        headers: { Accept: 'application/json' },
      },
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
  const parsed = matchDetailSchema.safeParse(body);
  if (!parsed.success) {
    console.error(
      '[match] arquivo fora do formato esperado',
      parsed.error.issues.slice(0, 3),
    );
    return null;
  }
  return parsed.data;
}
