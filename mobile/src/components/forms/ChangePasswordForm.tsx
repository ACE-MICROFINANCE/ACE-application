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
          : Yup.string().required('Current password is required'),
        newPassword: Yup.string()
          .min(8, 'At least 8 characters')
          .matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Must include letters and numbers')
          .required('New password is required'),
        confirmNewPassword: Yup.string()
          .oneOf([Yup.ref('newPassword')], 'Passwords must match')
          .required('Please confirm the new password'),
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
          await changePassword(values.oldPassword || '', values.newPassword);
          setSuccess('Password updated successfully.');
          onSuccess();
        } catch (e: any) {
          setError(e?.response?.data?.message || 'Unable to change password');
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
        <View className="w-full">
          {!mustChangePassword && (
            <TextInputField
              label="Current password"
              secureTextEntry
              secureToggle
              onChangeText={handleChange('oldPassword')}
              onBlur={handleBlur('oldPassword')}
              value={values.oldPassword}
              error={touched.oldPassword ? errors.oldPassword : undefined}
            />
          )}
          <TextInputField
            label="New password"
            secureTextEntry
            secureToggle
            onChangeText={handleChange('newPassword')}
            onBlur={handleBlur('newPassword')}
            value={values.newPassword}
            error={touched.newPassword ? errors.newPassword : undefined}
          />
          <TextInputField
            label="Confirm new password"
            secureTextEntry
            secureToggle
            onChangeText={handleChange('confirmNewPassword')}
            onBlur={handleBlur('confirmNewPassword')}
            value={values.confirmNewPassword}
            error={touched.confirmNewPassword ? errors.confirmNewPassword : undefined}
          />
          {error && <Text className="text-sm text-red-500 mb-2">{error}</Text>}
          {success && <Text className="text-sm text-emerald-600 mb-2">{success}</Text>}
          <AppButton title="Save password" onPress={handleSubmit as any} loading={isSubmitting} />
        </View>
      )}
    </Formik>
  );
};
