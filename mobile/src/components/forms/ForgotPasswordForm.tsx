import React, { useState } from 'react';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Text, View } from 'react-native';
import { AppButton } from '@components/ui/AppButton';
import { TextInputField } from '@components/ui/TextInputField';

const ForgotSchema = Yup.object().shape({
  customerId: Yup.string().matches(/^[0-9]+$/, 'Customer ID must be numeric').required('Customer ID is required'),
  otp: Yup.string().when('showOtp', {
    is: true,
    then: (schema) => schema.required('OTP is required'),
  }),
  newPassword: Yup.string().when('showOtp', {
    is: true,
    then: (schema) =>
      schema.min(8, 'At least 8 characters').matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Must include letters and numbers'),
  }),
  confirmNewPassword: Yup.string().when('showOtp', {
    is: true,
    then: (schema) => schema.oneOf([Yup.ref('newPassword')], 'Passwords must match'),
  }),
});

export const ForgotPasswordForm = () => {
  const [showOtp, setShowOtp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Formik
      initialValues={{ customerId: '', otp: '', newPassword: '', confirmNewPassword: '', showOtp: false }}
      validationSchema={ForgotSchema}
      onSubmit={(values, { setSubmitting }) => {
        setMessage('This feature is under development.');
        setSubmitting(false);
      }}
    >
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting, setFieldValue }) => (
        <View className="w-full">
          <TextInputField
            label="Customer ID"
            keyboardType="numeric"
            onChangeText={handleChange('customerId')}
            onBlur={handleBlur('customerId')}
            value={values.customerId}
            error={touched.customerId ? errors.customerId : undefined}
          />
          {!showOtp && (
            <AppButton
              title="Send OTP (demo)"
              onPress={() => {
                setShowOtp(true);
                setFieldValue('showOtp', true);
                setMessage('OTP demo only. SMS integration is pending.');
              }}
            />
          )}
          {showOtp && (
            <>
              <TextInputField
                label="OTP"
                keyboardType="numeric"
                onChangeText={handleChange('otp')}
                onBlur={handleBlur('otp')}
                value={values.otp}
                error={touched.otp ? errors.otp : undefined}
              />
              <TextInputField
                label="New password"
                secureTextEntry
                onChangeText={handleChange('newPassword')}
                onBlur={handleBlur('newPassword')}
                value={values.newPassword}
                error={touched.newPassword ? errors.newPassword : undefined}
              />
              <TextInputField
                label="Confirm new password"
                secureTextEntry
                onChangeText={handleChange('confirmNewPassword')}
                onBlur={handleBlur('confirmNewPassword')}
                value={values.confirmNewPassword}
                error={touched.confirmNewPassword ? errors.confirmNewPassword : undefined}
              />
              <AppButton title="Reset Password (demo)" onPress={handleSubmit as any} loading={isSubmitting} />
            </>
          )}
          {message && <Text className="mt-2 text-sm text-amber-600">{message}</Text>}
        </View>
      )}
    </Formik>
  );
};
