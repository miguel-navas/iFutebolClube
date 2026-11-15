import { useQuery } from '@tanstack/react-query';
import { useEdition } from '@/contexts/EditionContext';
import { loadTeamSquad } from '@/data/squad/source';

/** Elenco real de uma seleção na edição aberta; `null` quando não há arquivo. */
export function useTeamSquad(code: string | undefined) {
  const { competition, year, snapshot } = useEdition();
  return useQuery({
    queryKey: ['team-squad', competition, year, code],
    queryFn: () => loadTeamSquad(competition, year, code!),
    enabled: Boolean(snapshot && code),
    staleTime: 5 * 60_000,
  });
}
