'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Modal, ModalBody, ModalContent, ModalHeader, Switch } from '@heroui/react';
import { Plus, X } from 'lucide-react';
import { AceCard } from '@/share/ui/AceCard';
import { AceInput } from '@/share/ui/AceInput';
import { AceReadOnlyRow } from '@/share/ui/AceReadOnlyRow';
import { scrollIntoViewOnFocus } from '@/share/ui/keyboard/scrollIntoViewOnFocus';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';
import {
  appApi,
  type CreateCustomerAccountPayload,
  type ResetCustomerPasswordPayload,
  type StaffCustomerDetail,
  type StaffCustomerItem,
} from '@/services/appApi';

type ModalMode = 'create' | 'edit' | null;

type CreateFormState = {
  memberNo: string;
  initialPassword: string;
};

const IOS_SWITCH_CLASSNAMES = {
  base: 'group inline-flex items-center',
  wrapper:
    'relative w-[52px] h-[28px] rounded-full border border-black/5 ' +
    'bg-[#E5E5EA] transition-colors duration-200 ' +
    'group-data-[selected=true]:!bg-[#34C759]',
  thumb:
    'absolute top-[2px] left-[2px] h-[24px] w-[24px] rounded-full bg-white ' +
    'shadow-[0_3px_10px_rgba(0,0,0,0.18)] transition-transform duration-200 ' +
    'group-data-[selected=true]:translate-x-[24px]',
  label: 'hidden',
};

const buildStatusBadge = (isActive?: boolean | null) => {
  if (isActive === undefined || isActive === null) {
    return {
      text: 'Chưa có tài khoản',
      className: 'border-slate-100 bg-slate-50 text-slate-600',
    };
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

export default function CustomerManagementPage() {
  const { isAuthenticated, isInitializing, mustChangePassword, profile } = useAuth();
  const router = useRouter();

  const isStaffActor = profile?.actorKind === 'STAFF';
  const isAdmin = profile?.role === 'ADMIN';
  const canAccess = isStaffActor || isAdmin;

  const [customers, setCustomers] = useState<StaffCustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchValue, setSearchValue] = useState('');
  const [query, setQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<StaffCustomerDetail | null>(null);

  const [createForm, setCreateForm] = useState<CreateFormState>({
    memberNo: '',
    initialPassword: '',
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showTempPassword, setShowTempPassword] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [accessibilityLoading, setAccessibilityLoading] = useState(false);

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace(routes.login);
      return;
    }
    if (mustChangePassword) {
      router.replace(`${routes.changePassword}?mode=force`);
      return;
    }
  }, [isAuthenticated, isInitializing, mustChangePassword, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchValue.trim());
    }, 280);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const fetchCustomers = async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await appApi.getStaffCustomers(q?.trim() || undefined);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Không tải được danh sách khách hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) return;
    fetchCustomers(query);
  }, [query, canAccess]);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedDetail(null);
    setDetailError(null);
    setSaveError(null);
    setShowTempPassword(false);
    setShowResetPassword(false);
    setResetPassword('');
    setCreateForm({ memberNo: '', initialPassword: '' });
  };

  const openEditModal = async (memberNo: string) => {
    setModalMode('edit');
    setSelectedDetail(null);
    setDetailError(null);
    setSaveError(null);
    setShowTempPassword(false);
    setShowResetPassword(false);
    setResetPassword('');
    setDetailLoading(true);
    try {
      const detail = await appApi.getStaffCustomerDetail(memberNo);
      setSelectedDetail(detail);
    } catch (err: any) {
      setDetailError(err?.response?.data?.message ?? 'Không tải được thông tin khách hàng.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCancelSearch = () => {
    setSearchValue('');
    setQuery('');
    setIsSearchFocused(false);
    searchRef.current?.blur();
  };

  const handleCreateAccount = async () => {
    const memberNo = createForm.memberNo.trim();
    const initialPassword = createForm.initialPassword.trim();
    if (!memberNo) {
      setSaveError('Vui lòng nhập mã khách hàng.');
      return;
    }
    if (!initialPassword) {
      setSaveError('Vui lòng nhập mật khẩu ban đầu.');
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      const payload: CreateCustomerAccountPayload = { memberNo, initialPassword };
      await appApi.createCustomerAccountForStaff(payload);
      setModalMode(null);
      await fetchCustomers(query);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? 'Không thể tạo tài khoản khách hàng.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedDetail) return;
    const newPassword = resetPassword.trim();
    if (!newPassword) {
      setSaveError('Vui lòng nhập mật khẩu tạm thời.');
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      const payload: ResetCustomerPasswordPayload = { newPassword };
      const result = await appApi.resetCustomerPasswordForStaff(selectedDetail.memberNo, payload);
      const tempPassword = result.temporaryPassword ?? newPassword;
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
      if (typeof window !== 'undefined') {
        window.alert('Đặt lại mật khẩu thành công.');
      }
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? 'Không thể đặt lại mật khẩu.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleToggleLock = async (locked: boolean) => {
    if (!selectedDetail) return;
    if (!selectedDetail.credential) return;
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm(locked ? 'Khóa tài khoản khách hàng này?' : 'Mở khóa tài khoản khách hàng này?')
        : true;
    if (!confirmed) return;
    setLockLoading(true);
    setSaveError(null);
    try {
      await appApi.lockCustomerForStaff(selectedDetail.memberNo, locked);
      setSelectedDetail((prev) =>
        prev && prev.credential
          ? {
              ...prev,
              credential: {
                ...prev.credential,
                isActive: !locked,
              },
            }
          : prev,
      );
      await fetchCustomers(query);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? 'Không thể cập nhật trạng thái tài khoản.');
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
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? 'Không thể cập nhật trợ năng.');
    } finally {
      setAccessibilityLoading(false);
    }
  };

  const listContent = useMemo(() => {
    if (loading) {
      return <p className="px-4 py-6 text-center text-sm text-[#666]">Đang tải...</p>;
    }
    if (error) {
      return <p className="px-4 py-6 text-center text-sm text-red-500">{error}</p>;
    }
    if (!customers.length) {
      return <p className="px-4 py-6 text-center text-sm text-[#666]">Chưa có khách hàng.</p>;
    }
    return (
      <div className="divide-y divide-black/5">
        {customers.map((customer) => {
          const badge = buildStatusBadge(customer.isActive ?? null);
          return (
            <button
              key={customer.memberNo}
              type="button"
              onClick={() => openEditModal(customer.memberNo)}
              className="w-full px-4 py-4 text-left transition active:scale-[0.99] active:bg-black/[0.03]"
            >
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[#111]">
                    {customer.fullName || 'Khách hàng chưa cập nhật'}
                  </p>
                  <span
                    className={clsx(
                      'rounded-full border px-3 py-1 text-xs font-semibold',
                      badge.className,
                    )}
                  >
                    {badge.text}
                  </span>
                </div>
                <p className="text-xs text-[#666]">Mã định danh: {customer.memberNo}</p>
                <p className="text-xs text-[#666]">
                  Chi nhánh - Nhóm: {formatBranchGroup(customer.branchName, customer.groupName)}
                </p>
                {customer.phoneNumber ? (
                  <p className="text-xs text-[#666]">SĐT: {customer.phoneNumber}</p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    );
  }, [customers, error, loading]);

  if (!canAccess && !isInitializing) {
    return (
      <div className="w-full min-h-[100dvh] bg-[#F2F2F7]">
        <div className="mx-auto w-full max-w-md px-4 pt-6">
          <div className="rounded-2xl bg-white p-4 text-center text-sm text-[#666] shadow-sm">
            Bạn không có quyền truy cập trang này.
          </div>
        </div>
      </div>
    );
  }

  const tempPassword = selectedDetail?.credential?.tempPassword ?? null;
  const showTempPasswordLabel = tempPassword && selectedDetail?.credential?.mustChangePassword;

  return (
    <div className="w-full min-h-[100dvh] bg-[#F2F2F7]">
      <div className="mx-auto w-full max-w-md px-4 pt-8 pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-col space-y-4">
          <AceCard className="rounded-2xl bg-[#E6F4EA] px-6 py-4 text-center shadow-md">
            <h1 className="text-lg font-semibold text-slate-900">Quản lý đối tác</h1>
          </AceCard>

          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-2xl border border-black/5 bg-white px-3 py-2 shadow-sm">
              <input
                ref={searchRef}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Tìm theo mã khách hàng hoặc họ tên..."
                className="w-full bg-transparent px-1 py-2 text-sm text-[#111] outline-none focus:ring-0"
              />
            </div>
            {(isSearchFocused || searchValue) && (
              <button
                type="button"
                onClick={handleCancelSearch}
                className="text-sm font-medium text-[#007AFF]"
              >
                Hủy
              </button>
            )}
          </div>

          <div className="rounded-3xl border border-black/5 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.10)] overflow-hidden">
            {listContent}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 pointer-events-none z-50">
        <div className="mx-auto w-full max-w-md relative pointer-events-auto">
          <button
            type="button"
            aria-label="Thêm tài khoản đối tác"
            onClick={openCreateModal}
            className="absolute right-4 bottom-[calc(var(--ace-bottom-nav-h,98px)+24px+env(safe-area-inset-bottom))] flex h-14 w-14 items-center justify-center rounded-full bg-[#007AFF] text-white shadow-[0_12px_30px_rgba(0,0,0,0.25)] active:scale-95"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <Modal
        isOpen={modalMode !== null}
        onOpenChange={(open) => setModalMode(open ? modalMode ?? 'edit' : null)}
        placement="center"
        backdrop="blur"
        classNames={{ backdrop: 'bg-black/30 backdrop-blur-sm' }}
        scrollBehavior="inside"
        hideCloseButton
      >
        <ModalContent className="mx-4 w-[92vw] max-w-md max-h-[calc(100dvh-2rem)] flex flex-col min-h-0 overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
          <ModalHeader className="relative flex items-center justify-center border-b border-black/5 px-6 py-5">
            <span className="text-[17px] font-semibold text-[#111]">
              {modalMode === 'create' ? 'Tạo tài khoản đối tác' : 'Thông tin đối tác'}
            </span>
            <button
              type="button"
              aria-label="Đóng"
              onClick={() => setModalMode(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-black/5 text-[#333] transition active:scale-95 hover:bg-black/10"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </ModalHeader>
          <ModalBody className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-6 pt-5 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-4">
            {modalMode === 'create' ? (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#6C757D]">Mã định danh</label>
                  <AceInput
                    value={createForm.memberNo}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, memberNo: event.target.value }))
                    }
                    placeholder="Nhập mã đối tác"
                    className="rounded-2xl border-black/5 px-4 py-3 text-base"
                    onFocus={scrollIntoViewOnFocus}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#6C757D]">Mật khẩu ban đầu</label>
                  <AceInput
                    type="password"
                    value={createForm.initialPassword}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, initialPassword: event.target.value }))
                    }
                    placeholder="Nhập mật khẩu"
                    className="rounded-2xl border-black/5 px-4 py-3 text-base"
                    onFocus={scrollIntoViewOnFocus}
                  />
                </div>
                {saveError ? <p className="text-sm text-red-500">{saveError}</p> : null}
                <button
                  type="button"
                  onClick={handleCreateAccount}
                  disabled={saveLoading}
                  className="w-full rounded-full bg-[#007AFF] px-4 py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-70"
                >
                  Tạo tài khoản
                </button>
              </>
            ) : null}

            {modalMode === 'edit' ? (
              <>
                {detailLoading ? (
                  <p className="text-center text-sm text-[#666]">Đang tải thông tin...</p>
                ) : detailError ? (
                  <p className="text-center text-sm text-red-500">{detailError}</p>
                ) : selectedDetail ? (
                  <>
                    <AceReadOnlyRow label="Mã đối tác" value={selectedDetail.memberNo} />
                    <AceReadOnlyRow label="Họ và tên" value={selectedDetail.fullName} />
                    {/* <AceReadOnlyRow label="Chi nhánh" value={selectedDetail.branchName ?? '-'} />
                    <AceReadOnlyRow label="Nhóm" value={selectedDetail.groupName ?? '-'} />
                    {selectedDetail.phoneNumber ? (
                      <AceReadOnlyRow label="Số điện thoại" value={selectedDetail.phoneNumber} />
                    ) : null} */}

                    <div className="space-y-2 rounded-2xl border border-black/5 bg-white px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-[#111]">Khóa tài khoản</p>
                          <p className="text-xs text-[#6C757D]">
                            {selectedDetail.credential
                              ? 'Bật để vô hiệu hóa đăng nhập'
                              : 'Khách hàng chưa có tài khoản'}
                          </p>
                        </div>
                        <Switch
                          isSelected={Boolean(selectedDetail.credential && !selectedDetail.credential.isActive)}
                          isDisabled={!selectedDetail.credential || lockLoading}
                          onValueChange={(nextLocked) => handleToggleLock(nextLocked)}
                          classNames={IOS_SWITCH_CLASSNAMES}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 rounded-2xl border border-black/5 bg-white px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-[#111]">Trợ năng</p>
                          <p className="text-xs text-[#6C757D]">Bật để hỗ trợ bà con mù chữ</p>
                        </div>
                        <Switch
                          isSelected={Boolean(selectedDetail.accessibilityEnabled)}
                          isDisabled={accessibilityLoading}
                          onValueChange={(nextEnabled) => handleToggleAccessibility(nextEnabled)}
                          classNames={IOS_SWITCH_CLASSNAMES}
                        />
                      </div>
                    </div>

                    {showTempPasswordLabel ? (
                      <div className="space-y-2 rounded-2xl border border-black/5 bg-white px-4 py-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-[#111]">Mật khẩu tạm thời hiện tại</p>
                          <button
                            type="button"
                            onClick={() => setShowTempPassword((prev) => !prev)}
                            className="text-xs font-medium text-[#007AFF]"
                          >
                            {showTempPassword ? 'Ẩn' : 'Hiện'}
                          </button>
                        </div>
                        <p className="text-sm text-[#111]">
                          {showTempPassword ? tempPassword : '********'}
                        </p>
                      </div>
                    ) : null}

                    <div className="space-y-3 rounded-2xl border border-black/5 bg-white px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#111]">Đặt lại mật khẩu</p>
                        <button
                          type="button"
                          onClick={() => setShowResetPassword((prev) => !prev)}
                          className="text-sm font-medium text-[#007AFF]"
                        >
                          {showResetPassword ? 'Ẩn' : 'Mở'}
                        </button>
                      </div>
                      {showResetPassword ? (
                        <div className="space-y-2">
                          <AceInput
                            type="password"
                            value={resetPassword}
                            onChange={(event) => setResetPassword(event.target.value)}
                            placeholder="Mật khẩu tạm thời"
                            className="rounded-2xl border-black/5 px-4 py-3 text-base"
                            onFocus={scrollIntoViewOnFocus}
                          />
                          <button
                            type="button"
                            onClick={handleResetPassword}
                            disabled={saveLoading}
                            className="w-full rounded-full bg-[#007AFF] px-4 py-2.5 text-sm font-semibold text-white active:scale-95 disabled:opacity-70"
                          >
                            Xác nhận
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {saveError ? <p className="text-sm text-red-500">{saveError}</p> : null}
                  </>
                ) : null}
              </>
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
