'use client';

import { Card, type CardProps } from '@heroui/react';
import clsx from 'clsx';
import type { PropsWithChildren } from 'react';

type AceCardProps = PropsWithChildren<{
  className?: string;
}> &
  CardProps;

export const AceCard = ({ children, className, ...props }: AceCardProps) => {
  return (
    <Card
      {...props}
      className={clsx(
        'w-full bg-white rounded-2xl shadow-lg p-6 md:p-7',
        className,
      )}
      radius="lg"
    >
      {children}
    </Card>
  );
};
