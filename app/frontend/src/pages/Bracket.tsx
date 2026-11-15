import Flag from '@/components/Flag';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import BracketTree from '@/components/bracket/BracketTree';
import { buildTreeLayout, roundRank } from '@/components/bracket/layout';
import type { Stadium, BracketMatch } from '@/data/worldCupData';
import { sameStadium } from '@/data/stadiumAliases';
import type { EditionDataset } from '@/data/registry';
import { useEdition, useEditionPath } from '@/contexts/EditionContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Trophy, Calendar, X, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const COUNTRY_CODES: Record<string, string> = {
  EUA: 'USA',
  México: 'MEX',
  Canadá: 'CAN',
};
const COUNTRY_COLORS: Record<string, string> = {
  EUA: '#3B82F6',
  México: '#22C55E',
  Canadá: '#EF4444',
};
const FALLBACK_COLOR = '#94A3B8';

const ROUND_COLORS: Record<number, string> = {
  6: '#D4AF37',
  5: '#94A3B8',
  4: '#3B82F6',
  3: '#22C55E',
  2: '#F97316',
  1: '#A78BFA',
  0: '#94A3B8',
};

function BracketCard({ match }: { match: BracketMatch }) {
  const { data } = useEdition();
  const path = useEditionPath();
  const rank = roundRank(match.round);
  const isFinal = rank === 6;
  const color = ROUND_COLORS[rank];
  const nameOf = (code: string | null) =>
    code
      ? (data.teams.find((t) => t.code === code)?.name ?? code)
      : 'A definir';
  const known = (code: string | null) =>
    Boolean(code && data.teams.some((t) => t.code === code));

  const hasPens = match.penaltiesA != null && match.penaltiesB != null;
  const decided = match.scoreA !== null && match.scoreB !== null;
  const winner: 'A' | 'B' | null = !decided
    ? null
    : match.scoreA! > match.scoreB!
      ? 'A'
      : match.scoreB! > match.scoreA!
        ? 'B'
        : hasPens
          ? match.penaltiesA! > match.penaltiesB!
            ? 'A'
            : 'B'
          : null;

  const row = (side: 'A' | 'B') => {
    const code = side === 'A' ? match.teamA : match.teamB;
    const score = side === 'A' ? match.scoreA : match.scoreB;
    const pens = side === 'A' ? match.penaltiesA : match.penaltiesB;
    const wins = winner === side;
    return (
      <div
        className="flex items-center justify-between bg-[#0A0F1C]/50 rounded-lg px-3 py-2"
        data-testid="bracket-team"
        data-winner={wins ? 'true' : undefined}
      >
        <span
          className={`flex min-w-0 items-center gap-2 text-sm ${wins ? 'font-extrabold text-white' : 'font-semibold text-[#CBD5E1]'}`}
        >
          {known(code) && <Flag code={code!} className="h-4 shrink-0" />}
          <span className="truncate">{nameOf(code)}</span>
        </span>
        <span
          className={`text-sm font-bold ${wins ? 'text-[#D4AF37]' : 'text-[#94A3B8]'}`}
        >
          {score ?? '-'}
          {hasPens && pens != null && (
            <span className="ml-1 text-[10px] font-normal">({pens})</span>
          )}
        </span>
      </div>
    );
  };

  const card = (
    <Card
      className={`bg-[#131A2E] border-[#1E293B] p-4 hover:border-[#D4AF37]/30 transition-all ${isFinal ? 'border-[#D4AF37]/50 shadow-lg shadow-[#D4AF37]/10' : ''
        }`}
    >
      <div className="flex items-center justify-between mb-2">
        <Badge
          variant="outline"
          className="text-[10px] font-semibold"
          style={{ color, borderColor: color + '60' }}
        >
          {match.round}
        </Badge>
        <span className="text-[10px] text-[#94A3B8]">
          {new Date(match.date + 'T00:00:00').toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
          })}
        </span>
      </div>

      <div className="space-y-2 my-3">
        {row('A')}
        {row('B')}
      </div>

      <div className="flex items-center gap-1 text-[10px] text-[#94A3B8]">
        <MapPin className="w-3 h-3" />
        {match.stadium}
      </div>
    </Card>
  );

  if (match.matchId === undefined) return card;
  return (
    <Link
      to={path('jogos', String(match.matchId))}
      data-testid="bracket-match"
      data-match-id={match.matchId}
      aria-label={`Abrir jogo ${nameOf(match.teamA)} x ${nameOf(match.teamB)}`}
      className="block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
    >
      {card}
    </Link>
  );
}

interface StadiumMatchItem {
  type: 'group' | 'knockout';
  date: string;
  time: string;
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  stage: string;
  group?: string;
  round?: string;
  id?: number;
}

function getStadiumMatches(
  data: EditionDataset,
  stadiumName: string,
): StadiumMatchItem[] {
  const { matches, bracketMatches } = data;
  const result: StadiumMatchItem[] = [];

  // Group stage matches
  matches.forEach((m) => {
    if (sameStadium(m.stadium, stadiumName) && m.group) {
      result.push({
        id: m.id,
        type: 'group',
        date: m.date,
        time: m.time,
        teamA: m.teamA,
        teamB: m.teamB,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        stage: `Grupo ${m.group}`,
        group: m.group,
      });
    }
  });

  // Knockout stage matches
  bracketMatches.forEach((m) => {
    if (sameStadium(m.stadium, stadiumName)) {
      const played = data.matches.find((x) => x.id === m.matchId);
      result.push({
        id: m.matchId,
        type: 'knockout',
        date: m.date,
        time: played?.time ?? 'A definir',
        teamA:
          (m.teamA && data.teams.find((t) => t.code === m.teamA)?.name) ||
          m.teamA ||
          'A definir',
        teamB:
          (m.teamB && data.teams.find((t) => t.code === m.teamB)?.name) ||
          m.teamB ||
          'A definir',
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        stage: m.round,
        round: m.round,
      });
    }
  });

  // Sort by date
  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

function StadiumModal({
  stadium,
  onClose,
}: {
  stadium: Stadium;
  onClose: () => void;
}) {
  const { data } = useEdition();
  const path = useEditionPath();
  const navigate = useNavigate();
  const stadiumMatches = getStadiumMatches(data, stadium.name);
  const countryColors = COUNTRY_COLORS;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-[#0A0F1C] border border-[#1E293B] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#1E293B] bg-[#131A2E]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-2xl">
                🏟️
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{stadium.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-1 text-[#94A3B8]">
                    <MapPin className="w-3 h-3" />
                    <span className="text-xs">
                      {stadium.city}, {stadium.country}
                    </span>
                  </div>
                  <span className="text-[#1E293B]">·</span>
                  <div className="flex items-center gap-1 text-[#94A3B8]">
                    <Users className="w-3 h-3" />
                    <span className="text-xs">
                      {stadium.capacity.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Matches List */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="text-sm font-bold text-white">
              Jogos neste estádio
            </h3>
            <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border-none text-[10px]">
              {stadiumMatches.length} jogo
              {stadiumMatches.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {stadiumMatches.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-[#94A3B8] text-sm">
                Nenhum jogo programado para este estádio ainda.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stadiumMatches.map((match, idx) => {
                const roundColors: Record<string, string> = {
                  Final: '#D4AF37',
                  Semifinal: '#3B82F6',
                  Quartas: '#22C55E',
                  Oitavas: '#F97316',
                  '3º Lugar': '#94A3B8',
                };
                const stageColor =
                  match.type === 'knockout'
                    ? roundColors[match.round || ''] || '#94A3B8'
                    : countryColors[stadium.country] || '#94A3B8';

                return (
                  <div
                    key={idx}
                    {...(match.id !== undefined
                      ? {
                        role: 'link',
                        tabIndex: 0,
                        'data-testid': 'stadium-match-link',
                        onClick: () =>
                          navigate(path('jogos', String(match.id))),
                        onKeyDown: (e: React.KeyboardEvent) =>
                          e.key === 'Enter' &&
                          navigate(path('jogos', String(match.id))),
                      }
                      : {})}
                    className={`bg-[#131A2E] rounded-xl p-4 border border-[#1E293B] hover:border-[#D4AF37]/20 transition-all ${match.id !== undefined ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold"
                        style={{
                          color: stageColor,
                          borderColor: stageColor + '40',
                        }}
                      >
                        {match.stage}
                      </Badge>
                      <span className="text-[10px] text-[#94A3B8]">
                        {new Date(match.date + 'T00:00:00').toLocaleDateString(
                          'pt-BR',
                          {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          },
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        {match.type === 'group' && (
                          <Flag code={match.teamA} className="h-5" />
                        )}
                        <span className="text-sm font-semibold text-white">
                          {match.teamA}
                        </span>
                      </div>

                      <div className="px-4">
                        {match.scoreA !== null ? (
                          <span className="text-base font-extrabold text-white">
                            {match.scoreA} - {match.scoreB}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-3 py-1 rounded-lg">
                            {match.time}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-sm font-semibold text-white">
                          {match.teamB}
                        </span>
                        {match.type === 'group' && (
                          <Flag code={match.teamB} className="h-5" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BracketPage() {
  const edition = useEdition();
  const path = useEditionPath();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data } = edition;
  const { bracketMatches, stadiums } = data;
  const [selectedStadium, setSelectedStadium] = useState<Stadium | null>(null);

  // A aba vem do endereço: .../estadios ou .../eliminatorias
  const tab = pathname.replace(/\/+$/, '').endsWith('/estadios')
    ? 'stadiums'
    : 'bracket';
  const countries = [...new Set(stadiums.map((st) => st.country))];
  const finalDate = edition.finalVenue
    ? new Date(edition.finalVenue.date + 'T00:00:00').toLocaleDateString(
      'pt-BR',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      },
    )
    : null;

  const layout = buildTreeLayout(bracketMatches);

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <div
        className={`pt-24 pb-5 ${tab === 'bracket' ? 'w-full px-3 sm:px-6 lg:px-8 2xl:px-12' : 'w-full px-4 sm:px-6 lg:px-8 2xl:px-12'}`}
        data-testid="bracket-page"
        data-layout={tab === 'bracket' ? 'full' : 'contained'}
      >
        <Tabs
          value={tab}
          onValueChange={(v) =>
            navigate(path(v === 'stadiums' ? 'estadios' : 'eliminatorias'))
          }
          className="w-full"
        >


          {/* Bracket Tab */}
          <TabsContent value="bracket">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
              <div>
                <h1 className="text-3xl font-extrabold text-white">
                  Fase Eliminatória
                </h1>
              </div>

            </div>

            {bracketMatches.length === 0 && (
              <p
                className="text-center text-[#94A3B8] py-10"
                data-testid="bracket-empty"
              >
                Os jogos da fase eliminatória ainda não foram definidos.
              </p>
            )}

            {bracketMatches.length > 0 && <BracketTree layout={layout} />}

            {layout.others.length > 0 && (
              <section className="mt-10" data-testid="bracket-others">
                <h3 className="text-lg font-bold mb-4 text-[#94A3B8]">
                  Outros jogos
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3">
                  {layout.others.map((m) => (
                    <BracketCard key={m.id} match={m} />
                  ))}
                </div>
              </section>
            )}
          </TabsContent>

          {/* Stadiums Tab */}
          <TabsContent value="stadiums">
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-white">
                Estádios & Cidades-Sede
              </h1>
              <p className="text-[#94A3B8] mt-1">
                {stadiums.length} estádios em {countries.length}{' '}
                {countries.length === 1 ? 'país' : 'países'} · Clique para ver
                os jogos
              </p>
            </div>

            {/* Country Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              {countries
                .map((country) => ({
                  country,
                  code: COUNTRY_CODES[country] ?? '',
                  count: stadiums.filter((st) => st.country === country).length,
                  color: COUNTRY_COLORS[country] || FALLBACK_COLOR,
                }))
                .map((c) => (
                  <Card
                    key={c.country}
                    data-testid="country-summary"
                    className="bg-[#131A2E] border-[#1E293B] p-5 text-center"
                  >
                    <Flag code={c.code} name={c.country} className="h-10" />
                    <h3 className="text-lg font-bold text-white mt-2">
                      {c.country}
                    </h3>
                    <p
                      className="text-sm font-semibold mt-1"
                      style={{ color: c.color }}
                    >
                      {c.count} estádio{c.count > 1 ? 's' : ''}
                    </p>
                  </Card>
                ))}
            </div>

            {/* Stadium Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
              {stadiums.map((stadium) => {
                const countryColors = COUNTRY_COLORS;
                const matchCount = getStadiumMatches(data, stadium.name).length;

                return (
                  <Card
                    key={stadium.name}
                    data-testid="stadium-card"
                    className="bg-[#131A2E] border-[#1E293B] p-5 hover:border-[#D4AF37]/30 transition-all cursor-pointer group"
                    onClick={() => setSelectedStadium(stadium)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-3xl">{stadium.image}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold"
                        style={{
                          color:
                            countryColors[stadium.country] || FALLBACK_COLOR,
                          borderColor:
                            (countryColors[stadium.country] || FALLBACK_COLOR) +
                            '40',
                        }}
                      >
                        {stadium.country}
                      </Badge>
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-[#D4AF37] transition-colors">
                      {stadium.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-1 text-[#94A3B8]">
                      <MapPin className="w-3 h-3" />
                      <span className="text-xs">{stadium.city}</span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1E293B]">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#94A3B8]" />
                        <span className="text-xs text-[#94A3B8]">
                          Capacidade:
                        </span>
                        <span className="text-xs font-bold text-white">
                          {stadium.capacity.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border-none text-[10px] font-semibold">
                          {matchCount} jogo{matchCount !== 1 ? 's' : ''}
                        </Badge>
                        <ChevronRight className="w-3 h-3 text-[#94A3B8] group-hover:text-[#D4AF37] transition-colors" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Stadium Modal */}
      {selectedStadium && (
        <StadiumModal
          stadium={selectedStadium}
          onClose={() => setSelectedStadium(null)}
        />
      )}
    </div>
  );
}
