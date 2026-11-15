import NativeSelect from '@/components/NativeSelect';

interface Option {
  value: string;
  label: string;
}

/** Filtro em lista para o celular (< 768 px): um único campo de 44 px no lugar de dezenas de botões. */
export default function FilterSelect({
  label,
  value,
  options,
  onChange,
  testId,
  className = '',
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  testId?: string;
  className?: string;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">{label}</span>
      <NativeSelect
        data-testid={testId}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}
