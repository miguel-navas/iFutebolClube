import FilterSelect from '@/components/FilterSelect';
import { useMemo, useState } from 'react';
import Pager from '@/components/Pager';
import type { RankingRow } from '@/data/stats/types';
import type { FifaRanking } from '@/data/stats/fifa';

const CONFEDERATIONS = ['UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'];
const PAGE_SIZE = 10;

type Mode = 'fifa' | 'copas';

const fmtDate = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
};

/** Ranking das seleções: o da FIFA (atual) e o histórico em Copas, geral ou por confederação. */
export default function TeamRanking({
  ranking,
  fifa,
}: {
  ranking: RankingRow[];
  fifa: FifaRanking | null;
}) {
  const hasCopas = ranking.length > 0;
  const hasFifa = fifa !== null;
  const [mode, setMode] = useState<Mode>(hasFifa ? 'fifa' : 'copas');
  const active: Mode =
    mode === 'fifa' && hasFifa ? 'fifa' : hasCopas ? 'copas' : 'fifa';
  const [filter, setFilter] = useState<string>('Geral');
  const [page, setPage] = useState(0);

  const source = active === 'fifa' ? (fifa?.teams ?? []) : ranking;
  const available = useMemo(
    () =>
      CONFEDERATIONS.filter((c) => source.some((r) => r.confederation === c)),
    [source],
  );
  const rows = useMemo(
    () =>
      filter === 'Geral'
        ? source
        : source.filter((r) => r.confederation === filter),
    [source, filter],
  );
  const current = Math.min(page, Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1));
  const offset = current * PAGE_SIZE;
  const shown = rows.slice(offset, offset + PAGE_SIZE);

  const choose = (value: string) => {
    setFilter(value);
    setPage(0);
  };
  const chooseMode = (m: Mode) => {
    setMode(m);
    setFilter('Geral');
    setPage(0);
  };

  return (
    <section
      className="rounded-2xl border border-[#1E293B] bg-[#131A2E] p-5"
      data-testid="ranking-section"
      aria-labelledby="ranking-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="ranking-title" className="text-lg font-bold text-white">
            {active === 'fifa'
              ? 'Ranking mundial da FIFA (masculino)'
              : 'Ranking das seleções em Copas'}
          </h2>
          <p className="mt-1 text-xs text-[#94A3B8]" data-testid="ranking-note">
            {active === 'fifa' && fifa
              ? `Última atualização oficial: ${fmtDate(fifa.updatedAt)}.${
                  fifa.source ? ` Fonte: ${fifa.source}.` : ''
                }`
              : 'Todas as Copas do banco. Pontos: 3 por vitória e 1 por empate, em todas as edições.'}
          </p>
        </div>
        {hasFifa && hasCopas && (
          <div
            className="flex gap-1 rounded-lg border border-[#1E293B] bg-[#0A0F1C] p-1"
            role="group"
            aria-label="Tipo de ranking"
          >
            {(
              [
                ['fifa', 'FIFA'],
                ['copas', 'Em Copas'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                data-testid={`ranking-mode-${m}`}
                aria-pressed={active === m}
                onClick={() => chooseMode(m)}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${
                  active === m
                    ? 'bg-[#D4AF37] text-[#0A0F1C]'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <FilterSelect
        className="mt-4 md:hidden"
        label="Confederação"
        testId="ranking-filter-select"
        value={filter}
        onChange={choose}
        options={['Geral', ...available].map((c) => ({ value: c, label: c }))}
      />

      <div
        className="mt-4 hidden flex-wrap gap-2 md:flex"
        role="group"
        aria-label="Filtrar por confederação"
      >
        {['Geral', ...available].map((c) => (
          <button
            key={c}
            type="button"
            data-testid={`ranking-filter-${c}`}
            aria-pressed={filter === c}
            onClick={() => choose(c)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
              filter === c
                ? 'bg-[#D4AF37] text-[#0A0F1C]'
                : 'border border-[#1E293B] bg-[#0A0F1C] text-[#94A3B8] hover:text-white'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {active === 'fifa' ? (
        <div className="mt-4 overflow-x-auto">
          <table
            className="w-full min-w-[22rem] text-sm"
            data-testid="fifa-table"
          >
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-[#94A3B8]">
                <th className="w-8 py-2 pr-2">#</th>
                <th className="py-2 pr-2">Seleção</th>
                <th className="py-2 px-1 text-center">Confed.</th>
                {filter !== 'Geral' && (
                  <th className="py-2 px-1 text-center">Mundial</th>
                )}
                <th className="py-2 pl-1 text-right">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {(shown as FifaRanking['teams']).map((r, i) => (
                <tr
                  key={r.code}
                  className="border-t border-[#1E293B] text-[#CBD5E1]"
                  data-testid="fifa-row"
                  data-code={r.code}
                >
                  <td className="py-2 pr-2 font-bold text-[#D4AF37]">
                    {offset + i + 1}
                  </td>
                  <td className="py-2 pr-2">
                    <span className="mr-2 rounded bg-[#0A0F1C] px-1.5 py-0.5 text-[10px] font-bold text-[#94A3B8]">
                      {r.code}
                    </span>
                    <span className="font-semibold text-white">{r.name}</span>
                  </td>
                  <td className="py-2 px-1 text-center text-xs text-[#94A3B8]">
                    {r.confederation || '—'}
                  </td>
                  {filter !== 'Geral' && (
                    <td className="py-2 px-1 text-center text-xs">{r.rank}º</td>
                  )}
                  <td className="py-2 pl-1 text-right font-extrabold text-white">
                    {r.points.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table
            className="w-full min-w-[34rem] text-sm"
            data-testid="ranking-table"
          >
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-[#94A3B8]">
                <th className="w-8 py-2 pr-2">#</th>
                <th className="py-2 pr-2">Seleção</th>
                <th className="py-2 px-1 text-center" title="Títulos">
                  Tít.
                </th>
                <th className="py-2 px-1 text-center" title="Participações">
                  Part.
                </th>
                <th className="py-2 px-1 text-center">J</th>
                <th className="py-2 px-1 text-center">V</th>
                <th className="py-2 px-1 text-center">E</th>
                <th className="py-2 px-1 text-center">D</th>
                <th className="py-2 px-1 text-center">GP</th>
                <th className="py-2 px-1 text-center">GC</th>
                <th className="py-2 pl-1 text-center">Pts</th>
              </tr>
            </thead>
            <tbody>
              {(shown as RankingRow[]).map((r, i) => (
                <tr
                  key={r.code}
                  className="border-t border-[#1E293B] text-[#CBD5E1]"
                  data-testid="ranking-row"
                  data-code={r.code}
                >
                  <td className="py-2 pr-2 font-bold text-[#D4AF37]">
                    {offset + i + 1}
                  </td>
                  <td className="py-2 pr-2">
                    <span className="mr-2 rounded bg-[#0A0F1C] px-1.5 py-0.5 text-[10px] font-bold text-[#94A3B8]">
                      {r.code}
                    </span>
                    <span className="font-semibold text-white">{r.name}</span>
                  </td>
                  <td className="py-2 px-1 text-center font-bold text-[#D4AF37]">
                    {r.titles}
                  </td>
                  <td className="py-2 px-1 text-center">{r.participations}</td>
                  <td className="py-2 px-1 text-center">{r.played}</td>
                  <td className="py-2 px-1 text-center">{r.won}</td>
                  <td className="py-2 px-1 text-center">{r.drawn}</td>
                  <td className="py-2 px-1 text-center">{r.lost}</td>
                  <td className="py-2 px-1 text-center">{r.goalsFor}</td>
                  <td className="py-2 px-1 text-center">{r.goalsAgainst}</td>
                  <td className="py-2 pl-1 text-center font-extrabold text-white">
                    {r.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length === 0 && (
        <p className="py-4 text-sm text-[#94A3B8]" data-testid="ranking-empty">
          Nenhuma seleção nesta confederação.
        </p>
      )}

      <Pager
        testId="ranking"
        page={current}
        total={rows.length}
        pageSize={PAGE_SIZE}
        onPage={setPage}
      />
    </section>
  );
}
