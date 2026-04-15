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
import { PaginationBar } from '@components/ui/PaginationBar';
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
const PAGE_LIMIT = 20;

type StatusBadge = { text: string; className: string };

const buildStatusBadge = (isActive?: boolean | null): StatusBadge => {
  if (isActive === undefined || isActive === null) {
    return { text: 'No account', className: 'border-slate-100 bg-slate-50 text-slate-600' };
  }
  return isActive
    ? { text: 'Active', className: 'border-emerald-100 bg-emerald-50 text-emerald-700' }
    : { text: 'Locked', className: 'border-rose-100 bg-rose-50 text-rose-700' };
};

const formatBranchGroup = (branchName?: string | null, groupName?: string | null) => {
  const branchText = branchName?.trim() || '-';
  const groupText = groupName?.trim() || '-';
  return `${branchText} • ${groupText}`;
};

const StaffCustomersScreen = () => {
  const { profile } = useProfileStore();
  const isStaff = profile?.actorKind === 'STAFF';
  const isBA = profile?.role === 'BA';
  const insets = useSafeAreaInsets();

  // Same as StaffManageScreen: use tabBar height to keep FAB visible
  const tabBarHeight = useBottomTabBarHeight();
  const CONTAINER_MAX_W = 480;
  const [contentWidth, setContentWidth] = useState<number>(0);

  const TAB_FALLBACK = 110; // fallback when tabBarHeight is unavailable
  const tabH = Math.max(tabBarHeight || 0, TAB_FALLBACK);

  const BUTTON_H = 56;
  const floatingBottom = tabH + 12;

  const { height: WIN_H } = Dimensions.get('window');
  const MODAL_H = Math.min(WIN_H * 0.86, 720);

  const [customers, setCustomers] = useState<StaffCustomerItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCustomers, setTotalCustomers] = useState(0);
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

  const fetchCustomers = async (options?: { q?: string; page?: number }) => {
    const q = options?.q?.trim() || undefined;
    const page = options?.page ?? 1;
    setLoading(true);
    setError(null);
    try {
      const data = await appApi.getStaffCustomers({ q, page, limit: PAGE_LIMIT });
      setCustomers(data?.items ?? []);
      setCurrentPage(data?.page ?? page);
      setHasMore(Boolean(data?.hasMore));
      setTotalCustomers(data?.total ?? 0);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Unable to load customer list.');
      setCustomers([]);
      setCurrentPage(1);
      setHasMore(false);
      setTotalCustomers(0);
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
      setDetailError(e?.response?.data?.message ?? 'Unable to load customer details.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!isStaff) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(searchValue.trim());
    }, 280);
  }, [searchValue, isStaff]);

  useEffect(() => {
    if (!isStaff) return;
    fetchCustomers({ q: query, page: 1 });
  }, [query, isStaff]);

  const handlePageChange = async (page: number) => {
    if (loading || page === currentPage) return;
    await fetchCustomers({ q: query, page });
  };

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
      setSaveError('Please enter customer ID.');
      return;
    }
    if (!formInitialPassword.trim()) {
      setSaveError('Please enter initial password.');
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
      await fetchCustomers({ q: query, page: 1 });
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? 'Unable to create customer account.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedDetail) return;
    if (!resetPassword.trim()) {
      setSaveError('Please enter temporary password.');
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
      await fetchCustomers({ q: query, page: 1 });
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? 'Unable to reset password.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleToggleLock = async (lock: boolean) => {
    if (!selectedDetail) return;

    const confirmed = lock
      ? await new Promise<boolean>((resolve) =>
          Alert.alert('Lock account?', 'Are you sure you want to lock this account?', [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Confirm', style: 'destructive', onPress: () => resolve(true) },
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
      await fetchCustomers({ q: query, page: 1 });
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? 'Unable to update account status.');
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
      await fetchCustomers({ q: query, page: 1 });
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? 'Unable to update accessibility.');
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
            <Text className="text-center text-sm text-[#666]">You do not have access to this screen.</Text>
          </Card>
        </View>
      </MobileFrame>
    );
  }

  return (
    <MobileFrame withBottomPadding>
      <ScrollView
        className="flex-1"
        // Keep enough room for button + tab bar
        contentContainerStyle={{
          paddingTop: 32,
          paddingBottom: floatingBottom + BUTTON_H + 24,
          paddingHorizontal: 16,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          // Measure real content width so FAB aligns with max 480
          onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}
          style={{ alignSelf: 'center', width: '100%', maxWidth: CONTAINER_MAX_W, gap: 16 }}
        >
          <Card className="items-center rounded-2xl bg-[#E6F4EA] px-6 py-4 shadow-md">
            <Text className="text-lg font-semibold text-[#1f2933] text-center">Partner Management</Text>
          </Card>

          <View className="flex-row items-center gap-2">
            <View className="flex-1 rounded-2xl border border-black/5 bg-white px-3 py-2 shadow-sm">
              <TextInput
                ref={searchRef}
                value={searchValue}
                onChangeText={setSearchValue}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search by customer ID or full name..."
                className="text-sm text-[#111] py-1"
                placeholderTextColor="#C5CCD7"
              />
            </View>
            {(isSearchFocused || searchValue.length > 0) && (
              <Pressable onPress={handleCancelSearch}>
                <Text className="text-sm font-medium text-[#007AFF]">Cancel</Text>
              </Pressable>
            )}
          </View>

          <View className="rounded-3xl border border-black/5 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.10)] overflow-hidden">
            {loading ? (
              <View className="px-4 py-6 items-center">
                <ActivityIndicator />
                <Text className="mt-2 text-sm text-[#666]">Loading...</Text>
              </View>
            ) : error ? (
              <Text className="px-4 py-6 text-center text-sm text-red-500">{error}</Text>
            ) : customers.length === 0 ? (
              <Text className="px-4 py-6 text-center text-sm text-[#666]">No customers found.</Text>
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
                          {customer.fullName || 'Customer not updated'}
                        </Text>
                        <Text className={`rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}>
                          {badge.text}
                        </Text>
                      </View>
                      <Text className="text-xs text-[#666]">ID: {customer.memberNo}</Text>
                      <Text className="text-xs text-[#666]">
                        Branch - Group: {formatBranchGroup(customer.branchName, customer.groupName)}
                      </Text>
                      {customer.phoneNumber ? (
                        <Text className="text-xs text-[#666]">Phone: {customer.phoneNumber}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

          {!loading && customers.length > 0 ? (
            <PaginationBar
              currentPage={currentPage}
              totalItems={totalCustomers}
              pageSize={PAGE_LIMIT}
              onPageChange={(page) => void handlePageChange(page)}
              disabled={loading}
            />
          ) : null}
        </View>
      </ScrollView>

      {/* Button aligned with max content width and above tab bar */}
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
          <AppButton title="Add New Partner" onPress={openCreate} />
        </View>
      </View>

      <Modal visible={modalMode !== null} transparent animationType="fade" onRequestClose={() => setModalMode(null)}>
        <View className="flex-1 items-center justify-center bg-black/30 px-4">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalMode(null)} />
          <View className="w-full max-w-md overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-2xl">
            <View className="relative flex-row items-center justify-center border-b border-black/5 px-6 py-4">
              <Text className="text-[17px] font-semibold text-[#111]">
                {modalMode === 'create' ? 'Create Partner Account' : 'Partner Details'}
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
                    <Text className="text-xs font-medium text-[#6C757D]">Identifier</Text>
                <TextInput
                  value={formMemberNo}
                  onChangeText={setFormMemberNo}
                  placeholder="Enter partner ID"
                  className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                  placeholderTextColor="#C5CCD7"
                />
                  </View>

                  <View className="space-y-2">
                    <Text className="text-xs font-medium text-[#6C757D]">Initial Password</Text>
                <TextInput
                  secureTextEntry
                  value={formInitialPassword}
                  onChangeText={setFormInitialPassword}
                  placeholder="Enter password"
                  className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                  placeholderTextColor="#C5CCD7"
                />
                  </View>

                  {saveError ? <Text className="text-sm text-red-500">{saveError}</Text> : null}
                  <AppButton title="Create Account" onPress={handleCreateAccount} loading={saveLoading} />
                </>
              ) : null}

              {modalMode === 'edit' ? (
                <>
                  {detailLoading ? (
                    <View className="items-center">
                      <ActivityIndicator />
                      <Text className="mt-2 text-sm text-[#666]">Loading details...</Text>
                    </View>
                  ) : detailError ? (
                    <Text className="text-center text-sm text-red-500">{detailError}</Text>
                  ) : selectedDetail ? (
                    <>
                      <View className="space-y-1 rounded-2xl border border-black/5 bg-white px-4 py-3">
                        <Text className="text-xs font-medium text-[#6C757D]">Partner ID</Text>
                        <Text className="text-sm font-semibold text-[#111]">{selectedDetail.memberNo}</Text>
                      </View>

                      <View className="space-y-1 rounded-2xl border border-black/5 bg-white px-4 py-3">
                        <Text className="text-xs font-medium text-[#6C757D]">Full Name</Text>
                        <Text className="text-sm font-semibold text-[#111]">
                          {selectedDetail.fullName || 'Customer not updated'}
                        </Text>
                      </View>

                      {!isBA ? (
                        <View className="space-y-2 rounded-2xl border border-black/5 bg-white px-4 py-3">
                          <View className="flex-row items-center justify-between">
                            <View className="space-y-1">
                              <Text className="text-sm font-semibold text-[#111]">Lock Account</Text>
                              <Text className="text-xs text-[#6C757D]">
                                {selectedDetail.credential
                                  ? 'Turn on to disable login'
                                  : 'Customer has no account yet'}
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
                      ) : null}

                      <View className="space-y-2 rounded-2xl border border-black/5 bg-white px-4 py-3">
                        <View className="flex-row items-center justify-between">
                          <View className="space-y-1">
                            <Text className="text-sm font-semibold text-[#111]">Accessibility</Text>
                            <Text className="text-xs text-[#6C757D]">Enable for low-literacy support</Text>
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
                            <Text className="text-sm font-semibold text-[#111]">Current Temporary Password</Text>
                            <Pressable onPress={() => setShowTempPassword((prev) => !prev)}>
                              <Text className="text-xs font-medium text-[#007AFF]">
                                {showTempPassword ? 'Hide' : 'Show'}
                              </Text>
                            </Pressable>
                          </View>
                          <Text className="text-sm text-[#111]">{showTempPassword ? tempPassword : '********'}</Text>
                        </View>
                      ) : null}

                      <View className="space-y-2 rounded-2xl border border-black/5 bg-white px-4 py-3">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm font-semibold text-[#111]">Reset Password</Text>
                          <Pressable onPress={() => setShowResetPassword((prev) => !prev)}>
                            <Text className="text-sm font-medium text-[#007AFF]">{showResetPassword ? 'Hide' : 'Open'}</Text>
                          </Pressable>
                        </View>
                        {showResetPassword ? (
                          <View className="space-y-2">
                            <TextInput
                              secureTextEntry
                              value={resetPassword}
                              onChangeText={setResetPassword}
                              placeholder="Temporary password"
                              className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                              placeholderTextColor="#C5CCD7"
                            />
                            <AppButton title="Confirm" onPress={handleResetPassword} loading={saveLoading} />
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
