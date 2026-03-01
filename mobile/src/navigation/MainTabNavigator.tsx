import React, { useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '@screens/DashboardScreen';
import AdminDashboardScreen from '@screens/AdminDashboardScreen';
import LoansScreen from '@screens/LoansScreen';
import SavingsScreen from '@screens/SavingsScreen';
import CustomerScheduleScreen from '@screens/CustomerScheduleScreen';
import StaffScheduleScreen from '@screens/StaffScheduleScreen';
import InfoScreen from '@screens/InfoScreen';
import AccountScreen from '@screens/AccountScreen';
import StaffCustomersScreen from '@screens/StaffCustomersScreen';
import StaffManageScreen from '@screens/StaffManageScreen';
import AdminManagerScreen from '@screens/AdminManagerScreen';
import GroupScreen from '@screens/GroupScreen';
import { TabBar } from './TabBar';
import { useAuthStore } from '@store/authStore';
import { useProfileStore } from '@store/profileStore';
import { appApi } from '@services/appApi';

export type MainTabParamList = {
  Dashboard: undefined;
  AdminDashboard: undefined;
  Loans: undefined;
  Savings: undefined;
  Schedule: undefined;
  Info: undefined;
  Account: undefined;
  StaffCustomers: undefined;
  StaffManage: undefined;
  AdminManager: undefined;
  Group: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator = () => {
  const { mustChangePassword } = useAuthStore();
  const { profile } = useProfileStore();
  const isStaff = profile?.actorKind === 'STAFF';
  const isAdmin = isStaff && profile?.role === 'ADMIN';
  const isSuperAdmin = isStaff && profile?.role === 'SUPER_ADMIN';

  const isCustomerMode = !isStaff && !isAdmin && !isSuperAdmin;
  const navigatorKey = `${profile?.actorKind ?? 'guest'}-${profile?.role ?? 'none'}`;
  const featureFocusAtRef = useRef<Record<string, number>>({});

  const trackFeature = (featureKey: string) => ({
    focus: () => {
      featureFocusAtRef.current[featureKey] = Date.now();
      const clientEventId = `${featureKey}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      appApi
        .trackFeatureUsage({
          featureKey,
          eventType: 'VIEW',
          clientEventId,
          source: 'mobile-tab',
        })
        .catch((err) => {
          if (__DEV__) {
            // Keep production silent, but surface tracking issues in dev.
            console.warn('[trackFeatureUsage][VIEW] failed', featureKey, err?.response?.status ?? err?.message);
          }
        });
    },
    blur: () => {
      const startedAt = featureFocusAtRef.current[featureKey];
      if (!startedAt) return;
      const elapsedMs = Date.now() - startedAt;
      delete featureFocusAtRef.current[featureKey];

      const durationSeconds = Math.floor(elapsedMs / 1000);
      if (durationSeconds <= 0) return;

      const cappedDurationSeconds = Math.min(durationSeconds, 24 * 60 * 60);
      appApi
        .trackFeatureUsage({
          featureKey,
          eventType: 'DURATION',
          durationSeconds: cappedDurationSeconds,
          source: 'mobile-tab',
        })
        .catch((err) => {
          if (__DEV__) {
            console.warn('[trackFeatureUsage][DURATION] failed', featureKey, err?.response?.status ?? err?.message);
          }
        });
    },
  });

  return (
    <Tab.Navigator
      key={navigatorKey}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: mustChangePassword ? 'none' : 'flex' },
      }}
      tabBar={(props) => <TabBar {...props} />}
    >
      {isCustomerMode ? (
        <>
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen name="Loans" component={LoansScreen} listeners={trackFeature('LOANS')} />
          <Tab.Screen name="Savings" component={SavingsScreen} listeners={trackFeature('SAVINGS')} />
          <Tab.Screen name="Schedule" component={CustomerScheduleScreen} listeners={trackFeature('SCHEDULE')} />
          <Tab.Screen name="Info" component={InfoScreen} listeners={trackFeature('INFO')} />
          <Tab.Screen name="Account" component={AccountScreen} listeners={trackFeature('ACCOUNT')} />
        </>
      ) : isSuperAdmin ? (
        <>
          <Tab.Screen name="AdminManager" component={AdminManagerScreen} />
          <Tab.Screen name="Account" component={AccountScreen} />
        </>
      ) : isAdmin ? (
        <>
          <Tab.Screen name="AdminDashboard" component={AdminDashboardScreen} />
          {/* <Tab.Screen name="Schedule" component={StaffScheduleScreen} /> */}
          <Tab.Screen name="StaffCustomers" component={StaffCustomersScreen} />
          <Tab.Screen name="StaffManage" component={StaffManageScreen} />
          <Tab.Screen name="Account" component={AccountScreen} />
        </>
      ) : (
        <>
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen name="Schedule" component={StaffScheduleScreen} />
          <Tab.Screen name="StaffCustomers" component={StaffCustomersScreen} />
          <Tab.Screen name="Group" component={GroupScreen} />
          <Tab.Screen name="Account" component={AccountScreen} />
        </>
      )}
    </Tab.Navigator>
  );
};
