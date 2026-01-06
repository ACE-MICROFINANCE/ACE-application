'use client';

import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@heroui/react';
import clsx from 'clsx';

type AceMultiSelectOption = {
  label: string;
  value: string;
};

type AceMultiSelectIOSProps = {
  label?: string;
  placeholder?: string;
  options: AceMultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  maxSelected?: number;
  disabled?: boolean;
  error?: string;
  onFocus?: (event: any) => void;
};

export const AceMultiSelectIOS = ({
  label,
  placeholder = 'Tìm và thêm nhóm...',
  options,
  value,
  onChange,
  maxSelected,
  disabled,
  error,
  onFocus,
}: AceMultiSelectIOSProps) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedSet = useMemo(() => new Set(value), [value]);
  const isMaxReached = Boolean(maxSelected && value.length >= maxSelected);

  const filteredOptions = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return options.filter((option) => {
      if (selectedSet.has(option.value)) return false;
      if (!keyword) return true;
      return option.label.toLowerCase().includes(keyword);
    });
  }, [options, query, selectedSet]);

  const handleSelect = (optionValue: string) => {
    if (disabled || isMaxReached) return;
    if (selectedSet.has(optionValue)) return;
    const next = [...value, optionValue];
    onChange(next);
    setQuery('');
    if (maxSelected === 1) {
      setIsOpen(false);
    }
  };

  const handleRemove = (optionValue: string) => {
    onChange(value.filter((item) => item !== optionValue));
  };

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
  };

  return (
    <div className="space-y-2">
      {label ? (
        <label className="text-xs font-medium text-[#6C757D]">{label}</label>
      ) : null}

      <div
        className={clsx(
          'rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm',
          disabled && 'opacity-60',
        )}
      >
        <Popover
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          placement="bottom-start"
          offset={8}
          classNames={{ content: 'z-[9999]' }}
        >
          <PopoverTrigger>
            <div>
              <input
                value={query}
                placeholder={placeholder}
                onFocus={(event) => {
                  handleOpen();
                  onFocus?.(event);
                }}
                onClick={handleOpen}
                onChange={(event) => {
                  if (disabled || isMaxReached) return;
                  setQuery(event.target.value);
                  setIsOpen(true);
                }}
                readOnly={disabled}
                className="w-full bg-transparent text-base text-[#111] outline-none placeholder:text-[#9CA3AF]"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[min(92vw,360px)] rounded-3xl border border-black/5 bg-white p-2 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="max-h-64 overflow-y-auto">
              {filteredOptions.length ? (
                <div className="space-y-1">
                  {filteredOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className="w-full rounded-2xl px-3 py-3 text-left text-[15px] text-[#111] transition hover:bg-black/5"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-3 py-2 text-xs text-[#6C757D]">Không có nhóm phù hợp.</p>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {value.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {value.map((optionValue) => {
              const labelText =
                options.find((option) => option.value === optionValue)?.label ??
                optionValue;
              return (
                <span
                  key={optionValue}
                  className="flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 text-sm text-[#333]"
                >
                  <span className="truncate">{labelText}</span>
                  <button
                    type="button"
                    aria-label="Xóa nhóm"
                    onClick={() => handleRemove(optionValue)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-base text-[#555] hover:bg-black/10"
                  >
                    &times;
                  </button>
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
};
