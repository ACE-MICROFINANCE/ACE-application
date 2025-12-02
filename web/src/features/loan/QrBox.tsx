'use client';

import { forwardRef } from 'react';
import QRCode from 'react-qr-code';
import clsx from 'clsx';

type QrBoxProps = {
  value: string;
  className?: string;
};

/**
 * Hiển thị mã QR, forward ref để có thể export PNG.
 */
export const QrBox = forwardRef<SVGSVGElement, QrBoxProps>(({ value, className }, ref) => {
  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <QRCode value={value} ref={ref as any} size={192} />
    </div>
  );
});

QrBox.displayName = 'QrBox';
