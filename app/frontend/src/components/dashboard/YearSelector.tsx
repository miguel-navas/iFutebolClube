import { Card } from '@/components/ui/card';

interface Props {
  years: number[]; // do mais recente ao mais antigo
  selected: number;
  onSelect: (year: number) => void;
}

export default function YearSelector({ years, selected, onSelect }: Props) {
  return (
    <Card
      className="border-[#1E293B] bg-[#131A2E] p-4"
      data-testid="year-selector"
    >
      <h3 className="text-sm font-semibold text-white" id="year-selector-title">
        Copas anteriores
      </h3>
      <div
        role="group"
        aria-labelledby="year-selector-title"
        className="mt-3 flex flex-wrap gap-2"
      >
        {years.map((year) => {
          const current = year === selected;
          return (
            <button
              key={year}
              type="button"
              onClick={() => onSelect(year)}
              aria-pressed={current}
              data-testid={`year-${year}`}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
                current
                  ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                  : 'border-[#1E293B] text-[#94A3B8] hover:border-[#D4AF37]/40 hover:text-white'
              }`}
            >
              {year}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
