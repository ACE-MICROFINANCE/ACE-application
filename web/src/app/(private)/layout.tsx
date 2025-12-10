'use client';

import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { BottomNav } from '@/share/layout/BottomNav';

export default function PrivateLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#e7f3ff] flex flex-col items-center">
      <div className="w-full max-w-md flex-1">{children}</div>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
