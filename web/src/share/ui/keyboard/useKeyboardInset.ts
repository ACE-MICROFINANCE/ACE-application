'use client';

import { useEffect, useState } from 'react';

export const useKeyboardInset = () => {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const next = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setInset(next);
      document.documentElement.style.setProperty('--ace-kb-inset', `${next}px`);
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);

    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return inset;
};
