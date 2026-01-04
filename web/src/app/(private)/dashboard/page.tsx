'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AceCard } from '@/share/ui/AceCard';
import { AceButton } from '@/share/ui/AceButton';
import { Modal, ModalBody, ModalContent, ModalHeader } from '@heroui/react';
import { ChangePasswordForm } from '@/share/forms/ChangePasswordForm';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';
import { DashboardRemindersCard } from '@/features/dashboard/DashboardRemindersCard';
import { WeatherCard } from '@/features/dashboard/WeatherCard';
import {
  appApi,
  type ProfileResponse,
  type ScheduleItem,
  type LoanCurrentResponse,
} from '@/services/appApi';
import { formatDate } from '@/lib/format';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};
const daysUntil = (date: Date) =>
  Math.ceil((date.getTime() - startOfToday().getTime()) / MS_PER_DAY);

const DashboardContent = () => {
  const { customer, isAuthenticated, isInitializing, mustChangePassword, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showAccount = searchParams.get('tab') === 'account';

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const prevMustChangeRef = useRef(mustChangePassword);
  const hasFetchedProfile = useRef(false);

  const [scheduleEvents, setScheduleEvents] = useState<ScheduleItem[]>([]);
  const [loan, setLoan] = useState<LoanCurrentResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace(routes.login);
    } else if (mustChangePassword) {
      setChangePasswordOpen(true);
    }
  }, [isAuthenticated, isInitializing, mustChangePassword, router]);

  useEffect(() => {
    if (prevMustChangeRef.current && !mustChangePassword) {
      setChangePasswordOpen(false);
    }
    prevMustChangeRef.current = mustChangePassword;
  }, [mustChangePassword]);

  const loadProfile = async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const data = await appApi.getProfile();
      setProfile(data);
    } catch (err) {
      setProfileError('Không tải được thông tin tài khoản. Vui lòng thử lại.');
    } finally {
      setProfileLoading(false);
      hasFetchedProfile.current = true;
    }
  };

  useEffect(() => {
    if (!showAccount || isInitializing || !isAuthenticated || mustChangePassword) return;
    if (!hasFetchedProfile.current) {
      loadProfile();
    }
  }, [showAccount, isInitializing, isAuthenticated, mustChangePassword]);

  const loadSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const [loanData, scheduleData] = await Promise.all([
        appApi.getCurrentLoan().catch(() => null),
        appApi.getSchedule().catch(() => [] as ScheduleItem[]),
      ]);
      if (loanData) setLoan(loanData);
      setScheduleEvents(scheduleData ?? []);
    } catch (err) {
      setSummaryError('Không có dữ liệu tóm tắt.');
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (isInitializing || !isAuthenticated || mustChangePassword) return;
    loadSummary();
  }, [isInitializing, isAuthenticated, mustChangePassword]);

  const handleSendFeedback = async () => {
    if (!feedbackContent.trim()) {
      setFeedbackMessage('Vui lòng nhập nội dung phản hồi.');
      return;
    }
    setFeedbackSending(true);
    setFeedbackMessage(null);
    try {
      await appApi.sendFeedback(feedbackContent.trim());
      setFeedbackMessage('Cảm ơn bạn đã gửi góp ý!');
      setFeedbackContent('');
      setFeedbackOpen(false);
    } catch (err) {
      setFeedbackMessage('Gửi góp ý thất bại, thử lại sau.');
    } finally {
      setFeedbackSending(false);
    }
  };

  const handleCallCCO = () => {
    if (typeof window !== 'undefined') {
      window.location.href = 'tel:0877500429';
    }
  };

  const handleChangePasswordOpenChange = (open: boolean) => {
    if (mustChangePassword && !open) return;
    setChangePasswordOpen(open);
  };

  const renderChangePasswordModal = () => (
    <Modal
      isOpen={changePasswordOpen}
      onOpenChange={handleChangePasswordOpenChange}
      placement="center"
      backdrop="blur"
      classNames={{ backdrop: 'bg-black/30 backdrop-blur-sm' }}
      hideCloseButton={mustChangePassword}
    >
      <ModalContent className="mx-4 w-[92vw] max-w-md overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <ModalHeader className="relative flex items-center justify-center border-b border-black/5 px-6 py-5">
          <span className="text-[17px] font-semibold text-[#111]">Đổi mật khẩu</span>
          {!mustChangePassword ? (
            <button
              type="button"
              aria-label="Đóng"
              onClick={() => setChangePasswordOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-black/5 text-[#333] transition active:scale-95 hover:bg-black/10"
            >
              ×
            </button>
          ) : null}
        </ModalHeader>
        <ModalBody className="space-y-4 px-6 pb-6 pt-5">
          <p className="text-center text-sm text-[#666]">
            {mustChangePassword
              ? 'Bạn cần đổi mật khẩu để tiếp tục sử dụng ứng dụng.'
              : 'Vui lòng nhập đầy đủ thông tin để đổi mật khẩu.'}
          </p>
          <ChangePasswordForm />
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  if (showAccount) {
    return (
      <div className="min-h-screen px-4 pb-28 pt-8">
        <div className="mx-auto flex w-full max-w-md flex-col space-y-4">
          <AceCard className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-[#333]">Thông tin đối tác</h2>
              {/* <p className="text-sm text-[#666]">Cập nhật từ hồ sơ khách hàng ACE Farmer</p> */}
            </div>

            {profileLoading ? (
              <p className="text-center text-sm text-[#666]">Đang tải...</p>
            ) : profileError ? (
              <div className="space-y-2 text-center">
                <p className="text-sm text-red-500">{profileError}</p>
                <AceButton onClick={loadProfile}>Thử lại</AceButton>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-[#333]">
                <div className="flex justify-between">
                  <span className="text-[#555]">Họ tên</span>
                  <span className="font-semibold">{profile?.fullName ?? customer?.fullName ?? '—'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#555]">Mã thành viên</span>
                  <span className="font-semibold">
                    {profile?.memberNo ?? (customer as any)?.memberNo ?? '—'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#555]">Số CMT/CCCD</span>
                  <span className="font-semibold">{profile?.idCardNumber ?? '—'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#555]">Điện thoại</span>
                  <span className="font-semibold">{profile?.phoneNumber ?? '—'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#555]">Nhóm/Vùng</span>
                  <span className="font-semibold">{profile?.groupName ?? profile?.groupCode ?? '—'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#555]">Vòng vay</span>
                  <span className="font-semibold">
                    {profile?.loanCycle !== null && profile?.loanCycle !== undefined ? `${profile.loanCycle}` : ''}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#555]">Ngày tham gia</span>
                  <span className="font-semibold">
                    {formatDate(profile?.membershipStartDate ?? null)}
                  </span>
                </div>
              </div>
            )}

            {feedbackMessage ? (
              <p className="text-center text-sm text-[#2f855a]">{feedbackMessage}</p>
            ) : null}

            <div className="space-y-3">
              <AceButton onClick={() => setChangePasswordOpen(true)}>Đổi mật khẩu</AceButton>

              <AceButton
                className="bg-[#f59e0b] hover:bg-[#d97706]"
                onClick={() => setFeedbackOpen(true)}
              >
                Gửi góp ý
              </AceButton>

              <AceButton className="bg-[#10b981] hover:bg-[#0f9c6f]" onClick={handleCallCCO}>
                Liên hệ CCO
              </AceButton>

              <AceButton
                className="bg-[#ef4444] hover:bg-[#dc2626]"
                onClick={() => {
                  logout();
                  router.replace(routes.login);
                }}
              >
                Đăng xuất
              </AceButton>
            </div>
          </AceCard>
        </div>

        {feedbackOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
              <button
                aria-label="Đóng"
                onClick={() => setFeedbackOpen(false)}
                className="absolute right-3 top-3 text-[#666] hover:text-[#111]"
              >
                ✕
              </button>

              <h3 className="mb-3 text-center text-lg font-semibold text-[#333]">Gửi phản hồi</h3>

              <textarea
                className="w-full rounded-xl border border-[#d9d9d9] p-3 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#2b6cb0]"
                rows={4}
                placeholder="Nhập nội dung bạn muốn gửi..."
                value={feedbackContent}
                onChange={(e) => setFeedbackContent(e.target.value)}
              />

              <div className="mt-3 flex gap-3">
                <AceButton onClick={handleSendFeedback} isLoading={feedbackSending}>
                  Gửi
                </AceButton>
                <AceButton
                  className="bg-gray-200 text-[#333] hover:bg-gray-300"
                  onClick={() => setFeedbackOpen(false)}
                >
                  Hủy
                </AceButton>
              </div>

              {feedbackMessage ? <p className="mt-2 text-sm text-[#2f855a]">{feedbackMessage}</p> : null}
            </div>
          </div>
        ) : null}

        {renderChangePasswordModal()}
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pb-28 pt-8">
      <div className="mx-auto flex w-full max-w-md flex-col space-y-4">
        <AceCard className="space-y-2">
          <h1 className="text-center text-xl font-semibold text-[#333]">Chào mừng khách hàng</h1>
          <p className="text-center text-4xl font-bold text-[#2b6cb0] md:text-xl">
            {customer?.fullName ?? 'Nguyễn Văn A'}
          </p>
        </AceCard>

        <WeatherCard />
        <DashboardRemindersCard />
        {renderChangePasswordModal()}
      </div>
    </div>
  );
};

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
