import type { SectionKey } from '@/data/registry';

/** Trecho do endereço de cada seção da edição. */
export const SECTION_SLUG: Record<SectionKey, string> = {
  overview: '',
  jogos: 'jogos',
  grupos: 'grupos',
  selecoes: 'selecoes',
  jogadores: 'jogadores',
  probabilidades: 'probabilidades',
  comparacao: 'comparacao',
  eliminatorias: 'eliminatorias',
  estadios: 'estadios',
};

export function editionBase(competition: string, year: string): string {
  return `/${competition}/${year}`;
}

export function editionPath(
  competition: string,
  year: string,
  section: SectionKey = 'overview',
  sub?: string,
): string {
  const parts = [editionBase(competition, year), SECTION_SLUG[section]];
  if (sub) parts.push(encodeURIComponent(sub));
  return parts.filter(Boolean).join('/');
}
