import { ICON_LABEL, MatchIcon, type IconKind } from './Icons';

const ORDER: IconKind[] = [
  'goal',
  'penalty',
  'own',
  'yellow',
  'red',
  'second-yellow',
  'off',
  'on',
];

export default function Legend() {
  return (
    <section
      className="mt-4 rounded-xl border border-[#1E293B] bg-[#131A2E] p-5"
      data-testid="match-legend"
    >
      <h2 className="text-sm font-semibold text-white">Legenda</h2>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ORDER.map((k) => (
          <li
            key={k}
            className="flex items-center gap-2 text-sm text-[#CBD5E1]"
            data-testid="legend-item"
          >
            <MatchIcon kind={k} className="h-5 w-5 shrink-0" />
            <span>{ICON_LABEL[k]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-[#94A3B8]">
        O número ao lado do ícone é o minuto do jogo em que aconteceu.
      </p>
    </section>
  );
}
