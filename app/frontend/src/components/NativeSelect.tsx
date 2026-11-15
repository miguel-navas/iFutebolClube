import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  /** `md`: 44 px, para filtros; `sm`: compacto, para a barra de cima. */
  size?: 'md' | 'sm';
  /** Classes do contêiner (largura, margens). */
  wrapperClassName?: string;
};

/** Combo fechado padrão do site: seta própria, cantos arredondados e a mesma cara em todas as telas. */
export default function NativeSelect({
  size = 'md',
  wrapperClassName = '',
  className = '',
  children,
  ...rest
}: Props) {
  const sizing =
    size === 'sm'
      ? 'h-8 rounded-lg pl-2.5 pr-7 text-xs'
      : 'h-11 rounded-xl pl-3.5 pr-10 text-sm';
  return (
    <div className={`relative min-w-0 ${wrapperClassName}`}>
      <select
        {...rest}
        className={`peer w-full min-w-0 cursor-pointer appearance-none truncate border border-[#1E293B] bg-[#131A2E] font-medium text-white shadow-sm transition-colors hover:border-[#334155] focus:border-[#D4AF37] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/30 disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${className}`}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[#94A3B8] transition-colors peer-focus:text-[#D4AF37] ${
          size === 'sm' ? 'right-2 h-3.5 w-3.5' : 'right-3.5 h-4 w-4'
        }`}
      />
    </div>
  );
}
