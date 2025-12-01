import type { PropsWithChildren } from 'react';
import clsx from 'clsx';

type FormErrorTextProps = PropsWithChildren<{
  className?: string;
}>;

export const FormErrorText = ({ children, className }: FormErrorTextProps) => {
  if (!children) return null;
  return <p className={clsx('text-xs text-red-500 mt-1', className)}>{children}</p>;
};
