import Flag from '@/components/Flag';
import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import { Link } from "react-router-dom";
import { useEdition, useEditionPath } from "@/contexts/EditionContext";
import EditionNotes from "@/components/EditionNotes";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Filter, Bell, BellOff } from "lucide-react";
import { useAlerts } from "@/hooks/useAlerts";
import FilterSelect from "@/components/FilterSelect";

export default function MatchesPage() {
  const { data, ...edition } = useEdition();
  const path = useEditionPath();
  const { matches, teams, groups, getMatchDates } = data;
  const [selectedGroup, setSelectedGroup] = useState<string>("Todos");
  const [selectedDate, setSelectedDate] = useState<string>("Todos");
  const { isAlerted, toggleAlert, alertCount } = useAlerts();

  const allDates = useMemo(() => getMatchDates(), [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (selectedGroup !== "Todos" && m.group !== selectedGroup) return false;
      if (selectedDate !== "Todos" && m.date !== selectedDate) return false;
      return true;
    });
  }, [matches, selectedGroup, selectedDate]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, typeof matches>();
    filteredMatches.forEach((m) => {
      if (!map.has(m.date)) map.set(m.date, []);
      map.get(m.date)!.push(m);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredMatches]);

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 pt-24 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Calendário de Jogos</h1>
            <p className="text-[#94A3B8] mt-1">{edition.competition === 'copa' ? 'Todos os jogos da Copa do Mundo FIFA 2026' : `Todos os jogos · ${edition.label}`}</p>
          </div>
          {alertCount > 0 && (
            <div className="flex items-center gap-2 bg-[#D4AF37]/10 px-3 py-1.5 rounded-lg">
              <Bell className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-xs font-semibold text-[#D4AF37]">
                {alertCount} alerta{alertCount !== 1 ? "s" : ""} ativo{alertCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        <EditionNotes section="jogos" />

        {/* Filters */}
        <div className="hidden md:flex flex-wrap gap-3 mb-8">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#94A3B8]" />
            <span className="text-sm text-[#94A3B8] font-medium">Filtros:</span>
          </div>

          {/* Group Filter */}
          <div className="hidden md:flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedGroup("Todos")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedGroup === "Todos"
                  ? "bg-[#D4AF37] text-[#0A0F1C]"
                  : "bg-[#131A2E] text-[#94A3B8] hover:text-white border border-[#1E293B]"
              }`}
            >
              Todos
            </button>
            {groups.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGroup(g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedGroup === g
                    ? "bg-[#D4AF37] text-[#0A0F1C]"
                    : "bg-[#131A2E] text-[#94A3B8] hover:text-white border border-[#1E293B]"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Celular: filtros em lista */}
        <div className="grid grid-cols-2 gap-3 mb-6 md:hidden" data-testid="match-filters-mobile">
          <FilterSelect
            label="Grupo"
            testId="filter-group"
            value={selectedGroup}
            onChange={setSelectedGroup}
            options={[{ value: "Todos", label: "Todos" }, ...groups.map((g) => ({ value: g, label: `Grupo ${g}` }))]}
          />
          <FilterSelect
            label="Data"
            testId="filter-date"
            value={selectedDate}
            onChange={setSelectedDate}
            options={[
              { value: "Todos", label: "Todas as datas" },
              ...allDates.map((d) => ({
                value: d,
                label: new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
              })),
            ]}
          />
        </div>

        {/* Date Filter */}
        <div className="hidden md:flex flex-wrap gap-1.5 mb-8">
          <button
            onClick={() => setSelectedDate("Todos")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedDate === "Todos"
                ? "bg-[#3B82F6] text-white"
                : "bg-[#131A2E] text-[#94A3B8] hover:text-white border border-[#1E293B]"
            }`}
          >
            Todas as datas
          </button>
          {allDates.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedDate === d
                  ? "bg-[#3B82F6] text-white"
                  : "bg-[#131A2E] text-[#94A3B8] hover:text-white border border-[#1E293B]"
              }`}
            >
              {new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </button>
          ))}
        </div>

        {/* Matches */}
        {groupedByDate.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#94A3B8] text-lg">Nenhum jogo encontrado com os filtros selecionados.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedByDate.map(([date, dateMatches]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                  <h2 className="text-lg font-bold text-white">
                    {new Date(date + "T00:00:00").toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                  {dateMatches.map((match) => {
                    const matchId = String(match.id);
                    const alerted = isAlerted(matchId);

                    return (
                      <Card key={match.id} className={`bg-[#131A2E] border-[#1E293B] p-4 transition-all relative ${alerted ? "border-[#D4AF37]/40 shadow-md shadow-[#D4AF37]/5" : "hover:border-[#D4AF37]/30"}`}>
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="outline" className="text-[10px] border-[#1E293B] text-[#94A3B8]">
                            {match.group ? `Grupo ${match.group}` : match.stage}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#94A3B8]">{match.time}</span>
                            <button
                              onClick={() => toggleAlert(matchId)}
                              className={`p-1.5 rounded-lg transition-all ${
                                alerted
                                  ? "bg-[#D4AF37]/15 text-[#D4AF37] hover:bg-[#D4AF37]/25"
                                  : "text-[#475569] hover:text-[#94A3B8] hover:bg-white/5"
                              }`}
                              title={alerted ? "Remover alerta" : "Ativar alerta"}
                            >
                              {alerted ? (
                                <Bell className="w-4 h-4 fill-current" />
                              ) : (
                                <BellOff className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <Link to={path("jogos", matchId)} data-testid="match-link" aria-label={`Abrir jogo ${match.teamA} x ${match.teamB}`} className="block rounded-lg hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col items-center gap-1 flex-1">
                            <Flag code={match.teamA} className="h-6" />
                            <span className="text-xs font-semibold text-white">{match.teamA}</span>
                          </div>

                          <div className="flex flex-col items-center px-3">
                            {match.scoreA !== null ? (
                              <span className="text-lg font-extrabold text-white">
                                {match.scoreA} - {match.scoreB}
                              </span>
                            ) : (
                              <span className="text-sm font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-3 py-1 rounded-lg">
                                VS
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col items-center gap-1 flex-1">
                            <Flag code={match.teamB} className="h-6" />
                            <span className="text-xs font-semibold text-white">{match.teamB}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 mt-3 text-[10px] text-[#94A3B8]">
                          <MapPin className="w-3 h-3" />
                          {match.stadium} · {match.city}
                        </div>
                        </Link>

                        {/* Alert indicator */}
                        {alerted && (
                          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F5D060] rounded-t-lg" />
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}