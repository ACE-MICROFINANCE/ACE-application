import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@lib/queryClient';
import { AuthProvider, useAuth } from '@contexts/AuthContext';
import { AuthNavigator } from '@navigation/AuthNavigator';
import { MainTabNavigator } from '@navigation/MainTabNavigator';
import { View, Text } from 'react-native';
import { BootGate } from '@screens/BootGate';
import ForceChangePasswordScreen from '@screens/ForceChangePasswordScreen';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { navigationRef } from '@navigation/navigationRef';
import { appApi } from '@services/appApi';

const RootStack = createNativeStackNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

type NotificationData = {
  kind?: string;
  scheduleId?: number | string;
};

const navigateFromNotification = (data: NotificationData) => {
  if (!navigationRef.isReady()) return;
  if (data?.kind === 'SCHEDULE') {
    navigationRef.navigate('MainTabs' as never, {
      screen: 'Schedule',
      params: { notificationScheduleId: data.scheduleId },
    } as never);
    return;
  }
  if (data?.kind === 'LOAN') {
    navigationRef.navigate('MainTabs' as never, { screen: 'Loans' } as never);
    return;
  }
};

const RootNavigation = () => {
  const [fontsLoaded] = useFonts(Ionicons.font);
  const { isLoading, accessToken, customer, mustChangePassword } = useAuth();
  const isAuthenticated = Boolean(accessToken && customer);
  const [pendingNotification, setPendingNotification] = useState<NotificationData | null>(null);
  const registeringRef = useRef(false);

  // register device token after login
  useEffect(() => {
    const registerPushToken = async () => {
      if (!isAuthenticated || registeringRef.current) return;
      if (Platform.OS === 'web') return;
      registeringRef.current = true;
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          registeringRef.current = false;
          return;
        }

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
          });
        }

        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId ??
          Constants?.expoConfig?.projectId;

        const tokenResponse = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        const token = tokenResponse.data;
        if (token) {
          await appApi.registerDeviceToken(token, Platform.OS === 'android' ? 'android' : 'ios');
        }
      } catch (err) {
        console.warn('register push token failed', err);
      } finally {
        registeringRef.current = false;
      }
    };
    registerPushToken();
  }, [isAuthenticated]);

  // notification listeners
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotificationData;
      setPendingNotification(data);
    });
    const loadInitial = async () => {
      const last = await Notifications.getLastNotificationResponseAsync();
      if (last) {
        setPendingNotification(last.notification.request.content.data as NotificationData);
      }
    };
    loadInitial();
    return () => {
      responseSub.remove();
    };
  }, []);

  // navigate when ready
  useEffect(() => {
    if (!pendingNotification) return;
    if (!isAuthenticated) return;
    if (!navigationRef.isReady()) return;
    navigateFromNotification(pendingNotification);
    setPendingNotification(null);
  }, [pendingNotification, isAuthenticated]);

  if (!fontsLoaded) {
    return null;
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <Text className="text-slate-600">Loading session...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {isAuthenticated ? (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {mustChangePassword ? (
            <RootStack.Screen name="ForceChangePassword" component={ForceChangePasswordScreen} />
          ) : (
            <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
          )}
        </RootStack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <BootGate>
            <RootNavigation />
            <StatusBar style="dark" />
          </BootGate>
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
