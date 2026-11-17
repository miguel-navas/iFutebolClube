import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Flag from "@/components/Flag";
import { useEdition, useEditionPath } from "@/contexts/EditionContext";
import EditionNotes from "@/components/EditionNotes";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import FilterSelect from "@/components/FilterSelect";

export default function TeamsPage() {
  const edition = useEdition();
  const path = useEditionPath();
  const { teams, confederations, groups } = edition.data;
  const [search, setSearch] = useState("");
  const [filterConf, setFilterConf] = useState<string>("Todos");
  const [filterGroup, setFilterGroup] = useState<string>("Todos");
  const navigate = useNavigate();

  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.code.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterConf !== "Todos" && t.confederation !== filterConf) return false;
      if (filterGroup !== "Todos" && t.group !== filterGroup) return false;
      return true;
    });
  }, [teams, search, filterConf, filterGroup]);

  const confColors: Record<string, string> = {
    UEFA: "#3B82F6",
    CONMEBOL: "#22C55E",
    CONCACAF: "#EAB308",
    CAF: "#F97316",
    AFC: "#EF4444",
    OFC: "#8B5CF6",
  };

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 pt-24 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white">Seleções</h1>
          <p className="text-[#94A3B8] mt-1">{edition.competition === "copa" ? `${teams.length} seleções classificadas para a Copa do Mundo ${edition.year}` : `${teams.length} seleções · ${edition.label}`} · Clique para ver o elenco</p>
        </div>
        <EditionNotes section="selecoes" />

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <Input
            placeholder="Buscar seleção..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 rounded-xl pl-10 bg-[#131A2E] border-[#1E293B] text-white placeholder:text-[#475569] focus:border-[#D4AF37]"
          />
        </div>

        {/* Celular: filtros em lista */}
        <div className="grid grid-cols-2 gap-3 mb-6 md:hidden" data-testid="team-filters-mobile">
          <FilterSelect
            label="Confederação"
            testId="filter-conf"
            value={filterConf}
            onChange={setFilterConf}
            options={[{ value: "Todos", label: "Todas" }, ...confederations.map((c) => ({ value: c.code, label: c.name }))]}
          />
          <FilterSelect
            label="Grupo"
            testId="filter-group"
            value={filterGroup}
            onChange={setFilterGroup}
            options={[{ value: "Todos", label: "Todos os grupos" }, ...groups.map((g) => ({ value: g, label: `Grupo ${g}` }))]}
          />
        </div>

        {/* Confederation Filter */}
        <div className="hidden md:flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setFilterConf("Todos")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterConf === "Todos"
                ? "bg-[#D4AF37] text-[#0A0F1C]"
                : "bg-[#131A2E] text-[#94A3B8] hover:text-white border border-[#1E293B]"
            }`}
          >
            Todas
          </button>
          {confederations.map((c) => (
            <button
              key={c.code}
              onClick={() => setFilterConf(c.code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterConf === c.code
                  ? "text-white"
                  : "bg-[#131A2E] text-[#94A3B8] hover:text-white border border-[#1E293B]"
              }`}
              style={filterConf === c.code ? { backgroundColor: c.color } : {}}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Group Filter */}
        <div className="hidden md:flex flex-wrap gap-1.5 mb-8">
          <button
            onClick={() => setFilterGroup("Todos")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterGroup === "Todos"
                ? "bg-[#3B82F6] text-white"
                : "bg-[#131A2E] text-[#94A3B8] hover:text-white border border-[#1E293B]"
            }`}
          >
            Todos os grupos
          </button>
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => setFilterGroup(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterGroup === g
                  ? "bg-[#3B82F6] text-white"
                  : "bg-[#131A2E] text-[#94A3B8] hover:text-white border border-[#1E293B]"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {filteredTeams.map((team) => (
            <Card
              key={team.code}
              data-testid="team-card"
              onClick={() => navigate(path("selecoes", team.code))}
              className="bg-[#131A2E] border-[#1E293B] p-5 hover:border-[#D4AF37]/30 transition-all group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <Flag code={team.code} name={team.name} className="h-9" />
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold border-[#1E293B]"
                  style={{ color: confColors[team.confederation] || "#94A3B8" }}
                >
                  {team.confederation}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white group-hover:text-[#D4AF37] transition-colors">
                  {team.name}
                </h3>
                <ChevronRight className="w-4 h-4 text-[#475569] group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5">{team.code}</p>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#1E293B]">
                <div>
                  <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">Grupo</p>
                  <p className="text-sm font-bold text-[#D4AF37]">{team.group}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">Ranking FIFA</p>
                  <p className="text-sm font-bold text-white">{team.fifaRanking > 0 ? `#${team.fifaRanking}` : "—"}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredTeams.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[#94A3B8] text-lg">Nenhuma seleção encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
}