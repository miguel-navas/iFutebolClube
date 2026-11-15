import {
  timeline,
  type MatchEvent,
  type MatchDetail,
} from '@/data/match/types';
import { cardIcon, goalIcon, ICON_LABEL, MatchIcon } from './Icons';

type Person = { id: number | null; name: string };
type Side = 'A' | 'B';
type OnPlayer = (side: Side, p: Person) => void;

function Name({
  side,
  p,
  onPlayer,
  className,
}: {
  side: Side;
  p: Person;
  onPlayer?: OnPlayer;
  className: string;
}) {
  if (!onPlayer || p.id === null)
    return <span className={className}>{p.name}</span>;
  return (
    <button
      type="button"
      data-testid="player-open"
      onClick={() => onPlayer(side, p)}
      className={`${className} hover:text-[#D4AF37] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-white [.is-b_&]:text-left`}
    >
      {p.name}
    </button>
  );
}

function Body({ e, onPlayer }: { e: MatchEvent; onPlayer?: OnPlayer }) {
  if (e.type === 'goal') {
    const note =
      e.kind === 'penalty' ? ' (pênalti)' : e.kind === 'own' ? ' (contra)' : '';
    return (
      <div className="flex min-w-0 flex-col" data-testid="event-goal">
        <span className="flex items-center gap-1.5 [.is-b_&]:flex-row-reverse">
          <MatchIcon kind={goalIcon(e.kind)} />
          <span className="min-w-0 break-words">
            <Name
              side={e.side}
              p={e.player}
              onPlayer={onPlayer}
              className="font-semibold text-white"
            />
            <span className="text-xs font-normal text-[#94A3B8]">{note}</span>
          </span>
        </span>
        {e.assist && (
          <span className="text-xs text-[#94A3B8]">
            Assistência:{' '}
            <Name
              side={e.side}
              p={e.assist}
              onPlayer={onPlayer}
              className="text-[#94A3B8]"
            />
          </span>
        )}
      </div>
    );
  }
  if (e.type === 'card') {
    return (
      <span
        className="flex items-center gap-1.5 [.is-b_&]:flex-row-reverse"
        data-testid="event-card"
      >
        <MatchIcon kind={cardIcon(e.color)} />
        <Name
          side={e.side}
          p={e.player}
          onPlayer={onPlayer}
          className="min-w-0 break-words text-white"
        />
      </span>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-0.5" data-testid="event-sub">
      <span
        className="flex items-center gap-1.5 [.is-b_&]:flex-row-reverse"
        data-testid="sub-out"
      >
        <MatchIcon kind="off" />
        <Name
          side={e.side}
          p={e.out}
          onPlayer={onPlayer}
          className="min-w-0 break-words text-[#CBD5E1]"
        />
      </span>
      <span
        className="flex items-center gap-1.5 [.is-b_&]:flex-row-reverse"
        data-testid="sub-in"
      >
        <MatchIcon kind="on" />
        <Name
          side={e.side}
          p={e.in}
          onPlayer={onPlayer}
          className="min-w-0 break-words font-semibold text-white"
        />
      </span>
    </div>
  );
}

const typeLabel = (e: MatchEvent) =>
  e.type === 'goal'
    ? ICON_LABEL[goalIcon(e.kind)]
    : e.type === 'card'
      ? ICON_LABEL[cardIcon(e.color)]
      : 'Substituição';

export default function Timeline({
  detail,
  onPlayer,
}: {
  detail: MatchDetail;
  onPlayer?: OnPlayer;
}) {
  const events = timeline(detail.events);
  if (events.length === 0) {
    return (
      <p className="text-sm text-[#94A3B8]" data-testid="timeline-empty">
        Nenhum gol, cartão ou substituição registrado.
      </p>
    );
  }
  return (
    <ol className="flex flex-col gap-2" data-testid="timeline">
      {events.map((e, i) => (
        <li
          key={i}
          data-testid="event"
          data-type={e.type}
          data-side={e.side}
          data-minute={e.minute}
          aria-label={`${e.minute}' ${typeLabel(e)}`}
          className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 rounded-lg border border-[#1E293B] px-3 py-2 text-sm"
        >
          <div
            className={`flex min-w-0 justify-end text-right ${e.side === 'A' ? '' : 'invisible'}`}
          >
            {e.side === 'A' && <Body e={e} onPlayer={onPlayer} />}
          </div>
          <span className="min-w-[3rem] rounded-full bg-[#0F172A] px-2 py-0.5 text-center text-xs font-bold text-[#D4AF37]">
            {e.minute}&apos;
          </span>
          <div
            className={`is-b flex min-w-0 justify-start text-left ${e.side === 'B' ? '' : 'invisible'}`}
          >
            {e.side === 'B' && <Body e={e} onPlayer={onPlayer} />}
          </div>
        </li>
      ))}
    </ol>
  );
}
