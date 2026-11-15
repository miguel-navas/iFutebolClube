import TeamFlag from '@/components/Flag';
import Loading from '@/components/Loading';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Flag,
  MapPin,
  User,
  Users,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Card } from '@/components/ui/card';
import { useEdition, useEditionPath } from '@/contexts/EditionContext';
import { loadMatchDetail } from '@/data/match/source';
import { shootoutGoals } from '@/data/match/types';
import Timeline from '@/components/match/Timeline';
import Lineups from '@/components/match/Lineups';
import Legend from '@/components/match/Legend';
import MatchStats from '@/components/match/MatchStats';
import PlayerModal from '@/components/PlayerModal';
import { useTeamSquad } from '@/hooks/useTeamSquad';
import { viewFromSquad, type PlayerView } from '@/data/squad/view';
import { MatchIcon } from '@/components/match/Icons';

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

export default function MatchDetail() {
  const { id = '' } = useParams();
  const { data, competition, year, snapshot } = useEdition();
  const path = useEditionPath();

  const match = /^\d+$/.test(id)
    ? data.matches.find((m) => m.id === Number(id))
    : undefined;

  const detailQuery = useQuery({
    queryKey: ['match-detail', competition, year, match?.id],
    queryFn: () => loadMatchDetail(competition, year, match!.id),
    enabled: Boolean(snapshot && match),
    staleTime: 5 * 60_000,
  });
  const detail = detailQuery.data ?? null;
  const squadA = useTeamSquad(match?.teamA).data ?? null;
  const squadB = useTeamSquad(match?.teamB).data ?? null;
  const [tab, setTab] = useState<'jogo' | 'stats'>('jogo');
  const [picked, setPicked] = useState<{
    side: 'A' | 'B';
    id: number | null;
    name: string;
  } | null>(null);

  if (!match) {
    return (
      <div className="min-h-screen text-white">
        <Navbar />
        <div
          className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 pb-20 pt-28 text-center"
          data-testid="match-not-found"
        >
          <h1 className="text-2xl font-extrabold">Jogo não encontrado</h1>
          <p className="mt-2 text-[#94A3B8]">
            Não há um jogo com este número nesta edição.
          </p>
          <Link
            to={path('grupos')}
            className="mt-4 inline-block text-[#D4AF37] hover:underline"
          >
            Ver a fase de grupos
          </Link>
        </div>
      </div>
    );
  }

  const team = (code: string) => data.teams.find((t) => t.code === code);
  const finished = match.scoreA !== null && match.scoreB !== null;

  const Side = ({ code, testId }: { code: string; testId: string }) => {
    const t = team(code);
    return (
      <Link
        to={path('selecoes', code)}
        data-testid={testId}
        className="flex min-w-0 flex-1 flex-col items-center gap-2 rounded-xl p-2 text-center hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        <TeamFlag code={code} name={t?.name} className="h-12 sm:h-16" />
        <span className="max-w-full break-words text-base font-bold text-white sm:text-lg">
          {t?.name ?? code}
        </span>
        <span className="text-xs text-[#94A3B8]">{code}</span>
      </Link>
    );
  };

  const facts: {
    icon: typeof Clock;
    label: string;
    value: string;
    id: string;
  }[] = [
    {
      icon: CalendarDays,
      label: 'Data',
      value: longDate(match.date),
      id: 'date',
    },
    { icon: Clock, label: 'Horário', value: match.time, id: 'time' },
    { icon: MapPin, label: 'Estádio', value: match.stadium, id: 'stadium' },
    { icon: MapPin, label: 'Cidade', value: match.city, id: 'city' },
    {
      icon: Flag,
      label: 'Fase',
      value: match.group
        ? `${match.stage} · Grupo ${match.group}`
        : match.stage,
      id: 'stage',
    },
  ];
  if (detail?.referee)
    facts.push({
      icon: User,
      label: 'Árbitro',
      value: detail.referee,
      id: 'referee',
    });
  if (detail?.attendance)
    facts.push({
      icon: Users,
      label: 'Público',
      value: detail.attendance.toLocaleString('pt-BR'),
      id: 'attendance',
    });

  const openPlayer = (
    side: 'A' | 'B',
    p: { id: number | null; name: string },
  ) => setPicked({ side, id: p.id, name: p.name });

  let pickedView: PlayerView | null = null;
  if (picked) {
    const squad = picked.side === 'A' ? squadA : squadB;
    const reference = data.matches.reduce(
      (min, m) => (m.date < min ? m.date : min),
      match.date,
    );
    const fromSquad = squad?.players.find((p) => p.id === picked.id);
    const fromLineup = detail?.teams[picked.side].players.find(
      (p) => p.id === picked.id,
    );
    pickedView = fromSquad
      ? viewFromSquad(fromSquad, reference)
      : {
          id: picked.id ?? undefined,
          name: picked.name,
          number: fromLineup?.number ?? null,
          position: fromLineup?.position ?? null,
        };
  }
  const pickedTeam = picked
    ? team(picked.side === 'A' ? match.teamA : match.teamB)
    : undefined;

  const shootout = detail ? shootoutGoals(detail.events) : [];
  const names = {
    A: team(match.teamA)?.name ?? match.teamA,
    B: team(match.teamB)?.name ?? match.teamB,
  };

  return (
    <div className="min-h-screen text-white">
      <Navbar />
      <div
        className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 pb-20 pt-24"
        data-testid="match-detail"
        data-match-id={match.id}
      >
        <Link
          to={path(match.group ? 'grupos' : 'eliminatorias')}
          data-testid="match-back"
          className="inline-flex items-center gap-1.5 text-sm text-[#D4AF37] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {match.group ? 'Fase de grupos' : 'Eliminatórias'}
        </Link>

        <p
          className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#94A3B8]"
          data-testid="match-heading"
        >
          {match.stage}
          {match.group ? ` · Grupo ${match.group}` : ''}
        </p>

        <Card className="mt-3 border-[#1E293B] bg-[#131A2E] p-5 sm:p-8">
          <div className="flex items-center justify-between gap-2">
            <Side code={match.teamA} testId="match-team-a" />
            <div className="flex shrink-0 flex-col items-center gap-1 px-2 text-center">
              <span
                className="text-3xl font-extrabold text-[#D4AF37] sm:text-4xl"
                data-testid="match-center"
              >
                {finished ? `${match.scoreA} - ${match.scoreB}` : match.time}
              </span>
              {finished &&
                match.penaltiesA != null &&
                match.penaltiesB != null && (
                  <span
                    className="text-xs text-[#94A3B8]"
                    data-testid="match-penalties"
                  >
                    Pênaltis: {match.penaltiesA} x {match.penaltiesB}
                  </span>
                )}
              <span
                className="rounded-full border border-[#1E293B] px-3 py-0.5 text-[11px] font-semibold text-[#94A3B8]"
                data-testid="match-status"
              >
                {finished ? 'Encerrado' : 'Não iniciado'}
              </span>
            </div>
            <Side code={match.teamB} testId="match-team-b" />
          </div>
        </Card>

        <Card className="mt-4 border-[#1E293B] bg-[#131A2E] p-5">
          <h2 className="text-sm font-semibold text-white">
            Informações do jogo
          </h2>
          <dl
            className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"
            data-testid="match-facts"
          >
            {facts.map(({ icon: Icon, label, value, id }) => (
              <div
                key={id}
                className="flex items-start gap-3 rounded-lg border border-[#1E293B] px-3 py-2"
                data-testid={`match-fact-${id}`}
              >
                <Icon
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]"
                  aria-hidden
                />
                <div className="min-w-0">
                  <dt className="text-xs text-[#94A3B8]">{label}</dt>
                  <dd className="break-words text-sm font-semibold text-white">
                    {value}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </Card>

        {!finished && (
          <p
            className="mt-4 text-sm text-[#94A3B8]"
            data-testid="match-not-played"
          >
            Os gols, cartões e substituições aparecem depois que o jogo começar.
          </p>
        )}
        {finished && detailQuery.isPending && (
          <Loading testId="match-loading" label="Carregando detalhes do jogo…" />
        )}
        {finished && !detail && !detailQuery.isPending && (
          <p
            className="mt-4 text-sm text-[#94A3B8]"
            data-testid="match-detail-missing"
          >
            Os detalhes deste jogo (eventos e escalações) não estão disponíveis.
          </p>
        )}

        {(detail?.stats || detail?.ranking) && (
          <div
            className="mt-4 flex gap-2"
            role="tablist"
            data-testid="match-tabs"
          >
            {(
              [
                ['jogo', 'Lances e escalações'],
                ['stats', 'Estatísticas'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                data-testid={`match-tab-${key}`}
                onClick={() => setTab(key)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === key
                    ? 'border-[#D4AF37]/60 bg-[#D4AF37]/10 text-[#D4AF37]'
                    : 'border-[#1E293B] bg-[#131A2E] text-[#94A3B8] hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {detail && (detail.stats || detail.ranking) && tab === 'stats' && (
          <div className="mt-4">
            <MatchStats
              stats={detail.stats}
              ranking={detail.ranking}
              names={names}
              source={competition === 'nations-league' ? 'UEFA' : 'FIFA'}
            />
          </div>
        )}

        {detail && !((detail.stats || detail.ranking) && tab === 'stats') && (
          <>
            <div className="mt-4 grid gap-4 xl:grid-cols-2 xl:items-stretch">
              <div className="flex flex-col gap-4" data-testid="match-left">
                {finished && (
                  <Card
                    className="flex-1 border-[#1E293B] bg-[#131A2E] p-5"
                    data-testid="match-events"
                  >
                    <h2 className="mb-3 text-sm font-semibold text-white">
                      Lances do jogo
                    </h2>
                    <Timeline detail={detail} onPlayer={openPlayer} />
                  </Card>
                )}

                {finished && detail.penalties && (
                  <Card
                    className="border-[#1E293B] bg-[#131A2E] p-5"
                    data-testid="match-shootout"
                  >
                    <h2 className="text-sm font-semibold text-white">
                      Disputa de pênaltis:{' '}
                      <span data-testid="shootout-score">
                        {detail.penalties.a} x {detail.penalties.b}
                      </span>
                    </h2>
                    <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                      {shootout.map((g, i) =>
                        g.type === 'goal' ? (
                          <li
                            key={i}
                            className="flex items-center gap-2"
                            data-testid="shootout-goal"
                            data-side={g.side}
                          >
                            <MatchIcon kind="penalty" />
                            <span className="text-white">{g.player.name}</span>
                            <span className="text-xs text-[#94A3B8]">
                              ({g.side === 'A' ? names.A : names.B})
                            </span>
                          </li>
                        ) : null,
                      )}
                    </ul>
                  </Card>
                )}
              </div>

              <Card
                className="h-full border-[#1E293B] bg-[#131A2E] p-5"
                data-testid="match-lineups"
              >
                <h2 className="mb-3 text-sm font-semibold text-white">
                  Escalações
                </h2>
                <Lineups
                  detail={detail}
                  names={names}
                  onPlayer={(side, p) => openPlayer(side, p)}
                />
              </Card>
            </div>

            <div className="mt-4">
              <Legend />
            </div>
          </>
        )}

        {pickedView && picked && (
          <PlayerModal
            player={pickedView}
            teamName={
              pickedTeam?.name ??
              (picked.side === 'A' ? match.teamA : match.teamB)
            }
            teamCode={pickedTeam?.code ?? (picked.side === 'A' ? match.teamA : match.teamB)}
            onClose={() => setPicked(null)}
          />
        )}
      </div>
    </div>
  );
}
