import { Card } from '@/components/ui/card';
import {
  STAT_GROUPS,
  barWidths,
  formatStat,
  possession,
} from '@/data/match/stats';
import type { MatchDetail } from '@/data/match/types';

interface Props {
  stats: MatchDetail['stats'];
  ranking?: MatchDetail['ranking'];
  names: { A: string; B: string };
  /** Quem fornece os números (padrão: FIFA). */
  source?: string;
}

const RANKING_LISTS = [
  ['attack', 'Ataque'],
  ['defense', 'Defesa'],
  ['creativity', 'Criatividade'],
  ['goalkeepers', 'Goleiros'],
] as const;

function Ranking({
  ranking,
  names,
}: {
  ranking: NonNullable<MatchDetail['ranking']>;
  names: { A: string; B: string };
}) {
  const lists = RANKING_LISTS.filter(([k]) => ranking[k].length > 0);
  if (lists.length === 0) return null;
  return (
    <Card
      className="border-[#1E293B] bg-[#131A2E] p-5 xl:col-span-2"
      data-testid="match-ranking"
    >
      <h2 className="mb-3 text-center text-sm font-semibold text-white">
        Melhores do jogo
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {lists.map(([key, title]) => (
          <div key={key} data-testid={`ranking-${key}`}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              {title}
            </p>
            <ol className="flex flex-col gap-1">
              {ranking[key].map((p) => (
                <li
                  key={`${p.rank}-${p.name}`}
                  data-testid="ranking-player"
                  data-side={p.side}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="w-5 shrink-0 text-xs text-[#94A3B8]">
                    {p.rank}º
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate text-white"
                    title={`${p.name} (${names[p.side]})`}
                  >
                    {p.name}
                  </span>
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      p.side === 'A' ? 'bg-[#D4AF37]' : 'bg-[#3B82F6]'
                    }`}
                    aria-label={names[p.side]}
                  />
                  <span className="w-9 shrink-0 text-right text-xs font-semibold text-[#D4AF37]">
                    {formatStat(p.score, 'dec1')}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Linha com barras partindo do centro, como no match-centre da FIFA. */
function Row({
  id,
  label,
  a,
  b,
  text,
}: {
  id: string;
  label: string;
  a: number;
  b: number;
  text: (v: number) => string;
}) {
  const w = barWidths(a, b);
  return (
    <div data-testid={`stat-row-${id}`} className="py-1.5">
      <p className="text-center text-[11px] text-[#94A3B8]">{label}</p>
      <div className="mt-0.5 flex items-center gap-3">
        <span
          className="w-14 shrink-0 text-right text-sm font-semibold text-white"
          data-testid={`stat-a-${id}`}
        >
          {text(a)}
        </span>
        <div className="grid h-1.5 min-w-0 flex-1 grid-cols-2 gap-px">
          <div className="flex justify-end rounded-l bg-[#1E293B]">
            <div
              className="h-full rounded-l bg-[#D4AF37]"
              style={{ width: `${w.a}%` }}
              data-testid={`stat-bar-a-${id}`}
            />
          </div>
          <div className="flex rounded-r bg-[#1E293B]">
            <div
              className="h-full rounded-r bg-[#3B82F6]"
              style={{ width: `${w.b}%` }}
              data-testid={`stat-bar-b-${id}`}
            />
          </div>
        </div>
        <span
          className="w-14 shrink-0 text-sm font-semibold text-white"
          data-testid={`stat-b-${id}`}
        >
          {text(b)}
        </span>
      </div>
    </div>
  );
}

export default function MatchStats({ stats, ranking, names, source = 'FIFA' }: Props) {
  const pos = stats ? possession(stats.A, stats.B) : null;
  return (
    <div className="flex flex-col gap-4" data-testid="match-stats">
      <div className="flex items-center justify-between gap-3">
        <span className="text-base font-bold text-[#D4AF37]">{names.A}</span>
        <span className="rounded bg-[#1E293B] px-2 py-0.5 text-[11px] text-[#94A3B8]">
          Estatísticas oficiais da {source}
        </span>
        <span className="text-base font-bold text-[#3B82F6]">{names.B}</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-2 xl:items-stretch">
        {pos && (
          <Card
            className="border-[#1E293B] bg-[#131A2E] p-5 xl:col-span-2"
            data-testid="stat-group-posse"
          >
            <h2 className="mb-2 text-center text-sm font-semibold text-white">
              Posse da bola
            </h2>
            <div className="flex items-center gap-3">
              <span
                className="w-14 shrink-0 text-right text-sm font-semibold text-white"
                data-testid="stat-a-Possession"
              >
                {pos.a}%
              </span>
              <div className="flex h-2 min-w-0 flex-1 gap-px overflow-hidden rounded">
                <div className="bg-[#D4AF37]" style={{ width: `${pos.a}%` }} />
                <div
                  className="bg-[#475569]"
                  style={{ width: `${pos.contested}%` }}
                />
                <div className="bg-[#3B82F6]" style={{ width: `${pos.b}%` }} />
              </div>
              <span
                className="w-14 shrink-0 text-sm font-semibold text-white"
                data-testid="stat-b-Possession"
              >
                {pos.b}%
              </span>
            </div>
            {pos.contested > 0 && (
              <p
                className="mt-1 text-center text-[11px] text-[#94A3B8]"
                data-testid="stat-contested"
              >
                {pos.contested}% em disputa
              </p>
            )}
          </Card>
        )}
        {ranking && <Ranking ranking={ranking} names={names} />}
        {stats &&
          STAT_GROUPS.map((g) => {
            const rows = g.stats.filter(
              (s) =>
                typeof stats.A[s.key] === 'number' &&
                typeof stats.B[s.key] === 'number',
            );
            if (rows.length === 0) return null;
            return (
              <Card
                key={g.id}
                className="border-[#1E293B] bg-[#131A2E] p-5"
                data-testid={`stat-group-${g.id}`}
              >
                <h2 className="mb-1 text-center text-sm font-semibold text-white">
                  {g.title}
                </h2>
                {rows.map((s) => (
                  <Row
                    key={s.key}
                    id={s.key}
                    label={s.label}
                    a={stats.A[s.key]}
                    b={stats.B[s.key]}
                    text={(v) => formatStat(v, s.format)}
                  />
                ))}
              </Card>
            );
          })}
      </div>
    </div>
  );
}
