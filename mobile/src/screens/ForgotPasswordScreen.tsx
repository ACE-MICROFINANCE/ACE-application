import React from 'react';
import { View, Text } from 'react-native';
import { MobileFrame } from '@components/layout/MobileFrame';
import { Card } from '@components/ui/Card';
// CHANGED: dùng path tương đối để tránh lỗi resolve trên web
import { ForgotPasswordForm } from '../components/forms/ForgotPasswordForm';

const ForgotPasswordScreen = () => {
  return (
    <MobileFrame withBottomPadding={false}>
      <View className="flex-1 justify-center py-10 bg-[#e9f2ff] rounded-3xl">
        <Card className="bg-white rounded-3xl shadow-lg p-6">
          <View className="text-center mb-5 space-y-1">
            <Text className="text-2xl font-semibold text-[#1f2f50] text-center">Quên mật khẩu</Text>
            <Text className="text-sm text-[#6c7a93] text-center">
              Nhập mã khách hàng để gửi yêu cầu. Nhân viên ACE sẽ liên hệ và cấp mật khẩu tạm cho bạn.
            </Text>
          </View>
          <ForgotPasswordForm />
        </Card>
      </View>
    </MobileFrame>
  );
};

export default ForgotPasswordScreen;
