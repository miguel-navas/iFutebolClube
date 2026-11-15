import { useState, useMemo } from "react";
import Loading from "@/components/Loading";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Flag from "@/components/Flag";
import PlayerModal from "@/components/PlayerModal";
import { useEdition, useEditionPath } from "@/contexts/EditionContext";
import PlayerAvatar from "@/components/PlayerAvatar";
import { useTeamSquad } from "@/hooks/useTeamSquad";
import { viewFromSquad, type PlayerView } from "@/data/squad/view";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MapPin, Calendar, Users, Search, X, UserCog } from "lucide-react";

const confColors: Record<string, string> = {
  UEFA: "#3B82F6",
  CONMEBOL: "#22C55E",
  CONCACAF: "#EAB308",
  CAF: "#F97316",
  AFC: "#EF4444",
  OFC: "#8B5CF6",
};

const positionColors: Record<string, string> = {
  Goleiro: "#EAB308",
  Zagueiro: "#3B82F6",
  "Lateral Direito": "#3B82F6",
  "Lateral Esquerdo": "#3B82F6",
  Volante: "#22C55E",
  "Meio-campista": "#22C55E",
  "Meia Atacante": "#F97316",
  "Ponta Direita": "#EF4444",
  "Ponta Esquerda": "#EF4444",
  Atacante: "#EF4444",
  Centroavante: "#EF4444",
};

export default function TeamDetailPage() {
  const { data } = useEdition();
  const path = useEditionPath();
  const { teams, confederations, matches, getSquad } = data;
  const { code } = useParams<{ code: string }>();
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerView | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const team = teams.find((t) => t.code === code);

  const squadQuery = useTeamSquad(team?.code);
  const realSquad = squadQuery.data ?? null;
  const loadingSquad = Boolean(team) && squadQuery.isPending && squadQuery.fetchStatus !== "idle";
  const reference = useMemo(
    () => matches.reduce((min, m) => (m.date < min ? m.date : min), "9999-12-31"),
    [matches]
  );

  const squad = useMemo<PlayerView[]>(() => {
    if (!team) return [];
    if (realSquad) {
      return realSquad.players
        .map((p) => viewFromSquad(p, reference))
        .sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.name.localeCompare(b.name));
    }
    return getSquad(team.code);
  }, [team, getSquad, realSquad, reference]);

  // Filter players based on search query (name, position, or jersey number)
  const filteredSquad = useMemo(() => {
    if (!searchQuery.trim()) return squad;
    const q = searchQuery.toLowerCase().trim();
    return squad.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.position ?? "").toLowerCase().includes(q) ||
        String(p.number ?? "").includes(q)
    );
  }, [squad, searchQuery]);

  if (!team) {
    return (
      <div className="min-h-screen text-white">
        <Navbar />
        <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 pt-24 pb-20 text-center">
          <h1 className="text-2xl font-bold">Seleção não encontrada</h1>
          <Link to={path("selecoes")} className="text-[#D4AF37] mt-4 inline-block hover:underline">
            ← Voltar para Seleções
          </Link>
        </div>
      </div>
    );
  }

  const confName = confederations.find((c) => c.code === team.confederation)?.name || team.confederation;
  const teamMatches = matches.filter((m) => m.teamA === team.code || m.teamB === team.code);

  // Group filtered players by position category
  const goalkeepers = filteredSquad.filter((p) => p.position === "Goleiro");
  const defenders = filteredSquad.filter((p) =>
    ["Defensor", "Zagueiro", "Lateral Direito", "Lateral Esquerdo"].includes(p.position ?? "")
  );
  const midfielders = filteredSquad.filter((p) =>
    ["Volante", "Meio-campista", "Meia Atacante"].includes(p.position ?? "")
  );
  const attackers = filteredSquad.filter((p) =>
    ["Ponta Direita", "Ponta Esquerda", "Atacante", "Centroavante"].includes(p.position ?? "")
  );
  const grouped = new Set([...goalkeepers, ...defenders, ...midfielders, ...attackers]);
  const others = filteredSquad.filter((p) => !grouped.has(p));

  const sections = [
    { title: "Goleiros", players: goalkeepers, color: "#EAB308" },
    { title: "Defensores", players: defenders, color: "#3B82F6" },
    { title: "Meio-campistas", players: midfielders, color: "#22C55E" },
    { title: "Atacantes", players: attackers, color: "#EF4444" },
    { title: "Sem posição", players: others, color: "#94A3B8" },
  ];

  const hasResults = filteredSquad.length > 0;

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 pt-24 pb-20">
        {/* Back button */}
        <Link
          to={path("selecoes")}
          className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-[#D4AF37] transition-colors mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Seleções
        </Link>

        {/* Team Header */}
        <div className="bg-[#131A2E] border border-[#1E293B] rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Flag code={team.code} name={team.name} className="h-16 sm:h-20" />
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white">{team.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <Badge
                  className="text-xs font-semibold border-none"
                  style={{ backgroundColor: `${confColors[team.confederation]}20`, color: confColors[team.confederation] }}
                >
                  {confName}
                </Badge>
                <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border-none text-xs font-semibold">
                  Grupo {team.group}
                </Badge>
                <Badge variant="outline" className="border-[#1E293B] text-[#94A3B8] text-xs">
                  Ranking FIFA {team.fifaRanking > 0 ? `#${team.fifaRanking}` : "—"}
                </Badge>
              </div>
              {realSquad?.coach && (
                <p className="mt-3 flex items-center gap-2 text-sm text-[#94A3B8]" data-testid="team-coach">
                  <UserCog className="w-4 h-4 text-[#D4AF37]" aria-hidden />
                  <span>Técnico:</span>
                  <span className="font-semibold text-white" data-testid="coach-name">{realSquad.coach.name}</span>
                  {realSquad.coach.matches > 0 && (
                    <span className="text-xs">
                      ({realSquad.coach.matches} jogo{realSquad.coach.matches !== 1 ? "s" : ""})
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 bg-[#0A0F1C] px-4 py-2 rounded-xl border border-[#1E293B]">
              <Users className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-sm font-bold text-white" data-testid="squad-count">{squad.length}</span>
              <span className="text-xs text-[#94A3B8]">jogadores</span>
            </div>
          </div>

          {/* Team Matches */}
          {teamMatches.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[#1E293B]">
              <h3 className="text-sm font-bold text-[#94A3B8] mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Jogos na Copa
              </h3>
              <div className="flex flex-wrap gap-2">
                {teamMatches.map((match) => (
                  <Link
                    key={match.id}
                    to={path("jogos", String(match.id))}
                    data-testid="team-match-link"
                    aria-label={`Abrir jogo ${match.teamA} x ${match.teamB}`}
                    className="bg-[#0A0F1C] border border-[#1E293B] rounded-lg px-3 py-2 text-xs transition-colors hover:border-[#D4AF37] hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <span className="font-semibold text-white">{match.teamA}</span>
                    <span className="text-[#D4AF37] mx-1.5 font-bold">vs</span>
                    <span className="font-semibold text-white">{match.teamB}</span>
                    <span className="text-[#475569] ml-2">
                      {new Date(match.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </span>
                    <span className="text-[#475569] ml-1 hidden sm:inline">
                      <MapPin className="w-2.5 h-2.5 inline" /> {match.stadium}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Player Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <Input
              placeholder="Buscar por nome, posição ou número..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 bg-[#131A2E] border-[#1E293B] text-white placeholder:text-[#475569] focus:border-[#D4AF37] h-11"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#94A3B8] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-[#94A3B8] mt-2">
              {filteredSquad.length} jogador{filteredSquad.length !== 1 ? "es" : ""} encontrado{filteredSquad.length !== 1 ? "s" : ""}
              {" "}para "<span className="text-[#D4AF37]">{searchQuery}</span>"
            </p>
          )}
        </div>

        {/* No results */}
        {!hasResults && searchQuery && (
          <div className="text-center py-16">
            <Search className="w-10 h-10 text-[#1E293B] mx-auto mb-3" />
            <p className="text-[#94A3B8]">Nenhum jogador encontrado para "<span className="text-[#D4AF37]">{searchQuery}</span>"</p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-3 text-sm text-[#D4AF37] hover:underline"
            >
              Limpar busca
            </button>
          </div>
        )}

        {loadingSquad && (
          <Loading testId="squad-loading" label="Carregando elenco…" />
        )}

        {/* Players by Position */}
        {!loadingSquad && sections.map((section) =>
          section.players.length > 0 ? (
            <div key={section.title} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: section.color }} />
                <h2 className="text-lg font-bold text-white">{section.title}</h2>
                <span className="text-xs text-[#94A3B8]">({section.players.length})</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                {section.players.map((player) => (
                  <Card
                    key={player.id ?? `${player.name}-${player.number}`}
                    data-testid="squad-player"
                    onClick={() => setSelectedPlayer(player)}
                    className="bg-[#131A2E] border-[#1E293B] p-4 hover:border-[#D4AF37]/40 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    {/* Position color bar */}
                    <div
                      className="absolute top-0 left-0 w-full h-0.5"
                      style={{ backgroundColor: positionColors[player.position ?? ""] || "#94A3B8" }}
                    />

                    <div className="flex items-center gap-3">
                      <div className="rounded-full border-2 border-[#1E293B] group-hover:border-[#D4AF37]/40 transition-colors shrink-0">
                        <PlayerAvatar name={player.name} photo={player.photo} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-lg font-extrabold text-[#D4AF37]">{player.number != null ? `#${player.number}` : ""}</span>
                        </div>
                        <h3 className="text-sm font-bold text-white group-hover:text-[#D4AF37] transition-colors truncate">
                          {player.name}
                        </h3>
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: positionColors[player.position ?? ""] || "#94A3B8" }}
                        >
                          {player.position ?? ""}
                        </p>
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div className="flex items-center gap-4 mt-3 pt-2 border-t border-[#1E293B]">
                      {(player.edition
                        ? [
                            [player.age ?? "-", "Idade"],
                            [player.edition.games, "Jogos"],
                            [player.edition.goals, "Gols"],
                          ]
                        : [
                            [player.age ?? "-", "Idade"],
                            [player.caps ?? "-", "Jogos"],
                            [player.goals ?? "-", "Gols"],
                          ]
                      ).map(([v, label]) => (
                        <div key={label} className="text-center">
                          <p className="text-xs font-bold text-white">{v}</p>
                          <p className="text-[9px] text-[#475569]">{label}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : null
        )}
      </div>

      {/* Player Modal */}
      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          teamName={team.name}
          teamCode={team.code}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}