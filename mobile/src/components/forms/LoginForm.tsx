import React, { useState } from 'react';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { AppButton } from '@components/ui/AppButton';
import { TextInputField } from '@components/ui/TextInputField';
import { useAuth } from '@contexts/AuthContext';
import { Text, View } from 'react-native';

// CHANGED: giống web - identifier (mã KH hoặc email) + mật khẩu 6 số
const LoginSchema = Yup.object().shape({
  identifier: Yup.string()
    .required('Mã khách hàng hoặc email là bắt buộc')
    .test('identifier-format', 'Email không hợp lệ hoặc mã khách hàng phải là số', (value) => {
      if (!value) return false;
      if (value.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      return /^[0-9]+$/.test(value);
    }),
  password: Yup.string()
    .required('Mật khẩu bắt buộc')
    .matches(/^[0-9]+$/, 'Mật khẩu chỉ gồm chữ số.')
    .min(6, 'Mật khẩu phải tối thiểu 6 số'),
});

export const LoginForm = ({ onSuccess }: { onSuccess: (mustChange: boolean) => void }) => {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  return (
    <Formik
      initialValues={{ identifier: '', password: '' }}
      validationSchema={LoginSchema}
      onSubmit={async (values, { setSubmitting }) => {
        setError(null);
        try {
          const res = await login(values.identifier, values.password); // CHANGED: payload { identifier, password }
          const mustChange =
            res?.customer?.mustChangePassword ??
            res?.mustChangePassword ??
            // @ts-expect-error staff profile flag
            res?.profile?.mustChangePassword ??
            false;
          onSuccess(mustChange);
        } catch (e: any) {
          setError(e?.response?.data?.message || 'Đăng nhập thất bại');
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
        <View className="w-full space-y-3">
          <TextInputField
            label="Mã khách hàng hoặc email"
            placeholder="Nhập mã khách hàng hoặc email"
            keyboardType="default"
            onChangeText={handleChange('identifier')}
            onBlur={handleBlur('identifier')}
            value={values.identifier}
            error={touched.identifier ? (errors as any).identifier : undefined}
          />
          <TextInputField
            label="Mật khẩu (chỉ gồm số)"
            placeholder="Nhập mật khẩu 6 số"
            secureTextEntry
            secureToggle
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={handleChange('password')}
            onBlur={handleBlur('password')}
            value={values.password}
            error={touched.password ? errors.password : undefined}
          />
          <Text className="text-xs text-[#777] leading-relaxed">
            Mật khẩu lần đầu do nhân viên ACE cung cấp. Sau khi đăng nhập, ứng dụng sẽ yêu cầu bạn đổi mật khẩu mới.
          </Text>
          {error && <Text className="text-sm text-red-500">{error}</Text>}
          <AppButton
            title="Đăng nhập"
            onPress={handleSubmit as any}
            loading={isSubmitting}
            className="mt-4"
          />
          {/* <Text
            className="text-sm text-center text-[#2b6cb0] mt-2"
            onPress={() => {
              // TODO: navigate to ForgotPassword screen
            }}
          >
            Quên mật khẩu?
          </Text> */}
        </View>
      )}
    </Formik>
  );
};
