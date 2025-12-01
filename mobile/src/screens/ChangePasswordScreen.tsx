import React from 'react';
import { View, Text } from 'react-native';
import { ChangePasswordForm } from '@components/forms/ChangePasswordForm';

const ChangePasswordScreen = () => {
  return (
    <View className="flex-1 justify-center bg-slate-50 px-6">
      <Text className="mb-2 text-2xl font-semibold text-brand">Change Password</Text>
      <Text className="mb-6 text-slate-600">
        You are using a temporary password. Please set a new one to continue.
      </Text>
      <ChangePasswordForm onSuccess={() => {}} />
    </View>
  );
};

export default ChangePasswordScreen;
