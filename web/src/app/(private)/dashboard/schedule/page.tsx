'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AceCard } from '@/share/ui/AceCard';
import { AceButton } from '@/share/ui/AceButton';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';
import { appApi, type ScheduleDetail, type ScheduleItem } from '@/services/appApi';
import { formatDate } from '@/lib/format';

const buildEventText = (event: ScheduleItem) => {
  if (event.eventType === 'MEETING') {
    return `Bạn có cuộc họp trong ${event.daysUntilEvent} ngày tới`;
  }
  if (event.eventType === 'FIELD_SCHOOL') {
    return `Trong ${event.daysUntilEvent} ngày nữa sẽ có buổi tập huấn tại địa phương`;
  }
  if (event.eventType === 'FARMING_TASK') {
    return `Trong ${event.daysUntilEvent} ngày nữa: ${event.title.toLowerCase()}`;
  }
  return `${event.title} - còn ${event.daysUntilEvent} ngày`;
};

export default function SchedulePage() {
  const { isAuthenticated, isInitializing, mustChangePassword } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ScheduleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchSchedule = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await appApi.getSchedule();
      setEvents(data);
    } catch (err) {
      setError('Không tải được lịch sự kiện. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDetail = async (id: number) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await appApi.getScheduleDetail(id);
      setDetail(data);
    } catch (err) {
      setDetailError('Không tải được chi tiết sự kiện.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace(routes.login);
    } else if (mustChangePassword) {
      router.replace(`${routes.changePassword}?mode=force`);
    } else {
      fetchSchedule();
    }
  }, [isAuthenticated, isInitializing, mustChangePassword, router]);

  useEffect(() => {
    if (selectedId !== null) {
      fetchDetail(selectedId);
    } else {
      setDetail(null);
      setDetailError(null);
    }
  }, [selectedId]);

  const content = useMemo(() => {
    if (isLoading) {
      return <p className="text-center text-sm text-[#666]">Đang tải lịch...</p>;
    }
    if (error) {
      return (
        <div className="space-y-2 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <AceButton onClick={fetchSchedule}>Thử lại</AceButton>
        </div>
      );
    }
    const safeEvents = Array.isArray(events) ? events : [];
    if (!safeEvents.length) {
      return <p className="text-center text-sm text-[#666]">Chưa có sự kiện sắp tới.</p>;
    }

    return (
      <div className="space-y-3">
        {safeEvents.map((event) => (
          <button
            key={event.id}
            onClick={() => setSelectedId(event.id)}
            className="w-full rounded-2xl bg-white p-4 text-left shadow hover:shadow-md transition flex items-center justify-between gap-3 border border-[#e2e8f0]"
          >
            <div className="space-y-1">
              <p className="text-sm text-[#2b6cb0] font-semibold">{formatDate(event.startDate)}</p>
              <p className="text-sm text-[#333]">{buildEventText(event)}</p>
            </div>
            <span className="text-lg text-[#999]">›</span>
          </button>
        ))}
      </div>
    );
  }, [error, events, isLoading]);

  return (
    <div className="min-h-screen px-4 pb-28 pt-8">
      <div className="mx-auto flex w-full max-w-md flex-col space-y-4">
        <AceCard className="bg-[#DFF5D1] shadow-md px-6 py-4 rounded-2xl text-center">
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Lịch</h1>
        </AceCard>
        <AceCard className="space-y-4">{content}</AceCard>
      </div>

      {selectedId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg relative">
            <button
              aria-label="Đóng"
              onClick={() => setSelectedId(null)}
              className="absolute right-3 top-3 text-[#666] hover:text-[#111]"
            >
              ×
            </button>
            <h2 className="mb-3 text-lg font-semibold text-[#333] text-center">Chi tiết lịch</h2>
            {detailLoading ? (
              <p className="text-sm text-[#666]">Đang tải...</p>
            ) : detailError ? (
              <p className="text-sm text-red-500">{detailError}</p>
            ) : detail ? (
              <div className="space-y-2 text-sm text-[#333]">
                <p className="font-semibold">{detail.title}</p>
                <p className="text-[#555]">
                  Bắt đầu: <span className="font-medium">{formatDate(detail.startDate)}</span>
                </p>
                {detail.endDate ? (
                  <p className="text-[#555]">
                    Kết thúc: <span className="font-medium">{formatDate(detail.endDate)}</span>
                  </p>
                ) : null}
                <div className="rounded-md bg-[#f7f9fb] p-3 whitespace-pre-wrap leading-relaxed text-[#444]">
                  {detail.description || 'Chưa có mô tả chi tiết.'}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
