import { probabilitiesSchema, type ProbabilitiesFile } from './types';

/**
 * Lê as probabilidades da edição (`data/editions/<competição>-<ano>/probabilities.json`).
 * Devolve `null` se o arquivo não existir ou não tiver o formato esperado.
 */
export async function loadProbabilities(
  competition: string,
  year: string,
): Promise<ProbabilitiesFile | null> {
  const base = import.meta.env?.BASE_URL ?? '/';
  let res: Response;
  try {
    res = await fetch(
      `${base}data/editions/${competition}-${year}/probabilities.json`,
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
  const parsed = probabilitiesSchema.safeParse(body);
  if (!parsed.success) {
    console.error(
      '[probabilities] arquivo fora do formato esperado',
      parsed.error.issues.slice(0, 3),
    );
    return null;
  }
  return parsed.data;
}
