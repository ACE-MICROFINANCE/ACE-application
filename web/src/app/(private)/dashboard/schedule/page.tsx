'use client';

import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { AceCard } from '@/share/ui/AceCard';
import { AceButton } from '@/share/ui/AceButton';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';
import { appApi, type ScheduleDetail, type ScheduleItem } from '@/services/appApi';
import { formatDate } from '@/lib/format';

const DEFAULT_AVATAR = '/img/caylua_info.jpg';
const LOCATION_OPTIONS = ['Nhà Anh Tòn', 'ACE Head Office', 'Nhà bà Lâm'];

const getLocationLabel = (id: number) => {
  const index = Math.abs(id) % LOCATION_OPTIONS.length;
  return LOCATION_OPTIONS[index];
};

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

const getAvatarUrl = (event: ScheduleItem) => {
  if (event.eventType === 'MEETING') return '/img/community-meeting.png';
  if (event.eventType === 'FIELD_SCHOOL') return '/img/farming-plant-rice.png';
  if (event.eventType === 'FARMING_TASK') return '/img/caylua_info.jpg';
  return DEFAULT_AVATAR;
};

const formatDuration = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return '—';
  const totalMinutes = Math.round(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ngày`);
  if (hours > 0) parts.push(`${hours} giờ`);
  if (minutes > 0) parts.push(`${minutes} phút`);
  return parts.length ? parts.join(' ') : '0 phút';
};

type ScheduleItemRowProps = {
  item: ScheduleItem;
  isExpanded: boolean;
  onToggle: () => void;
};

const ScheduleItemRow = ({ item, isExpanded, onToggle }: ScheduleItemRowProps) => {
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      className="flex items-center gap-4 px-4 py-4 transition active:scale-[0.99] active:bg-black/[0.03]"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-black/5">
        <Image
          src={getAvatarUrl(item)}
          alt={item.title}
          fill
          sizes="48px"
          className="object-cover"
        />
      </div>

      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold text-[#0A84FF] tabular-nums">
          {formatDate(item.startDate)}
        </p>
        <p className="text-sm text-[#1C1C1E] line-clamp-2">{buildEventText(item)}</p>
      </div>

      {/* GIỮ NGUYÊN ICON ChevronRight, chỉ rotate khi mở */}
      <motion.div
        animate={{ rotate: isExpanded ? 90 : 0 }}
        transition={{ duration: 0.2 }}
        className="shrink-0 text-[#C7C7CC]"
        aria-hidden="true"
      >
        <ChevronRight className="h-5 w-5" />
      </motion.div>
    </div>
  );
};

export default function SchedulePage() {
  const { isAuthenticated, isInitializing, mustChangePassword } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accordion state
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Detail caches (không load lại khi mở lại)
  const [detailsById, setDetailsById] = useState<Record<number, ScheduleDetail | undefined>>({});
  const [loadingById, setLoadingById] = useState<Record<number, boolean>>({});
  const [errorById, setErrorById] = useState<Record<number, string | null>>({});

  const fetchSchedule = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await appApi.getSchedule();
      setEvents(data);
    } catch {
      setError('Không tải được lịch sự kiện. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDetail = async (id: number) => {
    setLoadingById((prev) => ({ ...prev, [id]: true }));
    setErrorById((prev) => ({ ...prev, [id]: null }));
    try {
      const data = await appApi.getScheduleDetail(id);
      setDetailsById((prev) => ({ ...prev, [id]: data }));
    } catch {
      setErrorById((prev) => ({ ...prev, [id]: 'Không tải được chi tiết lịch.' }));
    } finally {
      setLoadingById((prev) => ({ ...prev, [id]: false }));
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

  const handleToggle = (id: number) => {
    const next = expandedId === id ? null : id;
    setExpandedId(next);

    // mở lần đầu thì fetch detail + cache
    if (next !== null && !detailsById[id] && !loadingById[id]) {
      fetchDetail(id);
    }
  };

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <div className="px-4 py-6">
          <p className="text-center text-sm text-[#666]">Đang tải lịch...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="space-y-2 px-4 py-6 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <AceButton onClick={fetchSchedule}>Thử lại</AceButton>
        </div>
      );
    }

    const safeEvents = Array.isArray(events) ? events : [];
    if (!safeEvents.length) {
      return (
        <div className="px-4 py-6">
          <p className="text-center text-sm text-[#666]">Chưa có sự kiện sắp tới.</p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-black/5">
        {safeEvents.map((event) => {
          const isExpanded = expandedId === event.id;
          const detail = detailsById[event.id];
          const isDetailLoading = Boolean(loadingById[event.id]);
          const detailError = errorById[event.id];

          return (
            <div key={event.id} className="overflow-hidden">
              <ScheduleItemRow
                item={event}
                isExpanded={isExpanded}
                onToggle={() => handleToggle(event.id)}
              />

              <AnimatePresence initial={false}>
                {isExpanded ? (
                  <motion.div
                    key={`detail-${event.id}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="overflow-hidden border-t border-black/5"
                  >
                    <div className="px-4 pb-4 pt-3">
                      {isDetailLoading ? (
                        <p className="text-sm text-[#666]">Đang tải...</p>
                      ) : detailError ? (
                        <div className="space-y-2">
                          <p className="text-sm text-red-500">{detailError}</p>
                          <AceButton className="h-10" onClick={() => fetchDetail(event.id)}>
                            Thử lại
                          </AceButton>
                        </div>
                      ) : detail ? (
                        <div className="space-y-2 text-sm text-[#333]">
                          <p className="font-semibold text-[#1C1C1E]">{detail.title}</p>

                          <p className="text-[#555]">
                            Bắt đầu:{' '}
                            <span className="font-medium tabular-nums">
                             9h30, {formatDate(detail.startDate)}
                            </span>
                          </p>

                          <p className="text-[#555]">
                            Địa điểm:{' '}
                            <span className="font-medium">{getLocationLabel(detail.id)}</span>
                          </p>

                          {detail.endDate ? (
                            <p className="text-[#555]">
                              Thời lượng:{' '}
                              <span className="font-medium">
                                {formatDuration(detail.startDate, detail.endDate)}
                              </span>
                            </p>
                          ) : null}

                          <div className="rounded-2xl bg-[#F2F2F7] p-3 whitespace-pre-wrap leading-relaxed text-[#444] border border-black/5">
                            {detail.description || 'Chưa có mô tả chi tiết.'}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-[#666]">Chưa có dữ liệu chi tiết.</p>
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    );
  }, [events, isLoading, error, expandedId, detailsById, loadingById, errorById]);

  return (
    <div className="min-h-screen bg-[#F2F2F7] px-4 pb-28 pt-8">
      <div className="mx-auto flex w-full max-w-md flex-col space-y-4">
        <AceCard className="bg-[#DFF5D1] shadow-md px-6 py-4 rounded-2xl text-center">
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
            Họp nhóm và Tập huấn
          </h1>
        </AceCard>

        <div className="bg-white rounded-3xl shadow-[0_12px_32px_rgba(0,0,0,0.10)] border border-black/5 overflow-hidden">
          {content}
        </div>
      </div>
    </div>
  );
}
