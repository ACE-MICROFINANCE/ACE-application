import clsx from 'clsx';

type AceReadOnlyRowProps = {
  label: string;
  value?: string | null;
  helperText?: string;
  className?: string;
};

export const AceReadOnlyRow = ({
  label,
  value,
  helperText,
  className,
}: AceReadOnlyRowProps) => {
  return (
    <div className={clsx('space-y-2', className)}>
      <p className="text-xs font-medium text-[#6C757D]">{label}</p>
      <div className="rounded-2xl border border-black/5 bg-[#F8F9FA] px-4 py-3 text-base font-semibold text-[#111]">
        {value ?? '—'}
      </div>
      {helperText ? <p className="text-xs text-[#6C757D]">{helperText}</p> : null}
    </div>
  );
};
