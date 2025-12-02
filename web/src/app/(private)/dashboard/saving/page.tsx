'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AceCard } from '@/share/ui/AceCard';
import { AceButton } from '@/share/ui/AceButton';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';
import { appApi, type SavingsItem } from '@/services/appApi';
import { formatCurrencyVND, formatDate } from '@/lib/format';

/**
 * Trang "Sổ tiết kiệm" – hiển thị sổ bắt buộc và tự nguyện.
 */
export default function SavingPage() {
  const { isAuthenticated, isInitializing, mustChangePassword } = useAuth();
  const router = useRouter();
  const [savings, setSavings] = useState<SavingsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSavings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await appApi.getSavings();
      setSavings(data);
    } catch (err) {
      setError('Không lấy được thông tin tiết kiệm. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace(routes.login);
    } else if (mustChangePassword) {
      router.replace(routes.changePassword);
    } else {
      fetchSavings();
    }
  }, [isAuthenticated, isInitializing, mustChangePassword, router]);

  const safeSavings = Array.isArray(savings) ? savings : [];
  const compulsory = useMemo(
    () => safeSavings.find((item) => item.type === 'COMPULSORY'),
    [safeSavings],
  );
  const voluntary = useMemo(
    () => safeSavings.find((item) => item.type === 'VOLUNTARY'),
    [safeSavings],
  );

  const renderCard = (item: SavingsItem, label: string, tone: 'red' | 'green') => {
    const baseColor = tone === 'red' ? 'bg-red-100' : 'bg-[#8fdba9]';
    return (
      <div className={`w-full rounded-2xl shadow-md p-5 ${baseColor}`}>
        <div className="flex items-start justify-between text-sm text-[#333]">
          <p className="font-semibold text-base">{label}</p>
          <p className="text-sm">Ngày: {formatDate(item.lastDepositDate)}</p>
        </div>
        <div className="mt-3 space-y-2 text-sm text-[#333]">
          <div className="flex justify-between">
            <span className="text-[#444]">Số tiền gốc</span>
            <span className="font-semibold">{formatCurrencyVND(item.principalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#444]">Số dư hiện tại</span>
            <span className="font-semibold">{formatCurrencyVND(item.currentBalance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#444]">Lãi tích luỹ</span>
            <span className="font-semibold">{formatCurrencyVND(item.interestAccrued)}</span>
          </div>
          {item.type === 'VOLUNTARY' ? (
            <div className="flex justify-between">
              <span className="text-[#444]">Giao dịch gần nhất</span>
              <span className="font-semibold">{formatCurrencyVND(item.lastDepositAmount ?? 0)}</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return <p className="text-center text-sm text-[#666]">Đang tải thông tin tiết kiệm...</p>;
    }

    if (error) {
      return (
        <div className="space-y-2 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <AceButton onClick={fetchSavings}>Thử lại</AceButton>
        </div>
      );
    }

    if (!compulsory && !voluntary) {
      return <p className="text-center text-sm text-[#666]">Chưa có sổ tiết kiệm.</p>;
    }

    return (
      <div className="space-y-4">
        {compulsory ? renderCard(compulsory, 'Tiết kiệm bắt buộc', 'red') : null}
        {voluntary ? renderCard(voluntary, 'Tiết kiệm tự nguyện', 'green') : null}
      </div>
    );
  };

  return (
    <div className="min-h-screen px-4 pb-28 pt-8">
      <div className="mx-auto flex w-full max-w-md flex-col space-y-4">
        <AceCard className="text-center !bg-[#f9c6e6] text-[#333]">
          <h1 className="text-xl font-semibold">Sổ tiết kiệm</h1>
        </AceCard>
        {renderContent()}
      </div>
    </div>
  );
}
