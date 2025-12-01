import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '@screens/LoginScreen';
import ChangePasswordScreen from '@screens/ChangePasswordScreen';
import ForgotPasswordScreen from '@screens/ForgotPasswordScreen';

export type AuthStackParamList = {
  Login: undefined;
  ChangePassword: undefined;
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Forgot Password' }} />
  </Stack.Navigator>
);
