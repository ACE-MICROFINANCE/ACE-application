'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AceCard } from '@/share/ui/AceCard';
import { AceButton } from '@/share/ui/AceButton';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';
import { formatCurrencyVND, formatDate } from '@/lib/format';
import { useCurrentLoan } from '@/hooks/useCurrentLoan';
// Tải ảnh VietQR về máy
const downloadImage = async (url: string) => {
  const res = await fetch(url);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = 'ACE-loan-QR.png';
  link.click();
  URL.revokeObjectURL(blobUrl);
};

export default function LoanPage() {
  const { isAuthenticated, isInitializing, mustChangePassword } = useAuth();
  const router = useRouter();
  const { loan, isLoading, error, refresh } = useCurrentLoan();
  const qrRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace(routes.login);
    } else if (mustChangePassword) {
      router.replace(`${routes.changePassword}?mode=force`);
    }
  }, [isAuthenticated, isInitializing, mustChangePassword, router]);

  const qrAmount = loan?.qrPayload?.amount ?? loan?.nextPayment?.totalDue ?? 0; // [BIJLI-LOAN-RULE]
  const qrImageUrl =
    loan?.qrPayload &&
    `https://img.vietqr.io/image/${loan.qrPayload.bankBin}-${loan.qrPayload.accountNumber}-compact.png?accountName=${encodeURIComponent(
      loan.qrPayload.accountName,
    )}&addInfo=${encodeURIComponent(loan.qrPayload.description)}${
      qrAmount > 0 ? `&amount=${Math.round(qrAmount)}` : ''
    }`;
  const loanTypeLabel =
    loan?.loanTypeLabel ??
    (loan?.loanType === 'BULLET' ? 'Trả gốc cuối kỳ' : 'Trả gốc hàng kỳ'); // [BIJLI-LOAN-RULE]

  return (
    <div className="min-h-screen px-4 pb-28 pt-8">
      <div className="mx-auto flex w-full max-w-md flex-col space-y-4">
        <AceCard className="bg-gray-100 text-center">
          <h1 className="text-xl font-semibold text-[#333]">Khoản vay của bạn</h1>
        </AceCard>

        <AceCard className="space-y-4 text-left">
          {isLoading ? (
            <p className="text-center text-sm text-[#666]">Đang tải dữ liệu khoản vay...</p>
          ) : error ? (
            <div className="space-y-2 text-center">
              <p className="text-sm text-red-500">{error}</p>
              <AceButton onClick={refresh}>Thử lại</AceButton>
            </div>
          ) : !loan ? (
            <p className="text-center text-sm text-[#666]">Bạn chưa có khoản vay hoạt động.</p>
          ) : (
            <>
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
                {/* [BIJLI-LOAN-RULE] loan type label */}
                <div className="flex justify-between">
                  <span className="text-[#555]">Loại Khoản Vay</span>
                  <span className="font-semibold">{loanTypeLabel}</span>
                </div>
                <div className="flex items-start justify-between text-sm sm:text-base text-[#555]">
                  <span>Kỳ thanh toán</span>
                  <div className="text-right leading-tight">
                    {/* [BIJLI-LOAN-RULE] show total due for installment */}
                    <div className="font-semibold">
                      {loan.nextPayment
                        ? formatCurrencyVND(
                            loan.nextPayment.totalDue ?? loan.nextPayment.principalDue,
                          )
                        : '—'}
                    </div>
                    {loan.nextPayment?.dueDate ? (
                      <div className="text-[#555] whitespace-nowrap">
                        Hạn tới {formatDate(loan.nextPayment.dueDate)}
                      </div>
                    ) : null}
                  </div>
                
                {/* [BIJLI-LOAN-RULE] next payment total due */}
                {/* <div className="flex justify-between">
                  <span className="text-[#555]">S? ti?n k? t?i</span>
                  <span className="font-semibold">
                    {loan.nextPayment?.totalDue
                      ? formatCurrencyVND(loan.nextPayment.totalDue)
                      : '?'}
                  </span>
                </div> */}

</div>
              </div>

              <p className="text-xs text-red-600 font-medium text-center">
                Không thanh toán vượt mức nếu không có chỉ dẫn từ nhân viên ACE về trả nợ trước hạn.
              </p>

              <div className="space-y-2">
                {qrImageUrl ? (
                  <div className="w-full rounded-xl border border-dashed border-[#999] bg-[#f7f9fb] p-6 text-center">
                    {/* NOTE: dùng ảnh VietQR để ngân hàng quét được; placeholder cũ đã comment */}
                    <img
                      ref={qrRef}
                      src={qrImageUrl}
                      alt="VietQR"
                      className="mx-auto h-48 w-48 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-full rounded-xl border border-dashed border-[#999] bg-[#f7f9fb] p-6 text-center text-sm text-[#666]">
                    {/* NOTE: old static placeholder for QR, replaced by dynamic QR component */}
                    Không có mã QR, vui lòng liên hệ nhân viên ACE
                  </div>
                )}
                <p className="text-center text-sm text-[#555]">Quét để thanh toán</p>
                <AceButton
                  disabled={isLoading || !qrImageUrl}
                  onClick={() => qrImageUrl && downloadImage(qrImageUrl)}
                >
                  Lưu QR vào thư viện
                </AceButton>
                <p className="text-center text-xs text-[#777]">
                  Mã QR dùng để chuyển khoản, số tiền mặc định là số tiền đến hạn, bạn có thể chỉnh sửa trong app ngân hàng.
                </p>
              </div>
            </>
          )}
        </AceCard>
      </div>
    </div>
  );
}

