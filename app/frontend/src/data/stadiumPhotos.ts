import { useQuery } from '@tanstack/react-query';

export interface StadiumPhoto {
  file: string;
  author: string;
  license: string;
  source: string;
}

interface CatalogEntry extends Partial<StadiumPhoto> {
  photos?: StadiumPhoto[];
  description?: string;
  descriptionLang?: string;
  descriptionSource?: string;
  lat?: number | null;
  lon?: number | null;
}

export interface StadiumInfo {
  photos: (StadiumPhoto & { url: string })[];
  description: string | null;
  descriptionLang: string;
  descriptionSource: string;
  lat: number | null;
  lon: number | null;
}

/** Mesma chave usada por scripts/baixar-estadios.py: nome + cidade, sem acento, em minúsculas, com hífens. */
export function stadiumPhotoKey(name: string, city: string): string {
  return `${name} ${city}`
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function load(): Promise<Record<string, CatalogEntry>> {
  const base = import.meta.env?.BASE_URL ?? '/';
  try {
    const res = await fetch(`${base}estadios/estadios.json`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return {};
    return (await res.json()) as Record<string, CatalogEntry>;
  } catch {
    return {};
  }
}

/** Fotos (Wikimedia Commons) e texto (Wikipédia) dos estádios; devolve null se o catálogo não tem o estádio. */
export function useStadiumInfo(): (name: string, city: string) => StadiumInfo | null {
  const q = useQuery({ queryKey: ['stadium-photos'], queryFn: load, staleTime: 10 * 60_000 });
  const base = import.meta.env?.BASE_URL ?? '/';
  const catalogo = q.data ?? {};
  return (name, city) => {
    const e = catalogo[stadiumPhotoKey(name, city)];
    if (!e) return null;
    const lista: StadiumPhoto[] =
      e.photos ?? (e.file ? [{ file: e.file, author: e.author ?? '', license: e.license ?? '', source: e.source ?? '' }] : []);
    const photos = lista.map((p) => ({ ...p, url: `${base}${p.file}` }));
    if (photos.length === 0 && !e.description) return null;
    return {
      photos,
      description: e.description ?? null,
      descriptionLang: e.descriptionLang ?? 'pt',
      descriptionSource: e.descriptionSource ?? '',
      lat: e.lat ?? null,
      lon: e.lon ?? null,
    };
  };
}
