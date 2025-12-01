import React, { useState } from 'react';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { AppButton } from '@components/ui/AppButton';
import { TextInputField } from '@components/ui/TextInputField';
import { useAuth } from '@contexts/AuthContext';
import { Text, View } from 'react-native';

const LoginSchema = Yup.object().shape({
  customerId: Yup.string().matches(/^[0-9]+$/, 'Customer ID must be numeric').required('Customer ID is required'),
  password: Yup.string().required('Password is required'),
});

export const LoginForm = ({ onSuccess }: { onSuccess: (mustChange: boolean) => void }) => {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  return (
    <Formik
      initialValues={{ customerId: '', password: '' }}
      validationSchema={LoginSchema}
      onSubmit={async (values, { setSubmitting }) => {
        setError(null);
        try {
          const res = await login(values.customerId, values.password);
          onSuccess(res.mustChangePassword ?? false);
        } catch (e: any) {
          setError(e?.response?.data?.message || 'Login failed');
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
        <View className="w-full">
          <TextInputField
            label="Customer ID"
            placeholder="Your ID"
            keyboardType="numeric"
            onChangeText={handleChange('customerId')}
            onBlur={handleBlur('customerId')}
            value={values.customerId}
            error={touched.customerId ? errors.customerId : undefined}
          />
          <TextInputField
            label="Password"
            placeholder="Password"
            secureTextEntry
            onChangeText={handleChange('password')}
            onBlur={handleBlur('password')}
            value={values.password}
            error={touched.password ? errors.password : undefined}
          />
          {error && <Text className="text-sm text-red-500 mb-2">{error}</Text>}
          <AppButton title="Login" onPress={handleSubmit as any} loading={isSubmitting} />
        </View>
      )}
    </Formik>
  );
};
