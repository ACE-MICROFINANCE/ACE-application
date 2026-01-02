'use client';

import { type KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion'; // CHANGED: thêm motion cho accordion
import { ChevronDownIcon } from '@heroicons/react/24/outline'; // CHANGED: icon gợi ý kéo xuống
import { ChevronsDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AceCard } from '@/share/ui/AceCard';
import { AceButton } from '@/share/ui/AceButton';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';
import { appApi, type SavingsItem } from '@/services/appApi';
import { formatCurrencyVND, formatDate } from '@/lib/format';

/**
 * Trang "Sổ tiết kiệm" hiển thị tổng số dư và lịch sử giao dịch tiết kiệm.
 */
export default function SavingPage() {
  const { isAuthenticated, isInitializing, mustChangePassword } = useAuth();
  const router = useRouter();
  const [savings, setSavings] = useState<SavingsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<'COMPULSORY' | 'VOLUNTARY' | null>(null); // CHANGED: accordion state

  const fetchSavings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await appApi.getSavings();
      setSavings(data);
    } catch {
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
      router.replace(`${routes.changePassword}?mode=force`);
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

  const toggleExpanded = (type: 'COMPULSORY' | 'VOLUNTARY') => {
    setExpanded((prev) => (prev === type ? null : type)); // CHANGED: accordion toggle
  };

  const handleKeyToggle = (
    event: KeyboardEvent<HTMLDivElement>,
    type: 'COMPULSORY' | 'VOLUNTARY',
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); // CHANGED: hỗ trợ Enter/Space
      toggleExpanded(type);
    }
  };

  const renderCompulsoryCard = (item: SavingsItem) => {
    const isExpanded = expanded === 'COMPULSORY'; // CHANGED: trạng thái mở/đóng
    return (
      <div
        className="w-full rounded-2xl shadow-md p-4 bg-red-100 cursor-pointer select-none" // CHANGED
        role="button" // CHANGED
        tabIndex={0} // CHANGED
        aria-expanded={isExpanded} // CHANGED
        onClick={() => toggleExpanded('COMPULSORY')} // CHANGED
        onKeyDown={(event) => handleKeyToggle(event, 'COMPULSORY')} // CHANGED
      >
        <div className="flex items-start justify-between">
          <p className="text-[18px] font-semibold text-[#333]">Tiết kiệm bắt buộc</p>
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-[15px] font-medium text-[#6C757D]">Tổng số dư</p> {/* CHANGED: chỉ hiển thị tổng số dư */}
          <p className="text-2xl font-bold text-[#333]">
            {formatCurrencyVND(item.currentBalance)}
          </p>
        </div>
        <div className="mt-3 flex justify-center">
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center justify-center text-[#0F5132]/70"
          aria-hidden="true"
        >
          <ChevronsDown className="h-4 w-4" />
          {/* <ChevronDownIcon className="-mt-1 h-4 w-4" /> chỉnh -mt-0.5 / -mt-1 / -mt-2 cho đúng khoảng cách */}
        </motion.div>
        </div>
      </div>
    );
  };

  const renderVoluntaryCard = (item: SavingsItem) => {
    const lastTxnDateText = item.lastTxnDate
      ? formatDate(item.lastTxnDate)
      : 'Chưa có giao dịch';
    const isExpanded = expanded === 'VOLUNTARY'; // CHANGED: trạng thái mở/đóng

    return (
      <div
        className="w-full rounded-2xl shadow-md p-4 bg-[#D8F1E3] cursor-pointer select-none" // CHANGED
        role="button" // CHANGED
        tabIndex={0} // CHANGED
        aria-expanded={isExpanded} // CHANGED
        onClick={() => toggleExpanded('VOLUNTARY')} // CHANGED
        onKeyDown={(event) => handleKeyToggle(event, 'VOLUNTARY')} // CHANGED
      >
        <div className="flex items-start justify-between">
          <p className="text-[18px] font-semibold text-[#0F5132]">Tiết kiệm tự nguyện</p>
        </div>

        <div className="mt-3 space-y-1">
          <p className="text-[15px] font-medium text-[#6C757D]">
            Tổng số dư{' '}
            <span className="text-xs italic font-normal text-[#6C757D]">
              (Giao dịch gần nhất: {lastTxnDateText})
            </span>
          </p> {/* CHANGED: hiển thị ngày giao dịch gần nhất */}
          <p className="text-2xl font-bold text-[#0F5132]">
            {formatCurrencyVND(item.currentBalance)}
          </p>
        </div>

        <div className="mt-3 flex justify-center">
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }} // CHANGED: xoay icon khi mở
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1 text-[#0F5132] opacity-70" // CHANGED: hiển thị 2 icon song song
            aria-hidden="true"
          >
            <ChevronsDown className="h-4 w-4" />

          </motion.div>
        </div>
      </div>
    );
  };

  const renderHistoryBox = (item: SavingsItem, emptyMessage: string) => {
    const transactions = item.transactions ?? [];
    const txToShow = transactions; // CHANGED: chưa giới hạn, có thể đổi thành slice(0, 12) sau này

    return (
      <AceCard className="rounded-2xl shadow-md p-5 bg-white">
        <h2 className="text-base font-semibold text-[#333]">Lịch sử giao dịch</h2>
        <div className="mt-4 divide-y divide-[#e6e6e6]">
          {txToShow.length ? (
            txToShow.map((txn, index) => {
              const amount = Number(txn.amount ?? 0);
              const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
              const amountText = `${sign}${formatCurrencyVND(Math.abs(amount))}`;
              const amountTone =
                amount > 0 ? 'text-green-600' : amount < 0 ? 'text-red-600' : 'text-[#666]';

              return (
                <div key={`${txn.date}-${index}`} className="flex items-start justify-between py-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[#333]">{txn.title}</p>
                    <p className="text-xs text-[#666]">{formatDate(txn.date)}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className={`text-sm font-semibold ${amountTone}`}>{amountText}</p>
                    <p className="text-xs text-[#666]">
                      Số dư sau GD: {formatCurrencyVND(txn.runningBalance)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="py-4 text-sm text-[#666]">{emptyMessage}</p>
          )}
        </div>
      </AceCard>
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
        {compulsory ? renderCompulsoryCard(compulsory) : null}
        <AnimatePresence initial={false}>
          {compulsory && expanded === 'COMPULSORY' ? (
            <motion.div
              key="compulsory-history"
              initial={{ height: 0, opacity: 0 }} // CHANGED: animation mở/đóng
              animate={{ height: 'auto', opacity: 1 }} // CHANGED: animation mở/đóng
              exit={{ height: 0, opacity: 0 }} // CHANGED: animation mở/đóng
              transition={{ duration: 0.25, ease: 'easeOut' }} // CHANGED: animation mở/đóng
              className="overflow-hidden"
            >
              {renderHistoryBox(compulsory, 'Chưa có giao dịch tiết kiệm bắt buộc.')}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {voluntary ? renderVoluntaryCard(voluntary) : null}
        <AnimatePresence initial={false}>
          {voluntary && expanded === 'VOLUNTARY' ? (
            <motion.div
              key="voluntary-history"
              initial={{ height: 0, opacity: 0 }} // CHANGED: animation mở/đóng
              animate={{ height: 'auto', opacity: 1 }} // CHANGED: animation mở/đóng
              exit={{ height: 0, opacity: 0 }} // CHANGED: animation mở/đóng
              transition={{ duration: 0.25, ease: 'easeOut' }} // CHANGED: animation mở/đóng
              className="overflow-hidden"
            >
              {renderHistoryBox(voluntary, 'Chưa có giao dịch tiết kiệm tự nguyện.')}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen px-4 pb-28 pt-8 w-full">
      <div className="flex w-full flex-col space-y-4">
        <AceCard className="text-center !bg-[#f9c6e6] text-[#333]">
          <h1 className="text-xl font-semibold">Sổ tiết kiệm</h1>
        </AceCard>
        {renderContent()}
      </div>
    </div>
  );
}

/* NOTE: Cập nhật /dashboard/saving để toggle lịch sử bằng click toàn bộ card + motion. */
