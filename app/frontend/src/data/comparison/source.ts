import { comparisonSchema, type ComparisonFile } from './types';

/** Lê `data/comparison/h2h.json`; devolve `null` se não existir ou estiver fora do formato. */
export async function loadComparison(): Promise<ComparisonFile | null> {
  const base = import.meta.env?.BASE_URL ?? '/';
  let res: Response;
  try {
    res = await fetch(`${base}data/comparison/h2h.json`, { headers: { Accept: 'application/json' } });
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
  const parsed = comparisonSchema.safeParse(body);
  if (!parsed.success) {
    console.error('[comparison] arquivo fora do formato esperado', parsed.error.issues.slice(0, 3));
    return null;
  }
  return parsed.data;
}
