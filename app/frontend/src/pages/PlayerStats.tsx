import { useMemo, useState } from 'react';
import Loading from '@/components/Loading';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, BookOpen, Search } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Pager from '@/components/Pager';
import FilterSelect from '@/components/FilterSelect';
import NativeSelect from '@/components/NativeSelect';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useEdition } from '@/contexts/EditionContext';
import { loadPlayerStats } from '@/data/playerstats/source';
import { STAT_TABS, buildRows, formatValue } from '@/data/playerstats/columns';

const PAGE = 20;

export default function PlayerStats() {
  const { data, competition, year } = useEdition();
  const query = useQuery({
    queryKey: ['player-stats', competition, year],
    queryFn: () => loadPlayerStats(competition, year),
    staleTime: 5 * 60_000,
  });
  const file = query.data ?? null;

  const [tabId, setTabId] = useState(STAT_TABS[0].id);
  const [team, setTeam] = useState('');
  const [text, setText] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [desc, setDesc] = useState(true);
  const [page, setPage] = useState(0);
  const [glossary, setGlossary] = useState(false);

  const tab = STAT_TABS.find((t) => t.id === tabId) ?? STAT_TABS[0];
  const teamName = (code: string) =>
    data.teams.find((t) => t.code === code)?.name ?? code;

  const teams = useMemo(() => {
    const codes = new Set((file?.players ?? []).map((p) => p.team));
    return [...codes]
      .map((code) => ({ code, name: teamName(code) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, data.teams]);

  const rows = useMemo(
    () =>
      file
        ? buildRows(file.players, { tab, team, query: text, sortBy, desc })
        : [],
    [file, tab, team, text, sortBy, desc],
  );

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  const start = current * PAGE;
  const pageRows = rows.slice(start, start + PAGE);
  function chooseTab(id: string) {
    setTabId(id);
    setSortBy(null);
    setDesc(true);
    setPage(0);
  }

  function sortOn(id: string) {
    if (sortBy === id) setDesc((d) => !d);
    else {
      setSortBy(id);
      setDesc(true);
    }
    setPage(0);
  }

  return (
    <div className="min-h-screen text-white">
      <Navbar />
      <div
        className="w-full px-4 pb-20 pt-24 sm:px-6 lg:px-8 2xl:px-12"
        data-testid="player-stats-page"
      >
        <h1 className="text-3xl font-extrabold text-white">
          Estatísticas dos jogadores
        </h1>
        <p className="mt-1 text-[#94A3B8]">
          Totais da Copa do Mundo {year}, somando todos os jogos.
        </p>

        {query.isPending && (
          <Loading testId="stats-loading" />
        )}

        {!query.isPending && !file && (
          <p
            className="mt-6 text-sm text-[#94A3B8]"
            data-testid="pstat-missing"
          >
            As estatísticas dos jogadores desta edição ainda não estão
            disponíveis.
          </p>
        )}

        {file && (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="relative w-full max-w-sm">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]"
                  aria-hidden
                />
                <Input
                  data-testid="player-search"
                  aria-label="Buscar jogador"
                  placeholder="Buscar jogador pelo nome..."
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setPage(0);
                  }}
                  className="h-11 rounded-xl border-[#1E293B] bg-[#131A2E] pl-10 text-white placeholder:text-[#475569] focus:border-[#D4AF37]"
                />
              </div>
              <NativeSelect
                data-testid="player-team"
                aria-label="Equipe"
                value={team}
                onChange={(e) => {
                  setTeam(e.target.value);
                  setPage(0);
                }}
                className="w-full"
                wrapperClassName="min-w-[12rem]"
              >
                <option value="">Todas as equipes</option>
                {teams.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </NativeSelect>
              <button
                type="button"
                data-testid="pstat-glossary-toggle"
                aria-expanded={glossary}
                onClick={() => setGlossary((g) => !g)}
                className={`inline-flex h-11 items-center gap-2 rounded-xl border px-3.5 text-sm transition-colors ${
                  glossary
                    ? 'border-[#D4AF37]/60 bg-[#D4AF37]/10 text-[#D4AF37]'
                    : 'border-[#1E293B] bg-[#131A2E] text-[#94A3B8] hover:text-white'
                }`}
              >
                <BookOpen className="h-4 w-4" aria-hidden />
                Glossário
              </button>
            </div>

            <FilterSelect
              className="mt-4 md:hidden"
              label="Estatística"
              testId="pstat-tab-select"
              value={tab.id}
              onChange={chooseTab}
              options={STAT_TABS.map((t) => ({ value: t.id, label: t.label }))}
            />

            <div
              className="mt-4 hidden flex-wrap gap-1.5 md:flex"
              role="tablist"
              data-testid="pstat-tabs"
            >
              {STAT_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={t.id === tab.id}
                  data-testid={`pstat-tab-${t.id}`}
                  onClick={() => chooseTab(t.id)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    t.id === tab.id
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/10 text-[#D4AF37]'
                      : 'border-[#1E293B] bg-[#131A2E] text-[#94A3B8] hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {glossary && (
              <Card
                className="mt-4 border-[#1E293B] bg-[#131A2E] p-5"
                data-testid="pstat-glossary"
              >
                <h2 className="mb-3 text-sm font-semibold text-white">
                  Glossário · {tab.label}
                </h2>
                <dl className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                  {tab.columns.map((c) => (
                    <div key={c.id} data-testid="pstat-glossary-item">
                      <dt className="text-sm font-semibold text-[#D4AF37]">
                        {c.label}
                      </dt>
                      <dd className="text-sm text-[#94A3B8]">{c.desc}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            )}

            <p
              className="mt-4 text-xs text-[#94A3B8]"
              data-testid="pstat-count"
            >
              {rows.length} {rows.length === 1 ? 'jogador' : 'jogadores'}
            </p>

            <Card className="mt-2 overflow-hidden border-[#1E293B] bg-[#131A2E]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="pstat-table">
                  <thead>
                    <tr className="border-b border-[#1E293B] text-left text-xs text-[#94A3B8]">
                      <th className="w-12 px-3 py-3 font-medium">Pos.</th>
                      <th className="min-w-[200px] px-3 py-3 font-medium">
                        Jogador
                      </th>
                      {tab.columns.map((c) => (
                        <th
                          key={c.id}
                          className="whitespace-nowrap px-3 py-3 text-right font-medium"
                        >
                          <button
                            type="button"
                            data-testid={`pstat-sort-${c.id}`}
                            onClick={() => sortOn(c.id)}
                            className="inline-flex items-center gap-1 hover:text-white"
                          >
                            {c.label}
                            {sortBy === c.id &&
                              (desc ? (
                                <ArrowDown className="h-3 w-3" aria-hidden />
                              ) : (
                                <ArrowUp className="h-3 w-3" aria-hidden />
                              ))}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((p, i) => (
                      <tr
                        key={p.id}
                        data-testid="pstat-row"
                        data-player-id={p.id}
                        className="border-b border-[#1E293B]/60 last:border-0 hover:bg-[#1E293B]/30"
                      >
                        <td className="px-3 py-2.5 text-[#94A3B8]">{start + i + 1}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className="font-semibold text-white"
                            data-testid="pstat-name"
                          >
                            {p.name}
                          </span>
                          <span className="ml-2 text-xs text-[#94A3B8]">
                            <span
                              className="rounded bg-[#1E293B] px-1.5 py-0.5 font-semibold"
                              title={teamName(p.team)}
                            >
                              {p.team}
                            </span>
                            {p.position && (
                              <span className="ml-1">{p.position}</span>
                            )}
                          </span>
                        </td>
                        {tab.columns.map((c) => (
                          <td
                            key={c.id}
                            className="px-3 py-2.5 text-right tabular-nums text-white"
                            data-col={c.id}
                          >
                            {formatValue(c.get(p), c.fmt)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length === 0 && (
                <p
                  className="p-6 text-center text-sm text-[#94A3B8]"
                  data-testid="pstat-empty"
                >
                  Nenhum jogador encontrado.
                </p>
              )}
            </Card>

            <Pager
              testId="pstat"
              page={current}
              total={rows.length}
              pageSize={PAGE}
              onPage={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
