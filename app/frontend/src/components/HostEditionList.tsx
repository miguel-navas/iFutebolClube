import { Link } from 'react-router-dom';
import { ArrowRight, Map as MapIcon } from 'lucide-react';
import Flag from '@/components/Flag';
import { getHostCountry, getHostEditions, type HostEdition } from '@/data/worldCupHosts';
import { editionPath } from '@/lib/editionPaths';

interface Props {
  competition: string;
  /** Anos com dados no site. */
  availableYears: ReadonlySet<string>;
  onShowMap: () => void;
  mapShown: boolean;
}

/** Países da edição, com o código da bandeira (a Alemanha Ocidental usa a bandeira da Alemanha). */
function hostsOf(edition: HostEdition) {
  return edition.hosts.map((code) => {
    const host = getHostCountry(code);
    return { code: host?.placeOn ?? code, name: host?.name ?? code };
  });
}

/** Lista das edições da Copa, da mais recente à mais antiga; é o que o celular mostra no lugar do mapa. */
export default function HostEditionList({ competition, availableYears, onShowMap, mapShown }: Props) {
  const editions = [...getHostEditions()].reverse();
  const latest = editions.find((e) => availableYears.has(e.year));
  const others = editions.filter((e) => e !== latest);

  return (
    <div data-testid="host-edition-list">
      {latest && (
        <Link
          to={editionPath(competition, latest.year)}
          data-testid="host-edition-featured"
          className="block rounded-xl border border-[#D4AF37]/40 bg-[#131A2E] p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Edição mais recente</p>
          <h2 className="mt-1 text-2xl font-extrabold text-white">Copa {latest.year}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {hostsOf(latest).map((h) => (
              <Flag key={h.code} code={h.code} name={h.name} className="h-5" />
            ))}
            <span className="text-sm text-[#94A3B8]">{hostsOf(latest).map((h) => h.name).join(' · ')}</span>
          </div>
          <span className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#D4AF37] px-4 text-sm font-bold text-black">
            Abrir Copa {latest.year}
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      )}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-[#94A3B8]">Todas as Copas</h2>
      <ul className="mt-3 grid grid-cols-2 gap-3">
        {others.map((e) => {
          const ok = availableYears.has(e.year);
          const hosts = hostsOf(e);
          const body = (
            <>
              <span className="text-lg font-bold text-white">{e.year}</span>
              <span className="mt-1 flex items-center gap-1.5">
                {hosts.map((h) => (
                  <Flag key={h.code} code={h.code} name={h.name} className="h-4" />
                ))}
              </span>
              <span className="mt-1 block text-xs leading-tight text-[#94A3B8]">
                {hosts.map((h) => h.name).join(' · ')}
              </span>
              {!ok && <span className="mt-1 block text-[11px] font-medium text-[#64748B]">em breve</span>}
            </>
          );
          return (
            <li key={e.year}>
              {ok ? (
                <Link
                  to={editionPath(competition, e.year)}
                  data-testid="host-edition-card"
                  className="flex min-h-[88px] flex-col rounded-xl border border-[#1E293B] bg-[#131A2E] p-3 active:border-[#D4AF37]/40"
                >
                  {body}
                </Link>
              ) : (
                <div
                  data-testid="host-edition-card"
                  data-available="false"
                  aria-disabled="true"
                  className="flex min-h-[88px] flex-col rounded-xl border border-[#1E293B]/60 bg-[#0F1526] p-3 opacity-60"
                >
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {!mapShown && (
        <button
          type="button"
          data-testid="show-map"
          onClick={onShowMap}
          className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#1E293B] bg-[#131A2E] text-sm font-semibold text-white"
        >
          <MapIcon className="h-4 w-4 text-[#D4AF37]" />
          Ver no mapa
        </button>
      )}
    </div>
  );
}
