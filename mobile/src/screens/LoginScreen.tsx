import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { LoginForm } from '@components/forms/LoginForm';
import { AuthStackParamList } from '@navigation/AuthNavigator';

type NavProp = NativeStackNavigationProp<AuthStackParamList>;

const LoginScreen = () => {
  const navigation = useNavigation<NavProp>();

  return (
    <View className="flex-1 items-center justify-center bg-slate-50 px-6">
      <Text className="mb-2 text-3xl font-bold text-brand">ACE Farmer</Text>
      <Text className="mb-6 text-slate-600">Secure sign-in for customers</Text>
      <LoginForm onSuccess={() => {}} />
      <TouchableOpacity className="mt-4" onPress={() => navigation.navigate('ForgotPassword')}>
        <Text className="text-brand">Forgot password?</Text>
      </TouchableOpacity>
    </View>
  );
};

export default LoginScreen;
