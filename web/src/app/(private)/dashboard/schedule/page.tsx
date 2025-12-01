'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AceCard } from '@/share/ui/AceCard';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';

export default function SchedulePage() {
  const { isAuthenticated, isInitializing, mustChangePassword } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace(routes.login);
    } else if (mustChangePassword) {
      router.replace(routes.changePassword);
    }
  }, [isAuthenticated, isInitializing, mustChangePassword, router]);

  return (
    <div className="min-h-screen px-4 pb-28 pt-8">
      <div className="mx-auto flex w-full max-w-md flex-col space-y-4">
        <AceCard className="space-y-2 text-center">
          <h1 className="text-xl font-semibold text-[#333]">Lịch</h1>
          <p className="text-sm text-[#666]">Tính năng này đang được phát triển.</p>
        </AceCard>
      </div>
    </div>
  );
}
