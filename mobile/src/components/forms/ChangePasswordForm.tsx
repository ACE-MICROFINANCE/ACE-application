import React, { useMemo, useState } from 'react';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Text, View } from 'react-native';
import { AppButton } from '@components/ui/AppButton';
import { TextInputField } from '@components/ui/TextInputField';
import { useAuth } from '@contexts/AuthContext';

export const ChangePasswordForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { changePassword, mustChangePassword } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const ChangePasswordSchema = useMemo(
    () =>
      Yup.object().shape({
        oldPassword: mustChangePassword
          ? Yup.string()
          : Yup.string()
              .matches(/^[0-9]+$/, 'Mật khẩu chỉ gồm số')
              .min(6, 'Tối thiểu 6 ký tự')
              .required('Vui lòng nhập mật khẩu hiện tại'),
        newPassword: Yup.string()
          .matches(/^[0-9]+$/, 'Mật khẩu chỉ gồm số')
          .min(6, 'Tối thiểu 6 ký tự')
          .required('Vui lòng nhập mật khẩu mới'),
        confirmNewPassword: Yup.string()
          .oneOf([Yup.ref('newPassword')], 'Mật khẩu nhập lại không khớp')
          .required('Vui lòng nhập lại mật khẩu mới'),
      }),
    [mustChangePassword],
  );

  return (
    <Formik
      initialValues={{ oldPassword: '', newPassword: '', confirmNewPassword: '' }}
      validationSchema={ChangePasswordSchema}
      onSubmit={async (values, { setSubmitting }) => {
        setError(null);
        setSuccess(null);
        try {
          const oldVal = mustChangePassword ? '' : values.oldPassword;
          await changePassword(oldVal, values.newPassword);
          setSuccess('Đổi mật khẩu thành công.');
          onSuccess();
        } catch (e: any) {
          setError(e?.response?.data?.message || 'Không thể đổi mật khẩu');
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
        <View className="w-full">
          {!mustChangePassword && (
            <TextInputField
              label="Mật khẩu hiện tại"
              placeholder="Nhập mật khẩu hiện tại (6 số)"
              secureTextEntry
              secureToggle
              keyboardType="numeric"
              onChangeText={handleChange('oldPassword')}
              onBlur={handleBlur('oldPassword')}
              value={values.oldPassword}
              error={touched.oldPassword ? errors.oldPassword : undefined}
            />
          )}
          <TextInputField
            label="Mật khẩu mới"
            placeholder="Nhập mật khẩu mới (6 số)"
            secureTextEntry
            secureToggle
            keyboardType="numeric"
            onChangeText={handleChange('newPassword')}
            onBlur={handleBlur('newPassword')}
            value={values.newPassword}
            error={touched.newPassword ? errors.newPassword : undefined}
          />
          <TextInputField
            label="Nhập lại mật khẩu mới"
            placeholder="Nhập lại mật khẩu mới"
            secureTextEntry
            secureToggle
            keyboardType="numeric"
            onChangeText={handleChange('confirmNewPassword')}
            onBlur={handleBlur('confirmNewPassword')}
            value={values.confirmNewPassword}
            error={touched.confirmNewPassword ? errors.confirmNewPassword : undefined}
          />
          {error && <Text className="text-sm text-red-500 mb-2">{error}</Text>}
          {success && <Text className="text-sm text-emerald-600 mb-2">{success}</Text>}
          <AppButton title="Đổi mật khẩu" onPress={handleSubmit as any} loading={isSubmitting} />
        </View>
      )}
    </Formik>
  );
};
