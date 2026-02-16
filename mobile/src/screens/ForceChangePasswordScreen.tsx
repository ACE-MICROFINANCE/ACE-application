import React from 'react';
import { View, Text } from 'react-native';
import { MobileFrame } from '@components/layout/MobileFrame';
import { Card } from '@components/ui/Card';
import { ChangePasswordForm } from '@components/forms/ChangePasswordForm';
import { AppButton } from '@components/ui/AppButton';
import { useAuthStore } from '@store/authStore';
import { useAuth } from '@contexts/AuthContext';
import { useProfileStore } from '@store/profileStore';

const ForceChangePasswordScreen = () => {
  const { logout } = useAuth();
  const { mustChangePassword } = useAuthStore();
  const { profile } = useProfileStore();

  const isAdminUi =
    profile?.actorKind === 'STAFF' && (profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN');

  const t = isAdminUi
    ? {
        title: 'Change Password',
        desc: 'You need to change your password to continue using the app.',
        logout: 'Logout',
      }
    : {
        title: 'Đổi mật khẩu',
        desc: 'Bạn cần đổi mật khẩu để tiếp tục sử dụng ứng dụng.',
        logout: 'Đăng xuất',
      };

  return (
    <MobileFrame withBottomPadding={false}>
      <View className="flex-1 items-center justify-center px-4">
        <Card className="w-full rounded-2xl bg-white shadow-lg p-6 space-y-4">
          <Text className="text-xl font-semibold text-center text-[#111]">{t.title}</Text>
          <Text className="text-center text-sm text-[#666]">{t.desc}</Text>
          <ChangePasswordForm onSuccess={() => {}} locale={isAdminUi ? 'en' : 'vi'} />
          {!mustChangePassword ? (
            <AppButton
              title={t.logout}
              bgColor="#e53935"
              onPress={async () => {
                await logout();
              }}
            />
          ) : (
            <AppButton
              title={t.logout}
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
