import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { LoginForm } from '@components/forms/LoginForm';
import { AuthStackParamList } from '@navigation/AuthNavigator';
import { MobileFrame } from '@components/layout/MobileFrame';
import { Card } from '@components/ui/Card';

type NavProp = NativeStackNavigationProp<AuthStackParamList>;

const LoginScreen = () => {
  const navigation = useNavigation<NavProp>();

  return (
    <MobileFrame withBottomPadding={false}>
      <View className="flex-1 justify-center py-10 bg-[#e9f2ff] rounded-3xl">
        <Card className="bg-white rounded-3xl shadow-lg p-6">
          <View className="mb-4 space-y-1">
            <Text className="text-2xl font-semibold text-[#1f2f50] text-center">Đăng nhập</Text>
            <Text className="text-sm text-[#6c7a93] text-center">Ứng dụng ACE cho khách hàng</Text>
          </View>

          <LoginForm onSuccess={() => {}} />

          <TouchableOpacity className="mt-4 items-center" onPress={() => navigation.navigate('ForgotPassword')}>
            <Text className="text-[#1f7a8c] font-medium">Quên mật khẩu?</Text>
          </TouchableOpacity>
        </Card>
      </View>
    </MobileFrame>
  );
};

export default LoginScreen;
