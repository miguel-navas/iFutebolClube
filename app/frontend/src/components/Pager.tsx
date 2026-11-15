import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number; // 0-based, já limitada ao total
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  /** prefixo dos data-testid: `<prefixo>-pager`, `-range`, `-prev`, `-next`, `-page` */
  testId: string;
}

/** Paginação: Anterior, 1 … 4 5 [6] 7 8 … 20, Próxima. Não aparece com uma página só. */
export default function Pager({ page, total, pageSize, onPage, testId }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const start = page * pageSize;
  const end = Math.min(total, start + pageSize);
  const numbers = [
    ...new Set([0, pages - 1, ...[-2, -1, 0, 1, 2].map((d) => page + d)]),
  ]
    .filter((n) => n >= 0 && n < pages)
    .sort((a, b) => a - b);

  return (
    <nav
      data-testid={`${testId}-pager`}
      aria-label="Paginação"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#94A3B8]"
    >
      <span data-testid={`${testId}-range`}>
        {start + 1}–{end} de {total}
      </span>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          data-testid={`${testId}-prev`}
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          className="flex items-center gap-1 rounded-md border border-[#1E293B] bg-[#131A2E] px-3 py-1.5 hover:text-white disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>
        {numbers.map((n, k) => (
          <span key={n} className="flex items-center gap-1">
            {k > 0 && n - numbers[k - 1] > 1 && <span>…</span>}
            <button
              type="button"
              data-testid={`${testId}-page`}
              aria-current={n === page ? 'page' : undefined}
              onClick={() => onPage(n)}
              className={`min-w-9 rounded-md border px-2 py-1.5 ${
                n === page
                  ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                  : 'border-[#1E293B] bg-[#131A2E] hover:text-white'
              }`}
            >
              {n + 1}
            </button>
          </span>
        ))}
        <button
          type="button"
          data-testid={`${testId}-next`}
          disabled={page >= pages - 1}
          onClick={() => onPage(page + 1)}
          className="flex items-center gap-1 rounded-md border border-[#1E293B] bg-[#131A2E] px-3 py-1.5 hover:text-white disabled:opacity-40"
        >
          Próxima <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
