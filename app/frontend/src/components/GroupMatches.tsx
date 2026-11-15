import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { Match } from '@/data/worldCupData';

interface Props {
  group: string;
  matches: Match[];
  hrefOf: (match: Match) => string;
}

/** "Jogos do grupo": botão que abre e fecha a lista; cada jogo leva à página do jogo. */
export default function GroupMatches({ group, matches, hrefOf }: Props) {
  const [open, setOpen] = useState(false);
  const listId = useId();

  return (
    <div className="border-t border-[#1E293B] px-5 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={listId}
        data-testid={`group-matches-toggle-${group}`}
        className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-left hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
          Jogos do grupo <span className="ml-1 text-[#D4AF37]">({matches.length})</span>
        </span>
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 text-[#94A3B8] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul id={listId} className="mt-2 space-y-2" data-testid={`group-matches-${group}`}>
          {matches.map((match) => (
            <li key={match.id}>
              <Link
                to={hrefOf(match)}
                data-testid="group-match"
                className="flex items-center justify-between rounded-lg bg-[#0A0F1C]/50 px-3 py-2 text-xs hover:bg-[#0A0F1C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <span className="font-semibold text-white">{match.teamA}</span>
                <span className="text-[10px] font-bold text-[#D4AF37]">
                  {match.scoreA !== null ? `${match.scoreA} - ${match.scoreB}` : match.time}
                </span>
                <span className="font-semibold text-white">{match.teamB}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
