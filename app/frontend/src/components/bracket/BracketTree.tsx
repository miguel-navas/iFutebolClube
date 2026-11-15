import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { useEdition, useEditionPath } from '@/contexts/EditionContext';
import type { BracketMatch } from '@/data/worldCupData';
import { winnerCode, type Slot, type TreeLayout } from './layout';

const CARD_H = 86; // altura reservada por jogo na primeira fase
const STAGE_CARD_H = 78; // celular: cards mais juntos na vertical
const FINAL_BLOCK_H = 270; // final + disputa do 3º lugar
// Recorte vertical suave (sem cortar os conectores laterais) e deslize dos cards.
const CLIP = '[overflow-y:clip] [overflow-x:visible] transition-[height] duration-300 ease-out motion-reduce:transition-none';
const SLIDE =
  'translate-y-[calc(var(--shift)*-1)] transition-transform duration-300 ease-out motion-reduce:transition-none';

function TreeCard({ match }: { match: Slot }) {
  const { data } = useEdition();
  const path = useEditionPath();
  const nameOf = (code: string | null) =>
    code
      ? (data.teams.find((t) => t.code === code)?.name ?? code)
      : 'A definir';

  if (!match) {
    return (
      <div
        className="w-full rounded-lg border border-dashed border-[#1E293B] bg-[#0A0F1C]/40 px-2 py-1.5"
        data-testid="bracket-slot-empty"
        aria-hidden
      >
        <div className="h-3.5 w-3/4 rounded bg-[#1E293B]/60" />
        <div className="mt-1.5 h-3.5 w-2/3 rounded bg-[#1E293B]/60" />
      </div>
    );
  }

  const winner = winnerCode(match);
  const hasPens = match.penaltiesA != null && match.penaltiesB != null;
  const row = (side: 'A' | 'B') => {
    const code = side === 'A' ? match.teamA : match.teamB;
    const score = side === 'A' ? match.scoreA : match.scoreB;
    const pens = side === 'A' ? match.penaltiesA : match.penaltiesB;
    const wins = winner !== null && winner === code;
    const lost = winner !== null && !wins;
    return (
      <div
        className={`flex items-center justify-between gap-1 rounded px-1.5 py-1 ${
          wins ? 'bg-[#D4AF37]/10' : ''
        }`}
        data-testid="bracket-team"
        data-winner={wins ? 'true' : undefined}
      >
        <span
          className={`flex min-w-0 items-center gap-1.5 text-[11px] ${
            wins ? 'font-extrabold text-white' : 'font-semibold text-[#CBD5E1]'
          } ${lost ? 'opacity-50' : ''}`}
        >
          <span className="rounded bg-[#0A0F1C] px-1 text-[9px] font-bold text-[#94A3B8]">
            {code ?? '—'}
          </span>
          <span className="truncate">{nameOf(code)}</span>
        </span>
        <span
          className={`text-[11px] font-bold ${wins ? 'text-[#D4AF37]' : 'text-[#94A3B8]'}`}
        >
          {score ?? '-'}
          {hasPens && pens != null && (
            <span className="ml-0.5 text-[9px] font-normal">({pens})</span>
          )}
        </span>
      </div>
    );
  };

  const date = new Date(match.date + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
  const body = (
    <div className="w-full rounded-lg border border-[#1E293B] bg-[#131A2E] px-1.5 py-1 transition-colors hover:border-[#D4AF37]/50">
      <div className="px-1 text-[9px] text-[#94A3B8]">{date}</div>
      {row('A')}
      {row('B')}
    </div>
  );
  if (match.matchId === undefined) return body;
  return (
    <Link
      to={path('jogos', String(match.matchId))}
      data-testid="bracket-match"
      data-match-id={match.matchId}
      aria-label={`Abrir jogo ${nameOf(match.teamA)} x ${nameOf(match.teamB)}`}
      className="block w-full rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
    >
      {body}
    </Link>
  );
}

interface Stage {
  rank: number;
  label: string;
  slots: Slot[];
}

/** Uma etapa por coluna: todos os jogos da fase, na ordem da chave (cada dupla alimenta um jogo da fase seguinte). */
function StageColumn({
  stage,
  height,
}: {
  stage: Stage;
  height: number;
}) {
  const groups: Slot[][] = [];
  for (let i = 0; i < stage.slots.length; i += 2) groups.push(stage.slots.slice(i, i + 2));
  return (
    <section
      className="w-[90%] shrink-0 snap-start"
      data-testid="bracket-column"
      data-round={stage.label}
      data-rank={stage.rank}
      aria-label={stage.label}
    >
      <h3 className="mb-3 flex h-8 items-center justify-center text-center text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
        {stage.label}
      </h3>
      <div className={CLIP} style={{ height: 'var(--vis)' }}>
      <div
        className={`${SLIDE} flex h-[var(--h)] flex-col`}
        style={{ ['--h' as string]: `${height}px` }}
        data-testid="bracket-cards"
      >
        {groups.map((g, gi) => (
          <div
            key={gi}
            className="relative flex flex-1 flex-col justify-around"
          >
            {g.map((m, i) => (
              <TreeCard key={m?.id ?? `e${gi}-${i}`} match={m} />
            ))}
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}

function BracketStages({ layout }: { layout: TreeLayout }) {
  const { columns, final, third } = layout;
  const stages: Stage[] = columns.map((c) => ({
    rank: c.rank,
    label: c.label,
    slots: [...c.left, ...c.right],
  }));
  const perFirst = stages[0]?.slots.length ?? 2;
  const height = Math.max((perFirst / 2) * 2 * STAGE_CARD_H, 2 * STAGE_CARD_H);
  const total = stages.length + 1; // + a final

  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [edge, setEdge] = useState({ start: true, end: false });

  const columnsOf = () =>
    [...(ref.current?.querySelectorAll<HTMLElement>('[data-testid=bracket-column]') ?? [])];

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const cols = columnsOf();
    const x = el.scrollLeft;
    const idx = Math.max(0, cols.findIndex((c) => c.offsetLeft + c.offsetWidth > x + 8));
    setActive(idx);
    setEdge({ start: x <= 1, end: x + el.clientWidth >= el.scrollWidth - 1 });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update, total]);

  function goTo(i: number) {
    const el = ref.current;
    const cols = columnsOf();
    const c = cols[Math.min(Math.max(i, 0), cols.length - 1)];
    if (!el || !c) return;
    el.scrollTo({ left: c.offsetLeft, behavior: 'smooth' });
  }

  const labels = [...stages.map((s) => s.label), final?.round ?? 'Final'];
  const shown = edge.end ? labels.length - 1 : active;
  // Todas as etapas usam o mesmo espaçamento da primeira; a área ajusta a altura à etapa ativa.
  const heightOf = (i: number) =>
    i >= stages.length ? FINAL_BLOCK_H : Math.max(stages[i].slots.length, 2) * STAGE_CARD_H;
  const shift = 0;
  const vis = heightOf(shown);

  const arrow =
    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#1E293B] bg-[#131A2E] text-white transition-colors enabled:hover:border-[#D4AF37]/50 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white';

  return (
    <div data-testid="bracket-stages">
      <div
        className="sticky top-[65px] z-20 -mx-3 mb-4 flex items-center gap-3 border-b border-[#1E293B] bg-[#0A0F1C]/95 px-3 py-2 backdrop-blur-md sm:-mx-6 sm:px-6"
        data-testid="bracket-nav"
      >
        <button
          type="button"
          data-testid="bracket-prev"
          aria-label="Etapa anterior"
          disabled={edge.start}
          onClick={() => goTo(shown - 1)}
          className={arrow}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1 text-center" aria-live="polite">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
            Etapa {shown + 1} de {total}
          </p>
          <p className="truncate text-base font-bold text-white" data-testid="bracket-current">
            {labels[shown]}
          </p>
          <div className="mt-1.5 flex justify-center gap-1.5" aria-hidden>
            {labels.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === shown ? 'w-5 bg-[#D4AF37]' : 'w-1.5 bg-[#334155]'}`}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          data-testid="bracket-next"
          aria-label="Próxima etapa"
          disabled={edge.end}
          onClick={() => goTo(shown + 1)}
          className={arrow}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div
        ref={ref}
        onScroll={update}
        data-testid="bracket-tree"
        data-height={Math.round(vis)}
        style={{ ['--shift' as string]: `${shift}px`, ['--vis' as string]: `${vis}px` }}
        className="relative flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4"
      >
        {stages.map((st, i) => (
          <StageColumn
            key={st.rank}
            stage={st}
            height={Math.max(st.slots.length, 2) * STAGE_CARD_H}
          />
        ))}

        <section
          className="w-[90%] shrink-0 snap-start"
          data-testid="bracket-column"
          data-round={final?.round ?? 'Final'}
          data-rank={6}
          aria-label={final?.round ?? 'Final'}
        >
          <h3 className="mb-3 flex h-8 items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">
            <Trophy className="h-4 w-4" />
            {final?.round ?? 'Final'}
          </h3>
          <div className={CLIP} style={{ height: 'var(--vis)' }}>
            <div
              className={`${SLIDE} flex h-[var(--h)] flex-col items-stretch justify-center gap-10`}
              style={{ ['--h' as string]: `${FINAL_BLOCK_H}px` }}
            >
              <div data-testid="bracket-final">
                <TreeCard match={final} />
              </div>
              <div data-testid="bracket-third">
                <div className="mb-1 text-center text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  Disputa do 3º lugar
                </div>
                <TreeCard match={third} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/** Um lado da chave: dois jogos por grupo, ligados ao jogo da fase seguinte. */
function Column({
  slots,
  side,
  rank,
  label,
  height,
  isLast,
}: {
  slots: Slot[];
  side: 'left' | 'right';
  rank: number;
  label: string;
  height: number;
  isLast: boolean;
}) {
  const groups: Slot[][] = [];
  for (let i = 0; i < slots.length; i += 2) groups.push(slots.slice(i, i + 2));
  const toCenter = side === 'left' ? 'right' : 'left';
  const border = toCenter === 'right' ? 'border-r' : 'border-l';
  const edge = toCenter === 'right' ? '-right-3' : '-left-3';
  const stub = toCenter === 'right' ? '-right-6' : '-left-6';
  return (
    <div
      className="flex min-w-[148px] flex-1 basis-0 flex-col px-3"
      data-testid="bracket-column"
      data-round={label}
      data-rank={rank}
      data-side={side}
    >
      <h3 className="mb-3 h-8 text-center text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
        {label}
      </h3>
      <div className="flex flex-col" style={{ height }}>
        {groups.map((g, gi) => (
          <div
            key={gi}
            className="relative flex flex-1 flex-col justify-around"
          >
            {g.map((m, i) => (
              <TreeCard key={m?.id ?? `e${gi}-${i}`} match={m} />
            ))}
            {g.length === 2 && (
              <>
                <span
                  className={`pointer-events-none absolute top-1/4 bottom-1/4 w-3 border-y border-[#334155] ${border} ${edge}`}
                />
                <span
                  className={`pointer-events-none absolute top-1/2 w-3 border-t border-[#334155] ${stub}`}
                />
              </>
            )}
            {g.length === 1 && !isLast && (
              <span
                className={`pointer-events-none absolute top-1/2 w-3 border-t border-[#334155] ${edge}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Chave espelhada para telas largas: duas metades, com a final no centro. */
function BracketMirrored({ layout }: { layout: TreeLayout }) {
  const { columns, final, third } = layout;
  const perHalf = columns[0]?.left.length ?? 1;
  const height = Math.max(perHalf * CARD_H, 2 * CARD_H);
  const last = columns.length - 1;
  return (
    <div className="overflow-x-auto pb-4" data-testid="bracket-tree">
      <div
        className="flex w-full items-start"
        style={{ minWidth: columns.length * 2 * 148 + 180 }}
      >
        {columns.map((c, i) => (
          <Column
            key={`l${c.rank}`}
            slots={c.left}
            side="left"
            rank={c.rank}
            label={c.label}
            height={height}
            isLast={i === last}
          />
        ))}

        <div
          className="flex min-w-[180px] flex-[1.3] basis-0 flex-col px-3"
          data-testid="bracket-center"
        >
          <h3 className="mb-3 flex h-8 items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
            <Trophy className="h-4 w-4" />
            {final?.round ?? 'Final'}
          </h3>
          <div
            className="flex flex-col items-stretch justify-center gap-10"
            style={{ height }}
          >
            <div data-testid="bracket-final">
              <TreeCard match={final} />
            </div>
            <div data-testid="bracket-third">
              <div className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                Disputa do 3º lugar
              </div>
              <TreeCard match={third} />
            </div>
          </div>
        </div>

        {[...columns].reverse().map((c, i) => (
          <Column
            key={`r${c.rank}`}
            slots={c.right}
            side="right"
            rank={c.rank}
            label={c.label}
            height={height}
            isLast={i === 0}
          />
        ))}
      </div>
    </div>
  );
}

/** Telas a partir de 768 px mostram a chave espelhada; no celular, as etapas em colunas com setas. */
function useWideScreen(): boolean {
  const query = '(min-width: 768px)';
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const on = () => setWide(mql.matches);
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, []);
  return wide;
}

export default function BracketTree({ layout }: { layout: TreeLayout }) {
  const wide = useWideScreen();
  return wide ? <BracketMirrored layout={layout} /> : <BracketStages layout={layout} />;
}

export type { BracketMatch };
