import React from 'react';
import { View, Text } from 'react-native';
import { useAuth } from '@contexts/AuthContext';
import { AppButton } from '@components/ui/AppButton';

const AccountScreen = () => {
  const { logout } = useAuth();

  return (
    <View className="flex-1 items-center justify-center bg-slate-50 px-6">
      <Text className="text-lg font-semibold text-slate-900">Account</Text>
      <Text className="mt-2 text-slate-600">This feature is under development.</Text>
      <AppButton title="Logout" onPress={logout} variant="danger" />
    </View>
  );
};

export default AccountScreen;
