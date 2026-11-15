import Flag from '@/components/Flag';
import { useEffect } from "react";
import { X, Trophy, Users, Target, Building2, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PlayerAvatar from "@/components/PlayerAvatar";
import type { PlayerView } from "@/data/squad/view";

interface PlayerModalProps {
  player: PlayerView;
  teamName: string;
  teamCode: string;
  onClose: () => void;
}

function Stat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-[#131A2E] rounded-xl p-3 border border-[#1E293B]" data-testid="player-stat">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-extrabold text-white">{value}</p>
    </div>
  );
}

export default function PlayerModal({ player, teamName, teamCode, onClose }: PlayerModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ed = player.edition;
  const clubs = player.clubs ?? [];
  const hasProfile = player.age != null || player.caps != null || player.goals != null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={player.name} data-testid="player-modal">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} data-testid="player-backdrop" />

      <div className="relative bg-[#0A0F1C] border border-[#1E293B] rounded-2xl shadow-2xl shadow-black/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="Fechar"
          data-testid="player-close"
          className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-[#131A2E] text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col sm:flex-row">
          <div className="sm:w-2/5 bg-gradient-to-br from-[#131A2E] to-[#0A0F1C] p-6 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-[#1E293B] rounded-t-2xl sm:rounded-t-none sm:rounded-l-2xl">
            <div className="rounded-full border-4 border-[#D4AF37]/30 shadow-lg shadow-[#D4AF37]/10 mb-4">
              <PlayerAvatar name={player.name} photo={player.photo} className="w-36 h-36" textClass="text-4xl" />
            </div>
            <h2 className="text-xl font-extrabold text-white text-center break-words" data-testid="player-name">{player.name}</h2>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              {player.number != null && (
                <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border-none text-xs font-bold">#{player.number}</Badge>
              )}
              {player.position && (
                <Badge variant="outline" className="border-[#1E293B] text-[#94A3B8] text-xs">{player.position}</Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-sm text-[#94A3B8]">
              <Flag code={teamCode} name={teamName} className="h-4" />
              <span>{teamName}</span>
            </div>
          </div>

          <div className="sm:w-3/5 p-6">
            <h3 className="text-sm font-bold text-[#D4AF37] uppercase tracking-wider mb-4">Perfil do Jogador</h3>

            {!hasProfile && !ed && clubs.length === 0 && (
              <p className="text-sm text-[#94A3B8]" data-testid="player-no-data">Não há mais dados deste jogador.</p>
            )}

            {hasProfile && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {player.age != null && (
                  <Stat label="Idade" value={`${player.age} anos`} icon={<Users className="w-3.5 h-3.5 text-[#3B82F6]" />} />
                )}
                {player.caps != null && (
                  <Stat label={player.careerScope === "copas" ? "Jogos em Copas" : "Jogos pela Seleção"} value={player.caps} icon={<Trophy className="w-3.5 h-3.5 text-[#D4AF37]" />} />
                )}
                {player.goals != null && (
                  <Stat label={player.careerScope === "copas" ? "Gols em Copas" : player.careerScope === "selecao" ? "Gols pela Seleção" : "Gols (Total)"} value={player.goals} icon={<Target className="w-3.5 h-3.5 text-[#22C55E]" />} />
                )}
              </div>
            )}

            {ed && (
              <div className="mb-6" data-testid="player-edition">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="w-4 h-4 text-[#3B82F6]" />
                  <h4 className="text-sm font-bold text-white">Nesta Copa</h4>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-center">
                  {[
                    ["Jogos", ed.games],
                    ["Titular", ed.starts],
                    ["Gols", ed.goals],
                    ["Assistências", ed.assists],
                    ["Amarelos", ed.yellow],
                    ["Vermelhos", ed.red],
                  ].map(([label, v]) => (
                    <div key={label} className="rounded-lg border border-[#1E293B] bg-[#131A2E] px-2 py-2" data-testid={`edition-${label}`}>
                      <dd className="text-lg font-extrabold text-white">{v}</dd>
                      <dt className="text-[10px] text-[#94A3B8]">{label}</dt>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {clubs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3" data-testid="clubs-title">
                  <Building2 className="w-4 h-4 text-[#F97316]" />
                  <h4 className="text-sm font-bold text-white">Clubes na Carreira</h4>
                </div>
                <div
                  className="space-y-2 overflow-y-auto pr-1 max-h-[max(8rem,calc(90vh-34rem))]"
                  data-testid="clubs-list"
                  tabIndex={0}
                  aria-label="Lista de clubes"
                >
                  {clubs.map((club, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-[#131A2E] rounded-lg px-3 py-2.5 border border-[#1E293B]">
                      <div className="w-6 h-6 rounded-full bg-[#1E293B] flex items-center justify-center text-[10px] font-bold text-[#94A3B8]">{idx + 1}</div>
                      <span className="text-sm text-white font-medium">{club}</span>
                      {idx === clubs.length - 1 && (
                        <Badge className="ml-auto bg-[#22C55E]/15 text-[#22C55E] border-none text-[9px]">Atual</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {player.source && (clubs.length > 0 || player.careerScope === "selecao") && (
              <p className="mt-4 text-[10px] text-[#475569]" data-testid="player-source">
                Clubes e totais da seleção: {player.source} (CC BY-SA)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
