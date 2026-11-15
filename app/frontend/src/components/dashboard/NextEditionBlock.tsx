import { CalendarDays, MapPin, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import CountdownTimer from '@/components/CountdownTimer';
import type { NextEdition } from '@/data/stats/types';

const nf = new Intl.NumberFormat('pt-BR');

// Datas "AAAA-MM-DD" são mostradas como estão, sem deslocar pelo fuso do navegador.
const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

function datesText(next: NextEdition): string | null {
  if (!next.startDate) return null;
  return next.endDate
    ? `${fmt(next.startDate)} a ${fmt(next.endDate)}`
    : `A partir de ${fmt(next.startDate)}`;
}

export default function NextEditionBlock({
  next,
  now = Date.now(),
}: {
  next: NextEdition;
  now?: number;
}) {
  const dates = datesText(next);
  const startsInFuture = next.startDate
    ? new Date(`${next.startDate}T00:00:00Z`).getTime() > now
    : false;

  return (
    <Card
      className="border-[#D4AF37]/40 bg-gradient-to-br from-[#1a1f2e] to-[#131A2E] p-5"
      data-testid="next-edition"
      data-year={next.year}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-[#D4AF37]">
        Próxima Copa do Mundo
      </p>
      <h2
        className="mt-1 text-2xl font-extrabold text-white"
        data-testid="next-title"
      >
        {next.label}
      </h2>

      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#CBD5E1]">
        <li className="flex items-center gap-2" data-testid="next-hosts">
          <MapPin className="h-4 w-4 text-[#D4AF37]" aria-hidden />
          {next.hosts.join(' · ')}
        </li>
        {dates && (
          <li className="flex items-center gap-2" data-testid="next-dates">
            <CalendarDays className="h-4 w-4 text-[#D4AF37]" aria-hidden />
            {dates}
          </li>
        )}
        {next.teams != null && (
          <li className="flex items-center gap-2" data-testid="next-teams">
            <Users className="h-4 w-4 text-[#D4AF37]" aria-hidden />
            {next.teams} seleções
          </li>
        )}
      </ul>

      {startsInFuture && next.startDate && (
        <div
          className="mt-4 max-w-full overflow-x-auto"
          data-testid="next-countdown"
        >
          <CountdownTimer target={`${next.startDate}T00:00:00Z`} />
        </div>
      )}

      {next.stadiums.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-white">Estádios</h3>
          <ul
            className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
            data-testid="next-stadiums"
          >
            {next.stadiums.map((s) => (
              <li
                key={`${s.name}-${s.city}`}
                className="rounded-lg border border-[#1E293B] px-3 py-2 text-sm"
                data-testid="next-stadium"
              >
                <span className="font-semibold text-white">{s.name}</span>
                <span className="block text-[#94A3B8]">
                  {s.city}, {s.country}
                  {s.capacity ? ` · ${nf.format(s.capacity)} lugares` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
