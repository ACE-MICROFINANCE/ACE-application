'use client';

import clsx from 'clsx';
import { forwardRef, type InputHTMLAttributes } from 'react';

type AceInputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export const AceInput = forwardRef<HTMLInputElement, AceInputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          'w-full border border-[#c7d5e8] rounded-lg px-3 py-2.5 text-sm outline-none transition focus:border-[#2b6cb0] focus:ring-2 focus:ring-[#2b6cb0]/20 bg-white placeholder:text-[#777]',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-200',
          className,
        )}
        {...props}
      />
    );
  },
);

AceInput.displayName = 'AceInput';
