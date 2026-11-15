import { Link, useSearchParams } from 'react-router-dom';
import Loading from '@/components/Loading';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Trophy } from 'lucide-react';
import SideMenuShell from '@/components/SideMenuShell';
import EditionDashboard from '@/components/dashboard/EditionDashboard';
import TeamRanking from '@/components/dashboard/TeamRanking';
import NextEditionBlock from '@/components/dashboard/NextEditionBlock';
import YearSelector from '@/components/dashboard/YearSelector';
import { listCompetitions } from '@/data/registry';
import {
  editionsNewestFirst,
  latestEdition,
  upcomingEdition,
} from '@/data/stats/derive';
import { loadWorldCupStats } from '@/data/stats/source';
import { loadFifaRanking } from '@/data/stats/fifa';
import type { WorldCupStats } from '@/data/stats/types';

export default function Hub() {
  const competitions = listCompetitions();
  const [params, setParams] = useSearchParams();
  const stats = useQuery({
    queryKey: ['stats', 'copa'],
    queryFn: loadWorldCupStats,
    staleTime: 5 * 60_000,
  });

  const fifa = useQuery({
    queryKey: ['stats', 'fifa'],
    queryFn: loadFifaRanking,
    staleTime: 60 * 60_000,
  });

  return (
    <SideMenuShell>
      <div className="h-full overflow-y-auto">
        <header className="flex w-full items-center gap-3 px-4 sm:px-6 lg:px-8 2xl:px-12 pb-4 pt-16">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8960C]">
            <Trophy className="h-5 w-5 text-[#0A0F1C]" />
          </div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">iFutebolClube</h1>
        </header>

        <main className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 pb-20">
          <nav aria-label="Competições" className="flex flex-wrap gap-3">
            {competitions.map((c) => {
              const count = c.editions.length;
              return (
                <Link
                  key={c.slug}
                  to={`/${c.slug}`}
                  data-testid={`competition-${c.slug}`}
                  className="group inline-flex items-center gap-3 rounded-xl border border-[#1E293B] bg-[#131A2E] px-4 py-2.5 transition-all hover:border-[#D4AF37]/30"
                >
                  <span className="font-bold text-white transition-colors group-hover:text-[#D4AF37]">
                    {c.name}
                  </span>
                  <span className="text-xs text-[#94A3B8]">
                    {count === 0
                      ? 'Em breve'
                      : count === 1
                        ? '1 edição'
                        : `${count} edições`}
                  </span>
                  <ArrowRight className="h-4 w-4 text-[#94A3B8] transition-all group-hover:translate-x-1 group-hover:text-[#D4AF37]" />
                </Link>
              );
            })}
          </nav>

          <div className="mt-8" data-testid="dashboard-area">
            {stats.isPending ? (
              <Loading testId="stats-loading" label="Carregando estatísticas…" />
            ) : stats.data ? (
              <DashboardWithYears
                stats={stats.data}
                requestedYear={Number(params.get('ano'))}
                onSelect={(year) => setParams({ ano: String(year) })}
              />
            ) : (
              <p
                className="rounded-xl border border-[#1E293B] bg-[#131A2E] p-6 text-center text-[#94A3B8]"
                data-testid="stats-soon"
              >
                Estatísticas em breve
              </p>
            )}
          </div>

          {((stats.data && stats.data.ranking.length > 0) || fifa.data) && (
            <div className="mt-8">
              <TeamRanking ranking={stats.data?.ranking ?? []} fifa={fifa.data ?? null} />
            </div>
          )}
        </main>
      </div>
    </SideMenuShell>
  );
}

function DashboardWithYears({
  stats,
  requestedYear,
  onSelect,
}: {
  stats: WorldCupStats;
  requestedYear: number;
  onSelect: (year: number) => void;
}) {
  const editions = editionsNewestFirst(stats);
  // Ano inválido ou sem estatísticas no endereço: volta para a última edição.
  const shown =
    editions.find((e) => e.year === requestedYear) ?? latestEdition(stats);
  const next = upcomingEdition(stats);
  return (
    <div className="flex flex-col gap-4">
      {next && <NextEditionBlock next={next} />}
      <EditionDashboard edition={shown} />
      <YearSelector
        years={editions.map((e) => e.year)}
        selected={shown.year}
        onSelect={onSelect}
      />
      <p
        className="text-center text-xs text-[#94A3B8]"
        data-testid="stats-generated-at"
      >
        Dados de {formatDate(stats.generatedAt)}
      </p>
    </div>
  );
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
