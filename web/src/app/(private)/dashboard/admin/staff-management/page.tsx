'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Switch } from '@heroui/react';
import { Plus, X } from 'lucide-react';
import { AceCard } from '@/share/ui/AceCard';
import { AceInput } from '@/share/ui/AceInput';
import { AceSelectIOS } from '@/share/ui/AceSelectIOS';
import { scrollIntoViewOnFocus } from '@/share/ui/keyboard/scrollIntoViewOnFocus';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';
import {
  appApi,
  type CreateStaffUserPayload,
  type StaffBranchItem,
  type StaffUserItem,
  type UpdateStaffUserPayload,
} from '@/services/appApi';

// TODO: replaced by ACE Farmer implementation
// const ROLE_OPTIONS = [
//   { value: 'ADMIN', label: 'ADMIN' },
//   { value: 'BRANCH_MANAGER', label: 'BRANCH_MANAGER' },
// ];

const formatBranchDisplay = (staff: StaffUserItem) => {
  if (staff.branchCode && staff.branchName) {
    return `${staff.branchCode}-${staff.branchName}`;
  }
  if (staff.branchName) return staff.branchName;
  if (staff.branchCode) return staff.branchCode;
  return '-';
};

export default function StaffManagementPage() {
  const { isAuthenticated, isInitializing, mustChangePassword, profile } = useAuth();
  const router = useRouter();
  const isAdmin = profile?.role === 'ADMIN';
    const IOS_SWITCH_CLASSNAMES = {
  // quan trọng: base có group để wrapper/thumb đọc được state từ root
  base: 'group inline-flex items-center',

  // track
  wrapper:
    'relative w-[52px] h-[28px] rounded-full border border-black/5 ' +
    'bg-[#E5E5EA] transition-colors duration-200 ' +
    // dùng group-data để chắc chắn ăn theo state
    'group-data-[selected=true]:!bg-[#34C759]',

  // thumb
  thumb:
    'absolute top-[2px] left-[2px] h-[24px] w-[24px] rounded-full bg-white ' +
    'shadow-[0_3px_10px_rgba(0,0,0,0.18)] transition-transform duration-200 ' +
    'group-data-[selected=true]:translate-x-[24px]',

  // nếu HeroUI render label mặc định
  label: 'hidden',
};
  const [staffUsers, setStaffUsers] = useState<StaffUserItem[]>([]);
  const [branches, setBranches] = useState<StaffBranchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchValue, setSearchValue] = useState('');
  const [query, setQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffUserItem | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [formState, setFormState] = useState({
    fullName: '',
    email: '',
    role: 'BRANCH_MANAGER',
    branchCode: '',
    password: '',
  });

  const branchOptions = useMemo(
    () =>
      branches.map((branch) => ({
        value: branch.branchCode,
        label: branch.displayName,
      })),
    [branches],
  );

  const modalTitle = modalMode === 'create' ? 'Thêm nhân viên' : 'Chỉnh sửa nhân viên';

  const fetchStaffUsers = async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await appApi.getStaffUsers(q?.trim() || undefined);
      setStaffUsers(Array.isArray(data) ? data : []);
    } catch {
      setError('Không tải được danh sách nhân viên.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const data = await appApi.getStaffBranches();
      setBranches(Array.isArray(data) ? data : []);
    } catch {
      setBranches([]);
    }
  };

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
    if (isAdmin) {
      fetchBranches();
    }
  }, [isAuthenticated, isInitializing, mustChangePassword, router, isAdmin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchValue.trim());
    }, 280);
    return () => clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchStaffUsers(query);
  }, [query, isAdmin]);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedStaff(null);
    setSaveError(null);
    setShowResetPassword(false);
    setResetPassword('');
    setFormState({
      fullName: '',
      email: '',
      role: 'BRANCH_MANAGER',
      branchCode: '',
      password: '',
    });
  };

  const openEditModal = (staff: StaffUserItem) => {
    setModalMode('edit');
    setSelectedStaff(staff);
    setSaveError(null);
    setShowResetPassword(false);
    setResetPassword('');
    setFormState({
      fullName: staff.fullName ?? '',
      email: staff.email ?? '',
      role: staff.role ?? 'BRANCH_MANAGER',
      branchCode: staff.branchCode ?? '',
      password: '',
    });
  };
// TODO: replaced by ACE Farmer implementation
// 
// 
//   const handleRoleChange = (value: string) => {
//     setFormState((prev) => ({
//       ...prev,
//       role: value,
//       branchCode: value === 'BRANCH_MANAGER' ? prev.branchCode : '',
//     }));
//   };

  const handleCreate = async () => {
    const fullName = formState.fullName.trim();
    const email = formState.email.trim();
    const password = formState.password.trim();
    if (!fullName) {
      setSaveError('Vui lòng nhập họ và tên.');
      return;
    }
    if (!email) {
      setSaveError('Vui lòng nhập email.');
      return;
    }
    if (!password) {
      setSaveError('Vui lòng nhập mật khẩu ban đầu.');
      return;
    }
    if (formState.role === 'BRANCH_MANAGER' && !formState.branchCode) {
      setSaveError('Vui lòng chọn chi nhánh cho quản lý chi nhánh.');
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      const payload: CreateStaffUserPayload = {
        fullName,
        email,
        password,
        role: formState.role,
        branchCode: formState.role === 'BRANCH_MANAGER' ? formState.branchCode : undefined,
      };
      await appApi.createStaffUser(payload);
      setModalMode(null);
      await fetchStaffUsers(query);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? 'Không thể tạo nhân viên.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedStaff) return;
    const fullName = formState.fullName.trim();
    const email = formState.email.trim();
    if (!fullName) {
      setSaveError('Vui lòng nhập họ và tên.');
      return;
    }
    if (!email) {
      setSaveError('Vui lòng nhập email.');
      return;
    }
    if (formState.role === 'BRANCH_MANAGER' && !formState.branchCode) {
      setSaveError('Vui lòng chọn chi nhánh cho quản lý chi nhánh.');
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      const payload: UpdateStaffUserPayload = {
        fullName,
        email,
        role: formState.role,
        branchCode: formState.role === 'BRANCH_MANAGER' ? formState.branchCode : undefined,
      };
      await appApi.updateStaffUser(selectedStaff.id, payload);
      setModalMode(null);
      await fetchStaffUsers(query);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? 'Không thể cập nhật nhân viên.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleToggleActive = async (nextActive: boolean) => {
    if (!selectedStaff) return;
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm(
            nextActive ? 'Mở khóa tài khoản nhân viên này?' : 'Khóa tài khoản nhân viên này?',
          )
        : true;
    if (!confirmed) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      await appApi.lockStaffUser(selectedStaff.id, !nextActive);
      setSelectedStaff((prev) => (prev ? { ...prev, isActive: nextActive } : prev));
      await fetchStaffUsers(query);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? 'Không thể cập nhật trạng thái.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedStaff) return;
    const newPassword = resetPassword.trim();
    if (!newPassword) {
      setSaveError('Vui lòng nhập mật khẩu mới.');
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      await appApi.resetStaffPassword(selectedStaff.id, newPassword);
      if (typeof window !== 'undefined') {
        window.alert('Đặt lại mật khẩu thành công.');
      }
      setResetPassword('');
      setShowResetPassword(false);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? 'Không thể đặt lại mật khẩu.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStaff) return;
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm(
            'Bạn có chắc muốn xóa nhân viên này không? Hành động không thể hoàn tác.',
          )
        : true;
    if (!confirmed) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      await appApi.deleteStaffUser(selectedStaff.id);
      setModalMode(null);
      await fetchStaffUsers(query);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? 'Không thể xóa nhân viên.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancelSearch = () => {
    setSearchValue('');
    setQuery('');
    setIsSearchFocused(false);
    searchRef.current?.blur();
  };

  if (!isAdmin && !isInitializing) {
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

  return (
    <div className="w-full min-h-[100dvh] bg-[#F2F2F7]">
      <div className="mx-auto w-full max-w-md px-4 pt-8 pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-col space-y-4">
          <AceCard className="rounded-2xl bg-[#DDEBFF] px-6 py-4 text-center shadow-md">
            <h1 className="text-lg font-semibold text-slate-900">{'Qu\u1ea3n l\u00fd nh\u00e2n vi\u00ean'}</h1>
          </AceCard>

          {/* <h1 className="text-lg font-semibold text-[#111]">Quản lý nhân viên</h1> */}

          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-2xl border border-black/5 bg-white px-3 py-2 shadow-sm">
              <input
                ref={searchRef}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Tìm theo tên hoặc email..."
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
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-[#666]">Đang tải...</p>
            ) : error ? (
              <p className="px-4 py-6 text-center text-sm text-red-500">{error}</p>
            ) : staffUsers.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[#666]">Chưa có nhân viên.</p>
            ) : (
              <div className="divide-y divide-black/5">
                {staffUsers
                  // TODO: replaced by ACE Farmer implementation
                  // admin accounts are hidden in UI list
                  .filter((staff) => staff.role !== 'ADMIN' && staff.email !== 'admin@ace.vn')
                  .map((staff) => {
                    const isActive = staff.isActive;
                    const badgeText = isActive ? 'Đang hoạt động' : 'Bị khóa'; // CHANGED: badge trạng thái
                    const badgeClass = isActive
                      ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                      : 'border-rose-100 bg-rose-50 text-rose-700'; // CHANGED: màu badge theo trạng thái
                    return (
                      <button
                        key={staff.id}
                        type="button"
                        onClick={() => openEditModal(staff)}
                        className="w-full px-4 py-4 text-left transition active:scale-[0.99] active:bg-black/[0.03]"
                      >
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-[#111]">
                              {staff.fullName ?? staff.email}
                            </p>
                            <span
                              className={clsx(
                                'rounded-full border px-3 py-1 text-xs font-semibold',
                                badgeClass,
                              )}
                            >
                              {badgeText}
                            </span>
                          </div>
                          <p className="text-xs text-[#666]">{'Chi nh\u00e1nh: '}{formatBranchDisplay(staff)}</p>
                          <p className="text-xs text-[#666]">{'Email: '}{staff.email}</p>
                          {/* TODO: replaced by ACE Farmer implementation */}
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 pointer-events-none z-50">
        <div className="mx-auto w-full max-w-md relative pointer-events-auto">
          <button
            type="button"
            aria-label="Thêm nhân viên"
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
            <span className="text-[17px] font-semibold text-[#111]">{modalTitle}</span>
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
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#6C757D]">Họ và tên</label>
              <AceInput
                value={formState.fullName}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, fullName: event.target.value }))
                }
                placeholder="Nhập họ và tên"
                className="rounded-2xl border-black/5 px-4 py-3 text-base"
                onFocus={scrollIntoViewOnFocus}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[#6C757D]">Email</label>
              <AceInput
                value={formState.email}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="Nhập email"
                className="rounded-2xl border-black/5 px-4 py-3 text-base"
                onFocus={scrollIntoViewOnFocus}
              />
            </div>

            {/* TODO: replaced by ACE Farmer implementation */}
            {/* <AceSelectIOS
              label="Vai trò"
              value={formState.role}
              options={ROLE_OPTIONS}
              onChange={handleRoleChange}
              placeholder="Chọn vai trò"
              onFocus={scrollIntoViewOnFocus}
            /> */}

            <AceSelectIOS
              label="Chi nhánh"
              value={formState.branchCode}
              options={branchOptions}
              onChange={(value) => setFormState((prev) => ({ ...prev, branchCode: value }))}
              placeholder="Chọn chi nhánh"
              disabled={formState.role !== 'BRANCH_MANAGER'}
              onFocus={scrollIntoViewOnFocus}
            />

            {modalMode === 'create' ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#6C757D]">Mật khẩu ban đầu</label>
                <AceInput
                  type="password"
                  value={formState.password}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, password: event.target.value }))
                  }
                  placeholder="Nhập mật khẩu"
                  className="rounded-2xl border-black/5 px-4 py-3 text-base"
                  onFocus={scrollIntoViewOnFocus}
                />
              </div>
            ) : null}

            {modalMode === 'edit' && selectedStaff ? (
              <div className="space-y-3 rounded-2xl border border-black/5 bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#111]">{'Kh\u00f3a t\u00e0i kho\u1ea3n'}</p> {/* CHANGED: nhãn rõ ràng hơn */}
                    {/* TODO: replaced by ACE Farmer implementation */}
                    {/* <p className="text-xs text-[#6C757D]">{'B\u1eadt \u0111\u1ec3 v\u00f4 hi\u1ec7u h\u00f3a \u0111\u0103ng nh\u1eadp'}</p> */}
                  </div>
                    <Switch
                    isSelected={!selectedStaff.isActive}
                    onValueChange={(nextLocked) => handleToggleActive(!nextLocked)}
                    classNames={IOS_SWITCH_CLASSNAMES}
                    />
                </div>
              </div>
            ) : null}

            {modalMode === 'edit' ? (
              <div className="space-y-3 rounded-2xl border border-black/5 bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#111]">Bảo mật</p>
                  <button
                    type="button"
                    onClick={() => setShowResetPassword((prev) => !prev)}
                    className="text-sm font-medium text-[#007AFF]"
                  >
                    Đặt lại mật khẩu
                  </button>
                </div>
                {showResetPassword ? (
                  <div className="space-y-2">
                    <AceInput
                      type="password"
                      value={resetPassword}
                      onChange={(event) => setResetPassword(event.target.value)}
                      placeholder="Mật khẩu mới"
                      className="rounded-2xl border-black/5 px-4 py-3 text-base"
                      onFocus={scrollIntoViewOnFocus}
                    />
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      className="w-full rounded-full bg-[#007AFF] px-4 py-2.5 text-sm font-semibold text-white active:scale-95"
                      disabled={saveLoading}
                    >
                      Xác nhận
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* TODO: replaced by ACE Farmer implementation */}
            {/* <div className="space-y-2">
              <label className="text-xs font-medium text-[#6C757D]">Số điện thoại</label>
              <AceInput />
            </div> */}

            {saveError ? <p className="text-sm text-red-500">{saveError}</p> : null}

                        {/* TODO: replaced by ACE Farmer implementation */}
            {/* {modalMode === 'edit' ? (
              <div className="space-y-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-semibold text-red-600">Vùng nguy hiểm</p>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 active:scale-95"
                >
                  Xóa nhân viên
                </button>
              </div>
            ) : null} */}
            {modalMode === 'edit' ? (
              <button
                type="button"
                onClick={handleDelete}
                className="w-full rounded-full bg-[#DC3545] px-4 py-3 text-sm font-semibold text-white active:scale-95"
              >
                {'X\u00f3a nh\u00e2n vi\u00ean'}
              </button>
            ) : null}
          </ModalBody>
          <ModalFooter className="border-t border-black/5 bg-white px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
            {modalMode === 'create' ? (
              <button
                type="button"
                onClick={handleCreate}
                disabled={saveLoading}
                className="w-full rounded-full bg-[#007AFF] px-4 py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-70"
              >
                Tạo nhân viên
              </button>
            ) : (
              <button
                type="button"
                onClick={handleUpdate}
                disabled={saveLoading}
                className="w-full rounded-full bg-[#007AFF] px-4 py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-70"
              >
                Lưu thay đổi
              </button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
