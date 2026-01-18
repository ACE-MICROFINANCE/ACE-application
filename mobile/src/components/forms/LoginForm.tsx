import React, { useState } from 'react';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { AppButton } from '@components/ui/AppButton';
import { TextInputField } from '@components/ui/TextInputField';
import { useAuth } from '@contexts/AuthContext';
import { Text, View } from 'react-native';

// CHANGED: giống web - chỉ mã khách hàng numeric và mật khẩu 6 số
const LoginSchema = Yup.object().shape({
  memberNo: Yup.string()
    .matches(/^[0-9]+$/, 'Mã khách hàng phải là số')
    .required('Vui lòng nhập mã khách hàng'),
  password: Yup.string()
    .matches(/^[0-9]+$/, 'Mật khẩu chỉ gồm số')
    .min(6, 'Mật khẩu tối thiểu 6 số')
    .required('Vui lòng nhập mật khẩu'),
});

export const LoginForm = ({ onSuccess }: { onSuccess: (mustChange: boolean) => void }) => {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  return (
    <Formik
      initialValues={{ memberNo: '', password: '' }}
      validationSchema={LoginSchema}
      onSubmit={async (values, { setSubmitting }) => {
        setError(null);
        try {
          const res = await login(values.memberNo, values.password);
          onSuccess(res.mustChangePassword ?? false);
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
            label="Mã khách hàng"
            placeholder="Nhập mã khách hàng"
            keyboardType="numeric"
            onChangeText={handleChange('memberNo')}
            onBlur={handleBlur('memberNo')}
            value={values.memberNo}
            error={touched.memberNo ? errors.memberNo : undefined}
          />
          <TextInputField
            label="Mật khẩu"
            placeholder="Nhập mật khẩu 6 số"
            secureTextEntry
            keyboardType="numeric"
            onChangeText={handleChange('password')}
            onBlur={handleBlur('password')}
            value={values.password}
            error={touched.password ? errors.password : undefined}
          />
          <Text className="text-xs text-[#6b7280] leading-relaxed">
            Mật khẩu lần đầu do nhân viên ACE cung cấp. Sau khi đăng nhập, ứng dụng sẽ yêu cầu bạn đổi mật khẩu mới.
          </Text>
          {error && <Text className="text-sm text-red-500 mb-2">{error}</Text>}
          <AppButton
            title="Đăng nhập"
            onPress={handleSubmit as any}
            loading={isSubmitting}
            className="mt-4"
          />
        </View>
      )}
    </Formik>
  );
};
