import { Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { goalsPerMatch } from '@/data/stats/derive';
import type { EditionStats } from '@/data/stats/types';

const DASH = '—';
const nf = new Intl.NumberFormat('pt-BR');
const num = (v: number | null) => (v == null ? DASH : nf.format(v));
const dec = (v: number | null) =>
  v == null
    ? DASH
    : v.toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });

function Tile({
  id,
  label,
  value,
}: {
  id: string;
  label: string;
  value: string;
}) {
  return (
    <Card
      className="border-[#1E293B] bg-[#131A2E] p-4 text-center"
      data-testid={`tile-${id}`}
    >
      <p className="text-2xl font-extrabold text-white">{value}</p>
      <p className="mt-1 text-xs text-[#94A3B8]">{label}</p>
    </Card>
  );
}

export default function EditionDashboard({
  edition,
}: {
  edition: EditionStats;
}) {
  const perMatch = goalsPerMatch(edition);

  return (
    <section
      aria-labelledby="dash-title"
      data-testid="edition-dashboard"
      data-year={edition.year}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="dash-title"
            className="text-2xl font-extrabold text-white"
            data-testid="dashboard-title"
          >
            {edition.label}
          </h2>
          <p className="text-sm text-[#94A3B8]" data-testid="dashboard-host">
            Sede: {edition.host}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="flex items-center gap-3 border-[#D4AF37]/40 bg-[#131A2E] p-4">
          <Trophy className="h-8 w-8 shrink-0 text-[#D4AF37]" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-[#94A3B8]">
              Campeã
            </p>
            <p
              className="truncate text-lg font-bold text-white"
              data-testid="dashboard-champion"
            >
              {edition.champion ?? DASH}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 border-[#1E293B] bg-[#131A2E] p-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-[#94A3B8]">
              Vice-campeã
            </p>
            <p
              className="truncate text-lg font-bold text-white"
              data-testid="dashboard-runner-up"
            >
              {edition.runnerUp ?? DASH}
            </p>
          </div>
        </Card>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Tile id="teams" label="Seleções" value={num(edition.teams)} />
        <Tile id="matches" label="Jogos" value={num(edition.matches)} />
        <Tile id="goals" label="Gols" value={num(edition.goals)} />
        <Tile
          id="goals-per-match"
          label="Gols por jogo"
          value={dec(perMatch)}
        />
        <Tile
          id="attendance-total"
          label="Público total"
          value={num(edition.attendanceTotal)}
        />
        <Tile
          id="attendance-average"
          label="Público médio"
          value={num(edition.attendanceAverage)}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card className="border-[#1E293B] bg-[#131A2E] p-4">
          <h3 className="text-sm font-semibold text-white">Artilheiros</h3>
          {edition.topScorers.length === 0 ? (
            <p
              className="mt-3 text-sm text-[#94A3B8]"
              data-testid="scorers-empty"
            >
              Sem dados de artilharia.
            </p>
          ) : (
            <ol className="mt-3 flex flex-col gap-2" data-testid="scorers">
              {edition.topScorers.map((s, i) => (
                <li
                  key={`${s.player}-${s.team}`}
                  className="flex items-center justify-between gap-3 text-sm"
                  data-testid="scorer"
                >
                  <span className="min-w-0 truncate text-white">
                    <span className="mr-2 text-[#94A3B8]">{i + 1}.</span>
                    {s.player}{' '}
                    <span className="text-[#94A3B8]">· {s.team}</span>
                  </span>
                  <span className="font-bold text-[#D4AF37]">{s.goals}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="border-[#1E293B] bg-[#131A2E] p-4">
          <h3 className="text-sm font-semibold text-white">Maior vitória</h3>
          {edition.biggestWin ? (
            <p className="mt-3 text-base text-white" data-testid="biggest-win">
              {edition.biggestWin.home}{' '}
              <span className="font-extrabold text-[#D4AF37]">
                {edition.biggestWin.score.replace('-', ' x ')}
              </span>{' '}
              {edition.biggestWin.away}
            </p>
          ) : (
            <p
              className="mt-3 text-sm text-[#94A3B8]"
              data-testid="biggest-win-empty"
            >
              {DASH}
            </p>
          )}
        </Card>
      </div>
    </section>
  );
}
