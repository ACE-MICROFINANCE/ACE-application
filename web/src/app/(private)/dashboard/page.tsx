'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AceCard } from '@/share/ui/AceCard';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';
import { DashboardRemindersCard } from '@/features/dashboard/DashboardRemindersCard';
import { WeatherCard } from '@/features/dashboard/WeatherCard';

const DashboardContent = () => {
  const { customer, isAuthenticated, isInitializing, mustChangePassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showAccount = searchParams.get('tab') === 'account';

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace(routes.login);
    } else if (mustChangePassword) {
      router.replace(routes.changePassword);
    }
  }, [isAuthenticated, isInitializing, mustChangePassword, router]);

  if (showAccount) {
    return (
      <div className="min-h-screen px-4 pb-28 pt-8">
        <div className="mx-auto flex w-full max-w-md flex-col space-y-4">
          <AceCard className="space-y-1">
            <h2 className="text-lg font-semibold text-[#333]">Thong tin tai khoan</h2>
            <div className="text-sm text-[#555] space-y-1">
              <p>
                <span className="font-medium">Ho ten:</span> {customer?.fullName ?? 'Nguyen Van A'}
              </p>
              <p>
                <span className="font-medium">Ma KH:</span> {customer?.customerId ?? 'xxxxxxxxxx'}
              </p>
              <p>
                <span className="font-medium">So dien thoai:</span> {(customer as any)?.phone ?? 'xxxxxxxxx'}
              </p>
              <p>
                <span className="font-medium">Ngay bat dau:</span> 27/10/2025
              </p>
              <p>
                <span className="font-medium">Dia chi:</span> Dien Bien Phu
              </p>
            </div>
          </AceCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pb-28 pt-8">
      <div className="mx-auto flex w-full max-w-md flex-col space-y-4">
        <AceCard className="space-y-1">
          <h1 className="text-xl font-semibold text-[#333] text-center">Chao mung khach hang</h1>
          <p className="text-lg text-[#2b6cb0] font-semibold text-center">
            {customer?.fullName ?? 'Nguyen Van A'}
          </p>
        </AceCard>

        <WeatherCard />

        <DashboardRemindersCard />
      </div>
    </div>
  );
};

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
