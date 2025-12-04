'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AceCard } from '@/share/ui/AceCard';
import { AceButton } from '@/share/ui/AceButton';
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
import { formatDate, formatCurrencyVND } from '@/lib/format';

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
      router.replace(`${routes.changePassword}?mode=force`);
    }
  }, [isAuthenticated, isInitializing, mustChangePassword, router]);

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
      setFeedbackMessage('Đã gửi phản hồi thành công.');
      setFeedbackContent('');
      setFeedbackOpen(false);
    } catch (err) {
      setFeedbackMessage('Gửi phản hồi thất bại, thử lại sau.');
    } finally {
      setFeedbackSending(false);
    }
  };

  const handleCallCCO = () => {
    if (typeof window !== 'undefined') {
      window.location.href = 'tel:0877500429';
    }
  };

  if (showAccount) {
    return (
      <div className="min-h-screen px-4 pb-28 pt-8">
        <div className="mx-auto flex w-full max-w-md flex-col space-y-4">
          <AceCard className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-[#333]">Thông tin tài khoản</h2>
              <p className="text-sm text-[#666]">Cập nhật từ hồ sơ khách hàng ACE Farmer</p>
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
                  <span className="font-semibold">
                    {profile?.fullName ?? customer?.fullName ?? '—'}
                  </span>
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
                  <span className="font-semibold">
                    {profile?.groupName ?? profile?.groupCode ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#555]">Địa chỉ</span>
                  <span className="font-semibold">
                    {profile?.villageName ?? profile?.locationType ?? '—'}
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
              <AceButton onClick={() => router.push(routes.changePassword)}>Đổi mật khẩu</AceButton>
              <AceButton className="bg-[#f59e0b] hover:bg-[#d97706]" onClick={() => setFeedbackOpen(true)}>
                Gửi phản hồi
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
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg relative">
              <button
                aria-label="Đóng"
                onClick={() => setFeedbackOpen(false)}
                className="absolute right-3 top-3 text-[#666] hover:text-[#111]"
              >
                ✕
              </button>
              <h3 className="text-lg font-semibold text-[#333] text-center mb-3">Gửi phản hồi</h3>
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
                  Huỷ
                </AceButton>
              </div>
              {feedbackMessage ? (
                <p className="mt-2 text-sm text-[#2f855a]">{feedbackMessage}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pb-28 pt-8">
      <div className="mx-auto flex w-full max-w-md flex-col space-y-4">
        <AceCard className="space-y-2">
          <h1 className="text-xl font-semibold text-[#333] text-center">Chào mừng khách hàng</h1>
          <p className="text-4xl md:text-xl text-[#2b6cb0] font-bold text-center">
            {customer?.fullName ?? 'Nguyễn Văn A'}
          </p>
        </AceCard>

        <WeatherCard />

        <DashboardRemindersCard />
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
