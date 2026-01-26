import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View, Platform } from 'react-native';
import { MobileFrame } from '@components/layout/MobileFrame';
import { Card } from '@components/ui/Card';
import { AppButton } from '@components/ui/AppButton';
import { useScreenGuard } from '../hooks/useScreenGuard';
import { appApi, type ScheduleItem, type ScheduleDetail } from '@services/appApi';

// ✅ TTS imports
import { useProfileStore } from '@store/profileStore';
import { requestTts } from '@services/ttsApi';
import { playTtsUrl, stopTts } from '@lib/ttsPlayer';

const formatDate = (val?: string | null) => {
  if (!val) return '';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const formatTime = (val?: string | null) => {
  if (!val) return '';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (start?: string | null, end?: string | null, durationMinutes?: number | null) => {
  const minutes =
    durationMinutes && durationMinutes > 0
      ? durationMinutes
      : (() => {
          if (!start || !end) return null;
          const s = new Date(start);
          const e = new Date(end);
          const diff = e.getTime() - s.getTime();
          if (!Number.isFinite(diff) || diff <= 0) return null;
          return Math.round(diff / 60000);
        })();
  if (!minutes) return '';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ngày`);
  if (hours > 0) parts.push(`${hours} giờ`);
  if (mins > 0) parts.push(`${mins} phút`);
  return parts.join(' ') || '0 phút';
};

const getAvatarUrl = (event: ScheduleItem) => {
  const type = String(event.eventType ?? '').trim().toUpperCase();

  if (type === 'MEETING') return require('../../assets/img/community-meeting.png');
  if (type === 'FIELD_SCHOOL') return require('../../assets/img/farming-plant-rice.jpg');
  if (type === 'FARMING_TASK') return require('../../assets/img/farming-plant-rice.jpg');

  return require('../../assets/img/farming-plant-rice.jpg');
};

const buildEventText = (event: ScheduleItem) => {
  const type = String(event.eventType ?? '').trim().toUpperCase();

  if ((event as any).daysUntilEvent != null) {
    const days = (event as any).daysUntilEvent;
    if (type === 'MEETING') return `Bạn có cuộc họp trong ${days} ngày tới`;
    if (type === 'FIELD_SCHOOL') return `Trong ${days} ngày nữa sẽ có buổi tập huấn tại địa phương`;
    if (type === 'FARMING_TASK') return `Trong ${days} ngày nữa: ${String(event.title ?? '').toLowerCase()}`;
    return `${event.title} - còn ${days} ngày`;
  }

  return event.title;
};

const ScheduleItemRow = ({
  item,
  isExpanded,
  onToggle,
}: {
  item: ScheduleItem;
  isExpanded: boolean;
  onToggle: () => void;
}) => (
  <Pressable
    onPress={onToggle}
    className="flex-row items-center gap-4 px-4 py-4 active:bg-black/5"
    android_ripple={{ color: '#e5e7eb' }}
    style={({ pressed }) =>
      Platform.OS === 'web'
        ? undefined
        : {
            backgroundColor: pressed ? 'rgba(0,0,0,0.03)' : 'transparent',
          }
    }
  >
    <View className="relative h-12 w-12 overflow-hidden rounded-full bg-black/5">
      <Image source={getAvatarUrl(item)} style={{ width: 48, height: 48 }} resizeMode="cover" />
    </View>
    <View className="flex-1 space-y-1">
      <Text className="text-sm font-semibold text-[#0A84FF]">{formatDate(item.startDate)}</Text>
      <Text className="text-sm text-[#1C1C1E]" numberOfLines={2}>
        {buildEventText(item)}
      </Text>
    </View>
    <View style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}>
      <Text className="text-[#C7C7CC]">{'>'}</Text>
    </View>
  </Pressable>
);

const CustomerScheduleScreen = () => {
  const { loading, allowed } = useScreenGuard((profile) => profile?.actorKind !== 'STAFF');

  // ✅ profile để check trợ năng
  const { profile } = useProfileStore();
  const accessibilityEnabled = profile?.actorKind === 'CUSTOMER' && profile?.accessibilityEnabled === true;

  const [events, setEvents] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailsById, setDetailsById] = useState<Record<number, ScheduleDetail | undefined>>({});
  const [loadingById, setLoadingById] = useState<Record<number, boolean>>({});
  const [errorById, setErrorById] = useState<Record<number, string | null>>({});

  // ✅ chống đọc lặp + chống spam gọi API
  const spokenOnceRef = useRef(false);
  const ttsInFlightRef = useRef(false);

  const fetchSchedule = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await appApi.getSchedule();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Không tải được lịch sự kiện. Vui lòng thử lại.');
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
    if (allowed) fetchSchedule();
  }, [allowed]);

  // ✅ stop tts khi rời màn
  useEffect(() => {
    return () => {
      stopTts().catch(() => undefined);
    };
  }, []);

  // ✅ TTS đọc MEETING gần nhất
  useEffect(() => {
    if (!allowed || !accessibilityEnabled) return;
    if (isLoading) return;
    if (error) return;
    if (spokenOnceRef.current) return;
    if (ttsInFlightRef.current) return;

    const isMeeting = (x: any) => String(x ?? '').trim().toUpperCase() === 'MEETING';

    const parseDateMs = (val?: string | null) => {
      if (!val) return NaN;
      const s = String(val);

      // fix "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm:ss"
      const fixed = s.includes(' ') && !s.includes('T') ? s.replace(' ', 'T') : s;

      const ms = Date.parse(fixed);
      return Number.isFinite(ms) ? ms : NaN;
    };

    const formatDateForSpeech = (val?: string | null) => {
      const ms = parseDateMs(val);
      if (!Number.isFinite(ms)) return '';
      const d = new Date(ms);
      return `${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
    };

    const meetings = (Array.isArray(events) ? events : [])
      .filter((e) => isMeeting(e.eventType) && e.startDate)
      .map((e) => ({ e, t: parseDateMs(e.startDate as string) }))
      .filter((x) => Number.isFinite(x.t))
      .sort((a, b) => a.t - b.t);

    console.log('[CustomerSchedule TTS] events=', events?.length ?? 0, 'meetings=', meetings.length);

    if (!meetings.length) return;

    const now = Date.now();
    const nextMeeting = meetings.find((m) => m.t >= now)?.e ?? meetings[0].e;

    const dateText = formatDateForSpeech(nextMeeting.startDate);
    if (!dateText) return;

    const textToSpeak = `Buổi họp nhóm tiếp theo của bạn là vào ngày ${dateText}.`;
    console.log('[CustomerSchedule TTS] speak=', textToSpeak);

    const playWithRetry = async (url: string) => {
      for (let i = 0; i < 4; i++) {
        try {
          await playTtsUrl(url);
          return true;
        } catch {
          await new Promise((r) => setTimeout(r, 800));
        }
      }
      return false;
    };

    ttsInFlightRef.current = true;

    (async () => {
      try {
        await stopTts();
        const res = await requestTts(textToSpeak);

        console.log('[CustomerSchedule TTS] res=', res);

        if (res?.ok && res.audioUrl) {
          const played = await playWithRetry(res.audioUrl);
          if (played) spokenOnceRef.current = true; // ✅ chỉ set true khi play OK
        }
      } catch (e) {
        console.log('[CustomerSchedule TTS] error=', e);
      } finally {
        ttsInFlightRef.current = false;
      }
    })();
  }, [allowed, accessibilityEnabled, isLoading, error, events]);

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <View className="px-4 py-6">
          <Text className="text-center text-sm text-[#666]">Đang tải lịch...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View className="space-y-2 px-4 py-6 items-center">
          <Text className="text-sm text-red-500">{error}</Text>
          <AppButton title="Thử lại" onPress={fetchSchedule} className="w-32" />
        </View>
      );
    }

    const safeEvents = Array.isArray(events) ? events : [];
    if (!safeEvents.length) {
      return (
        <View className="px-4 py-6">
          <Text className="text-center text-sm text-[#666]">Chưa có sự kiện sắp tới.</Text>
        </View>
      );
    }

    return (
      <View className="divide-y divide-black/5">
        {safeEvents.map((event) => {
          const isExpanded = expandedId === event.id;
          const detail = detailsById[event.id as number];
          const isDetailLoading = Boolean(loadingById[event.id as number]);
          const detailError = errorById[event.id as number];

          return (
            <View key={event.id} className="overflow-hidden">
              <ScheduleItemRow
                item={event}
                isExpanded={isExpanded}
                onToggle={() => {
                  const next = isExpanded ? null : (event.id as number);
                  setExpandedId(next);

                  if (next !== null && !detailsById[event.id as number] && !loadingById[event.id as number]) {
                    fetchDetail(event.id as number);
                  }
                }}
              />

              {isExpanded ? (
                <View className="border-t border-black/5 px-4 pb-4 pt-3">
                  {isDetailLoading ? (
                    <Text className="text-sm text-[#666]">Đang tải...</Text>
                  ) : detailError ? (
                    <View className="space-y-2">
                      <Text className="text-sm text-red-500">{detailError}</Text>
                      <AppButton title="Thử lại" onPress={() => fetchDetail(event.id as number)} className="h-10 w-28" />
                    </View>
                  ) : detail ? (
                    <View className="space-y-2 text-sm text-[#333]">
                      <Text className="font-semibold text-[#1C1C1E]">{detail.title}</Text>
                      <Text className="text-[#555]">
                        Bắt đầu:{' '}
                        <Text className="font-medium">
                          {formatTime(detail.startDate) ? `${formatTime(detail.startDate)}, ` : ''}
                          {formatDate(detail.startDate)}
                        </Text>
                      </Text>
                      <Text className="text-[#555]">
                        Địa điểm: <Text className="font-medium">{detail.locationName || '-'}</Text>
                      </Text>
                      {formatDuration(detail.startDate, detail.endDate, detail.durationMinutes) ? (
                        <Text className="text-[#555]">
                          Thời lượng:{' '}
                          <Text className="font-medium">
                            {formatDuration(detail.startDate, detail.endDate, detail.durationMinutes)}
                          </Text>
                        </Text>
                      ) : null}
                      <View className="rounded-2xl bg-[#F2F2F7] p-3 border border-black/5">
                        <Text className="text-[#444]">{detail.description || 'Chưa có mô tả chi tiết.'}</Text>
                      </View>
                    </View>
                  ) : (
                    <Text className="text-sm text-[#666]">Chưa có dữ liệu chi tiết.</Text>
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    );
  }, [events, isLoading, error, expandedId, detailsById, loadingById, errorById]);

  if (loading || !allowed) {
    return (
      <MobileFrame withBottomPadding>
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-slate-600">Đang tải...</Text>
        </View>
      </MobileFrame>
    );
  }

  return (
    <MobileFrame withBottomPadding>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 32, paddingBottom: 56, paddingHorizontal: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignSelf: 'center', width: '100%', maxWidth: 480, gap: 12 }}>
          <Card className="bg-[#DFF5D1] px-6 py-4 rounded-2xl shadow-md items-center">
            <Text className="text-xl font-semibold text-slate-900">Họp nhóm và Tập huấn</Text>
          </Card>
          <View className="bg-white rounded-3xl shadow-[0_12px_32px_rgba(0,0,0,0.10)] border border-black/5 overflow-hidden">
            {content}
          </View>
        </View>
      </ScrollView>
    </MobileFrame>
  );
};

export default CustomerScheduleScreen;
