import { flagUrl } from '@/lib/flags';

/** Bandeira da seleção em imagem (o emoji de bandeira não aparece no Windows). */
export default function Flag({
  code,
  name,
  className = 'h-8',
}: {
  code: string;
  name?: string;
  className?: string;
}) {
  const url = flagUrl(code);
  if (!url) {
    return (
      <span
        data-testid="flag-missing"
        className={`inline-flex aspect-[4/3] items-center justify-center rounded-[3px] bg-[#1E293B] text-[10px] font-bold text-[#94A3B8] ${className}`}
      >
        {code}
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={name ? `Bandeira: ${name}` : `Bandeira ${code}`}
      data-testid="flag"
      loading="lazy"
      className={`inline-block aspect-[4/3] rounded-[3px] object-cover shadow-sm ring-1 ring-white/10 ${className}`}
    />
  );
}
