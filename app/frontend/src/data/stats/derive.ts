import type { EditionStats, NextEdition, WorldCupStats } from './types';

/** Gols por jogo, com uma casa decimal; `null` quando faltar dado ou não houver jogos. */
export function goalsPerMatch(edition: Pick<EditionStats, 'goals' | 'matches'>): number | null {
  if (edition.goals == null || edition.matches == null || edition.matches === 0) return null;
  return Math.round((edition.goals / edition.matches) * 10) / 10;
}

/** Edição de maior ano entre as que têm estatísticas. */
export function latestEdition(stats: WorldCupStats): EditionStats {
  return stats.editions.reduce((a, b) => (b.year > a.year ? b : a));
}

/** Próxima edição só existe se o ano for maior que o da última edição com dados. */
export function upcomingEdition(stats: WorldCupStats): NextEdition | null {
  const next = stats.nextEdition;
  return next && next.year > latestEdition(stats).year ? next : null;
}

/** Todas as edições com estatísticas, da mais recente para a mais antiga. */
export function editionsNewestFirst(stats: WorldCupStats): EditionStats[] {
  return [...stats.editions].sort((a, b) => b.year - a.year);
}
