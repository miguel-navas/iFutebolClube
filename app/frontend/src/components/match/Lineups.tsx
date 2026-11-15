import {
  markersByPlayer,
  type DetailPlayer,
  type MatchDetail,
  type PlayerMarkers,
  type Side,
} from '@/data/match/types';
import { cardIcon, goalIcon, MatchIcon } from './Icons';

function Marks({ m }: { m?: PlayerMarkers }) {
  if (!m) return null;
  return (
    <span className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-[11px] text-[#94A3B8]">
      {m.goals.map((g, i) => (
        <span
          key={`g${i}`}
          className="inline-flex items-center gap-0.5"
          data-testid="mark-goal"
        >
          <MatchIcon kind={goalIcon(g.kind)} className="h-3.5 w-3.5" />
          {g.minute}&apos;
        </span>
      ))}
      {m.cards.map((c, i) => (
        <span
          key={`c${i}`}
          className="inline-flex items-center gap-0.5"
          data-testid="mark-card"
        >
          <MatchIcon kind={cardIcon(c.color)} className="h-3.5 w-3.5" />
          {c.minute}&apos;
        </span>
      ))}
      {m.onMinute && (
        <span
          className="inline-flex items-center gap-0.5"
          data-testid="mark-on"
        >
          <MatchIcon kind="on" className="h-3.5 w-3.5" />
          {m.onMinute}&apos;
        </span>
      )}
      {m.offMinute && (
        <span
          className="inline-flex items-center gap-0.5"
          data-testid="mark-off"
        >
          <MatchIcon kind="off" className="h-3.5 w-3.5" />
          {m.offMinute}&apos;
        </span>
      )}
    </span>
  );
}

function Row({
  p,
  markers,
  onPlayer,
}: {
  p: DetailPlayer;
  markers?: PlayerMarkers;
  onPlayer?: (p: DetailPlayer) => void;
}) {
  return (
    <li
      className="flex items-center justify-between gap-2 border-b border-[#1E293B] py-1.5 text-sm last:border-0"
      data-testid="lineup-player"
      data-player-id={p.id}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="w-6 shrink-0 text-right text-xs font-bold text-[#D4AF37]">
          {p.number ?? ''}
        </span>
        <span className="min-w-0 break-words">
          <button
            type="button"
            data-testid="player-open"
            onClick={() => onPlayer?.(p)}
            className="text-left text-white hover:text-[#D4AF37] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            {p.name}
          </button>
          {p.captain && (
            <abbr
              title="Capitão"
              className="ml-1 text-xs font-bold text-[#D4AF37] no-underline"
              data-testid="captain"
            >
              (C)
            </abbr>
          )}
        </span>
      </span>
      <Marks m={markers} />
    </li>
  );
}

function Column({
  side,
  detail,
  teamName,
  markers,
  onPlayer,
}: {
  side: Side;
  detail: MatchDetail;
  teamName: string;
  markers: Map<number, PlayerMarkers>;
  onPlayer?: (side: Side, p: DetailPlayer) => void;
}) {
  const t = detail.teams[side];
  const starters = t.players.filter((p) => p.starter);
  const subs = t.players.filter((p) => !p.starter);
  return (
    <div className="min-w-0 flex-1" data-testid={`lineup-${side}`}>
      <h3 className="break-words text-base font-bold text-white">{teamName}</h3>
      <p className="mt-0.5 text-xs text-[#94A3B8]">
        {t.formation && (
          <span data-testid="formation">Formação {t.formation}</span>
        )}
        {t.formation && t.coach && ' · '}
        {t.coach && <span data-testid="coach">Técnico: {t.coach}</span>}
      </p>
      {t.players.length === 0 ? (
        <p className="mt-3 text-sm text-[#94A3B8]">Escalação não disponível.</p>
      ) : (
        <>
          <h4 className="mt-3 text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
            Titulares
          </h4>
          <ul>
            {starters.map((p) => (
              <Row
                key={p.id}
                p={p}
                markers={markers.get(p.id)}
                onPlayer={(pl) => onPlayer?.(side, pl)}
              />
            ))}
          </ul>
          {subs.length > 0 && (
            <>
              <h4 className="mt-3 text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                Reservas
              </h4>
              <ul>
                {subs.map((p) => (
                  <Row
                    key={p.id}
                    p={p}
                    markers={markers.get(p.id)}
                    onPlayer={(pl) => onPlayer?.(side, pl)}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function Lineups({
  detail,
  names,
  onPlayer,
}: {
  detail: MatchDetail;
  names: { A: string; B: string };
  onPlayer?: (side: Side, p: DetailPlayer) => void;
}) {
  const markers = markersByPlayer(detail.events);
  return (
    <div className="flex flex-col gap-6 sm:flex-row" data-testid="lineups">
      <Column
        side="A"
        detail={detail}
        teamName={names.A}
        markers={markers}
        onPlayer={onPlayer}
      />
      <Column
        side="B"
        detail={detail}
        teamName={names.B}
        markers={markers}
        onPlayer={onPlayer}
      />
    </div>
  );
}
