import { editionSnapshotSchema, type EditionSnapshot } from './types';

/**
 * Lê o arquivo exportado de uma edição (`data/editions/<competição>-<ano>.json`).
 * Devolve `null` se o arquivo não existir ou não tiver o formato esperado.
 */
export async function loadEditionSnapshot(
  competition: string,
  year: string,
): Promise<EditionSnapshot | null> {
  const base = import.meta.env?.BASE_URL ?? '/';
  let res: Response;
  try {
    res = await fetch(`${base}data/editions/${competition}-${year}.json`, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return null; // inclusive quando o servidor devolve a página HTML do site
  }
  const parsed = editionSnapshotSchema.safeParse(body);
  if (!parsed.success) {
    console.error(
      '[edition] arquivo fora do formato esperado',
      parsed.error.issues.slice(0, 3),
    );
    return null;
  }
  return parsed.data;
}
