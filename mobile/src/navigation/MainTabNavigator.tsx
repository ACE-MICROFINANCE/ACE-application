import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '@screens/DashboardScreen';
import LoansScreen from '@screens/LoansScreen';
import SavingsScreen from '@screens/SavingsScreen';
import CustomerScheduleScreen from '@screens/CustomerScheduleScreen';
import StaffScheduleScreen from '@screens/StaffScheduleScreen';
import InfoScreen from '@screens/InfoScreen';
import AccountScreen from '@screens/AccountScreen';
import StaffCustomersScreen from '@screens/StaffCustomersScreen';
import StaffManageScreen from '@screens/StaffManageScreen';
import { TabBar } from './TabBar';
import { useAuthStore } from '@store/authStore';
import { useProfileStore } from '@store/profileStore';

export type MainTabParamList = {
  Dashboard: undefined;
  Loans: undefined;
  Savings: undefined;
  Schedule: undefined;
  Info: undefined;
  Account: undefined;
  StaffCustomers: undefined;
  StaffManage: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator = () => {
  const { mustChangePassword } = useAuthStore();
  const { profile } = useProfileStore();
  const isStaff = profile?.actorKind === 'STAFF';
  const isAdmin = isStaff && profile?.role === 'ADMIN';

  const isCustomerMode = !isStaff && !isAdmin;
  const navigatorKey = `${profile?.actorKind ?? 'guest'}-${profile?.role ?? 'none'}`;

  return (
    <Tab.Navigator
      key={navigatorKey}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: mustChangePassword ? 'none' : 'flex' },
      }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      {isCustomerMode ? (
        <>
          <Tab.Screen name="Loans" component={LoansScreen} />
          <Tab.Screen name="Savings" component={SavingsScreen} />
          <Tab.Screen name="Schedule" component={CustomerScheduleScreen} />
          <Tab.Screen name="Info" component={InfoScreen} />
          <Tab.Screen name="Account" component={AccountScreen} />
        </>
      ) : isAdmin ? (
        <>
          {/* <Tab.Screen name="Schedule" component={StaffScheduleScreen} /> */}
          <Tab.Screen name="StaffCustomers" component={StaffCustomersScreen} />
          <Tab.Screen name="StaffManage" component={StaffManageScreen} />
          <Tab.Screen name="Account" component={AccountScreen} />
        </>
      ) : (
        <>
          <Tab.Screen name="Schedule" component={StaffScheduleScreen} />
          <Tab.Screen name="StaffCustomers" component={StaffCustomersScreen} />
          <Tab.Screen name="Account" component={AccountScreen} />
        </>
      )}
    </Tab.Navigator>
  );
};
