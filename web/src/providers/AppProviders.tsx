'use client';

import type { PropsWithChildren } from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { useUnzoomOnRouteChange } from '@/share/ui/keyboard/useUnzoomOnRouteChange';

export const AppProviders = ({ children }: PropsWithChildren) => {
  useUnzoomOnRouteChange();
  return <AuthProvider>{children}</AuthProvider>;
};
