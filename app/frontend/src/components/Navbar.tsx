import NativeSelect from '@/components/NativeSelect';
import Flag from '@/components/Flag';
import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Trophy, Calendar, Users, LayoutGrid, GitBranch, MapPin, UserRound, Percent, Scale, Menu, X, Bell, Trash2 } from "lucide-react";
import { useAlerts } from "@/hooks/useAlerts";
import { useEdition, useEditionPath } from "@/contexts/EditionContext";
import { getCompetition, listAvailableEditions, getEdition, type SectionKey } from "@/data/registry";
import { SECTION_SLUG, editionBase, editionPath } from "@/lib/editionPaths";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS: { section: SectionKey; label: string; icon: typeof Trophy }[] = [
  { section: "overview", label: "Dashboard", icon: Trophy },
  { section: "jogos", label: "Jogos", icon: Calendar },
  { section: "grupos", label: "Grupos", icon: LayoutGrid },
  { section: "selecoes", label: "Seleções", icon: Users },
  { section: "jogadores", label: "Jogadores", icon: UserRound },
  { section: "probabilidades", label: "Probabilidades", icon: Percent },
  { section: "comparacao", label: "Comparação", icon: Scale },
  { section: "eliminatorias", label: "Eliminatórias", icon: GitBranch },
  { section: "estadios", label: "Estádios", icon: MapPin },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const edition = useEdition();
  const path = useEditionPath();
  const { teams } = edition.data;
  const competitionName = getCompetition(edition.competition)?.name ?? "";
  const editions = listAvailableEditions(edition.competition);
  const base = editionBase(edition.competition, edition.year);
  const navItems = NAV_ITEMS.filter((item) => edition.sections.includes(item.section)).map((item) => ({
    ...item,
    path: path(item.section),
  }));
  const isItemActive = (item: { section: SectionKey; path: string }) =>
    item.section === "overview"
      ? location.pathname === item.path
      : location.pathname === item.path || location.pathname.startsWith(item.path + "/");

  // Seção atual (trecho do endereço depois da edição), para manter ao trocar de edição.
  const currentSlug = location.pathname.startsWith(base + "/") ? location.pathname.slice(base.length + 1).split("/")[0] : "";
  const currentSection = (Object.keys(SECTION_SLUG) as SectionKey[]).find((k) => SECTION_SLUG[k] === currentSlug) ?? "overview";

  function changeEdition(year: string) {
    const target = getEdition(edition.competition, year);
    if (!target) return;
    const keep = target.sections.includes(currentSection) ? currentSection : "overview";
    navigate(editionPath(target.competition, target.year, keep));
  }
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const { alertedMatches, alertCount, clearAll, toggleAlert } = useAlerts();

  // Close bell dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav className="sticky top-0 z-50 -mb-[65px] bg-[#0A0F1C]/95 backdrop-blur-md border-b border-[#1E293B]">
      <div className="w-full pl-16 pr-4 sm:pr-6 lg:pr-8 2xl:pr-12">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" aria-label="Início" data-testid="hub-link" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8960C] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20 group-hover:shadow-[#D4AF37]/40 transition-shadow">
              <Trophy className="w-5 h-5 text-[#0A0F1C]" />
            </div>
            <div className="hidden sm:block">
              <span className="text-white font-extrabold text-lg tracking-tight whitespace-nowrap" data-testid="edition-label">{edition.label}</span>
              <span className="text-[#D4AF37] text-xs block -mt-1 font-medium whitespace-nowrap">{competitionName}</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = isItemActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.section}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[#D4AF37]/15 text-[#D4AF37]"
                      : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right side: Edition selector + Bell + Mobile Toggle */}
          <div className="flex items-center gap-2">
            <NativeSelect
              size="sm"
              aria-label="Edição"
              value={edition.year}
              onChange={(e) => changeEdition(e.target.value)}
              className="text-[#CBD5E1]"
            >
              {editions.map((e) => (
                <option key={e.year} value={e.year}>
                  {e.year}
                </option>
              ))}
            </NativeSelect>
            {/* Bell Icon */}
            <div ref={bellRef} className="relative">
              <button
                aria-label="Alertas"
                data-testid="bell"
                onClick={() => setBellOpen(!bellOpen)}
                className={`relative p-2 rounded-lg transition-all duration-200 ${
                  bellOpen
                    ? "bg-[#D4AF37]/15 text-[#D4AF37]"
                    : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                }`}
              >
                <Bell className="w-5 h-5" />
                {alertCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#EF4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {alertCount > 9 ? "9+" : alertCount}
                  </span>
                )}
              </button>

              {/* Bell Dropdown */}
              {bellOpen && (
                <div className="absolute right-0 top-12 w-80 sm:w-96 bg-[#0A0F1C] border border-[#1E293B] rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-[#1E293B] bg-[#131A2E] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-sm font-bold text-white">Meus Alertas</span>
                      {alertCount > 0 && (
                        <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border-none text-[10px]">
                          {alertCount}
                        </Badge>
                      )}
                    </div>
                    {alertCount > 0 && (
                      <button
                        onClick={clearAll}
                        className="flex items-center gap-1 text-[10px] text-[#EF4444] hover:text-[#F87171] transition-colors font-semibold"
                      >
                        <Trash2 className="w-3 h-3" />
                        Limpar
                      </button>
                    )}
                  </div>

                  {/* Matches List */}
                  <div className="max-h-80 overflow-y-auto">
                    {alertCount === 0 ? (
                      <div className="px-4 py-10 text-center">
                        <Bell className="w-8 h-8 text-[#1E293B] mx-auto mb-2" />
                        <p className="text-sm text-[#94A3B8]">Nenhum alerta ativo</p>
                        <p className="text-xs text-[#475569] mt-1">
                          Clique no 🔔 nos jogos para receber alertas
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#1E293B]">
                        {alertedMatches.map((match) => (
                          <div
                            key={match.id}
                            className="px-4 py-3 hover:bg-[#131A2E] transition-colors flex items-center gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-semibold border-[#1E293B] text-[#94A3B8] shrink-0"
                                >
                                  {match.type === "group" ? `Grupo ${match.group}` : match.round}
                                </Badge>
                                <span className="text-[10px] text-[#94A3B8]">
                                  {new Date(match.date + "T00:00:00").toLocaleDateString("pt-BR", {
                                    day: "2-digit",
                                    month: "short",
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {match.type === "group" && (
                                  <Flag code={match.teamA} className="h-3.5" />
                                )}
                                <span className="text-xs font-semibold text-white">{match.teamA}</span>
                                <span className="text-[10px] text-[#D4AF37] font-bold">vs</span>
                                <span className="text-xs font-semibold text-white">{match.teamB}</span>
                                {match.type === "group" && (
                                  <Flag code={match.teamB} className="h-3.5" />
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <MapPin className="w-2.5 h-2.5 text-[#475569]" />
                                <span className="text-[10px] text-[#475569]">{match.stadium}</span>
                                <span className="text-[10px] text-[#475569]">· {match.time}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleAlert(match.id)}
                              className="p-1.5 rounded-lg text-[#EF4444] hover:bg-[#EF4444]/10 transition-all shrink-0"
                              title="Remover alerta"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {alertCount > 0 && (
                    <div className="px-4 py-2.5 border-t border-[#1E293B] bg-[#131A2E]">
                      <Link
                        to={path("jogos")}
                        onClick={() => setBellOpen(false)}
                        className="text-[11px] text-[#D4AF37] hover:underline font-semibold"
                      >
                        Ver todos os jogos →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Toggle */}
            <button
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-[#94A3B8] hover:text-white transition-colors"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="lg:hidden pb-4 border-t border-[#1E293B] mt-2 pt-3">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = isItemActive(item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.section}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[#D4AF37]/15 text-[#D4AF37]"
                        : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}