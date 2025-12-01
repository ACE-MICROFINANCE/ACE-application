'use client';

import type { PropsWithChildren } from 'react';
import { AuthProvider } from '@/hooks/useAuth';

export const AppProviders = ({ children }: PropsWithChildren) => {
  return <AuthProvider>{children}</AuthProvider>;
};
