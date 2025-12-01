import type { PropsWithChildren } from 'react';
import clsx from 'clsx';

type CenteredAuthLayoutProps = PropsWithChildren<{
  className?: string;
}>;

export const CenteredAuthLayout = ({ children, className }: CenteredAuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-[#e7f3ff] flex items-center justify-center px-4 py-8">
      <div className={clsx('w-full flex justify-center', className)}>{children}</div>
    </div>
  );
};
