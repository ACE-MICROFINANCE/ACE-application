import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { MobileFrame } from '@components/layout/MobileFrame';
import { Card } from '@components/ui/Card';
import { AppButton } from '@components/ui/AppButton';
import { useScreenGuard } from '../hooks/useScreenGuard';
import { appApi, type SavingsItem, type SavingsTransactionItem } from '@services/appApi';

const formatCurrency = (val?: number | null) => {
  const n = Number(val ?? 0);
  return n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
};

const formatDate = (val?: string | null) => {
  if (!val) return '';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const SavingsScreen = () => {
  const { loading, allowed } = useScreenGuard((profile) => profile?.actorKind !== 'STAFF');
  const [savings, setSavings] = useState<SavingsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<'COMPULSORY' | 'VOLUNTARY' | null>(null);

  const fetchSavings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await appApi.getSavings();
      setSavings(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Không lấy được thông tin tiết kiệm. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) fetchSavings();
  }, [allowed]);

  const compulsory = useMemo(
    () => savings.find((item) => item.type === 'COMPULSORY'),
    [savings],
  );
  const voluntary = useMemo(
    () => savings.find((item) => item.type === 'VOLUNTARY'),
    [savings],
  );

  const toggle = (type: 'COMPULSORY' | 'VOLUNTARY') => {
    setExpanded((prev) => (prev === type ? null : type));
  };

  const renderHistory = (item: SavingsItem, emptyMessage: string) => {
    const txns = (item.transactions ?? []).filter((txn) => {
      const isZeroInt =
        (txn.rawType ?? '').toUpperCase() === 'INT' &&
        Number(txn.deposit ?? 0) === 0 &&
        Number(txn.withdrawal ?? 0) === 0;
      return !isZeroInt;
    });

    if (!txns.length) {
      return <Text className="py-4 text-sm text-[#666] text-center">{emptyMessage}</Text>;
    }

    return (
      <View className="divide-y divide-[#e6e6e6]">
        {txns.map((txn, idx) => {
          const amount = Number(txn.amount ?? 0);
          const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
          const amountTone = amount > 0 ? 'text-green-600' : amount < 0 ? 'text-red-600' : 'text-[#666]';
          return (
            <View key={`${txn.date}-${idx}`} className="flex-row justify-between py-3">
              <View className="space-y-1">
                <Text className="text-sm font-medium text-[#333]">{txn.title}</Text>
                <Text className="text-xs text-[#666]">{formatDate(txn.date)}</Text>
              </View>
              <View className="items-end space-y-1">
                <Text className={`text-sm font-semibold ${amountTone}`}>{`${sign}${formatCurrency(Math.abs(amount))}`}</Text>
                <Text className="text-xs text-[#666]">Số dư sau GD: {formatCurrency(txn.runningBalance)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

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
        contentContainerStyle={{ paddingTop: 32, paddingBottom: 56, paddingHorizontal: 16, gap: 16 }} // CHANGED: gap ~ space-y-4
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignSelf: 'center', width: '100%', maxWidth: 480 }}>
          <Card className="items-center bg-[#f9c6e6] rounded-2xl shadow-sm">
            <Text className="text-xl font-semibold text-[#333]">Sổ tiết kiệm</Text>
          </Card>

          {isLoading ? (
            <View className="items-center py-4">
              <ActivityIndicator />
              <Text className="mt-2 text-sm text-[#666]">Đang tải thông tin tiết kiệm...</Text>
            </View>
          ) : error ? (
            <View className="items-center space-y-2">
              <Text className="text-sm text-red-500">{error}</Text>
              <AppButton title="Thử lại" onPress={fetchSavings} />
            </View>
          ) : !compulsory && !voluntary ? (
            <Text className="text-center text-sm text-[#666]">Chưa có sổ tiết kiệm.</Text>
          ) : (
            <View className="mt-2 space-y-4">
              {compulsory ? (
                <View className="overflow-hidden rounded-2xl shadow-md border border-[#fcd1d5] bg-white">
                  <Pressable
                    onPress={() => toggle('COMPULSORY')}
                    className="w-full bg-[#fecdd3] p-4"
                  >
                    <Text className="text-[18px] font-semibold text-[#333]">Tiết kiệm bắt buộc</Text>
                    <View className="mt-3 space-y-1">
                      <Text className="text-[15px] font-medium text-[#6C757D]">Tổng số dư</Text>
                      <Text className="text-2xl font-bold text-[#333]">{formatCurrency(compulsory.currentBalance)}</Text>
                    </View>
                    <View className="mt-3 items-center">
                      <Text
                        className="text-[#0F5132]/70"
                        style={{ transform: [{ rotate: expanded === 'COMPULSORY' ? '180deg' : '0deg' }] }}
                      >
                        ˅
                      </Text>
                    </View>
                  </Pressable>
                  {expanded === 'COMPULSORY' ? (
                    <View className="border-t border-black/5 bg-white p-5">
                      <Text className="text-base font-semibold text-[#333]">Lịch sử giao dịch</Text>
                      {renderHistory(compulsory, 'Chưa có giao dịch tiết kiệm bắt buộc.')}
                    </View>
                  ) : null}
                </View>
              ) : null}

              {voluntary ? (
                <View className="overflow-hidden rounded-2xl shadow-md border border-[#cfead8] bg-white">
                  <Pressable
                    onPress={() => toggle('VOLUNTARY')}
                    className="w-full bg-[#D8F1E3] p-4"
                  >
                    <Text className="text-[18px] font-semibold text-[#0F5132]">Tiết kiệm tự nguyện</Text>
                    <View className="mt-3 space-y-1">
                      <Text className="text-[15px] font-medium text-[#6C757D]">
                        Tổng số dư{' '}
                        <Text className="text-xs font-normal italic text-[#6C757D]">
                          (Giao dịch gần nhất: {voluntary.lastTxnDate ? formatDate(voluntary.lastTxnDate) : 'Chưa có giao dịch'})
                        </Text>
                      </Text>
                      <Text className="text-2xl font-bold text-[#0F5132]">
                        {formatCurrency(voluntary.currentBalance)}
                      </Text>
                    </View>
                    <View className="mt-3 items-center">
                      <Text
                        className="text-[#0F5132]/70"
                        style={{ transform: [{ rotate: expanded === 'VOLUNTARY' ? '180deg' : '0deg' }] }}
                      >
                        ˅
                      </Text>
                    </View>
                  </Pressable>
                  {expanded === 'VOLUNTARY' ? (
                    <View className="border-t border-black/5 bg-white p-5">
                      <Text className="text-base font-semibold text-[#333]">Lịch sử giao dịch</Text>
                      {renderHistory(voluntary, 'Chưa có giao dịch tiết kiệm tự nguyện.')}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
    </MobileFrame>
  );
};

export default SavingsScreen;
