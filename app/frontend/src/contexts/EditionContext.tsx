import { createContext, useCallback, useContext, useMemo } from 'react';
import Loading from '@/components/Loading';
import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useParams } from 'react-router-dom';
import {
  getCompetition,
  getEdition,
  type Edition,
  type SectionKey,
} from '@/data/registry';
import { editionPath } from '@/lib/editionPaths';
import { buildDataset, withFifaRanking } from '@/data/edition/build';
import { loadFifaRanking } from '@/data/stats/fifa';
import { loadEditionSnapshot } from '@/data/edition/source';
import NotFound from '@/pages/NotFound';
import SideMenuShell from '@/components/SideMenuShell';

const EditionContext = createContext<Edition | null>(null);

export function useEdition(): Edition {
  const edition = useContext(EditionContext);
  if (!edition)
    throw new Error('useEdition deve ser usado dentro de uma edição');
  return edition;
}

/** Devolve uma função que monta o endereço de uma seção da edição atual. */
export function useEditionPath() {
  const { competition, year } = useEdition();
  return useCallback(
    (section: SectionKey = 'overview', sub?: string) =>
      editionPath(competition, year, section, sub),
    [competition, year],
  );
}

export function EditionLayout() {
  const params = useParams();
  const slug = params.competition ?? '';
  const year = params.edition ?? '';

  const competition = getCompetition(slug);
  const base = competition ? getEdition(slug, year) : undefined;

  const snapshot = useQuery({
    queryKey: ['edition-snapshot', slug, year],
    queryFn: () => loadEditionSnapshot(slug, year),
    enabled: Boolean(base?.snapshot),
    staleTime: 5 * 60_000,
  });

  // Ranking oficial da FIFA: dá a confederação e a posição de cada seleção. Não bloqueia a tela.
  const fifa = useQuery({
    queryKey: ['stats', 'fifa'],
    queryFn: loadFifaRanking,
    staleTime: 5 * 60_000,
  });

  const edition = useMemo(() => {
    if (!base) return base;
    const data = snapshot.data
      ? buildDataset(base.data, snapshot.data)
      : base.data;
    return {
      ...base,
      data: { ...data, teams: withFifaRanking(data.teams, fifa.data) },
    };
  }, [base, snapshot.data, fifa.data]);

  if (!competition) return <NotFound />;

  if (!edition) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Edição não encontrada</h1>
          <p className="text-[#94A3B8] mt-2">
            Não há dados disponíveis para esta edição.
          </p>
          <Link
            to={`/${slug}`}
            className="text-[#D4AF37] mt-4 inline-block hover:underline"
          >
            Ver edições disponíveis
          </Link>
        </div>
      </div>
    );
  }

  if (base?.snapshot && snapshot.isPending) {
    return (
      <div className="text-white">
        <Loading fullScreen testId="edition-loading" label="Carregando dados da edição…" />
      </div>
    );
  }

  return (
    <EditionContext.Provider value={edition}>
      <SideMenuShell competition={slug}>
        <div className="h-full overflow-y-auto" data-testid="edition-scroll">
          <Outlet />
        </div>
      </SideMenuShell>
    </EditionContext.Provider>
  );
}
