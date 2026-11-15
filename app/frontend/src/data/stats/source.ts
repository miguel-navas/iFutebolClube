import { worldCupStatsSchema, type WorldCupStats } from './types';

const URL_COPA = `${import.meta.env?.BASE_URL ?? '/'}data/stats/copa.json`;

/**
 * Única porta de entrada das estatísticas da Copa do Mundo.
 * Hoje lê um arquivo estático exportado do banco; trocar por uma API muda só este corpo.
 * Devolve `null` quando o arquivo não existe ou não é válido.
 */
export async function loadWorldCupStats(): Promise<WorldCupStats | null> {
  let res: Response;
  try {
    res = await fetch(URL_COPA, { headers: { Accept: 'application/json' } });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    console.error('[stats] copa.json não é JSON válido');
    return null;
  }
  const parsed = worldCupStatsSchema.safeParse(body);
  if (!parsed.success) {
    console.error('[stats] copa.json fora do formato esperado', parsed.error.issues.slice(0, 3));
    return null;
  }
  return parsed.data;
}
