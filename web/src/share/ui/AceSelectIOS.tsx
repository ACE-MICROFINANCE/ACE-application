import clsx from 'clsx';
import type { FocusEventHandler } from 'react'; // CHANGED: supports focus handler
import { Select, SelectItem } from '@heroui/react'; // CHANGED: use HeroUI Select for iOS style
// import { ChevronDown } from 'lucide-react';

type AceSelectOption = {
  label: string;
  value: string;
};

type AceSelectIOSProps = {
  label: string;
  value?: string;
  options: AceSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string | null;
  onFocus?: FocusEventHandler; // CHANGED: supports scrollIntoView
};

export const AceSelectIOS = ({
  label,
  value,
  options,
  onChange,
  placeholder = 'Chọn',
  disabled,
  error,
  onFocus,
}: AceSelectIOSProps) => {
  const selectedKeys = value ? new Set([value]) : new Set([]);

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-[#6C757D]">{label}</label>

      {/* TODO: replaced by ACE Farmer implementation */}
      {/*
      <div
        className={clsx(
          'relative rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm',
          disabled && 'opacity-60',
        )}
      >
        <select
          className="w-full appearance-none bg-transparent text-base text-[#111] focus:outline-none"
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          onFocus={onFocus} // CHANGED: support focus handler
        >
          <option value="" disabled hidden>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
      </div>
      */}

      <Select
        selectedKeys={selectedKeys}
        onSelectionChange={(keys) => {
          if (keys === 'all') return;
          const key = Array.from(keys)[0];
          if (key) onChange(String(key));
        }}
        placeholder={placeholder}
        isDisabled={disabled}
        onFocus={onFocus}
        selectorIcon={<span aria-hidden="true" />}
        classNames={{
          trigger: clsx(
            'rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm min-h-[52px]',
            disabled && 'opacity-60',
          ),
          value: 'text-[16px] text-[#111]',
          selectorIcon: 'hidden', // CHANGED: hide default selector icon
          popoverContent:
            'rounded-3xl border border-black/5 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] overflow-hidden',
          listbox: 'p-2',
        }}
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            textValue={option.label}
            classNames={{
              base:
                'rounded-2xl px-3 py-3 text-[15px] text-[#111] data-[hover=true]:bg-black/5 data-[selected=true]:bg-[#0A84FF]/10 data-[selected=true]:text-[#0A84FF] data-[selected=true]:font-semibold',
            }}
          >
            {option.label}
          </SelectItem>
        ))}
      </Select>

      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
};
