import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Switch,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MobileFrame } from '@components/layout/MobileFrame';
import { Card } from '@components/ui/Card';
import { AppButton } from '@components/ui/AppButton';
import { useProfileStore } from '@store/profileStore';
import {
  appApi,
  type CreateCustomerAccountPayload,
  type ResetCustomerPasswordPayload,
  type StaffCustomerDetail,
  type StaffCustomerItem,
} from '@services/appApi';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

type ModalMode = 'create' | 'edit' | null;

type StatusBadge = { text: string; className: string };

const buildStatusBadge = (isActive?: boolean | null): StatusBadge => {
  if (isActive === undefined || isActive === null) {
    return { text: 'Chưa có tài khoản', className: 'border-slate-100 bg-slate-50 text-slate-600' };
  }
  return isActive
    ? { text: 'Đang hoạt động', className: 'border-emerald-100 bg-emerald-50 text-emerald-700' }
    : { text: 'Bị khóa', className: 'border-rose-100 bg-rose-50 text-rose-700' };
};

const formatBranchGroup = (branchName?: string | null, groupName?: string | null) => {
  const branchText = branchName?.trim() || '-';
  const groupText = groupName?.trim() || '-';
  return `${branchText} • ${groupText}`;
};

const StaffCustomersScreen = () => {
  const { profile } = useProfileStore();
  const isStaff = profile?.actorKind === 'STAFF';
  const insets = useSafeAreaInsets();

  // ✅ giống StaffManageScreen: lấy tabbar height để đặt FAB không bị chìm
  const tabBarHeight = useBottomTabBarHeight();
  const CONTAINER_MAX_W = 480;
  const [contentWidth, setContentWidth] = useState<number>(0);

  const TAB_FALLBACK = 110; // fallback nếu tabBarHeight không trả về
  const tabH = Math.max(tabBarHeight || 0, TAB_FALLBACK);

  const BUTTON_H = 56;
  const floatingBottom = tabH + 12;

  const { height: WIN_H } = Dimensions.get('window');
  const MODAL_H = Math.min(WIN_H * 0.86, 720);

  const [customers, setCustomers] = useState<StaffCustomerItem[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [query, setQuery] = useState('');
  const searchRef = useRef<TextInput | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedDetail, setSelectedDetail] = useState<StaffCustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [formMemberNo, setFormMemberNo] = useState('');
  const [formInitialPassword, setFormInitialPassword] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const [showTempPassword, setShowTempPassword] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [accessibilityLoading, setAccessibilityLoading] = useState(false);

  const fetchCustomers = async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await appApi.getStaffCustomers(q?.trim() || undefined);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Không tải được danh sách khách hàng.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (memberNo: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await appApi.getStaffCustomerDetail(memberNo);
      setSelectedDetail(data);
      setShowTempPassword(false);
    } catch (e: any) {
      setDetailError(e?.response?.data?.message ?? 'Không tải được thông tin khách hàng.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!isStaff) return;
    fetchCustomers();
  }, [isStaff]);

  useEffect(() => {
    if (!isStaff) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(searchValue.trim());
    }, 280);
  }, [searchValue, isStaff]);

  useEffect(() => {
    if (!isStaff) return;
    fetchCustomers(query);
  }, [query, isStaff]);

  const openCreate = () => {
    setModalMode('create');
    setSelectedDetail(null);
    setFormMemberNo('');
    setFormInitialPassword('');
    setSaveError(null);
    setDetailError(null);
    setShowTempPassword(false);
    setShowResetPassword(false);
    setResetPassword('');
  };

  const openEdit = async (item: StaffCustomerItem) => {
    setModalMode('edit');
    setSaveError(null);
    setDetailError(null);
    setShowTempPassword(false);
    setShowResetPassword(false);
    setResetPassword('');
    await fetchDetail(item.memberNo);
  };

  const handleCancelSearch = () => {
    setSearchValue('');
    setQuery('');
    setIsSearchFocused(false);
    searchRef.current?.blur();
  };

  const handleCreateAccount = async () => {
    if (!formMemberNo.trim()) {
      setSaveError('Vui lòng nhập mã khách hàng.');
      return;
    }
    if (!formInitialPassword.trim()) {
      setSaveError('Vui lòng nhập mật khẩu ban đầu.');
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      const payload: CreateCustomerAccountPayload = {
        memberNo: formMemberNo.trim(),
        initialPassword: formInitialPassword.trim(),
      };
      await appApi.createCustomerAccountForStaff(payload);
      setModalMode(null);
      await fetchCustomers(query);
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? 'Không thể tạo tài khoản khách hàng.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedDetail) return;
    if (!resetPassword.trim()) {
      setSaveError('Vui lòng nhập mật khẩu tạm thời.');
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      const payload: ResetCustomerPasswordPayload = { newPassword: resetPassword.trim() };
      const result = await appApi.resetCustomerPasswordForStaff(selectedDetail.memberNo, payload);
      const tempPassword = (result as any)?.temporaryPassword ?? resetPassword.trim();
      setSelectedDetail((prev) =>
        prev
          ? {
              ...prev,
              credential: {
                isActive: prev.credential?.isActive ?? true,
                mustChangePassword: true,
                tempPassword,
              },
            }
          : prev,
      );
      setResetPassword('');
      setShowResetPassword(false);
      setShowTempPassword(true);
      await fetchCustomers(query);
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? 'Không thể đặt lại mật khẩu.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleToggleLock = async (lock: boolean) => {
    if (!selectedDetail) return;

    const confirmed = lock
      ? await new Promise<boolean>((resolve) =>
          Alert.alert('Khóa tài khoản?', 'Bạn có chắc muốn khóa tài khoản này?', [
            { text: 'Hủy', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Đồng ý', style: 'destructive', onPress: () => resolve(true) },
          ]),
        )
      : true;

    if (!confirmed) return;

    setLockLoading(true);
    setSaveError(null);
    try {
      await appApi.lockCustomerForStaff(selectedDetail.memberNo, lock);
      setSelectedDetail((prev) =>
        prev && prev.credential ? { ...prev, credential: { ...prev.credential, isActive: !lock } } : prev,
      );
      await fetchCustomers(query);
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? 'Không thể cập nhật trạng thái tài khoản.');
    } finally {
      setLockLoading(false);
    }
  };

  const handleToggleAccessibility = async (enabled: boolean) => {
    if (!selectedDetail) return;
    setAccessibilityLoading(true);
    setSaveError(null);
    try {
      await appApi.setCustomerAccessibilityForStaff(selectedDetail.memberNo, enabled);
      setSelectedDetail((prev) => (prev ? { ...prev, accessibilityEnabled: enabled } : prev));
      await fetchCustomers(query);
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? 'Không thể cập nhật trợ năng.');
    } finally {
      setAccessibilityLoading(false);
    }
  };

  const tempPassword = selectedDetail?.credential?.tempPassword ?? null;
  const mustChangeTemp = selectedDetail?.credential?.mustChangePassword;
  const showTempBlock = Boolean(tempPassword && mustChangeTemp);

  if (!isStaff) {
    return (
      <MobileFrame withBottomPadding>
        <View className="flex-1 items-center justify-center px-4">
          <Card className="w-full rounded-2xl">
            <Text className="text-center text-sm text-[#666]">Bạn không có quyền truy cập trang này.</Text>
          </Card>
        </View>
      </MobileFrame>
    );
  }

  return (
    <MobileFrame withBottomPadding>
      <ScrollView
        className="flex-1"
        // ✅ chừa đúng chỗ cho button + tabbar (không bị chìm)
        contentContainerStyle={{
          paddingTop: 32,
          paddingBottom: floatingBottom + BUTTON_H + 24,
          paddingHorizontal: 16,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          // ✅ đo width thật khung content để FAB canh đúng 480
          onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}
          style={{ alignSelf: 'center', width: '100%', maxWidth: CONTAINER_MAX_W, gap: 16 }}
        >
          <Card className="items-center rounded-2xl bg-[#E6F4EA] px-6 py-4 shadow-md">
            <Text className="text-lg font-semibold text-[#1f2933] text-center">Quản lý đối tác</Text>
          </Card>

          <View className="flex-row items-center gap-2">
            <View className="flex-1 rounded-2xl border border-black/5 bg-white px-3 py-2 shadow-sm">
              <TextInput
                ref={searchRef}
                value={searchValue}
                onChangeText={setSearchValue}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Tìm theo mã khách hàng hoặc họ tên..."
                className="text-sm text-[#111] py-1"
              />
            </View>
            {(isSearchFocused || searchValue.length > 0) && (
              <Pressable onPress={handleCancelSearch}>
                <Text className="text-sm font-medium text-[#007AFF]">Hủy</Text>
              </Pressable>
            )}
          </View>

          <View className="rounded-3xl border border-black/5 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.10)] overflow-hidden">
            {loading ? (
              <View className="px-4 py-6 items-center">
                <ActivityIndicator />
                <Text className="mt-2 text-sm text-[#666]">Đang tải...</Text>
              </View>
            ) : error ? (
              <Text className="px-4 py-6 text-center text-sm text-red-500">{error}</Text>
            ) : customers.length === 0 ? (
              <Text className="px-4 py-6 text-center text-sm text-[#666]">Chưa có khách hàng.</Text>
            ) : (
              customers.map((customer, index) => {
                const badge = buildStatusBadge(customer.isActive ?? null);
                const isLast = index === customers.length - 1;
                return (
                  <Pressable
                    key={customer.memberNo}
                    onPress={() => openEdit(customer)}
                    className="w-full px-4 py-4"
                    android_ripple={{ color: 'rgba(0,0,0,0.03)' }}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? 'rgba(0,0,0,0.03)' : 'transparent',
                      borderBottomWidth: isLast ? 0 : 1,
                      borderBottomColor: 'rgba(0,0,0,0.05)',
                      ...(Platform.OS === 'web' ? {} : {}),
                    })}
                  >
                    <View className="space-y-1">
                      <View className="flex-row items-start justify-between">
                        <Text className="text-sm font-semibold text-[#111]">
                          {customer.fullName || 'Khách hàng chưa cập nhật'}
                        </Text>
                        <Text className={`rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}>
                          {badge.text}
                        </Text>
                      </View>
                      <Text className="text-xs text-[#666]">Mã định danh: {customer.memberNo}</Text>
                      <Text className="text-xs text-[#666]">
                        Chi nhánh - Nhóm: {formatBranchGroup(customer.branchName, customer.groupName)}
                      </Text>
                      {customer.phoneNumber ? (
                        <Text className="text-xs text-[#666]">SĐT: {customer.phoneNumber}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* ✅ Button: canh đúng khung 480 + không chìm tabbar */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: floatingBottom,
          zIndex: 9999,
          elevation: 50,
          paddingHorizontal: 16,
          alignItems: 'center',
        }}
      >
        <View
          pointerEvents="box-none"
          style={{
            width: contentWidth || '100%',
            maxWidth: CONTAINER_MAX_W,
            position: 'relative',
            height: BUTTON_H,
          }}
        >
          <AppButton title="Thêm đối tác mới" onPress={openCreate} />
        </View>
      </View>

      <Modal visible={modalMode !== null} transparent animationType="fade" onRequestClose={() => setModalMode(null)}>
        <View className="flex-1 items-center justify-center bg-black/30 px-4">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalMode(null)} />
          <View className="w-full max-w-md overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-2xl">
            <View className="relative flex-row items-center justify-center border-b border-black/5 px-6 py-4">
              <Text className="text-[17px] font-semibold text-[#111]">
                {modalMode === 'create' ? 'Tạo tài khoản đối tác' : 'Thông tin đối tác'}
              </Text>
              <Pressable
                onPress={() => setModalMode(null)}
                className="absolute right-4 top-3 h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-black/5"
              >
                <Text className="text-base text-[#333]">×</Text>
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: MODAL_H }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingTop: 16,
                paddingBottom: insets.bottom + 24,
                gap: 12,
              }}
            >
              {modalMode === 'create' ? (
                <>
                  <View className="space-y-2">
                    <Text className="text-xs font-medium text-[#6C757D]">Mã định danh</Text>
                    <TextInput
                      value={formMemberNo}
                      onChangeText={setFormMemberNo}
                      placeholder="Nhập mã đối tác"
                      className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                    />
                  </View>

                  <View className="space-y-2">
                    <Text className="text-xs font-medium text-[#6C757D]">Mật khẩu ban đầu</Text>
                    <TextInput
                      secureTextEntry
                      value={formInitialPassword}
                      onChangeText={setFormInitialPassword}
                      placeholder="Nhập mật khẩu"
                      className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                    />
                  </View>

                  {saveError ? <Text className="text-sm text-red-500">{saveError}</Text> : null}
                  <AppButton title="Tạo tài khoản" onPress={handleCreateAccount} loading={saveLoading} />
                </>
              ) : null}

              {modalMode === 'edit' ? (
                <>
                  {detailLoading ? (
                    <View className="items-center">
                      <ActivityIndicator />
                      <Text className="mt-2 text-sm text-[#666]">Đang tải thông tin...</Text>
                    </View>
                  ) : detailError ? (
                    <Text className="text-center text-sm text-red-500">{detailError}</Text>
                  ) : selectedDetail ? (
                    <>
                      <View className="space-y-1 rounded-2xl border border-black/5 bg-white px-4 py-3">
                        <Text className="text-xs font-medium text-[#6C757D]">Mã đối tác</Text>
                        <Text className="text-sm font-semibold text-[#111]">{selectedDetail.memberNo}</Text>
                      </View>

                      <View className="space-y-1 rounded-2xl border border-black/5 bg-white px-4 py-3">
                        <Text className="text-xs font-medium text-[#6C757D]">Họ và tên</Text>
                        <Text className="text-sm font-semibold text-[#111]">
                          {selectedDetail.fullName || 'Khách hàng chưa cập nhật'}
                        </Text>
                      </View>

                      <View className="space-y-2 rounded-2xl border border-black/5 bg-white px-4 py-3">
                        <View className="flex-row items-center justify-between">
                          <View className="space-y-1">
                            <Text className="text-sm font-semibold text-[#111]">Khóa tài khoản</Text>
                            <Text className="text-xs text-[#6C757D]">
                              {selectedDetail.credential
                                ? 'Bật để vô hiệu hóa đăng nhập'
                                : 'Khách hàng chưa có tài khoản'}
                            </Text>
                          </View>
                          <Switch
                            value={Boolean(selectedDetail.credential && !selectedDetail.credential.isActive)}
                            onValueChange={(nextSelected) => handleToggleLock(nextSelected)}
                            disabled={!selectedDetail.credential || lockLoading}
                            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                            thumbColor="#fff"
                          />
                        </View>
                      </View>

                      <View className="space-y-2 rounded-2xl border border-black/5 bg-white px-4 py-3">
                        <View className="flex-row items-center justify-between">
                          <View className="space-y-1">
                            <Text className="text-sm font-semibold text-[#111]">Trợ năng</Text>
                            <Text className="text-xs text-[#6C757D]">Bật để hỗ trợ bà con mù chữ</Text>
                          </View>
                          <Switch
                            value={Boolean(selectedDetail.accessibilityEnabled)}
                            onValueChange={(nextEnabled) => handleToggleAccessibility(nextEnabled)}
                            disabled={accessibilityLoading}
                            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                            thumbColor="#fff"
                          />
                        </View>
                      </View>

                      {showTempBlock ? (
                        <View className="space-y-2 rounded-2xl border border-black/5 bg-white px-4 py-3">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-sm font-semibold text-[#111]">Mật khẩu tạm thời hiện tại</Text>
                            <Pressable onPress={() => setShowTempPassword((prev) => !prev)}>
                              <Text className="text-xs font-medium text-[#007AFF]">
                                {showTempPassword ? 'Ẩn' : 'Hiện'}
                              </Text>
                            </Pressable>
                          </View>
                          <Text className="text-sm text-[#111]">{showTempPassword ? tempPassword : '********'}</Text>
                        </View>
                      ) : null}

                      <View className="space-y-2 rounded-2xl border border-black/5 bg-white px-4 py-3">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm font-semibold text-[#111]">Đặt lại mật khẩu</Text>
                          <Pressable onPress={() => setShowResetPassword((prev) => !prev)}>
                            <Text className="text-sm font-medium text-[#007AFF]">{showResetPassword ? 'Ẩn' : 'Mở'}</Text>
                          </Pressable>
                        </View>
                        {showResetPassword ? (
                          <View className="space-y-2">
                            <TextInput
                              secureTextEntry
                              value={resetPassword}
                              onChangeText={setResetPassword}
                              placeholder="Mật khẩu tạm thời"
                              className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                            />
                            <AppButton title="Xác nhận" onPress={handleResetPassword} loading={saveLoading} />
                          </View>
                        ) : null}
                      </View>

                      {saveError ? <Text className="text-sm text-red-500">{saveError}</Text> : null}
                    </>
                  ) : null}
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </MobileFrame>
  );
};

export default StaffCustomersScreen;
