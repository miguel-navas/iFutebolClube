import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import Loading from '@/components/Loading';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import SideMenuShell from '@/components/SideMenuShell';
import { getCompetition, listAvailableEditions } from '@/data/registry';
import { editionPath } from '@/lib/editionPaths';
import HostEditionList from '@/components/HostEditionList';
import NotFound from '@/pages/NotFound';

// Mapa e geometria só carregam na página da Copa do Mundo.
const WorldCupMap = lazy(() => import('@/components/WorldCupMap'));

/** Celular (< 768 px): lê o tamanho da tela já na primeira renderização, para não baixar o mapa à toa. */
function useCompactScreen(): boolean {
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  );
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const on = () => setCompact(mql.matches);
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, []);
  return compact;
}

export default function Competition() {
  const { competition = '' } = useParams();
  const navigate = useNavigate();
  const info = getCompetition(competition);
  const editions = useMemo(
    () => listAvailableEditions(competition),
    [competition],
  );
  const availableYears = useMemo(
    () => new Set(editions.map((e) => e.year)),
    [editions],
  );
  const compact = useCompactScreen();
  const [mapOnRequest, setMapOnRequest] = useState(false);
  if (!info) return <NotFound />;

  const mapElement = (
    <Suspense fallback={<div className="flex h-full w-full items-center justify-center bg-[#0B1220]"><Loading testId="map-loading" label="Carregando mapa…" /></div>}>
      <WorldCupMap
        availableYears={availableYears}
        onOpenEdition={(year) => navigate(editionPath(competition, year))}
      />
    </Suspense>
  );

  return (
    <SideMenuShell competition={competition}>
      {competition === 'copa' && !compact ? (
        mapElement
      ) : competition === 'copa' ? (
        <div className="h-full overflow-y-auto" data-testid="copa-mobile">
          <div className="w-full px-4 pb-12 pt-20">
            <h1 className="mb-5 text-3xl font-extrabold">{info.name}</h1>
            <HostEditionList
              competition={competition}
              availableYears={availableYears}
              mapShown={mapOnRequest}
              onShowMap={() => setMapOnRequest(true)}
            />
            {mapOnRequest && (
              <div className="mt-6 h-[70vh] overflow-hidden rounded-xl border border-[#1E293B]" data-testid="wc-map-block">
                {mapElement}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="h-full overflow-y-auto">
          <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 pb-12 pt-20">
            <Link to="/" className="text-sm text-[#D4AF37] hover:underline">
              ← Todas as competições
            </Link>
            <h1 className="mt-4 text-3xl font-extrabold">{info.name}</h1>

            {editions.length === 0 ? (
              <p className="mt-6 text-[#94A3B8]" data-testid="empty-editions">
                Nenhuma edição disponível ainda. Em breve.
              </p>
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {editions.map((e) => (
                  <Link key={e.year} to={editionPath(e.competition, e.year)}>
                    <Card className="group border-[#1E293B] bg-[#131A2E] p-6 transition-all hover:border-[#D4AF37]/30">
                      <h2 className="text-lg font-bold text-white transition-colors group-hover:text-[#D4AF37]">
                        {e.label}
                      </h2>
                      <ArrowRight className="mt-3 h-4 w-4 text-[#94A3B8] transition-all group-hover:text-[#D4AF37]" />
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </SideMenuShell>
  );
}
