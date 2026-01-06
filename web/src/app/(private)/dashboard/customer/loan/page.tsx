'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AceCard } from '@/share/ui/AceCard';
import { AceButton } from '@/share/ui/AceButton';
import { AceInput } from '@/share/ui/AceInput'; // CHANGED: dùng input giống ở mật khẩu
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react'; // CHANGED: modal
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';
import { formatCurrencyVND, formatDate } from '@/lib/format';
import { useCurrentLoan } from '@/hooks/useCurrentLoan';
import { appApi } from '@/services/appApi'; // CHANGED: tạo QR theo số tiền

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
  const amountInputRef = useRef<HTMLInputElement | null>(null); // CHANGED: auto focus input

  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null); // CHANGED: trạng thái QR
  const [amountDueNow, setAmountDueNow] = useState(0); // CHANGED: số tiền đến hạn từ BE
  const [isQrModalOpen, setIsQrModalOpen] = useState(false); // CHANGED: modal QR
  const [amountInput, setAmountInput] = useState(''); // CHANGED: số tiền nhập
  const [amountError, setAmountError] = useState<string | null>(null); // CHANGED: lỗi nhập số tiền
  const [isQrLoading, setIsQrLoading] = useState(false); // CHANGED: loading tạo QR

  const buildQrImageUrl = (
    payload: { bankBin: string; accountNumber: string; accountName: string; description: string },
    amount: number,
  ) => {
    // CHANGED: build VietQR image url with amount
    return `https://img.vietqr.io/image/${payload.bankBin}-${payload.accountNumber}-compact.png?accountName=${encodeURIComponent(
      payload.accountName,
    )}&addInfo=${encodeURIComponent(payload.description)}${amount > 0 ? `&amount=${Math.round(amount)}` : ''}`;
  };

  const qrEnabled = Boolean(loan?.qrPayload); // CHANGED: mở QR theo rule từ BE
  const canShowQr = qrEnabled && Boolean(qrImageUrl); // CHANGED: chỉ hiện QR khi có dữ liệu

  const formatAmountInputValue = (value: number) => {
    // CHANGED: format số tiền với dấu chấm (vd: 1.000.000)
    if (!Number.isFinite(value)) return '';
    const digits = Math.round(value).toString();
    if (!digits || digits == '0') return '0';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // CHANGED: phân tách bằng dấu chấm
  };

  const parseAmountInputValue = (value: string) => {
    // CHANGED: parse số tiền từ input đã format
    const digits = value.replace(/[^\d]/g, '');
    return digits ? Number(digits) : 0;
  };

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace(routes.login);
    } else if (mustChangePassword) {
      router.replace(`${routes.dashboard}?tab=account`);
    }
  }, [isAuthenticated, isInitializing, mustChangePassword, router]);

  useEffect(() => {
    if (!loan?.qrPayload) {
      setQrImageUrl(null);
      setAmountDueNow(0);
      setAmountInput('');
      setAmountError(null);
      return;
    }
    const baseAmount = loan.qrPayload.amount ?? 0;
    setAmountDueNow(baseAmount);
    // setAmountInput(baseAmount > 0 ? formatAmountInputValue(baseAmount) : '');
    setAmountError(null);
    setQrImageUrl(buildQrImageUrl(loan.qrPayload, baseAmount));
  }, [loan]); // CHANGED: đồng bộ QR từ BE

  useEffect(() => {
    if (!isQrModalOpen) return;
    const timer = setTimeout(() => {
      amountInputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, [isQrModalOpen]); // CHANGED: focus input khi mở modal

  const validationError = useMemo(() => {
    if (!amountInput.trim()) return null;
    const amountNumber = parseAmountInputValue(amountInput);
    if (!Number.isFinite(amountNumber) || !Number.isInteger(amountNumber) || amountNumber <= 0) {
      return 'Số tiền không hợp lệ';
    }
    if (amountNumber < 1000) {
      return 'Số tiền tối thiểu là 1.000 VND';
    }
    if (amountNumber > amountDueNow) {
      return `Số tiền vượt quá ${formatCurrencyVND(amountDueNow)}`;
    }
    return null;
  }, [amountInput, amountDueNow]);

  const amountDueNowText = formatCurrencyVND(amountDueNow); // CHANGED: helper cho modal
  const displayError = amountError ?? validationError; // CHANGED: gộp lỗi
  const isConfirmDisabled = Boolean(validationError) || !amountInput.trim() || isQrLoading; // CHANGED: disable khi chưa hợp lệ

  const handleAmountChange = (value: string) => {
    if (!value.trim()) {
      setAmountInput(''); // CHANGED: cho phép xóa trắng input
      if (amountError) setAmountError(null);
      return;
    }
    const amountNumber = parseAmountInputValue(value);
    setAmountInput(formatAmountInputValue(amountNumber)); // CHANGED: tự động thêm dấu phân cách
    if (amountError) setAmountError(null);
  };

  const handleAmountKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // CHANGED: khóa cứng nhập số (chỉ cho phép phím số và điều hướng)
    const allowedKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Tab',
      'Home',
      'End',
    ];
    if (allowedKeys.includes(event.key)) return;
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  };

  const handleOpenAmountModal = () => {
    if (!canShowQr) return;
    setAmountInput('');
    setAmountError(null);
    // setAmountInput(amountDueNow > 0 ? formatAmountInputValue(amountDueNow) : '');
    setIsQrModalOpen(true);
  };

  const handleConfirmAmount = async () => {
    if (validationError) return;
    const amountNumber = parseAmountInputValue(amountInput);
    setIsQrLoading(true);
    setAmountError(null);
    try {
      const response = await appApi.createLoanQr(amountNumber); // CHANGED: tạo QR theo số tiền
      setQrImageUrl(response.qrImageUrl);
      setAmountInput(formatAmountInputValue(response.amount));
      setIsQrModalOpen(false);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Không thể tạo mã QR lúc này.';
      setAmountError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setIsQrLoading(false);
    }
  };

  const loanTypeLabel =
    loan?.loanTypeLabel ??
    (loan?.loanType === 'BULLET' ? 'Trả gốc cuối kỳ' : 'Trả gốc hàng kỳ'); // [BIJLI-LOAN-RULE]
  const loanPaymentTypeLabel = loan?.loanPaymentTypeLabel ?? null;
  const loanTypeDisplayLabel = loanPaymentTypeLabel ?? loanTypeLabel ?? null; // CHANGED: fallback hiển thị BULLET/DEGRESSIVE

  const disbursementDateText = formatDate(
    loan?.disbursementDate ?? loan?.disbursementDateInferred,
  ); // CHANGED: dùng ngày giải ngân ước tính khi thiếu dữ liệu
  const showInferredNote = !loan?.disbursementDate && Boolean(loan?.disbursementDateInferred); // CHANGED: hiện ghi chú ước tính
  // CHANGED: nhãn "hình thức trả nợ" do BE tính sẵn

  return (
    <div className="min-h-screen px-4 pb-28 pt-8">
      {/* CHANGED: chừa khoảng cho bottom bar */}
      {/* // <div className="min-h-screen px-4 pb-28 pt-8"> */}
      <div className="mx-auto flex w-full max-w-md flex-col space-y-4">
        <AceCard className="bg-[#66FF66] text-center">
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
                  <p className="text-sm text-[#666]">Mã khoản vay</p>
                  {/* CHANGED: hiển thị mã KH thay vì mã khoản vay */}
                  <p className="text-xl font-semibold text-[#333]">
                    {loan.loanNo ?? `#${loan.memberNo}`} {/* CHANGED: ưu tiên memberNo, fallback loanNo */}
                  </p>
                </div>
                <div className="text-right text-sm text-[#555]">
                  <p>Ngày giải ngân</p>
                  <p className="font-semibold text-xl">{disbursementDateText}</p>
                  {/* {showInferredNote ? (
                    <p className="text-xs italic text-[#777]">Ước tính từ lãi kỳ đầu: {formatDate(loan.disbursementDateInferred)}</p>
                  ) : null} CHANGED: hiển thị ngày giải ngân ước tính */}
                </div>
              </div>

              <div className="space-y-2 text-sm text-[#333]">
                <div className="flex justify-between">
                  <span className="text-[#555]">Số tiền vay ban đầu</span>
                  <span className="font-semibold">{formatCurrencyVND(loan.principalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#555]">Dư nợ gốc còn lại</span>
                  <span className="font-semibold">{formatCurrencyVND(loan.remainingPrincipal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#555]">Lãi suất</span>
                  <span className="font-semibold">{loan.interestRate}%</span>
                </div>

                {loan?.lateAmount && loan.lateAmount > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-[#555]">Tiền chậm trả</span>
                    <span className="font-semibold">{formatCurrencyVND(loan.lateAmount)}</span>
                  </div>
                ) : null}
                {/* CHANGED: show late payment amount if any */}

                {loanTypeDisplayLabel ? (
                  // CHANGED: hiển thị loanTypeLabel nếu loanPaymentTypeLabel null
                  <div className="flex justify-between">
                    <span className="text-[#555]">Loại khoản vay</span>
                    <span className="font-semibold">{loanTypeDisplayLabel}</span>
                  </div>
                ) : null}
                {/* [BIJLI-LOAN-RULE] loan type label */}

                <div className="flex justify-between">
                  <span className="text-[#555]">Số kỳ còn phải trả</span>
                  <span className="font-semibold">
                    {loan.remainingInstallments}/{loan.termInstallments} Kỳ
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#555]">Ngày phải trả tiếp theo</span>
                  <span className="font-semibold">
                    {loan.nextPayment?.dueDate ? (
                      <div className="mt-0.5 inline-block text-right">
                        <div className="text-[#555] whitespace-nowrap">
                          {formatDate(loan.nextPayment.dueDate)}
                        </div>

                        {typeof loan.remainingInstallments === 'number' &&
                        typeof loan.termInstallments === 'number' &&
                        loan.termInstallments > 0 ? (
                          <div className="text-[#555] whitespace-nowrap">
                            {/* Còn {loan.remainingInstallments}/{loan.termInstallments} Kỳ */}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_auto] items-start gap-3 text-[#555]">
                  <span>Số tiền phải trả tiếp theo</span>

                  <div className="grid justify-items-end leading-tight">
                    <div className="font-semibold text-right">
                      {loan.nextPayment
                        ? formatCurrencyVND(loan.nextPayment.totalDue ?? loan.nextPayment.principalDue)
                        : '—'}
                    </div>

                    {loan.nextPayment?.dueDate ? (
                      <div className="mt-0.5 inline-block text-right">
                        {/* <div className="text-[#555] whitespace-nowrap">
                          Hạn tới {formatDate(loan.nextPayment.dueDate)}
                        </div> */}

                        {typeof loan.remainingInstallments === 'number' &&
                        typeof loan.termInstallments === 'number' &&
                        loan.termInstallments > 0 ? (
                          <div className="text-[#555] whitespace-nowrap">
                            {/* Còn {loan.remainingInstallments}/{loan.termInstallments} Kỳ */}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* [BIJLI-LOAN-RULE] next payment total due */}
                {/* <div className="flex justify-between">
                  <span className="text-[#555]">Số tiền kỳ tới</span>
                  <span className="font-semibold">
                    {loan.nextPayment?.totalDue ? formatCurrencyVND(loan.nextPayment.totalDue) : '?'}
                  </span>
                </div> */}
              </div>

              {/* 
              <p className="text-xs text-red-600 font-medium text-center">
                Không thanh toán vượt mức nếu không có chỉ dẫn từ nhân viên ACE về trả nợ trước hạn.
              </p> 
              */}

              <div className="space-y-2">
                <div className="w-full p-6 text-center">
                  {/* <div className="w-full rounded-xl border border-dashed border-[#999] bg-[#f7f9fb] p-6 text-center"> */}
                  {canShowQr ? (
                    <img
                      ref={qrRef}
                      src={qrImageUrl ?? ''} // CHANGED: satisfy TS when qrImageUrl can be null
                      alt="VietQR"
                      className="mx-auto h-48 w-48 object-contain"
                    />
                  ) : (
                    <p className="text-sm text-[#666]">Bạn hiện chưa đến kỳ thanh toán</p>
                  )}{' '}
                  {/* CHANGED: khung QR luôn hiển thị */}
                </div>

                {canShowQr ? (
                  <>
                    <p className="text-center text-sm text-[#555]">Quét để thanh toán</p>
                    <AceButton
                      className="bg-[#99FF66] text-[#1f3b1f] hover:bg-[#8ae65a]" // CHANGED: button màu xanh nhạt theo yêu cầu
                      disabled={isLoading || isQrLoading}
                      onClick={handleOpenAmountModal}
                    >
                      Nhấn vào đây nếu bạn muốn trả ít hơn
                    </AceButton>
                    <AceButton
                      disabled={isLoading || !qrImageUrl || isQrLoading}
                      onClick={() => qrImageUrl && downloadImage(qrImageUrl)}
                    >
                      Lưu QR vào thư viện
                    </AceButton>
                    {/* <p className="text-center text-xs text-[#777]">
                      Mã QR dùng để chuyển khoản, số tiền mặc định là số tiền đến hạn, bạn có thể chỉnh sửa trong app ngân hàng.
                    </p> */}
                  </>
                ) : null}
                {/* CHANGED: ẩn nút khi chưa đến kỳ */}
              </div>

              {/* CHANGED: modal nhập số tiền thanh toán */}
              <Modal
                isOpen={isQrModalOpen}
                onOpenChange={setIsQrModalOpen}
                placement="center"
                backdrop="blur" // CHANGED: nền mờ giống iOS
                classNames={{ backdrop: 'bg-black/30 backdrop-blur-sm' }} // CHANGED: tối + blur nhẹ
                hideCloseButton // CHANGED: dùng nút đóng custom bên phải
              >
                <ModalContent className="mx-4 w-[92vw] max-w-md overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                  {/* CHANGED: iOS modal */}
                  <ModalHeader className="relative flex items-center justify-center border-b border-black/5 px-6 py-5">
                    {/* CHANGED: header iOS */}
                    <span className="text-[17px] font-semibold text-[#111]">
                      Nhập số tiền bạn muốn trả
                    </span>
                    <button
                      type="button"
                      aria-label="Đóng"
                      onClick={() => setIsQrModalOpen(false)} // CHANGED: đóng modal bằng nút X
                      className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-black/5 text-[#333] transition active:scale-95 hover:bg-black/10"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </ModalHeader>

                  <ModalBody className="space-y-3 px-6 pb-6 pt-5">
                    {/* CHANGED: padding iOS */}
                    <AceInput
                      type="text" // CHANGED: cho phép hiển thị số có dấu phân cách
                      placeholder="000"
                      value={amountInput}
                      onChange={(event) => handleAmountChange(event.target.value)}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onKeyDown={handleAmountKeyDown}
                      ref={amountInputRef}
                      className="rounded-xl border border-black/10 bg-white py-3 text-center text-10xl
                      text-[clamp(28px,7vw,56px)]
                       font-semibold tabular-nums"
                    />
                    <p className="text-center text-xl italic text-[#6C757D]">
                      Tối thiểu 1.000 VND, tối đa {amountDueNowText}
                    </p>
                    {displayError ? <p className="text-xs text-red-500">{displayError}</p> : null}
                  </ModalBody>

                  <ModalFooter className="px-6 pb-6 pt-2">
                    {/* CHANGED: footer iOS */}
                    <div className="flex w-full justify-center">
                      <AceButton
                        className="h-12 w-full max-w-xs rounded-full" // CHANGED: nút iOS
                        onClick={handleConfirmAmount}
                        isDisabled={isConfirmDisabled}
                        isLoading={isQrLoading}
                      >
                        Xác nhận
                      </AceButton>
                    </div>
                  </ModalFooter>
                </ModalContent>
              </Modal>
            </>
          )}
        </AceCard>
      </div>
    </div>
  );
}
