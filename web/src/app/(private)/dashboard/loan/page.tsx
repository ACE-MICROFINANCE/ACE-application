'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AceCard } from '@/share/ui/AceCard';
import { AceButton } from '@/share/ui/AceButton';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';
import { appApi, type LoanCurrentResponse } from '@/services/appApi';
import { formatCurrencyVND, formatDate } from '@/lib/format';

type LoanSummaryCardProps = {
  loan: LoanCurrentResponse | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

const LoanSummaryCard = ({ loan, isLoading, error, onRetry }: LoanSummaryCardProps) => {
  const renderContent = () => {
    if (isLoading) {
      return <p className="text-center text-sm text-[#666]">Đang tải dữ liệu khoản vay...</p>;
    }

    if (error) {
      return (
        <div className="space-y-2 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <AceButton onClick={onRetry}>Thử lại</AceButton>
        </div>
      );
    }

    if (!loan) {
      return <p className="text-center text-sm text-[#666]">Bạn chưa có khoản vay hoạt động.</p>;
    }

    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-[#666]">Khoản vay</p>
            <p className="text-xl font-semibold text-[#333]">#{loan.loanNo}</p>
          </div>
          <div className="text-right text-sm text-[#555]">
            <p>Ngày giải ngân</p>
            <p className="font-semibold">{formatDate(loan.disbursementDate)}</p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-[#333]">
          <div className="flex justify-between">
            <span className="text-[#555]">Số tiền vay ban đầu</span>
            <span className="font-semibold">{formatCurrencyVND(loan.principalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#555]">Dư nợ còn lại</span>
            <span className="font-semibold">{formatCurrencyVND(loan.remainingPrincipal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#555]">Lãi suất</span>
            <span className="font-semibold">{loan.interestRate}%</span>
          </div>
          <div className="flex items-start justify-between text-sm sm:text-base text-[#555]">
            <span>Kỳ thanh toán</span>
            <div className="text-right leading-tight">
              <div className="font-semibold">
                {loan.nextPayment ? formatCurrencyVND(loan.nextPayment.principalDue) : '—'}
              </div>
              {loan.nextPayment && loan.nextPayment.dueDate ? (
                <div className="text-[#555] whitespace-nowrap">
                  Hạn tới {formatDate(loan.nextPayment.dueDate)}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <p className="text-xs text-red-600 font-medium">
          Không thanh toán vượt mức nếu không có chỉ dẫn từ nhân viên ACE về trả nợ trước hạn.
        </p>

        <div className="space-y-2">
          <div className="w-full rounded-xl border border-dashed border-[#999] bg-[#f7f9fb] p-6 text-center text-sm text-[#666]">
            Mã QR sẽ hiển thị ở đây
          </div>
          <p className="text-center text-sm text-[#555]">Quét để thanh toán</p>
          <AceButton disabled>Lưu QR vào thư viện</AceButton>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <AceCard className="bg-gray-100 text-center">
        <h1 className="text-xl font-semibold text-[#333]">Khoản vay của bạn</h1>
      </AceCard>
      <AceCard className="space-y-4 text-left">{renderContent()}</AceCard>
    </div>
  );
};

/**
 * Trang "Khoản vay" – lấy dữ liệu từ API và hiển thị theo thiết kế.
 */
export default function LoanPage() {
  const { isAuthenticated, isInitializing, mustChangePassword } = useAuth();
  const router = useRouter();
  const [loan, setLoan] = useState<LoanCurrentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLoan = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await appApi.getCurrentLoan();
      setLoan(data);
    } catch (err) {
      setError('Không lấy được thông tin khoản vay. Vui lòng thử lại.');
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
      fetchLoan();
    }
  }, [isAuthenticated, isInitializing, mustChangePassword, router]);

  return (
    <div className="min-h-screen px-4 pb-28 pt-8">
      <div className="mx-auto flex w-full max-w-md flex-col space-y-4">
        <LoanSummaryCard loan={loan} isLoading={isLoading} error={error} onRetry={fetchLoan} />
      </div>
    </div>
  );

  // TODO: replaced by ACE Farmer implementation
  // return (
  //   <div className="min-h-screen px-4 pb-28 pt-8">
  //     <div className="mx-auto flex w-full max-w-md flex-col space-y-4">
  //       <AceCard className="space-y-2 text-center">
  //         <h1 className="text-xl font-semibold text-[#333]">Khoản vay</h1>
  //         <p className="text-sm text-[#666]">Tính năng này đang được phát triển.</p>
  //       </AceCard>
  //     </div>
  //   </div>
  // );
}
