import { useMemo, useState } from 'react';
import Loading from '@/components/Loading';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Flag from '@/components/Flag';
import NativeSelect from '@/components/NativeSelect';
import { Card } from '@/components/ui/card';
import { loadComparison } from '@/data/comparison/source';
import { copaPairStats, headToHead, pairGameStats, pairPenalties, pairStats, KINDS, STAT_ROWS } from '@/data/comparison/compute';

/** Estatísticas que o confronto já mostra, jogo a jogo, nas linhas de cima do gráfico. */
const JOGO_A_JOGO = new Set(['Goals', 'GoalsConceded', 'YellowCards', 'RedCards']);

const KIND_LABEL: Record<string, string> = {
  copa: 'Copa do Mundo',
  continental: 'Torneio continental',
  eliminatoria: 'Eliminatórias',
  liga: 'Nations League',
  amistoso: 'Amistoso',
  outro: 'Outro',
};

const fmt = (v: number, percent = false) =>
  percent ? `${(v * 100).toFixed(0)}%` : String(Math.round(v));

/** Nome do torneio em português (o histórico vem em inglês). */
const TORNEIO: [RegExp, string][] = [
  [/^Friendly$/, 'Amistoso'],
  [/^FIFA World Cup qualification$/, 'Eliminatórias da Copa'],
  [/^FIFA World Cup$/, 'Copa do Mundo'],
  [/^Confederations Cup$/, 'Copa das Confederações'],
  [/^Copa América$/, 'Copa América'],
  [/^UEFA Euro qualification$/, 'Eliminatórias da Eurocopa'],
  [/^UEFA Euro$/, 'Eurocopa'],
  [/^UEFA Nations League$/, 'Nations League'],
  [/^African Cup of Nations/, 'Copa Africana de Nações'],
  [/^AFC Asian Cup/, 'Copa da Ásia'],
  [/^Gold Cup/, 'Copa Ouro'],
];
const torneio = (nome: string) => TORNEIO.find(([re]) => re.test(nome))?.[1] ?? nome;

const date = (iso: string) => iso.split('-').reverse().join('/');

/** Linha do gráfico de barras espelhado: uma seleção de cada lado, o nome da estatística no meio. */
function BarRow({
  label, va, vb, text, testId = 'cmp-bar-row',
}: {
  label: string;
  va: number | undefined;
  vb: number | undefined;
  text: (v: number) => string;
  testId?: string;
}) {
  const max = Math.max(va ?? 0, vb ?? 0, 0.0001);
  const w = (v: number | undefined) => `${((v ?? 0) / max) * 100}%`;
  const winA = va !== undefined && vb !== undefined && va > vb;
  const winB = va !== undefined && vb !== undefined && vb > va;
  return (
    <div
      data-testid={testId}
      className="grid grid-cols-[1fr_8.5rem_1fr] items-center gap-2 border-t border-[#1E293B] py-1.5 text-sm sm:grid-cols-[1fr_11rem_1fr]"
    >
      <div className="flex items-center justify-end gap-2">
        <span className={`tabular-nums ${winA ? 'font-bold text-white' : 'text-[#CBD5E1]'}`}>
          {va === undefined ? '—' : text(va)}
        </span>
        <div className="flex h-4 w-1/2 justify-end overflow-hidden rounded-l-full bg-[#0B1020]">
          <div className="h-full rounded-l-full bg-[#1D4ED8]" style={{ width: w(va) }} />
        </div>
      </div>
      <div className="text-center text-[#CBD5E1]">{label}</div>
      <div className="flex items-center gap-2">
        <div className="flex h-4 w-1/2 overflow-hidden rounded-r-full bg-[#0B1020]">
          <div className="h-full rounded-r-full bg-[#EF4444]" style={{ width: w(vb) }} />
        </div>
        <span className={`tabular-nums ${winB ? 'font-bold text-white' : 'text-[#CBD5E1]'}`}>
          {vb === undefined ? '—' : text(vb)}
        </span>
      </div>
    </div>
  );
}

export default function Comparison() {
  const query = useQuery({ queryKey: ['comparison'], queryFn: loadComparison, staleTime: 10 * 60_000 });
  const file = query.data ?? null;
  const [params, setParams] = useSearchParams();
  const [kind, setKind] = useState<string | null>(null); // null = todas as competições

  const codes = useMemo(() => new Set(file?.teams.map((t) => t.code)), [file]);
  const pick = (v: string | null, fallback: string) => (v && codes.has(v) ? v : fallback);
  const first = file?.teams[0]?.code ?? '';
  const a = pick(params.get('a'), codes.has('BRA') ? 'BRA' : first);
  const b = pick(params.get('b'), codes.has('GER') ? 'GER' : (file?.teams[1]?.code ?? first));

  const teamA = file?.teams.find((t) => t.code === a);
  const teamB = file?.teams.find((t) => t.code === b);
  const h2h = useMemo(() => (file && a !== b ? headToHead(file, a, b) : null), [file, a, b]);
  const ps = useMemo(() => pairStats(h2h?.meetings ?? [], kind), [h2h, kind]);
  const copa = useMemo(() => (file && a !== b ? copaPairStats(file, a, b) : null), [file, a, b]);
  const pens = useMemo(() => (file && a !== b ? pairPenalties(file, a, b, kind) : null), [file, a, b, kind]);
  const gameStats = useMemo(() => (file && a !== b ? pairGameStats(file, a, b, kind) : null), [file, a, b, kind]);

  const setTeam = (key: 'a' | 'b', code: string) => {
    setKind(null);
    const next = new URLSearchParams(params);
    next.set('a', key === 'a' ? code : a);
    next.set('b', key === 'b' ? code : b);
    setParams(next, { replace: true });
  };

  const select = (key: 'a' | 'b', value: string) => (
    <NativeSelect
      aria-label={key === 'a' ? 'Primeira seleção' : 'Segunda seleção'}
      data-testid={`cmp-${key}`}
      value={value}
      onChange={(e) => setTeam(key, e.target.value)}
    >
      {file?.teams.map((t) => (
        <option key={t.code} value={t.code}>
          {t.name}
        </option>
      ))}
    </NativeSelect>
  );

  return (
    <div className="min-h-screen text-white">
      <Navbar />
      <div className="w-full px-4 pb-20 pt-24 sm:px-6 lg:px-8 2xl:px-12" data-testid="comparison-page">
        <h1 className="text-3xl font-extrabold text-white">Comparação entre seleções</h1>
        <p className="mt-1 text-[#94A3B8]">
          Confronto direto desde {file?.since ?? 1930} e estatísticas dos jogos entre as duas.
        </p>

        {query.isPending && <Loading testId="cmp-loading" label="Carregando comparação…" />}
        {!query.isPending && !file && (
          <p className="mt-6 text-sm text-[#94A3B8]" data-testid="cmp-missing">
            Os dados de comparação ainda não estão disponíveis.
          </p>
        )}

        {file && teamA && teamB && (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {select('a', a)}
              {select('b', b)}
            </div>

            {a === b && (
              <p className="mt-6 text-sm text-[#94A3B8]" data-testid="cmp-same">
                Escolha duas seleções diferentes.
              </p>
            )}

            {h2h && (
              <>
                <Card className="mt-6 border-[#1E293B] bg-[#131A2E] p-5 text-white" data-testid="cmp-h2h">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-lg font-bold">
                      <Flag code={a} name={teamA.name} className="h-6" />
                      {teamA.name}
                    </div>
                    <div className="flex items-center gap-2 text-lg font-bold">
                      {teamB.name}
                      <Flag code={b} name={teamB.name} className="h-6" />
                    </div>
                  </div>
                  {h2h.total === 0 ? (
                    <p className="mt-4 text-sm text-[#94A3B8]">
                      Estas seleções não se enfrentaram desde {file.since}.
                    </p>
                  ) : (
                    <>
                      <div className="mt-4 flex flex-wrap gap-2" data-testid="cmp-kinds">
                        <button
                          type="button"
                          data-testid="cmp-kind-todos"
                          aria-pressed={kind === null}
                          onClick={() => setKind(null)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            kind === null
                              ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                              : 'border-[#1E293B] text-[#94A3B8] hover:border-[#334155]'
                          }`}
                        >
                          Todas ({h2h.total})
                        </button>
                        {KINDS.map((k) => {
                          const n = h2h.meetings.filter((m) => m.kind === k.key).length;
                          if (n === 0) return null;
                          return (
                            <button
                              key={k.key}
                              type="button"
                              data-testid={`cmp-kind-${k.key}`}
                              aria-pressed={kind === k.key}
                              onClick={() => setKind(k.key)}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                kind === k.key
                                  ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                                  : 'border-[#1E293B] text-[#94A3B8] hover:border-[#334155]'
                              }`}
                            >
                              {k.label} ({n})
                            </button>
                          );
                        })}
                      </div>

                      <p className="mt-4 text-center text-sm text-[#CBD5E1]">
                        <strong className="text-2xl text-white" data-testid="cmp-total">{ps.games}</strong> jogos entre as duas seleções
                      </p>
                      <div className="mt-2 grid grid-cols-3 text-center">
                        <div>
                          <div className="text-4xl font-extrabold" data-testid="cmp-wins-a">{ps.winsA}</div>
                          <div className="text-xs text-[#94A3B8]">vitórias</div>
                        </div>
                        <div>
                          <div className="text-4xl font-extrabold text-[#D4AF37]" data-testid="cmp-draws">{ps.draws}</div>
                          <div className="text-xs text-[#94A3B8]">empates</div>
                        </div>
                        <div>
                          <div className="text-4xl font-extrabold" data-testid="cmp-wins-b">{ps.winsB}</div>
                          <div className="text-xs text-[#94A3B8]">vitórias</div>
                        </div>
                      </div>

                      <div className="mt-5" data-testid="cmp-h2h-bars">
                        <BarRow label="Vitórias" va={ps.winsA} vb={ps.winsB} text={String} />
                        <BarRow label="Empates" va={ps.draws} vb={ps.draws} text={String} />
                        <BarRow label="Gols marcados" va={ps.goalsA} vb={ps.goalsB} text={String} />
                        <BarRow label="Jogos sem sofrer gol" va={ps.cleanA} vb={ps.cleanB} text={String} />
                        <BarRow label="Jogos marcando gol" va={ps.scoredA} vb={ps.scoredB} text={String} />
                        {(() => {
                          const comCartoes = !!copa && copa.games > 0 && (kind === null || kind === 'copa');
                          return (
                            <>
                              <BarRow label="Cartões amarelos" va={comCartoes ? copa!.yellowA : undefined} vb={comCartoes ? copa!.yellowB : undefined} text={String} />
                              <BarRow label="Cartões vermelhos" va={comCartoes ? copa!.redA : undefined} vb={comCartoes ? copa!.redB : undefined} text={String} />
                            </>
                          );
                        })()}
                        <BarRow label="Pênaltis" va={pens?.a} vb={pens?.b} text={String} />
                        {STAT_ROWS.filter((r) => !JOGO_A_JOGO.has(r.key)).map((row) => {
                          const comDados = !!gameStats && gameStats.games > 0;
                          return (
                            <BarRow
                              key={row.key}
                              testId="cmp-stat-row"
                              label={row.label}
                              va={comDados ? gameStats!.a[row.key] : undefined}
                              vb={comDados ? gameStats!.b[row.key] : undefined}
                              text={(v) => fmt(v, row.percent)}
                            />
                          );
                        })}
                      </div>
                    </>
                  )}
                </Card>

                {ps.games > 0 && (
                  <>
                    <h2 className="mt-8 text-xl font-bold text-white">Últimos jogos</h2>
                    <ul className="mt-2 space-y-1.5" data-testid="cmp-meetings">
                      {h2h.meetings
                        .filter((m) => !kind || m.kind === kind)
                        .slice(0, 10)
                        .map((m, i) => (
                          <li
                            key={`${m.date}-${i}`}
                            className="flex items-center gap-3 rounded-xl border border-[#1E293B] bg-[#131A2E] px-3 py-2 text-sm"
                          >
                            <span className="w-24 shrink-0 text-[#94A3B8]">{date(m.date)}</span>
                            <span className="flex-1 truncate">
                              {torneio(m.tournament) || KIND_LABEL[m.kind] || m.kind}
                            </span>
                            <span className="shrink-0 font-semibold tabular-nums">
                              {teamA.name} {m.goalsA} × {m.goalsB} {teamB.name}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </>
                )}
              </>
            )}

            <section className="mt-10 max-w-4xl space-y-2 text-xs text-[#94A3B8]" data-testid="cmp-notes">
              <h2 className="text-sm font-bold text-[#CBD5E1]">Como ler este gráfico</h2>
              <p>
                Vitórias, empates, gols, jogos sem sofrer gol e jogos marcando gol são contados só nos jogos entre{' '}
                {teamA.name} e {teamB.name} ({file.since} em diante), conforme o tipo de competição escolhido.
              </p>
              <p data-testid="cmp-copa-note">
                Pênaltis são os convertidos no tempo de jogo em todos os jogos entre as duas (os perdidos e a disputa de pênaltis não entram).
                {copa && copa.games > 0
                  ? ` Cartões valem só para ${copa.games === 1 ? 'o 1 jogo' : `os ${copa.games} jogos`} entre as duas em Copas do Mundo; vermelhos incluem o segundo amarelo.`
                  : ' Não há cartões do confronto: o histórico dos jogos tem apenas o placar.'}
              </p>
              <p data-testid="cmp-stats-note">
                {gameStats && gameStats.games > 0
                  ? `Chutes, escanteios, posse, passes e demais estatísticas valem só para ${gameStats.games === 1 ? 'o 1 jogo' : `os ${gameStats.games} jogos`} entre as duas com estatísticas (Copas de 2018, 2022 e 2026 e Nations League 2026/27). Chutes, escanteios e impedimentos existem desde 2018; posse, passes e demais só em 2026 e faltas e desarmes só na Nations League, então cada linha soma só os jogos que têm aquele dado. A posse é a porcentagem média.`
                  : 'Linhas com "—" não têm dado: o histórico dos jogos entre as duas tem apenas o placar e estas seleções não se enfrentaram em nenhum jogo com estatísticas (Copas de 2018, 2022 e 2026 e Nations League 2026/27).'}
              </p>
              <p>
                {file.sources} Seleções que mudaram de nome entram sob o nome atual (ex.: Alemanha Ocidental na
                Alemanha).
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
