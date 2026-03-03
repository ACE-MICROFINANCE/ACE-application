import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { UserCog, UsersRound } from 'lucide-react-native';
import { LineChart, PieChart } from 'react-native-gifted-charts';
import { MobileFrame } from '@components/layout/MobileFrame';
import { Card } from '@components/ui/Card';
import { useProfileStore } from '@store/profileStore';
import {
  type ActiveCustomersResponse,
  type FeatureTimeSpentResponse,
  appApi,
  type FeatureUsageOverTimeResponse,
  type FeatureUsageRange,
} from '@services/appApi';

type SummaryState = {
  customers: number;
  staff: number;
};

const RANGE_OPTIONS: Array<{ key: FeatureUsageRange; label: string }> = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'year', label: 'Year' },
];

const ACTIVE_USERS_RANGE_OPTIONS: Array<{ key: 'weekly' | 'monthly' | 'yearly'; label: string }> = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

const TRACKED_FEATURES = ['LOANS', 'SAVINGS', 'SCHEDULE'] as const;
const TIME_SPENT_FEATURES = ['LOANS', 'SAVINGS', 'SCHEDULE'] as const;

const SERIES = {
  LOANS: { label: 'Loans', color: '#2563eb' },
  SAVINGS: { label: 'Savings', color: '#14b8a6' },
  SCHEDULE: { label: 'Schedule', color: '#f59e0b' },
} as const;

const chartWidth = Math.max(Dimensions.get('window').width - 92, 280);

function formatUsageBucketLabel(rawLabel: string, _range: FeatureUsageRange): string {
  if (!rawLabel) return '';
  // Keep original backend labels for consistency across filters.
  return rawLabel;
}

const AdminDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { profile } = useProfileStore();
  const isAdmin = profile?.actorKind === 'STAFF' && profile?.role === 'ADMIN';

  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryState>({ customers: 0, staff: 0 });

  const [range, setRange] = useState<FeatureUsageRange>('weekly');
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [usage, setUsage] = useState<FeatureUsageOverTimeResponse | null>(null);
  const [activeUsersRange, setActiveUsersRange] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [activeUsersLoading, setActiveUsersLoading] = useState(true);
  const [activeUsersError, setActiveUsersError] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveCustomersResponse | null>(null);
  const [timeSpentRange, setTimeSpentRange] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [timeSpentLoading, setTimeSpentLoading] = useState(true);
  const [timeSpentError, setTimeSpentError] = useState<string | null>(null);
  const [timeSpent, setTimeSpent] = useState<FeatureTimeSpentResponse | null>(null);
  const [usageChartWidth, setUsageChartWidth] = useState<number>(chartWidth);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadSummary = async () => {
      if (!isAdmin) {
        setSummaryLoading(false);
        return;
      }
      setSummaryLoading(true);
      try {
        const [customers, staff] = await Promise.all([
          appApi.getStaffCustomers().catch(() => []),
          appApi.getStaffUsers().catch(() => []),
        ]);
        if (!mounted) return;
        setSummary({
          customers: Array.isArray(customers) ? customers.length : 0,
          staff: Array.isArray(staff) ? staff.length : 0,
        });
      } finally {
        if (mounted) setSummaryLoading(false);
      }
    };

    loadSummary();
    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    let mounted = true;
    const loadUsage = async () => {
      if (!isAdmin) {
        setUsageLoading(false);
        return;
      }
      setUsageLoading(true);
      setUsageError(null);
      try {
        const data = await appApi.getFeatureUsageOverTime({
          range,
          features: [...TRACKED_FEATURES],
          limit: 3,
        });
        if (!mounted) return;
        setUsage(data);
      } catch (e: any) {
        if (!mounted) return;
        setUsageError(e?.response?.data?.message ?? 'Unable to load feature usage data.');
        setUsage(null);
      } finally {
        if (mounted) setUsageLoading(false);
      }
    };

    if (!isFocused) {
      setUsageLoading(false);
      return () => {
        mounted = false;
      };
    }

    loadUsage();

    return () => {
      mounted = false;
    };
  }, [isAdmin, range, isFocused]);

  const greetingName = useMemo(() => profile?.fullName || 'Admin', [profile?.fullName]);

  useEffect(() => {
    let mounted = true;
    const loadActiveUsers = async () => {
      if (!isAdmin) {
        setActiveUsersLoading(false);
        return;
      }
      setActiveUsersLoading(true);
      setActiveUsersError(null);
      try {
        const data = await appApi.getActiveCustomers({ range: activeUsersRange });
        if (!mounted) return;
        setActiveUsers(data);
      } catch (e: any) {
        if (!mounted) return;
        setActiveUsersError(e?.response?.data?.message ?? 'Unable to load active users data.');
        setActiveUsers(null);
      } finally {
        if (mounted) setActiveUsersLoading(false);
      }
    };

    if (!isFocused) {
      setActiveUsersLoading(false);
      return () => {
        mounted = false;
      };
    }

    loadActiveUsers();

    return () => {
      mounted = false;
    };
  }, [isAdmin, activeUsersRange, isFocused]);

  useEffect(() => {
    let mounted = true;
    const loadTimeSpent = async () => {
      if (!isAdmin) {
        setTimeSpentLoading(false);
        return;
      }
      setTimeSpentLoading(true);
      setTimeSpentError(null);
      try {
        const data = await appApi.getFeatureTimeSpent({
          range: timeSpentRange,
          features: [...TIME_SPENT_FEATURES],
        });
        if (!mounted) return;
        setTimeSpent(data);
      } catch (e: any) {
        if (!mounted) return;
        setTimeSpentError(e?.response?.data?.message ?? 'Unable to load time spent data.');
        setTimeSpent(null);
      } finally {
        if (mounted) setTimeSpentLoading(false);
      }
    };

    if (!isFocused) {
      setTimeSpentLoading(false);
      return () => {
        mounted = false;
      };
    }

    loadTimeSpent();

    return () => {
      mounted = false;
    };
  }, [isAdmin, timeSpentRange, isFocused]);

  const onRefresh = async () => {
    if (!isAdmin) return;
    setRefreshing(true);
    try {
      const [customers, staff, usageData, activeUsersData, timeSpentData] = await Promise.all([
        appApi.getStaffCustomers().catch(() => []),
        appApi.getStaffUsers().catch(() => []),
        appApi.getFeatureUsageOverTime({
          range,
          features: [...TRACKED_FEATURES],
          limit: 3,
        }),
        appApi.getActiveCustomers({ range: activeUsersRange }),
        appApi.getFeatureTimeSpent({
          range: timeSpentRange,
          features: [...TIME_SPENT_FEATURES],
        }),
      ]);

      setSummary({
        customers: Array.isArray(customers) ? customers.length : 0,
        staff: Array.isArray(staff) ? staff.length : 0,
      });
      setUsage(usageData);
      setUsageError(null);
      setActiveUsers(activeUsersData);
      setActiveUsersError(null);
      setTimeSpent(timeSpentData);
      setTimeSpentError(null);
    } catch (e: any) {
      // Preserve existing data; only surface refresh errors for each panel.
      if (!usageError) setUsageError(e?.response?.data?.message ?? 'Unable to refresh usage data.');
      if (!activeUsersError) setActiveUsersError(e?.response?.data?.message ?? 'Unable to refresh active users data.');
      if (!timeSpentError) setTimeSpentError(e?.response?.data?.message ?? 'Unable to refresh time spent data.');
    } finally {
      setRefreshing(false);
    }
  };

  const chartData = useMemo(() => {
    if (!usage) {
      return {
        loanData: [] as Array<{ value: number; label?: string }>,
        savingData: [] as Array<{ value: number; label?: string }>,
        scheduleData: [] as Array<{ value: number; label?: string }>,
        totals: { LOANS: 0, SAVINGS: 0, SCHEDULE: 0 },
      };
    }

    const byFeature = new Map(usage.features.map((f) => [f.featureKey, f]));
    const rawLabels = usage.buckets || [];
    const rawLoanSeries = byFeature.get('LOANS')?.data ?? Array(rawLabels.length).fill(0);
    const rawSavingSeries = byFeature.get('SAVINGS')?.data ?? Array(rawLabels.length).fill(0);
    const rawScheduleSeries = byFeature.get('SCHEDULE')?.data ?? Array(rawLabels.length).fill(0);

    const windowSize =
      range === 'daily' ? 6 : range === 'weekly' ? 8 : range === 'monthly' ? 8 : rawLabels.length;
    const startIndex = Math.max(rawLabels.length - windowSize, 0);

    let labels = rawLabels.slice(startIndex);
    let loanSeries = rawLoanSeries.slice(startIndex);
    let savingSeries = rawSavingSeries.slice(startIndex);
    let scheduleSeries = rawScheduleSeries.slice(startIndex);

    // If the latest bucket is still empty, trim it so the chart ends at the most recent activity.
    while (
      labels.length > 2 &&
      (loanSeries[labels.length - 1] ?? 0) === 0 &&
      (savingSeries[labels.length - 1] ?? 0) === 0 &&
      (scheduleSeries[labels.length - 1] ?? 0) === 0
    ) {
      labels = labels.slice(0, -1);
      loanSeries = loanSeries.slice(0, -1);
      savingSeries = savingSeries.slice(0, -1);
      scheduleSeries = scheduleSeries.slice(0, -1);
    }

    const totalPoints = labels.length;
    const targetLabelCount = range === 'daily' ? 5 : range === 'weekly' ? 4 : range === 'monthly' ? 4 : 5;
    const showEvery =
      totalPoints <= targetLabelCount ? 1 : Math.ceil((totalPoints - 1) / Math.max(targetLabelCount - 1, 1));

    const loanData = loanSeries.map((value, idx) => ({
      value: Number(value) || 0,
      // Keep cadence consistent and always show both boundaries.
      label:
        idx === 0 || idx === totalPoints - 1 || idx % showEvery === 0
          ? formatUsageBucketLabel(labels[idx] ?? '', range)
          : '',
    }));
    const savingData = savingSeries.map((value) => ({ value: Number(value) || 0 }));
    const scheduleData = scheduleSeries.map((value) => ({ value: Number(value) || 0 }));

    return {
      loanData,
      savingData,
      scheduleData,
      totals: {
        LOANS: rawLoanSeries.reduce((sum, v) => sum + v, 0),
        SAVINGS: rawSavingSeries.reduce((sum, v) => sum + v, 0),
        SCHEDULE: rawScheduleSeries.reduce((sum, v) => sum + v, 0),
      },
    };
  }, [usage, range]);

  const chartMaxValue = useMemo(() => {
    const allValues = [
      ...chartData.loanData.map((p) => p.value),
      ...chartData.savingData.map((p) => p.value),
      ...chartData.scheduleData.map((p) => p.value),
    ];
    if (!allValues.length) return 1;
    const max = Math.max(...allValues, 0);
    if (max <= 1) return 1;
    if (max <= 6) return Math.ceil(max);
    return Math.ceil(max * 1.1);
  }, [chartData]);

  const usageChartSections = useMemo(() => {
    if (chartMaxValue <= 1) return 1;
    if (chartMaxValue <= 6) return chartMaxValue;
    return 4;
  }, [chartMaxValue]);

  const pieData = useMemo(() => {
    if (!activeUsers || activeUsers.totalCustomers <= 0) return [];
    return [
      { value: activeUsers.activeCustomers, color: '#2563eb' },
      { value: activeUsers.inactiveCustomers, color: '#cbd5e1' },
    ];
  }, [activeUsers]);

  const activeUsersPeriodText = useMemo(() => {
    if (activeUsersRange === 'weekly') return 'week';
    if (activeUsersRange === 'yearly') return 'year';
    return 'month';
  }, [activeUsersRange]);

  const timeSpentRows = useMemo(() => {
    const colorMap: Record<string, string> = {
      LOANS: '#2563eb',
      SAVINGS: '#14b8a6',
      SCHEDULE: '#f59e0b',
    };
    const fallback = TIME_SPENT_FEATURES.map((featureKey) => ({
      label: SERIES[featureKey].label,
      color: colorMap[featureKey],
      avgMinutes: 0,
      totalMinutes: 0,
      sessions: 0,
      activeUsers: 0,
    }));

    if (!timeSpent) return fallback;

    const byFeature = new Map(timeSpent.features.map((f) => [f.featureKey, f]));
    return TIME_SPENT_FEATURES.map((featureKey) => {
      const row = byFeature.get(featureKey);
      return {
        label: SERIES[featureKey].label,
        color: colorMap[featureKey],
        avgMinutes: Number((row?.averageMinutes ?? 0).toFixed(1)),
        totalMinutes: Number((row?.totalMinutes ?? 0).toFixed(1)),
        sessions: Number(row?.sessions ?? 0),
        activeUsers: Number(row?.activeUsers ?? 0),
      };
    });
  }, [timeSpent]);

  const timeSpentMaxMinutes = useMemo(() => {
    const max = Math.max(...timeSpentRows.map((d) => d.avgMinutes), 0);
    return max > 0 ? max : 1;
  }, [timeSpentRows]);

  const timeSpentPeriodText = useMemo(() => {
    if (timeSpentRange === 'weekly') return 'week';
    if (timeSpentRange === 'yearly') return 'year';
    return 'month';
  }, [timeSpentRange]);

  const handleStatPress = async (target: 'StaffCustomers' | 'StaffManage') => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    navigation.navigate(target as never);
  };

  if (!isAdmin) {
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
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 24, gap: 14 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Card className="items-center justify-center rounded-2xl bg-[#DDEBFF] px-6 py-6 shadow-lg">
          <Text className="text-base font-semibold text-slate-900">Welcome</Text>
          <Text className="mt-1 text-2xl font-bold text-[#2b6cb0] text-center">{greetingName}</Text>
        </Card>

        <View className="flex-row" style={{ gap: 10 }}>
          <Pressable
            className="flex-1 rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-4"
            style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
            disabled={summaryLoading}
            onPress={() => handleStatPress('StaffCustomers')}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-[#1e3a8a]">Partners</Text>
              <UsersRound size={18} strokeWidth={2} color="#1e40af" />
            </View>
            <Text className="mt-2 text-3xl font-bold text-[#1e40af]">
              {summaryLoading ? '...' : summary.customers}
            </Text>
          </Pressable>

          <Pressable
            className="flex-1 rounded-2xl border border-[#a7f3d0] bg-[#ecfdf5] px-4 py-4"
            style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
            disabled={summaryLoading}
            onPress={() => handleStatPress('StaffManage')}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-[#065f46]">Staff</Text>
              <UserCog size={18} strokeWidth={2} color="#047857" />
            </View>
            <Text className="mt-2 text-3xl font-bold text-[#065f46]">
              {summaryLoading ? '...' : summary.staff}
            </Text>
          </Pressable>
        </View>

        <Card className="rounded-2xl bg-white px-4 py-4 shadow-lg">
          <Text className="text-base font-semibold text-[#111]">Feature Usage Over Time</Text>
          <Text className="text-xs text-[#64748b] mt-1">
            Track usage frequency of key features by period.
          </Text>

          <View style={{ marginTop: 12 }} className="flex-row flex-wrap gap-2">
            {RANGE_OPTIONS.map((item) => {
              const active = range === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setRange(item.key)}
                  className={`rounded-full border px-3 py-2 ${
                    active ? 'border-[#2563eb] bg-[#e8f0ff]' : 'border-black/10 bg-white'
                  }`}
                  style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                >
                  <Text className={`text-xs font-semibold ${active ? 'text-[#1d4ed8]' : 'text-[#475569]'}`}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: 12 }}>
            {usageLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator />
                <Text className="mt-2 text-sm text-[#666]">Loading chart...</Text>
              </View>
            ) : usageError ? (
              <View className="rounded-xl bg-rose-50 px-4 py-3">
                <Text className="text-sm text-rose-600">{usageError}</Text>
              </View>
            ) : !usage || usage.features.length === 0 ? (
              <View className="rounded-xl bg-slate-50 px-4 py-6">
                <Text className="text-sm text-[#64748b]">No usage data for this period.</Text>
              </View>
            ) : (
              <>
                <View style={{ marginTop: 8, gap: 8 }}>
                  {(Object.keys(SERIES) as Array<keyof typeof SERIES>).map((key) => (
                    <View key={key} className="flex-row items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <View className="flex-row items-center" style={{ gap: 8 }}>
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 9999,
                            backgroundColor: SERIES[key].color,
                          }}
                        />
                        <Text className="text-xs font-semibold text-[#334155]">{SERIES[key].label}</Text>
                      </View>
                      <Text className="text-xs font-semibold text-[#0f172a]">{chartData.totals[key]}</Text>
                    </View>
                  ))}
                </View>

                <View
                  style={{ marginTop: 10, paddingTop: 6 }}
                  onLayout={(e) => {
                    const w = Math.floor(e.nativeEvent.layout.width);
                    if (w > 0 && w !== usageChartWidth) setUsageChartWidth(w);
                  }}
                >
                  <LineChart
                    data={chartData.loanData}
                    data2={chartData.savingData}
                    data3={chartData.scheduleData}
                    width={Math.max(usageChartWidth - 8, 220)}
                    height={220}
                    color1={SERIES.LOANS.color}
                    color2={SERIES.SAVINGS.color}
                    color3={SERIES.SCHEDULE.color}
                    thickness1={3}
                    thickness2={3}
                    thickness3={3}
                    dataPointsColor1={SERIES.LOANS.color}
                    dataPointsColor2={SERIES.SAVINGS.color}
                    dataPointsColor3={SERIES.SCHEDULE.color}
                    dataPointsRadius={4}
                    hideDataPoints={false}
                    yAxisColor="#cbd5e1"
                    xAxisColor="#cbd5e1"
                    xAxisLabelTextStyle={{ color: '#64748b', fontSize: 9 }}
                    yAxisTextStyle={{ color: '#64748b', fontSize: 10 }}
                    noOfSections={usageChartSections}
                    maxValue={chartMaxValue}
                    adjustToWidth
                    initialSpacing={8}
                    endSpacing={8}
                    disableScroll
                    scrollToEnd={false}
                    showScrollIndicator={false}
                    rulesColor="#e2e8f0"
                    isAnimated
                    animationDuration={480}
                    curved={false}
                    hideRules={false}
                  />
                </View>
              </>
            )}
          </View>
        </Card>

        <Card className="rounded-2xl bg-white px-4 py-4 shadow-lg">
          <Text className="text-base font-semibold text-[#111]">Active Users</Text>
          <Text className="text-xs text-[#64748b] mt-1">
            Active customers over total customers.
          </Text>

          <View style={{ marginTop: 12 }} className="flex-row flex-wrap gap-2">
            {ACTIVE_USERS_RANGE_OPTIONS.map((item) => {
              const active = activeUsersRange === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setActiveUsersRange(item.key)}
                  className={`rounded-full border px-3 py-2 ${
                    active ? 'border-[#2563eb] bg-[#e8f0ff]' : 'border-black/10 bg-white'
                  }`}
                  style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                >
                  <Text className={`text-xs font-semibold ${active ? 'text-[#1d4ed8]' : 'text-[#475569]'}`}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: 12 }}>
            {activeUsersLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator />
                <Text className="mt-2 text-sm text-[#666]">Loading active users...</Text>
              </View>
            ) : activeUsersError ? (
              <View className="rounded-xl bg-rose-50 px-4 py-3">
                <Text className="text-sm text-rose-600">{activeUsersError}</Text>
              </View>
            ) : !activeUsers || activeUsers.totalCustomers <= 0 ? (
              <View className="rounded-xl bg-slate-50 px-4 py-6">
                <Text className="text-sm text-[#64748b]">No customer data.</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <View className="items-center">
                  <PieChart
                    data={pieData}
                    donut
                    radius={92}
                    innerRadius={60}
                    textColor="#0f172a"
                    textSize={12}
                    strokeColor="#ffffff"
                    strokeWidth={2}
                    centerLabelComponent={() => (
                      <View className="items-center">
                        <Text className="text-lg font-bold text-[#0f172a]">{activeUsers.activeRate}%</Text>
                        <Text className="text-[11px] text-[#64748b]">Active</Text>
                      </View>
                    )}
                  />
                </View>

                <View className="rounded-xl bg-slate-50 px-4 py-3">
                  <Text className="text-base font-semibold text-[#0f172a]">
                    {activeUsers.activeCustomers} / {activeUsers.totalCustomers}
                  </Text>
                  <Text className="mt-1 text-xs text-[#64748b]">Customers used app in this {activeUsersPeriodText}</Text>
                </View>

                <View style={{ gap: 8 }}>
                  <View className="flex-row items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 9999, backgroundColor: '#2563eb' }} />
                      <Text className="text-xs font-semibold text-[#334155]">Active</Text>
                    </View>
                    <Text className="text-xs font-semibold text-[#0f172a]">{activeUsers.activeCustomers}</Text>
                  </View>
                  <View className="flex-row items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 9999, backgroundColor: '#cbd5e1' }} />
                      <Text className="text-xs font-semibold text-[#334155]">Inactive</Text>
                    </View>
                    <Text className="text-xs font-semibold text-[#0f172a]">{activeUsers.inactiveCustomers}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </Card>

        <Card className="rounded-2xl bg-white px-4 py-4 shadow-lg">
          <Text className="text-base font-semibold text-[#111]">Time Spent on Features</Text>
          <Text className="text-xs text-[#64748b] mt-1">
            Average minutes per active customer by feature.
          </Text>

          <View style={{ marginTop: 12 }} className="flex-row flex-wrap gap-2">
            {ACTIVE_USERS_RANGE_OPTIONS.map((item) => {
              const active = timeSpentRange === item.key;
              return (
                <Pressable
                  key={`timespent-${item.key}`}
                  onPress={() => setTimeSpentRange(item.key)}
                  className={`rounded-full border px-3 py-2 ${
                    active ? 'border-[#2563eb] bg-[#e8f0ff]' : 'border-black/10 bg-white'
                  }`}
                  style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                >
                  <Text className={`text-xs font-semibold ${active ? 'text-[#1d4ed8]' : 'text-[#475569]'}`}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: 12 }}>
            {timeSpentLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator />
                <Text className="mt-2 text-sm text-[#666]">Loading time spent...</Text>
              </View>
            ) : timeSpentError ? (
              <View className="rounded-xl bg-rose-50 px-4 py-3">
                <Text className="text-sm text-rose-600">{timeSpentError}</Text>
              </View>
            ) : !timeSpent ? (
              <View className="rounded-xl bg-slate-50 px-4 py-6">
                <Text className="text-sm text-[#64748b]">No time spent data.</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <View style={{ gap: 8 }}>
                  {timeSpentRows.map((row) => {
                    const ratio = row.avgMinutes <= 0 ? 0 : row.avgMinutes / timeSpentMaxMinutes;
                    const widthPercent = ratio <= 0 ? 0 : Math.max(Math.round(ratio * 100), 8);
                    return (
                      <View key={`time-spent-${row.label}`} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center" style={{ gap: 8 }}>
                            <View style={{ width: 10, height: 10, borderRadius: 9999, backgroundColor: row.color }} />
                            <Text className="text-sm font-semibold text-[#1f2937]">{row.label}</Text>
                          </View>
                          <Text className="text-sm font-bold text-[#0f172a]">{row.avgMinutes.toFixed(1)} min</Text>
                        </View>

                        <View className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <View
                            style={{
                              height: '100%',
                              width: `${widthPercent}%`,
                              backgroundColor: row.color,
                              borderRadius: 9999,
                            }}
                          />
                        </View>

                        <View className="mt-2 flex-row items-center justify-between">
                          <Text className="text-[11px] text-[#64748b]">Users: {row.activeUsers}</Text>
                          <Text className="text-[11px] text-[#64748b]">Sessions: {row.sessions}</Text>
                          <Text className="text-[11px] text-[#64748b]">Total: {row.totalMinutes.toFixed(1)}m</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <Text className="text-xs text-[#64748b]">
                  Average time per active customer in this {timeSpentPeriodText}.
                </Text>
              </View>
            )}
          </View>
        </Card>

      </ScrollView>
    </MobileFrame>
  );
};

export default AdminDashboardScreen;
