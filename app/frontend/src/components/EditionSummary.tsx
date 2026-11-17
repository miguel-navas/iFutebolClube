import { useQuery } from '@tanstack/react-query';
import { Trophy, Medal, Goal, Target } from 'lucide-react';
import Flag from '@/components/Flag';
import { useEdition } from '@/contexts/EditionContext';

interface Resumo {
  champion: string | null;
  runnerUp: string | null;
  third: string | null;
  fourth: string | null;
  semifinalists?: string[];
  topScorers?: { name: string; team: string; goals: number }[];
  totalGoals: number;
  matches: number;
}

async function carrega(competition: string, year: string): Promise<Resumo | null> {
  const base = import.meta.env?.BASE_URL ?? '/';
  try {
    const res = await fetch(`${base}data/editions/${competition}-${year}/summary.json`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j && typeof j === 'object' && j.champion ? (j as Resumo) : null;
  } catch {
    return null;
  }
}

/** Resumo da edição: pódio, artilheiro e gols. Só aparece se a edição tem summary.json. */
export default function EditionSummary() {
  const { data, competition, year } = useEdition();
  const q = useQuery({
    queryKey: ['edition-summary', competition, year],
    queryFn: () => carrega(competition, year),
    staleTime: 5 * 60_000,
  });
  const r = q.data;
  if (!r) return null;
  const nome = (c: string) => data.getTeamByCode(c)?.name ?? c;
  const podio: { pos: string; code: string | null; cor: string }[] = [
    { pos: 'Campeão', code: r.champion, cor: '#D4AF37' },
    { pos: '2º lugar', code: r.runnerUp, cor: '#CBD5E1' },
    { pos: '3º lugar', code: r.third, cor: '#CD7F32' },
    { pos: '4º lugar', code: r.fourth, cor: '#94A3B8' },
  ].filter((p) => p.code);
  const media = r.matches > 0 ? (r.totalGoals / r.matches).toFixed(2).replace('.', ',') : '-';
  return (
    <section className="w-full px-4 pt-10 sm:px-6 lg:px-8 2xl:px-12" data-testid="edition-summary">
      <h2 className="mb-4 flex items-center gap-2 text-2xl font-extrabold text-white">
        <Trophy className="h-6 w-6 text-[#D4AF37]" />
        Resultado final
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {podio.map((p) => (
          <div key={p.pos} className="rounded-xl border border-[#1E293B] bg-[#131A2E] p-4 text-center" data-testid={`podio-${p.pos}`}>
            <Medal className="mx-auto mb-2 h-5 w-5" style={{ color: p.cor }} />
            <Flag code={p.code!} className="mx-auto mb-2 h-8" />
            <p className="font-bold text-white">{nome(p.code!)}</p>
            <p className="text-xs font-medium" style={{ color: p.cor }}>{p.pos}</p>
          </div>
        ))}
      </div>
      {!r.third && r.semifinalists && r.semifinalists.length > 0 && (
        <p className="mt-2 text-xs text-[#94A3B8]">
          Semifinalistas (sem disputa do 3º lugar): {r.semifinalists.map(nome).join(' · ')}
        </p>
      )}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#1E293B] bg-[#131A2E] p-4 sm:col-span-2" data-testid="artilheiro">
          <p className="mb-1 flex items-center gap-2 text-xs font-medium text-[#94A3B8]">
            <Target className="h-4 w-4 text-[#22C55E]" />
            {r.topScorers && r.topScorers.length > 1 ? 'Artilheiros' : 'Artilheiro'}
          </p>
          {r.topScorers && r.topScorers.length > 0 ? (
            <>
              <p className="text-sm text-white">
                {r.topScorers.map((s) => `${s.name} (${nome(s.team)})`).join(' · ')}
              </p>
              <p className="text-xs text-[#94A3B8]">
                {r.topScorers[0].goals} {r.topScorers[0].goals === 1 ? 'gol' : 'gols'}
                {r.topScorers.length > 1 ? ' cada' : ''}
              </p>
            </>
          ) : (
            <p className="text-sm text-[#94A3B8]">Sem dados de gols por jogador.</p>
          )}
        </div>
        <div className="rounded-xl border border-[#1E293B] bg-[#131A2E] p-4" data-testid="total-gols">
          <p className="mb-1 flex items-center gap-2 text-xs font-medium text-[#94A3B8]">
            <Goal className="h-4 w-4 text-[#F97316]" />
            Gols na edição
          </p>
          <p className="text-2xl font-extrabold text-white">{r.totalGoals}</p>
          <p className="text-xs text-[#94A3B8]">{media} por jogo · {r.matches} jogos</p>
        </div>
      </div>
    </section>
  );
}
