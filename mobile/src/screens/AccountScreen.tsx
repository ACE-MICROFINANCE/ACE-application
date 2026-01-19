import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { MobileFrame } from '@components/layout/MobileFrame';
import { Card } from '@components/ui/Card';
import { useAuth } from '@contexts/AuthContext';
import { AppButton } from '@components/ui/AppButton';
import { ChangePasswordForm } from '@components/forms/ChangePasswordForm';
import { appApi } from '@services/appApi';

const formatDate = (val?: string | null) => {
  if (!val) return '-';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const AccountScreen = () => {
  const { customer, logout, mustChangePassword } = useAuth();
  const [changeOpen, setChangeOpen] = useState(mustChangePassword);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(customer);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const merged = useMemo(() => profile || customer || {}, [profile, customer]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const me = await appApi.getProfile?.();
        if (mounted) setProfile(me);
      } catch (e: any) {
        // Hiển thị dữ liệu đã có (customer) nếu API lỗi
        if (mounted) setError('Không tải được thông tin tài khoản.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <MobileFrame withBottomPadding>
      <View className="pt-6 pb-4">
        <Card className="rounded-2xl bg-white shadow-lg p-6 space-y-4">
          <View className="items-center">
            <Text className="text-lg font-semibold text-[#333]">Thông tin bà con</Text>
          </View>

          {loading ? <Text className="text-center text-sm text-[#666]">Đang tải...</Text> : null}
          {error ? <Text className="text-center text-sm text-red-500">{error}</Text> : null}

          <View className="space-y-2 opacity-100">
            <View className="flex-row justify-between">
              <Text className="text-[#555] text-sm">Họ tên</Text>
              <Text className="text-sm font-semibold text-[#333]" numberOfLines={1}>
                {merged?.fullName || '-'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[#555] text-sm">Mã khách hàng</Text>
              <Text className="text-sm font-semibold text-[#333]">
                {merged?.customerId || merged?.memberNo || '-'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[#555] text-sm">Số CMT/CCCD</Text>
              <Text className="text-sm font-semibold text-[#333]">{merged?.idCardNumber || '-'}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[#555] text-sm">Điện thoại</Text>
              <Text className="text-sm font-semibold text-[#333]">{merged?.phoneNumber || '-'}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[#555] text-sm">Nhóm/Vùng</Text>
              <Text className="text-sm font-semibold text-[#333]">
                {merged?.groupName || merged?.groupCode || '-'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[#555] text-sm">Vòng vay</Text>
              <Text className="text-sm font-semibold text-[#333]">
                {merged?.loanCycle !== undefined && merged?.loanCycle !== null ? merged.loanCycle : '-'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[#555] text-sm">Ngày tham gia</Text>
              <Text className="text-sm font-semibold text-[#333]">
                {formatDate(merged?.membershipStartDate)}
              </Text>
            </View>
          </View>

          <View className="space-y-3 pt-2">
            <AppButton title="Đổi mật khẩu" bgColor="#1d63b3" className="mt-0" onPress={() => setChangeOpen(true)} />
            <AppButton
              title="Gửi góp ý"
              bgColor="#f39c12"
              className="mt-0"
              onPress={() => {
                setFeedback('');
                setFeedbackMsg(null);
                setFeedbackOpen(true);
              }}
            />
            <AppButton
              title="Liên hệ CCO"
              bgColor="#10b981"
              className="mt-0"
              onPress={() => Linking.openURL('tel:0877500429')}
            />
            <AppButton
              title="Đăng xuất"
              bgColor="#e53935"
              className="mt-0"
              onPress={async () => {
                await logout();
              }}
            />
          </View>
        </Card>
      </View>

      <Modal transparent visible={changeOpen} animationType="fade" onRequestClose={() => !mustChangePassword && setChangeOpen(false)}>
        <View className="flex-1 bg-black/40 items-center justify-center px-4">
          <View className="w-full max-w-md rounded-[28px] border border-black/5 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] overflow-hidden">
            <View className="flex-row items-center justify-center border-b border-black/5 px-6 py-5">
              <Text className="text-[17px] font-semibold text-[#111]">Đổi mật khẩu</Text>
              {!mustChangePassword ? (
                <Pressable
                  className="absolute right-4 top-4 h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-black/5"
                  onPress={() => setChangeOpen(false)}
                >
                  <Text className="text-lg text-[#333]">×</Text>
                </Pressable>
              ) : null}
            </View>
            <View className="px-6 pt-5 pb-[20px]">
              <ChangePasswordForm onSuccess={() => setChangeOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={feedbackOpen} animationType="fade" onRequestClose={() => setFeedbackOpen(false)}>
        <View className="flex-1 bg-black/40 items-center justify-center px-4">
          <View className="w-full max-w-md rounded-[24px] border border-black/5 bg-white p-5 shadow-lg">
            <Pressable
              className="absolute right-3 top-3 h-8 w-8 items-center justify-center rounded-full bg-black/5"
              onPress={() => setFeedbackOpen(false)}
            >
              <Text className="text-lg text-[#333]">×</Text>
            </Pressable>
            <Text className="text-lg font-semibold text-center text-[#333] mb-3">Gửi phản hồi</Text>
            <TextInput
              className="w-full min-h-[120px] rounded-2xl border border-[#d9d9d9] px-3 py-2 text-base text-[#333]"
              placeholder="Nhập nội dung bạn muốn gửi..."
              multiline
              value={feedback}
              onChangeText={setFeedback}
            />
              {feedbackMsg ? <Text className="mt-2 text-sm text-emerald-600">{feedbackMsg}</Text> : null}
            <View className="mt-3 flex-row gap-2">
              <View className="flex-1">
                <AppButton
                  title="Gửi"
                  onPress={() => {
                    if (!feedback.trim()) {
                      setFeedbackMsg('Vui lòng nhập nội dung phản hồi.');
                      return;
                    }
                    appApi
                      .sendFeedback(feedback.trim())
                      .then(() => {
                        setFeedbackMsg('Cảm ơn bạn đã gửi góp ý!');
                        setFeedbackOpen(false);
                      })
                      .catch(() => setFeedbackMsg('Gửi góp ý thất bại, thử lại sau.'));
                  }}
                />
              </View>
              <View className="flex-1">
                <AppButton title="Hủy" className="bg-gray-300 text-[#333]" onPress={() => setFeedbackOpen(false)} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </MobileFrame>
  );
};

export default AccountScreen;
