import React from 'react';
import { View, Text } from 'react-native';
import { ForgotPasswordForm } from '@components/forms/ForgotPasswordForm';

const ForgotPasswordScreen = () => {
  return (
    <View className="flex-1 justify-center bg-slate-50 px-6">
      <Text className="mb-2 text-2xl font-semibold text-brand">Forgot Password</Text>
      <Text className="mb-6 text-slate-600">Demo only. SMS OTP integration is under development.</Text>
      <ForgotPasswordForm />
    </View>
  );
};

export default ForgotPasswordScreen;
