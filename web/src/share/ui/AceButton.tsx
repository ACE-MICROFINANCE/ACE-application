'use client';

import { Button, type ButtonProps } from '@heroui/react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

type AceButtonProps = ButtonProps & {
  className?: string;
};

export const AceButton = ({ className, children, ...props }: AceButtonProps) => {
  return (
    <Button
      as={motion.button}
      whileTap={{ scale: 0.97 }}
      {...props}
      className={clsx(
        'w-full rounded-full bg-[#2b6cb0] hover:bg-[#245a93] text-white font-semibold py-2.5 text-sm shadow-sm disabled:opacity-70 disabled:cursor-not-allowed',
        className,
      )}
    >
      {children}
    </Button>
  );
};
