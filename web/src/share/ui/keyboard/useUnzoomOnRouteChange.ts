'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function useUnzoomOnRouteChange() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.activeElement as HTMLElement | null;
    el?.blur?.();

    requestAnimationFrame(() => {
      const el2 = document.activeElement as HTMLElement | null;
      el2?.blur?.();
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      }
    });
  }, [pathname]);
}
