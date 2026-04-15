import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { MobileFrame } from '@components/layout/MobileFrame';
import { Card } from '@components/ui/Card';
import { useScreenGuard } from '../hooks/useScreenGuard';
import { appApi, type LoanCurrentResponse, type LoanQrPayload } from '@services/appApi';
import { AppButton } from '@components/ui/AppButton';
import { useProfileStore } from '@store/profileStore';
import { requestTts } from '@services/ttsApi';
import { playTtsUrl, stopTts } from '@lib/ttsPlayer';

const LoansScreen = () => {
  const { loading, allowed } = useScreenGuard((profile) => profile?.actorKind !== 'STAFF');
  const { profile } = useProfileStore();
  const accessibilityEnabled =
    profile?.actorKind === 'CUSTOMER' && profile?.accessibilityEnabled === true;

  const [loan, setLoan] = useState<LoanCurrentResponse | null>(null);
  const [loanLoading, setLoanLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null); // CHANGED: giữ QR hiện tại
  const [amountDueNow, setAmountDueNow] = useState(0); // CHANGED: số tiền đến hạn từ BE
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const amountInputRef = useRef<TextInput | null>(null);
  const spokenOnceRef = useRef(false);

  const loadLoan = async () => {
    setLoanLoading(true);
    setError(null);
    try {
      const data = await appApi.getCurrentLoan();
      setLoan(data);
      if (data?.qrPayload) {
        const baseAmount = data.qrPayload.amount ?? 0;
        setAmountDueNow(baseAmount);
        setQrImageUrl(buildQrImageUrl(data.qrPayload, baseAmount));
      } else {
        setQrImageUrl(null);
        setAmountDueNow(0);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Không thể tải được dữ liệu khoản vay.');
    } finally {
      setLoanLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) {
      loadLoan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  useEffect(() => {
    if (!isQrModalOpen) return;
    const t = setTimeout(() => amountInputRef.current?.focus(), 150); // CHANGED: focus input khi mở modal
    return () => clearTimeout(t);
  }, [isQrModalOpen]);

  useEffect(() => {
    return () => {
      stopTts().catch(() => undefined);
    };
  }, []);

  const formatCurrency = (val?: number | null) => {
    const n = Number(val ?? 0);
    return n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
  };

  const formatMoneyForSpeech = (val?: number | null) => {
    const n = Math.round(Number(val ?? 0));
    if (!Number.isFinite(n)) return '';
    return `${n} đồng`;
  };

  const formatDateForSpeech = (val?: string | null) => {
    if (!val) return '';
    const d = new Date(val);
    if (!Number.isFinite(d.getTime())) return '';
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${day} tháng ${month} năm ${year}`;
  };

  const formatDate = (val?: string | null) => {
    if (!val) return '-';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return val;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const buildQrImageUrl = (payload: LoanQrPayload, amount: number) => {
    // CHANGED: build VietQR kèm số tiền
    return `https://img.vietqr.io/image/${payload.bankBin}-${payload.accountNumber}-compact.png?accountName=${encodeURIComponent(
      payload.accountName,
    )}&addInfo=${encodeURIComponent(payload.description)}${amount > 0 ? `&amount=${Math.round(amount)}` : ''}`;
  };

  const formatAmountInputValue = (value: number) => {
    if (!Number.isFinite(value)) return '';
    const digits = Math.round(value).toString();
    if (!digits || digits === '0') return '0';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const parseAmountInputValue = (value: string) => {
    const digits = value.replace(/[^\d]/g, '');
    return digits ? Number(digits) : 0;
  };

  const qrEnabled = Boolean(loan?.qrPayload);
  const canShowQr = qrEnabled && Boolean(qrImageUrl);

  const validationError = useMemo(() => {
    if (!amountInput.trim()) return null;
    const amountNumber = parseAmountInputValue(amountInput);
    if (!Number.isFinite(amountNumber) || !Number.isInteger(amountNumber) || amountNumber <= 0) {
      return 'Số tiền không hợp lệ';
    }
    if (amountNumber < 1000) return 'Số tiền tối thiểu là 1.000 VND';
    if (amountNumber > amountDueNow) return `Số tiền vượt quá ${formatCurrency(amountDueNow)}`;
    return null;
  }, [amountInput, amountDueNow]);

  const displayError = amountError ?? validationError;
  const isConfirmDisabled = Boolean(validationError) || !amountInput.trim() || isQrLoading;

  const handleAmountChange = (value: string) => {
    if (!value.trim()) {
      setAmountInput('');
      if (amountError) setAmountError(null);
      return;
    }
    const amountNumber = parseAmountInputValue(value);
    setAmountInput(formatAmountInputValue(amountNumber));
    if (amountError) setAmountError(null);
  };

  const handleOpenAmountModal = () => {
    if (!canShowQr) return;
    setAmountInput('');
    setAmountError(null);
    setIsQrModalOpen(true);
  };

  const handleConfirmAmount = async () => {
    if (validationError || !loan?.qrPayload) return;
    const amountNumber = parseAmountInputValue(amountInput);
    setIsQrLoading(true);
    setAmountError(null);
    try {
      const response = await appApi.createLoanQr?.(amountNumber);
      if (response?.qrImageUrl) {
        setQrImageUrl(response.qrImageUrl);
        setAmountInput(formatAmountInputValue(response.amount));
      } else {
        // CHANGED: fallback tự build nếu BE chưa hỗ trợ
        setQrImageUrl(buildQrImageUrl(loan.qrPayload, amountNumber));
        setAmountInput(formatAmountInputValue(amountNumber));
      }
      setIsQrModalOpen(false);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Không thể tạo mã QR lúc này.';
      setAmountError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setIsQrLoading(false);
    }
  };

  const handleSaveQr = async () => {
    if (!qrImageUrl) return;
    try {
      if (Platform.OS === 'web') {
        window.open(qrImageUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      const permission = await MediaLibrary.requestPermissionsAsync(
        true,
        Platform.OS === 'android' ? ['photo'] : undefined,
      );
      if (!permission.granted) {
        Alert.alert('Chưa có quyền lưu ảnh', 'Vui lòng cấp quyền thư viện ảnh để lưu mã QR.');
        return;
      }

      const fileSafeLoanNo = (loan?.loanNo ?? 'loan-qr').replace(/[^a-zA-Z0-9-_]/g, '-');
      const destinationUri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}${fileSafeLoanNo}-${Date.now()}.png`;
      const download = await FileSystem.downloadAsync(qrImageUrl, destinationUri);

      if (download.status !== 200) {
        throw new Error(`Download failed with status ${download.status}`);
      }

      await MediaLibrary.saveToLibraryAsync(download.uri);
      await FileSystem.deleteAsync(download.uri, { idempotent: true }).catch(() => undefined);
      Alert.alert('Đã lưu thành công', 'Mã QR đã được lưu vào thư viện ảnh của bạn.');
    } catch {
      Alert.alert('Không thể lưu ảnh', 'Hiện chưa lưu được mã QR. Vui lòng thử lại sau.');
    }
  };

  const loanTypeLabel =
    loan?.loanTypeLabel ?? (loan?.loanType === 'BULLET' ? 'Trả gốc cuối kỳ' : 'Trả gốc hàng kỳ'); // CHANGED: fallback
  const loanPaymentTypeLabel = loan?.loanPaymentTypeLabel ?? null;
  const loanTypeDisplayLabel = loanPaymentTypeLabel ?? loanTypeLabel ?? null;
  const disbursementDateText = formatDate(loan?.disbursementDate ?? loan?.disbursementDateInferred); // CHANGED

  useEffect(() => {
    if (!allowed || !accessibilityEnabled) return;
    if (loanLoading) return;
    if (spokenOnceRef.current) return;

    spokenOnceRef.current = true;

    let textToSpeak = '';

    if (error) {
      textToSpeak =
        'Không thể tải dữ liệu khoản vay. Nếu có lỗi, hãy liên hệ với cán bộ công tác xã hội.';
    } else if (!loan) {
      textToSpeak = 'Bạn chưa có khoản vay nào.';
    } else if (loan?.nextPayment?.totalDue && loan?.nextPayment?.dueDate) {
      const moneyText = formatMoneyForSpeech(loan.nextPayment.totalDue);
      const dateText = formatDateForSpeech(loan.nextPayment.dueDate);
      if (moneyText && dateText) {
        textToSpeak = `Số tiền đến hạn của bạn là ${moneyText}, sẽ tới hạn vào ngày ${dateText}.`;
      }
    } else {
      textToSpeak = 'Bạn hiện chưa đến kỳ thanh toán.';
    }

    if (!textToSpeak || textToSpeak.length < 3) return;

    (async () => {
      try {
        await stopTts();
        const res = await requestTts(textToSpeak);
        if (res?.ok && res.audioUrl) {
          await playTtsUrl(res.audioUrl);
        }
      } catch {
        // ignore TTS errors
      }
    })();
  }, [allowed, accessibilityEnabled, loanLoading, loan, error]);


  if (loading || !allowed) {
    return (
      <MobileFrame withBottomPadding>
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-slate-600">Đang tải...</Text>
        </View>
      </MobileFrame>
    );
  }

  return (
    <MobileFrame withBottomPadding>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 32, paddingBottom: 56, gap: 16, paddingHorizontal: 16 }} // CHANGED: pad giống web (pt-8, pb-28, px-4)
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignSelf: 'center', width: '100%', maxWidth: 480, gap: 12 }}>
          <Card className="items-center bg-[#66FF66] rounded-2xl shadow-sm">
            <Text className="text-xl font-semibold text-[#333]">Khoản vay của bạn</Text>
          </Card>

          <Card className="rounded-2xl bg-white shadow-md border border-[#e2e8f0] space-y-3">
            {loanLoading ? (
              <View className="items-center py-4">
                <ActivityIndicator />
                <Text className="mt-2 text-sm text-[#666]">Đang tải dữ liệu khoản vay...</Text>
              </View>
            ) : error ? (
              <View className="items-center space-y-2">
                <Text className="text-sm text-red-500">{error}</Text>
                <AppButton title="Thử lại" onPress={loadLoan} />
              </View>
            ) : !loan ? (
              <Text className="text-center text-sm text-[#666]">Bạn chưa có khoản vay hoạt động.</Text>
            ) : (
              <View className="space-y-3">
                <View className="flex-row justify-between">
                  <View>
                    <Text className="text-sm text-[#666]">Mã khoản vay</Text>
                    <Text className="text-xl font-semibold text-[#333]">
                      {loan.loanNo ?? `#${(loan as any)?.memberNo ?? ''}`}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm text-[#666]">Ngày giải ngân</Text>
                    <Text className="text-base font-semibold text-[#333]">{disbursementDateText}</Text>
                  </View>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-sm text-[#666]">Số tiền vay ban đầu</Text>
                  <Text className="text-sm font-semibold text-[#333]">
                    {formatCurrency(loan.principalAmount ?? loan.remainingPrincipal ?? 0)}
                  </Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-sm text-[#666]">Dư nợ gốc còn lại</Text>
                  <Text className="text-lg font-semibold text-[#333]">
                    {formatCurrency(loan.remainingPrincipal ?? (loan as any)?.totalPrincipal)}
                  </Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-sm text-[#666]">Lãi suất</Text>
                  <Text className="text-sm font-semibold text-[#333]">
                    {(loan.interestRate ?? 0).toLocaleString('vi-VN')}%
                  </Text>
                </View>

                {loan.lateAmount && loan.lateAmount > 0 ? (
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-[#666]">Tiền chậm trả</Text>
                    <Text className="text-sm font-semibold text-[#333]">{formatCurrency(loan.lateAmount)}</Text>
                  </View>
                ) : null}

                {loanTypeDisplayLabel ? (
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-[#666]">Loại khoản vay</Text>
                    <Text className="text-sm font-semibold text-[#333]">{loanTypeDisplayLabel}</Text>
                  </View>
                ) : null}

                <View className="flex-row justify-between">
                  <Text className="text-sm text-[#666]">Số kỳ còn phải trả</Text>
                  <Text className="text-sm font-semibold text-[#333]">
                    {loan.remainingInstallments ?? '-'}
                    {loan.termInstallments ? `/${loan.termInstallments} Kỳ` : ''}
                  </Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-sm text-[#666]">Ngày phải trả tiếp theo</Text>
                  <Text className="text-sm font-semibold text-[#333]">
                    {loan.nextPayment?.dueDate ? formatDate(loan.nextPayment.dueDate) : '-'}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-[#666]">Gốc kỳ tiếp theo</Text>
                  <Text className="text-sm font-semibold text-[#333]">
                    {formatCurrency(loan.nextPayment?.principalDue)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-[#666]">Lãi kỳ tiếp theo</Text>
                  <Text className="text-sm font-semibold text-[#333]">
                    {formatCurrency(loan.nextPayment?.interestDue)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-[#666]">Tổng phải trả</Text>
                  <Text className="text-sm font-semibold text-[#333]">
                    {formatCurrency(loan.nextPayment?.totalDue ?? loan.nextPayment?.principalDue)}
                  </Text>
                </View>

                <View className="w-full items-center justify-center py-4">
                  {canShowQr ? (
                    <Image source={{ uri: qrImageUrl ?? '' }} resizeMode="contain" className="h-48 w-48" />
                  ) : (
                    <Text className="text-sm text-[#666]">Bạn hiện chưa đến kỳ thanh toán</Text>
                  )}
                </View>

                {canShowQr ? (
                  <View className="w-full space-y-2">
                    <Text className="text-center text-sm text-[#555]">Quét để thanh toán</Text>
                    <AppButton
                      title="Nhấn vào đây nếu bạn muốn trả ít hơn"
                      onPress={handleOpenAmountModal}
                      disabled={loanLoading || isQrLoading}
                      bgColor="#99FF66"
                      className="border border-[#8ae65a]"
                    />
                    <AppButton
                      title="Lưu QR vào thư viện"
                      onPress={handleSaveQr}
                      disabled={loanLoading || !qrImageUrl || isQrLoading}
                      className="bg-white border border-[#1f3b1f] text-center"
                    />
                  </View>
                ) : null}
              </View>
            )}
          </Card>
        </View>
      </ScrollView>

      <Modal visible={isQrModalOpen} transparent animationType="fade" onRequestClose={() => setIsQrModalOpen(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/30 px-4"
          onPress={() => setIsQrModalOpen(false)}
        >
          <Pressable
            className="w-full max-w-md overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-lg"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="relative flex-row items-center justify-center border-b border-black/5 px-6 py-4">
              <Text className="text-[17px] font-semibold text-[#111]">Nhập số tiền bạn muốn trả</Text>
              <Pressable
                onPress={() => setIsQrModalOpen(false)}
                className="absolute right-4 top-3 h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-black/5"
              >
                <Text className="text-base text-[#333]">×</Text>
              </Pressable>
            </View>

            <View className="space-y-3 px-6 pb-6 pt-5">
              <TextInput
                ref={amountInputRef}
                value={amountInput}
                onChangeText={handleAmountChange}
                keyboardType="numeric"
                placeholder="000"
                className="w-full rounded-2xl border border-black/10 bg-white py-4 text-center text-[40px] font-semibold"
              />
              <Text className="text-center text-base italic text-[#6C757D]">
                Tối thiểu 1.000 VND, tối đa {formatCurrency(amountDueNow)}
              </Text>
              {displayError ? <Text className="text-center text-xs text-red-500">{displayError}</Text> : null}
              <AppButton
                title="Xác nhận"
                onPress={handleConfirmAmount}
                disabled={isConfirmDisabled}
                loading={isQrLoading}
                className="mx-auto w-full max-w-xs"
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </MobileFrame>
  );
};

export default LoansScreen;
