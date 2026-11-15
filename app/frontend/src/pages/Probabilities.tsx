import { useMemo, useState } from 'react';
import Loading from '@/components/Loading';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Info, Trophy } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Flag from '@/components/Flag';
import NativeSelect from '@/components/NativeSelect';
import { Card } from '@/components/ui/card';
import { useEdition } from '@/contexts/EditionContext';
import { loadProbabilities } from '@/data/probabilities/source';

const pct = (v: number) =>
  v >= 0.995 ? '100%' : v < 0.001 ? '<0,1%' : `${(v * 100).toFixed(v < 0.1 ? 1 : 0).replace('.', ',')}%`;

export default function Probabilities() {
  const { competition, year } = useEdition();
  const query = useQuery({
    queryKey: ['probabilities', competition, year],
    queryFn: () => loadProbabilities(competition, year),
    staleTime: 5 * 60_000,
  });
  const file = query.data ?? null;
  const [stage, setStage] = useState<number | null>(null);

  const stages = file?.stages ?? [];
  const isCopa = competition === 'copa';
  // Copa: padrão é a campeã (última fase); outras competições: a primeira linha (ex.: vencer o grupo)
  const stageIdx = stage ?? (isCopa ? Math.max(stages.length - 1, 0) : 0);
  const rows = useMemo(() => {
    if (!file) return [];
    return [...file.teams].sort((a, b) => (b.probs[stageIdx] ?? 0) - (a.probs[stageIdx] ?? 0));
  }, [file, stageIdx]);
  const maxProb = Math.max(...rows.map((r) => r.probs[stageIdx] ?? 0), 0.0001);

  const v = file?.validation;
  const within = v ? v.pooled.errorPp <= v.targetPp : false;

  return (
    <div className="min-h-screen text-white">
      <Navbar />
      <div className="w-full px-4 pb-20 pt-24 sm:px-6 lg:px-8 2xl:px-12" data-testid="probabilities-page">
        <h1 className="text-3xl font-extrabold text-white">Probabilidades</h1>
        <p className="mt-1 text-[#94A3B8]">
          {isCopa
            ? 'Chance de cada seleção chegar a cada fase, calculada antes do torneio e comparada com o que aconteceu.'
            : 'Chance de cada seleção em cada grupo, calculada a partir da tabela atual e dos jogos que faltam.'}
        </p>

        {query.isPending && <Loading testId="prob-loading" />}
        {!query.isPending && !file && (
          <p className="mt-6 text-sm text-[#94A3B8]" data-testid="prob-missing">
            As probabilidades desta edição ainda não estão disponíveis.
          </p>
        )}

        {file && v && (
          <>
            <Card className="mt-6 border-[#1E293B] bg-[#131A2E] p-4 text-white" data-testid="prob-validation">
              <div className="flex items-start gap-3">
                {within ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
                ) : (
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#D4AF37]" aria-hidden />
                )}
                <div className="text-sm text-[#CBD5E1]">
                  <p className="font-semibold text-white">Como o modelo se saiu</p>
                  <p className="mt-1">
                    {file.model.name}. {file.model.description}
                  </p>
                  <ul className="mt-2 space-y-1">
                    <li>
                      <strong className="text-white">{v.pooled.label}</strong> ({v.pooled.matches} jogos): erro médio de{' '}
                      <strong className="text-white">{v.pooled.errorPp.toFixed(1).replace('.', ',')} pontos</strong> entre a
                      probabilidade prevista e a frequência real (meta: até {v.targetPp} pontos; um modelo perfeito
                      mediria cerca de {v.pooled.noiseMedianPp.toFixed(1).replace('.', ',')} só por ruído de amostra).
                    </li>
                    <li>
                      <strong className="text-white">{v.edition.label}</strong> ({v.edition.matches} jogos):{' '}
                      {v.edition.errorPp.toFixed(1).replace('.', ',')} pontos.{' '}
                      {v.edition.errorPp > v.edition.noiseP90Pp
                        ? `Acima do que só o acaso explicaria (até ${v.edition.noiseP90Pp.toFixed(1).replace('.', ',')} pontos): neste torneio o modelo ficou tímido com os favoritos.`
                        : `Dentro do que o acaso explica com tão poucos jogos (até ${v.edition.noiseP90Pp.toFixed(1).replace('.', ',')} pontos).`}
                    </li>
                    <li>
                      O favorito do modelo acertou {(v.accuracy * 100).toFixed(0)}% dos jogos
                      {v.championName ? `; a campeã real foi ${v.championName}` : ''}.
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            {v.byType.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full max-w-2xl text-sm" data-testid="prob-by-type">
                  <caption className="pb-1 text-left text-[#94A3B8]">
                    Erro de calibração por tipo de jogo (jogos de 2020 em diante, que o ajuste do modelo não viu)
                  </caption>
                  <thead className="text-left text-[#94A3B8]">
                    <tr>
                      <th className="py-1 pr-4">Competição</th>
                      <th className="py-1 pr-4">Jogos</th>
                      <th className="py-1 pr-4">Erro</th>
                      <th className="py-1">Ruído esperado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.byType.map((b) => (
                      <tr key={b.label} className="border-t border-[#1E293B]">
                        <td className="py-1 pr-4">{b.label}</td>
                        <td className="py-1 pr-4 tabular-nums">{b.matches}</td>
                        <td className="py-1 pr-4 tabular-nums">{b.errorPp.toFixed(1).replace('.', ',')} pontos</td>
                        <td className="py-1 tabular-nums">{b.noiseMedianPp.toFixed(1).replace('.', ',')} pontos</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <label className="text-sm text-[#94A3B8]" htmlFor="prob-stage">
                {isCopa ? 'Probabilidade de chegar a:' : 'Probabilidade de:'}
              </label>
              <NativeSelect
                id="prob-stage"
                data-testid="prob-stage"
                aria-label="Fase"
                value={String(stageIdx)}
                onChange={(e) => setStage(Number(e.target.value))}
                className="w-full"
                wrapperClassName="min-w-[12rem]"
              >
                {stages.map((s, i) => (
                  <option key={s} value={i}>
                    {s}
                  </option>
                ))}
              </NativeSelect>
              {file.teams.some((t) => t.reached !== null) && (
              <span className="text-xs text-[#94A3B8]">
                <Trophy className="mr-1 inline h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
                destaque dourado: seleção que realmente chegou a essa fase
              </span>
              )}
            </div>

            <ul className="mt-4 space-y-1.5" data-testid="prob-list">
              {rows.map((t) => {
                const p = t.probs[stageIdx] ?? 0;
                const hit = t.reached !== null && t.reached >= stageIdx + 1;
                return (
                  <li
                    key={t.code}
                    data-testid="prob-row"
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                      hit ? 'border-[#D4AF37]/60 bg-[#D4AF37]/10' : 'border-[#1E293B] bg-[#131A2E]'
                    }`}
                  >
                    <Flag code={t.code} name={t.name} className="h-5 shrink-0" />
                    <span className="w-28 shrink-0 truncate text-sm font-medium sm:w-44">{t.name}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#0B1020]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#D4AF37]"
                        style={{ width: `${Math.max((p / maxProb) * 100, 1)}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums">{pct(p)}</span>
                  </li>
                );
              })}
            </ul>

            <h2 className="mt-10 text-xl font-bold text-white">Calibração ({v.edition.label})</h2>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Quando o modelo dizia “X%”, com que frequência aquilo realmente aconteceu (todas as probabilidades de
              vitória, empate e derrota juntas).
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full max-w-xl text-sm" data-testid="prob-calibration">
                <thead className="text-left text-[#94A3B8]">
                  <tr>
                    <th className="py-1 pr-4">Faixa</th>
                    <th className="py-1 pr-4">Previsões</th>
                    <th className="py-1 pr-4">Prevista</th>
                    <th className="py-1">Real</th>
                  </tr>
                </thead>
                <tbody>
                  {v.calibration.map((c) => (
                    <tr key={c.bin} className="border-t border-[#1E293B]">
                      <td className="py-1 pr-4">{c.bin}</td>
                      <td className="py-1 pr-4 tabular-nums">{c.n}</td>
                      <td className="py-1 pr-4 tabular-nums">{pct(c.predicted)}</td>
                      <td className="py-1 tabular-nums">{pct(c.observed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 className="mt-10 text-xl font-bold text-white">Limitações</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#CBD5E1]">
              {file.model.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
