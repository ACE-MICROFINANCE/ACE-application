import React, { useState } from 'react';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Text, View } from 'react-native';
import { AppButton } from '@components/ui/AppButton';
import { TextInputField } from '@components/ui/TextInputField';
import apiClient from '@lib/apiClient';

const ForgotSchema = Yup.object().shape({
  identifier: Yup.string()
    .required('Vui lòng nhập thông tin')
    .test('identifier-format', 'Thông tin không hợp lệ.', (value) => {
      if (!value) return false;
      const v = value.trim();
      if (v.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      return /^[0-9]+$/.test(v);
    }),
});

export const ForgotPasswordForm = () => {
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <Formik
      initialValues={{ identifier: '' }}
      validationSchema={ForgotSchema}
      onSubmit={async (values, { setSubmitting, resetForm }) => {
        setError(null);
        setInfo(null);
        const raw = values.identifier.trim();
        const isEmail = raw.includes('@');
        try {
          if (isEmail) {
            await apiClient.post('/auth/staff/forgot-password', { email: raw.toLowerCase() });
            setInfo('Hệ thống đã gửi mật khẩu tạm thời.');
          } else {
            await apiClient.post('/auth/request-password-reset', { memberNo: raw });
            setInfo('Nếu mã khách hàng tồn tại, nhân viên sẽ liên hệ để hỗ trợ.');
          }
          resetForm();
        } catch (e: any) {
          setError('Không thể gửi yêu cầu lúc này, vui lòng thử lại.');
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
        <View className="w-full space-y-3">
          <TextInputField
            label="Mã khách hàng hoặc Email"
            keyboardType="default"
            placeholder="Mã khách hàng hoặc Email"
            onChangeText={handleChange('identifier')}
            onBlur={handleBlur('identifier')}
            value={values.identifier}
            error={touched.identifier ? errors.identifier : undefined}
          />

          <AppButton title="Gửi yêu cầu" onPress={handleSubmit as any} loading={isSubmitting} className="mt-2" />

          {info ? <Text className="text-sm text-[#333]">{info}</Text> : null}
          {error ? <Text className="text-sm text-red-500">{error}</Text> : null}
        </View>
      )}
    </Formik>
  );
};
