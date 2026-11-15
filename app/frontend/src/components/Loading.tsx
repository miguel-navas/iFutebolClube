interface Props {
  /** Texto ao lado do indicador. */
  label?: string;
  testId?: string;
  /** Ocupa a tela inteira, centralizado (carga da página); senão, só um bloco no fluxo. */
  fullScreen?: boolean;
  className?: string;
}

/** Indicador de carregando animado, usado em todas as páginas e modais enquanto os dados chegam. */
export default function Loading({ label = 'Carregando…', testId = 'loading', fullScreen = false, className = '' }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={testId}
      className={`flex flex-col items-center justify-center gap-3 text-sm text-[#94A3B8] ${
        fullScreen ? 'min-h-screen px-4' : 'py-10'
      } ${className}`}
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1E293B] border-t-[#D4AF37] motion-reduce:animate-none" />
      <span>{label}</span>
    </div>
  );
}
