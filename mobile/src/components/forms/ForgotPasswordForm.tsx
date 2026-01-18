import React, { useState } from 'react';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Text, View } from 'react-native';
import { AppButton } from '@components/ui/AppButton';
import { TextInputField } from '@components/ui/TextInputField';
import apiClient from '@lib/apiClient';

const ForgotSchema = Yup.object().shape({
  memberNo: Yup.string()
    .matches(/^[0-9]+$/, 'Mã khách hàng phải là số')
    .required('Vui lòng nhập mã khách hàng'),
});

export const ForgotPasswordForm = () => {
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <Formik
      initialValues={{ memberNo: '' }}
      validationSchema={ForgotSchema}
      onSubmit={async (values, { setSubmitting, resetForm }) => {
        setError(null);
        setInfo(null);
        try {
          await apiClient.post('/auth/request-password-reset', { memberNo: values.memberNo.trim() });
          setInfo(
            'Yêu cầu đặt lại mật khẩu đã được gửi tới nhân viên ACE. Nhân viên sẽ liên hệ và cấp mật khẩu tạm cho bạn.',
          );
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
            label="Mã khách hàng (memberNo)"
            keyboardType="numeric"
            placeholder="Nhập mã khách hàng"
            onChangeText={handleChange('memberNo')}
            onBlur={handleBlur('memberNo')}
            value={values.memberNo}
            error={touched.memberNo ? errors.memberNo : undefined}
          />

          <AppButton
            title="Gửi yêu cầu"
            onPress={handleSubmit as any}
            loading={isSubmitting}
            className="mt-2"
          />

          {info ? <Text className="text-sm text-[#333]">{info}</Text> : null}
          {error ? <Text className="text-sm text-red-500">{error}</Text> : null}
        </View>
      )}
    </Formik>
  );
};
