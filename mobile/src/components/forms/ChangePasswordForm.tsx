import React, { useMemo, useState } from 'react';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Text, View } from 'react-native';
import { AppButton } from '@components/ui/AppButton';
import { TextInputField } from '@components/ui/TextInputField';
import { useAuth } from '@contexts/AuthContext';

type Props = { onSuccess: () => void; locale?: 'vi' | 'en' };

const dict = {
  vi: {
    oldLabel: 'Mật khẩu hiện tại',
    oldPlaceholder: 'Nhập mật khẩu hiện tại (6 số)',
    newLabel: 'Mật khẩu mới',
    newPlaceholder: 'Nhập mật khẩu mới (6 số)',
    confirmLabel: 'Nhập lại mật khẩu mới',
    confirmPlaceholder: 'Nhập lại mật khẩu mới',
    onlyDigits: 'Mật khẩu chỉ gồm số',
    min6: 'Tối thiểu 6 ký tự',
    requiredOld: 'Vui lòng nhập mật khẩu hiện tại',
    requiredNew: 'Vui lòng nhập mật khẩu mới',
    requiredConfirm: 'Vui lòng nhập lại mật khẩu mới',
    confirmNotMatch: 'Mật khẩu nhập lại không khớp',
    success: 'Đổi mật khẩu thành công.',
    fail: 'Không thể đổi mật khẩu',
    submit: 'Đổi mật khẩu',
  },
  en: {
    oldLabel: 'Current password',
    oldPlaceholder: 'Enter current password (6 digits)',
    newLabel: 'New password',
    newPlaceholder: 'Enter new password (6 digits)',
    confirmLabel: 'Repeat new password',
    confirmPlaceholder: 'Repeat new password',
    onlyDigits: 'Password must contain digits only',
    min6: 'Minimum 6 characters',
    requiredOld: 'Please enter current password',
    requiredNew: 'Please enter new password',
    requiredConfirm: 'Please confirm new password',
    confirmNotMatch: 'Passwords do not match',
    success: 'Password changed successfully.',
    fail: 'Unable to change password',
    submit: 'Change password',
  },
};

export const ChangePasswordForm = ({ onSuccess, locale = 'vi' }: Props) => {
  const tr = locale === 'en' ? dict.en : dict.vi;
  const { changePassword, mustChangePassword } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const ChangePasswordSchema = useMemo(
    () =>
      Yup.object().shape({
        oldPassword: mustChangePassword
          ? Yup.string()
          : Yup.string()
              .matches(/^[0-9]+$/, tr.onlyDigits)
              .min(6, tr.min6)
              .required(tr.requiredOld),
        newPassword: Yup.string()
          .matches(/^[0-9]+$/, tr.onlyDigits)
          .min(6, tr.min6)
          .required(tr.requiredNew),
        confirmNewPassword: Yup.string()
          .oneOf([Yup.ref('newPassword')], tr.confirmNotMatch)
          .required(tr.requiredConfirm),
      }),
    [mustChangePassword, tr],
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
          setSuccess(tr.success);
          onSuccess();
        } catch (e: any) {
          setError(e?.response?.data?.message || tr.fail);
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
        <View className="w-full">
          {!mustChangePassword && (
            <TextInputField
              label={tr.oldLabel}
              placeholder={tr.oldPlaceholder}
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
            label={tr.newLabel}
            placeholder={tr.newPlaceholder}
            secureTextEntry
            secureToggle
            keyboardType="numeric"
            onChangeText={handleChange('newPassword')}
            onBlur={handleBlur('newPassword')}
            value={values.newPassword}
            error={touched.newPassword ? errors.newPassword : undefined}
          />
          <TextInputField
            label={tr.confirmLabel}
            placeholder={tr.confirmPlaceholder}
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
          <AppButton title={tr.submit} onPress={handleSubmit as any} loading={isSubmitting} />
        </View>
      )}
    </Formik>
  );
};
