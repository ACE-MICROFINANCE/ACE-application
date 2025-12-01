import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { queryClient } from '@lib/queryClient';
import { AuthProvider, useAuth } from '@contexts/AuthContext';
import { AuthNavigator } from '@navigation/AuthNavigator';
import { MainTabNavigator } from '@navigation/MainTabNavigator';
import ChangePasswordScreen from '@screens/ChangePasswordScreen';
import { View, Text } from 'react-native';

const RootStack = createNativeStackNavigator();

const RootNavigation = () => {
  const [fontsLoaded] = useFonts(Ionicons.font);
  const { isLoading, accessToken, customer, mustChangePassword } = useAuth();
  const isAuthenticated = Boolean(accessToken && customer);

  if (!fontsLoaded) {
    return null;
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <Text className="text-slate-600">Loading session...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {mustChangePassword ? (
            <RootStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          ) : (
            <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
          )}
        </RootStack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigation />
        <StatusBar style="dark" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
