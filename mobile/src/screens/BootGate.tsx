import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuthStore } from '@store/authStore';
import { useProfileStore } from '@store/profileStore';

export const BootGate = ({ children }: { children: React.ReactNode }) => {
  const { hydrate, hydrated, isHydrating, accessToken } = useAuthStore();
  const { refreshProfile, status } = useProfileStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && accessToken) {
      refreshProfile();
    }
  }, [hydrated, accessToken, refreshProfile]);

  const busy = isHydrating || (accessToken && status === 'loading');

  if (busy) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator />
        <Text className="mt-2 text-slate-600">Đang tải phiên...</Text>
      </View>
    );
  }

  return <>{children}</>;
};
