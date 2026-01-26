import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Platform, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { MobileFrame } from '@components/layout/MobileFrame';
import { Card } from '@components/ui/Card';
import { useAuth } from '@contexts/AuthContext';
import { useProfileStore } from '@store/profileStore';
import { appApi, type LoanCurrentResponse, type ScheduleItem, type WeatherResponse } from '@services/appApi';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};
const daysUntil = (date: Date) => Math.ceil((date.getTime() - startOfToday().getTime()) / MS_PER_DAY);

const formatVND = (num?: number | null) => {
  const n = Number(num ?? 0);
  return n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
};

const DashboardInfoItem = ({
  imageSource,
  alt,
  text,
}: {
  imageSource: any;
  alt: string;
  text: React.ReactNode;
}) => (
  <View className="flex-row items-center" style={{ gap: 12 }}>
    <View className="h-12 w-12 items-center justify-center rounded-full overflow-hidden bg-white border border-black/5">
      <Image source={imageSource} accessibilityLabel={alt} className="h-12 w-12" resizeMode="cover" />
    </View>
    <Text className="flex-1 text-base text-[#333] leading-tight">{text as any}</Text>
  </View>
);

const DashboardRemindersCard = ({
  events,
  loan,
  includeLoanReminder,
  loading,
}: {
  events: ScheduleItem[];
  loan: LoanCurrentResponse | null;
  includeLoanReminder: boolean;
  loading: boolean;
  }) => {
    const icons = {
      farming: require('../../assets/img/farming-plant-rice.jpg'),
      loan: require('../../assets/img/loan-payment.png'),
      meeting: require('../../assets/img/community-meeting.png'),
    };

  const reminders = useMemo(() => {
    if (loading) {
      return [
        { imageSource: icons.farming, alt: 'Đang tải', text: 'Đang tải...' },
        includeLoanReminder ? { imageSource: icons.loan, alt: 'Đang tải', text: 'Đang tải...' } : null,
        { imageSource: icons.meeting, alt: 'Đang tải', text: 'Đang tải...' },
      ].filter(Boolean) as any[];
    }

    const safeEvents = Array.isArray(events) ? events : [];
    const items: any[] = [];

    const nearest = (type: string) =>
      safeEvents
        .filter((e) => e.eventType === type)
        .map((e) => ({ ...e, date: new Date(e.startDate) }))
        .filter((e) => e.date >= startOfToday())
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

    const farming = nearest('FARMING_TASK');
    if (farming) {
      const diff = daysUntil(farming.date);
      const text =
        diff === 0 ? `Hôm nay: ${farming.title.toLowerCase()}.` : `Trong ${diff} ngày nữa: ${farming.title.toLowerCase()}.`;
      items.push({ imageSource: icons.farming, alt: 'Lịch canh tác', text });
    }

    if (includeLoanReminder && loan?.nextPayment?.dueDate) {
      const due = new Date(loan.nextPayment.dueDate);
      const diff = daysUntil(due);
      const amountValue = loan.nextPayment.totalDue ?? loan.nextPayment.principalDue ?? 0;
      const amountText = formatVND(amountValue);
      const text =
        diff === 0
          ? `Hôm nay đến hạn thanh toán ${amountText}.`
          : `Trong ${diff} ngày nữa, khoản thanh toán ${amountText} sẽ đến hạn.`;
      items.push({ imageSource: icons.loan, alt: 'Nhắc thanh toán', text });
    }

    const meeting = nearest('MEETING');
    if (meeting) {
      const diff = daysUntil(meeting.date);
      const text = diff === 0 ? 'Bạn có cuộc họp hôm nay.' : `Bạn có cuộc họp trong ${diff} ngày tới.`;
      items.push({ imageSource: icons.meeting, alt: 'Họp nhóm', text });
    }

    return items;
  }, [events, loan, includeLoanReminder, loading]);

  if (!reminders.length) return null;

  return (
    <View>
      {reminders.map((item, idx) => (
        <View key={idx} className={idx === 0 ? '' : 'mt-4'}>
          <Card className="rounded-2xl bg-white shadow-lg p-5">
            <DashboardInfoItem imageSource={item.imageSource} alt={item.alt} text={item.text} />
          </Card>
        </View>
      ))}
    </View>
  );
};

const WeatherCard = () => {
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchWeather = async (lat: number, lon: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await appApi.getWeather?.(lat, lon);
        if (!cancelled) setWeather(data ?? null);
      } catch {
        if (!cancelled) setError('Không thể tải dữ liệu thời tiết');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const fallbackLat = 21.38602;
    const fallbackLon = 103.02301;
    const requestLocation = async () => {
      try {
        if (Platform.OS !== 'web') {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
            fetchWeather(pos.coords.latitude, pos.coords.longitude);
            return;
          }
        } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => fetchWeather(position.coords.latitude, position.coords.longitude),
            () => fetchWeather(fallbackLat, fallbackLon),
          );
          return;
        }
      } catch {
        // fall back
      }
      fetchWeather(fallbackLat, fallbackLon);
    };
    requestLocation();

    return () => {
      cancelled = true;
    };
  }, []);

  const fixIcon = (icon?: string | null) => {
    if (!icon) return '';
    return icon.startsWith('//') ? `https:${icon}` : icon;
  };

  const dailyList =
    weather?.daily && weather.daily.length >= 7
      ? weather.daily.slice(0, 7)
      : weather?.daily?.slice(0, 3) ?? [];

  return (
    <Card className="rounded-2xl bg-white shadow-lg p-5">
      {loading && <Text className="text-sm text-slate-500">Đang tải thời tiết...</Text>}
      {!loading && error && <Text className="text-sm text-red-500">{error}</Text>}
      {!loading && weather ? (
        <View>
          <View className="flex-row items-center" style={{ gap: 16 }}>
            {weather.current?.icon ? (
              <Image source={{ uri: fixIcon(weather.current.icon) }} className="h-14 w-14" resizeMode="contain" />
            ) : null}
            <View className="flex-1">
              <Text className="text-3xl font-semibold">{Math.round(weather.current.temp)}°C</Text>
              <Text className="text-sm text-slate-600">{weather.current.description}</Text>
              <Text className="text-xs text-slate-500">
                Cao {Math.round(weather.current.max ?? weather.current.temp)}° · Thấp{' '}
                {Math.round(weather.current.min ?? weather.current.temp)}°
              </Text>
            </View>
            {weather.location ? <Text className="text-sm text-slate-500 text-right">{weather.location}</Text> : null}
          </View>

          {dailyList.length ? (
            <View className="mt-4" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {dailyList.map((day, index) => {
                const date = new Date(day.date);
                const label =
                  index === 0 ? 'Hôm nay' : date.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' });
                return (
                  <View key={day.date} style={{ flex: 1, alignItems: 'center' }}>
                    <Text className="text-xs text-slate-600">{label}</Text>
                    {day.icon ? (
                      <Image source={{ uri: fixIcon(day.icon) }} className="h-8 w-8 my-1" resizeMode="contain" />
                    ) : null}
                    <Text className="text-xs text-slate-600">{Math.round(day.max)}°</Text>
                    <Text className="text-[11px] text-slate-400">{Math.round(day.min)}°</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
};

const DashboardScreen = () => {
  const { customer } = useAuth();
  const { profile } = useProfileStore();
  const isStaff = profile?.actorKind === 'STAFF';
  const isAdmin = isStaff && profile?.role === 'ADMIN';
  const includeLoanReminder = !(isStaff || isAdmin);
  const [loan, setLoan] = useState<LoanCurrentResponse | null>(null);
  const [events, setEvents] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [loanRes, eventsRes] = await Promise.all([
          appApi.getCurrentLoan().catch(() => null),
          appApi.getSchedule().catch(() => [] as ScheduleItem[]),
        ]);
        if (!mounted) return;
        setLoan(loanRes);
        setEvents(eventsRes ?? []);
      } catch {
        if (mounted) setError('Không tải được dữ liệu dashboard.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const welcomeName = customer?.fullName || 'Khách hàng ACE';

  if (loading) {
    return (
      <MobileFrame>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-[#666]">Đang tải dashboard...</Text>
        </View>
      </MobileFrame>
    );
  }

  if (error) {
    return (
      <MobileFrame>
        <View className="flex-1 items-center justify-center space-y-2">
          <Text className="text-sm text-red-500">{error}</Text>
          <Text className="text-sm text-[#555]">Vui lòng thử lại sau.</Text>
        </View>
      </MobileFrame>
    );
  }

  return (
    <MobileFrame withBottomPadding>
      <View className="pt-6 pb-4" style={{ gap: 20 }}>
        <Card className="items-center justify-center bg-white rounded-2xl shadow-lg p-6">
          <Text className="text-lg font-semibold text-[#333]">Chào mừng</Text>
          <Text className="text-3xl font-bold text-[#2b6cb0] text-center">{welcomeName}</Text>
        </Card>

        <WeatherCard />

        <DashboardRemindersCard events={events} loan={loan} includeLoanReminder={includeLoanReminder} loading={loading} />
      </View>
    </MobileFrame>
  );
};

export default DashboardScreen;
