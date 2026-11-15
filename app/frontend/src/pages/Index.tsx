import Flag from '@/components/Flag';
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import CountdownTimer from "@/components/CountdownTimer";
import { useEdition, useEditionPath } from "@/contexts/EditionContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, ArrowRight, Trophy, Users, LayoutGrid, Bell, BellOff } from "lucide-react";
import { useAlerts } from "@/hooks/useAlerts";

const HERO_IMG = "https://mgx-backend-cdn.metadl.com/generate/images/59946/2026-03-20/b4148228-88d4-47c4-87aa-9bb258f7efc2.png";
const TROPHY_IMG = "https://mgx-backend-cdn.metadl.com/generate/images/59946/2026-03-20/6074769a-de8c-4c86-9f9b-f0e0dded15c5.png";

export default function HomePage() {
  const edition = useEdition();
  const path = useEditionPath();
  const { matches, teams, groups, stadiums, getGroupStandings } = edition.data;
  const hasStarted = !edition.opensAt || Date.parse(edition.opensAt) <= Date.now();
  const hero = edition.hero ?? {
    title: "Copa do Mundo",
    highlight: "FIFA 2026™",
    description: "Acompanhe todos os jogos, grupos, seleções e a fase eliminatória do maior torneio de futebol do mundo.",
    hosts: [
      { code: "USA", name: "EUA" },
      { code: "MEX", name: "México" },
      { code: "CAN", name: "Canadá" },
    ],
    footer: "⚽ Copa do Mundo FIFA 2026™ · 11 de Junho - 19 de Julho ·",
    subtitle: "Fase de Grupos · Junho 2026 · Clique no 🔔 para ativar alertas",
  };
  const cityCount = new Set(stadiums.map((st) => st.city)).size;
  const pendentes = matches.filter((m) => m.scoreA === null);
  const upcomingMatches = (pendentes.length > 0 ? pendentes : matches).slice(0, 6);
  const featuredGroups = groups.slice(0, 4);
  const { isAlerted, toggleAlert } = useAlerts();

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="World Cup Stadium" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0F1C]/60 via-[#0A0F1C]/80 to-[#0A0F1C]" />
        </div>

        <div className="relative w-full px-4 sm:px-6 lg:px-8 2xl:px-12 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="flex flex-col lg:flex-row items-center gap-10">
            <div className="flex-1 text-center lg:text-left">
              {hero.hosts && (
                <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30 mb-4 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    {hero.hosts.map((h) => (
                      <Flag key={h.code} code={h.code} name={h.name} className="h-3" />
                    ))}
                    {hero.hosts.map((h) => h.name).join(" · ")}
                  </span>
                </Badge>
              )}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-4">
                {hero.title}
                <span className="block bg-gradient-to-r from-[#D4AF37] to-[#F5D060] bg-clip-text text-transparent">
                  {hero.highlight}
                </span>
              </h1>
              <p className="text-[#94A3B8] text-lg sm:text-xl max-w-lg mx-auto lg:mx-0 mb-8">
                {hero.description}
              </p>

              {/* Countdown (apenas antes do início) */}
              {!hasStarted && edition.opensAt && (
                <div className="mb-8" data-testid="countdown">
                  <p className="text-sm text-[#94A3B8] mb-3 font-medium">⏱️ Contagem regressiva para o início</p>
                  <CountdownTimer target={edition.opensAt} />
                </div>
              )}

              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                <Link
                  to={path("jogos")}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-[#0A0F1C] font-bold rounded-xl hover:bg-[#F5D060] transition-all shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40"
                >
                  <Calendar className="w-4 h-4" />
                  Ver Jogos
                </Link>
                <Link
                  to={path("grupos")}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all border border-white/10"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Grupos
                </Link>
              </div>
            </div>

            <div className="flex-shrink-0 hidden lg:block">
              <img src={TROPHY_IMG} alt="FIFA Trophy" className="w-64 h-64 object-contain drop-shadow-2xl animate-pulse" style={{ animationDuration: "3s" }} />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative -mt-6 z-10 w-full px-4 sm:px-6 lg:px-8 2xl:px-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Trophy, label: "Edição", value: `${edition.number}ª`, color: "#D4AF37" },
            { icon: Users, label: "Seleções", value: String(teams.length), color: "#3B82F6" },
            ...(groups.length > 0
              ? [{ icon: LayoutGrid, label: "Grupos", value: String(groups.length), color: "#22C55E" }]
              : []),
            { icon: MapPin, label: "Cidades", value: String(cityCount), color: "#F97316" },
          ].map((stat) => (
            <Card key={stat.label} data-testid={`stat-${stat.label}`} className="bg-[#131A2E] border-[#1E293B] p-4 text-center hover:border-[#2E3A5B] transition-colors">
              <stat.icon className="w-5 h-5 mx-auto mb-2" style={{ color: stat.color }} />
              <p className="text-2xl font-extrabold text-white">{stat.value}</p>
              <p className="text-xs text-[#94A3B8] font-medium">{stat.label}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Upcoming Matches */}
      <section className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-white">Próximos Jogos</h2>
            <p className="text-[#94A3B8] text-sm mt-1">{hero.subtitle}</p>
          </div>
          <Link to={path("jogos")} className="flex items-center gap-1 text-[#D4AF37] text-sm font-semibold hover:underline">
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {upcomingMatches.map((match) => {
            const matchId = String(match.id);
            const alerted = isAlerted(matchId);

            return (
              <Card key={match.id} className={`bg-[#131A2E] border-[#1E293B] p-5 transition-all group relative ${alerted ? "border-[#D4AF37]/40 shadow-md shadow-[#D4AF37]/5" : "hover:border-[#D4AF37]/30"}`}>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="text-[10px] border-[#1E293B] text-[#94A3B8]">
                    {match.group ? `Grupo ${match.group}` : match.stage}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#94A3B8]">{match.stadium}</span>
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
                    <Flag code={match.teamA} className="h-8" />
                    <span className="text-xs font-semibold text-white">{match.teamA}</span>
                  </div>

                  <div className="flex flex-col items-center gap-1 px-4">
                    {match.scoreA !== null ? (
                      <span className="text-xl font-extrabold text-white">
                        {match.scoreA} - {match.scoreB}
                      </span>
                    ) : (
                      <span className="text-lg font-bold text-[#D4AF37]">{match.time}</span>
                    )}
                    <span className="text-[10px] text-[#94A3B8]">
                      {new Date(match.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1 flex-1">
                    <Flag code={match.teamB} className="h-8" />
                    <span className="text-xs font-semibold text-white">{match.teamB}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 mt-3 text-[10px] text-[#94A3B8]">
                  <MapPin className="w-3 h-3" />
                  {match.city}
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
      </section>

      {/* Groups Preview */}
      <section className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-white">Grupos</h2>
            <p className="text-[#94A3B8] text-sm mt-1">{groups.length} grupos · {teams.length} seleções</p>
          </div>
          <Link to={path("grupos")} className="flex items-center gap-1 text-[#D4AF37] text-sm font-semibold hover:underline">
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredGroups.map((g) => {
            const standings = getGroupStandings(g);
            return (
              <Card key={g} className="bg-[#131A2E] border-[#1E293B] p-5 hover:border-[#D4AF37]/30 transition-all">
                <h3 className="text-sm font-bold text-[#D4AF37] mb-3">Grupo {g}</h3>
                <div className="space-y-2.5">
                  {standings.map((team, idx) => (
                    <div key={team.code} className="flex items-center gap-2">
                      <span className="text-xs text-[#94A3B8] w-4">{idx + 1}.</span>
                      <Flag code={team.code} className="h-4 shrink-0" />
                      <span className="text-sm font-medium text-white flex-1">{team.team}</span>
                      <span className="text-xs font-bold text-[#94A3B8]">{team.points} pts</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Quick Links */}
      <section className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { to: path("selecoes"), icon: Users, title: `${teams.length} Seleções`, desc: "Conheça todas as seleções classificadas", color: "#3B82F6" },
            { to: path("eliminatorias"), icon: Trophy, title: "Fase Eliminatória", desc: "Chaveamento das oitavas à final", color: "#D4AF37" },
            { to: path("estadios"), icon: MapPin, title: `${stadiums.length} Estádios`, desc: "Cidades-sede nos 3 países", color: "#22C55E" },
          ].map((link) => (
            <Link key={link.to} to={link.to}>
              <Card className="bg-[#131A2E] border-[#1E293B] p-6 hover:border-[#D4AF37]/30 transition-all group cursor-pointer h-full">
                <link.icon className="w-8 h-8 mb-3" style={{ color: link.color }} />
                <h3 className="text-lg font-bold text-white group-hover:text-[#D4AF37] transition-colors">{link.title}</h3>
                <p className="text-sm text-[#94A3B8] mt-1">{link.desc}</p>
                <ArrowRight className="w-4 h-4 text-[#94A3B8] mt-3 group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all" />
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1E293B] py-8">
        <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 text-center">
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[#94A3B8] text-sm">
            <span>{hero.footer}</span>
            {hero.hosts?.map((h) => (
              <span key={h.code} className="inline-flex items-center gap-1">{h.name} <Flag code={h.code} name={h.name} className="h-3" /></span>
            ))}
          </p>
          <p className="text-[#475569] text-xs mt-2">
            App de acompanhamento não oficial. Dados ilustrativos.
          </p>
        </div>
      </footer>
    </div>
  );
}