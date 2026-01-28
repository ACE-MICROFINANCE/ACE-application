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
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [socialPhone, setSocialPhone] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(customer);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const merged = useMemo(() => profile || customer || {}, [profile, customer]);
  const actorKind = merged?.actorKind;
  const staffRole = merged?.role;
  const isCustomer = actorKind === 'CUSTOMER';
  const isStaff = actorKind === 'STAFF';
  const isSuperAdmin = isStaff && staffRole === 'SUPER_ADMIN';
  const isAdmin = isStaff && staffRole === 'ADMIN';

  const t = isSuperAdmin
    ? {
        accountTitle: 'Account Information',
        loading: 'Loading...',
        changePassword: 'Change password',
        sendFeedback: 'Send feedback',
        contactCco: 'Contact CCO',
        logout: 'Logout',
        noContact: 'No contact number.',
        feedbackTitle: 'Send feedback',
        feedbackPlaceholder: 'Enter your feedback...',
        feedbackSend: 'Send',
        feedbackEmpty: 'Please enter feedback content.',
        feedbackSuccess: 'Thanks for your feedback!',
        feedbackFail: 'Send feedback failed, please try again.',
        close: 'Close',
        changePwdTitle: 'Change password',
        contactError: 'No contact number.',
      }
    : {
        accountTitle: 'Thông tin tài khoản',
        loading: 'Đang tải...',
        changePassword: 'Đổi mật khẩu',
        sendFeedback: 'Gửi phản hồi',
        contactCco: 'Liên hệ CCO',
        logout: 'Đăng xuất',
        noContact: 'Chưa có số liên hệ.',
        feedbackTitle: 'Gửi phản hồi',
        feedbackPlaceholder: 'Nhập nội dung bạn muốn gửi...',
        feedbackSend: 'Gửi',
        feedbackEmpty: 'Vui lòng nhập nội dung phản hồi.',
        feedbackSuccess: 'Cảm ơn bạn đã gửi góp ý!',
        feedbackFail: 'Gửi phản hồi thất bại, thử lại sau.',
        close: 'Đóng',
        changePwdTitle: 'Đổi mật khẩu',
        contactError: 'Chưa có số liên hệ.',
      };

  const lbl = isSuperAdmin
    ? {
        fullName: 'Full name',
        customerId: 'Customer ID',
        idCard: 'ID/Passport',
        phone: 'Phone',
        group: 'Group/Area',
        loanCycle: 'Loan cycle',
        joined: 'Joined date',
        role: 'Role',
        branch: 'Branch',
      }
    : {
        fullName: 'Họ tên',
        customerId: 'Mã khách hàng',
        idCard: 'Số CMT/CCCD',
        phone: 'Điện thoại',
        group: 'Nhóm/Vùng',
        loanCycle: 'Vòng vay',
        joined: 'Ngày tham gia',
        role: 'Vai trò',
        branch: 'Chi nhánh',
      };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const me = await appApi.getProfile?.();
        if (mounted) setProfile(me);
      } catch (e: any) {
        // // Hiển thị dữ liệu đã có (customer) nếu API lỗi
        // if (mounted) setError('Không tải được thông tin tài khoản.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const code = merged?.branchCode;
    if (!isCustomer) {
      setSocialPhone(null);
      setContactError(null);
      return () => {
        mounted = false;
      };
    }
    if (!code) {
      setSocialPhone(null);
      return () => {
        mounted = false;
      };
    }

    (async () => {
      try {
        setContactError(null);
        const res = await appApi.getContactsByBranchCode(code);
        if (!mounted) return;
        const phone = res?.socialPhone ?? null;
        setSocialPhone(phone);
        setContactError(phone ? null : t.noContact);
      } catch {
        if (mounted) {
          setSocialPhone(null);
          setContactError(t.noContact);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [merged?.branchCode, isCustomer]);

  const isMeaningful = (val: any) => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') return val.trim().length > 0;
    if (typeof val === 'number') return Number.isFinite(val);
    return true;
  };

  const rows = useMemo(() => {
    const r: Array<{ label: string; value: string | number }> = [];

    if (isCustomer) {
      const idCode = merged?.customerId || merged?.memberNo;
      if (isMeaningful(merged?.fullName)) r.push({ label: lbl.fullName, value: merged.fullName });
      if (isMeaningful(idCode)) r.push({ label: lbl.customerId, value: idCode });
      if (isMeaningful(merged?.idCardNumber)) r.push({ label: lbl.idCard, value: merged.idCardNumber });
      if (isMeaningful(merged?.phoneNumber)) r.push({ label: lbl.phone, value: merged.phoneNumber });
      const group = merged?.groupName || merged?.groupCode;
      if (isMeaningful(group)) r.push({ label: lbl.group, value: group });
      if (isMeaningful(merged?.loanCycle)) r.push({ label: lbl.loanCycle, value: merged.loanCycle });
      if (merged?.membershipStartDate) {
        r.push({ label: lbl.joined, value: formatDate(merged.membershipStartDate) });
      }
    } else if (isStaff) {
      if (isMeaningful(merged?.fullName)) r.push({ label: lbl.fullName, value: merged.fullName });
      if (isMeaningful(merged?.email)) r.push({ label: 'Email', value: merged.email });
      if (isMeaningful(merged?.role)) r.push({ label: lbl.role, value: merged.role });
      const branchText =
        merged?.branchCode || merged?.branchName
          ? `${merged.branchCode ?? ''}${merged.branchName ? ` - ${merged.branchName}` : ''}`.trim()
          : '';
      if (isMeaningful(branchText)) r.push({ label: lbl.branch, value: branchText });
    }

    return r;
  }, [isCustomer, isStaff, merged]);

  return (
    <MobileFrame withBottomPadding>
      <View className="pt-6 pb-4">
        <Card className="rounded-2xl bg-white shadow-lg p-6 space-y-4">
          <View className="items-center">
            <Text className="text-lg font-semibold text-[#333]">{t.accountTitle}</Text>
          </View>

          {loading ? <Text className="text-center text-sm text-[#666]">{t.loading}</Text> : null}
          {error ? <Text className="text-center text-sm text-red-500">{error}</Text> : null}

          <View className="space-y-2 opacity-100">
            {rows.map((row) => (
              <View className="flex-row justify-between" key={`${row.label}-${row.value}`}>
                <Text className="text-[#555] text-sm">{row.label}</Text>
                <Text className="text-sm font-semibold text-[#333]" numberOfLines={1}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>

          <View className="space-y-3 pt-2">
            <AppButton title={t.changePassword} bgColor="#1d63b3" className="mt-0" onPress={() => setChangeOpen(true)} />
            {isCustomer ? (
              <>
                <AppButton
                  title={t.sendFeedback}
                  bgColor="#f39c12"
                  className="mt-0"
                  onPress={() => {
                    setFeedback('');
                    setFeedbackMsg(null);
                    setFeedbackOpen(true);
                  }}
                />
                <AppButton
                  title={t.contactCco}
                  bgColor="#10b981"
                  className="mt-0"
                  onPress={() => {
                    if (!socialPhone) {
                      setContactError(t.contactError);
                      return;
                    }
                    Linking.openURL(`tel:${socialPhone}`);
                  }}
                />
              </>
            ) : null}
            <AppButton
              title={t.logout}
              bgColor="#e53935"
              className="mt-0"
              onPress={async () => {
                await logout();
              }}
            />
          </View>

          {isCustomer && contactError ? (
            <Text className="text-xs text-red-500 text-center">{contactError}</Text>
          ) : null}
        </Card>
      </View>

      <Modal transparent visible={changeOpen} animationType="fade" onRequestClose={() => !mustChangePassword && setChangeOpen(false)}>
        <View className="flex-1 bg-black/40 items-center justify-center px-4">
          <View className="w-full max-w-md rounded-[28px] border border-black/5 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] overflow-hidden">
            <View className="flex-row items-center justify-center border-b border-black/5 px-6 py-5">
              <Text className="text-[17px] font-semibold text-[#111]">{t.changePwdTitle}</Text>
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
              <ChangePasswordForm onSuccess={() => setChangeOpen(false)} locale={isSuperAdmin ? 'en' : 'vi'} />
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
            <Text className="text-lg font-semibold text-center text-[#333] mb-3">{t.feedbackTitle}</Text>
              <TextInput
                className="w-full min-h-[120px] rounded-2xl border border-[#d9d9d9] px-3 py-2 text-base text-[#333]"
                placeholder={t.feedbackPlaceholder}
                placeholderTextColor="#9ca3af"
                multiline
                value={feedback}
                onChangeText={setFeedback}
              />
            {feedbackMsg ? (
              <Text
                className={`mt-2 text-sm ${
                  feedbackMsg.includes('fail') || feedbackMsg.includes('thất bại') ? 'text-red-500' : 'text-emerald-600'
                }`}
              >
                {feedbackMsg}
              </Text>
            ) : null}
            <View className="mt-3 flex-row gap-2">
              <View className="flex-1">
                <AppButton
                  title={t.feedbackSend}
                  loading={feedbackSending}
                  disabled={feedbackSending}
                  onPress={async () => {
                    const content = feedback.trim();
                    if (!content) {
                      setFeedbackMsg(t.feedbackEmpty);
                      return;
                    }
                    try {
                      setFeedbackSending(true);
                      setFeedbackMsg(null);
                      await appApi.sendFeedback(content);
                      setFeedbackMsg(t.feedbackSuccess);
                      setFeedback('');
                    } catch {
                      setFeedbackMsg(t.feedbackFail);
                    } finally {
                      setFeedbackSending(false);
                    }
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </MobileFrame>
  );
};

export default AccountScreen;
