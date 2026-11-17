import { Info } from 'lucide-react';
import { useEdition } from '@/contexts/EditionContext';
import { copaNotes } from '@/data/editionNotes';
import type { SectionKey } from '@/data/registry';

/** Caixa de observações da edição para a tela atual (formato da época e limites dos dados). */
export default function EditionNotes({ section }: { section: SectionKey }) {
  const edition = useEdition();
  if (edition.competition !== 'copa') return null;
  const notes = copaNotes(
    Number(edition.year),
    section,
    edition.data.teams.map((t) => t.code),
  );
  if (notes.length === 0) return null;
  return (
    <aside
      className="mb-6 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/5 p-4"
      data-testid="edition-notes"
      aria-label="Observações desta edição"
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#D4AF37]">
        <Info className="h-4 w-4" />
        Sobre esta edição
      </div>
      <ul className="flex flex-col gap-1.5 text-sm text-[#CBD5E1]">
        {notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </aside>
  );
}
