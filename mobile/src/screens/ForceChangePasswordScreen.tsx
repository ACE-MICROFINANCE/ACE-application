import React from 'react';
import { View, Text } from 'react-native';
import { MobileFrame } from '@components/layout/MobileFrame';
import { Card } from '@components/ui/Card';
import { ChangePasswordForm } from '@components/forms/ChangePasswordForm';
import { AppButton } from '@components/ui/AppButton';
import { useAuthStore } from '@store/authStore';
import { useAuth } from '@contexts/AuthContext';

const ForceChangePasswordScreen = () => {
  const { logout } = useAuth();
  const { mustChangePassword } = useAuthStore();

  return (
    <MobileFrame withBottomPadding={false}>
      <View className="flex-1 items-center justify-center px-4">
        <Card className="w-full rounded-2xl bg-white shadow-lg p-6 space-y-4">
          <Text className="text-xl font-semibold text-center text-[#111]">Đổi mật khẩu</Text>
          <Text className="text-center text-sm text-[#666]">
            Bạn cần đổi mật khẩu để tiếp tục sử dụng ứng dụng.
          </Text>
          <ChangePasswordForm onSuccess={() => {}} />
          {!mustChangePassword ? (
            <AppButton
              title="Đăng xuất"
              bgColor="#e53935"
              onPress={async () => {
                await logout();
              }}
            />
          ) : (
            <AppButton
              title="Đăng xuất"
              bgColor="#e53935"
              onPress={async () => {
                await logout();
              }}
            />
          )}
        </Card>
      </View>
    </MobileFrame>
  );
};

export default ForceChangePasswordScreen;
