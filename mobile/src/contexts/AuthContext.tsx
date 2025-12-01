import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authService, AuthResponse } from '@services/authService';

type AuthContextType = {
  customer: any;
  accessToken: string | null;
  refreshToken: string | null;
  mustChangePassword: boolean;
  isLoading: boolean;
  login: (customerId: string, password: string) => Promise<AuthResponse>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [customer, setCustomer] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const storedAccess = await SecureStore.getItemAsync('ace_access_token');
      const storedRefresh = await SecureStore.getItemAsync('ace_refresh_token');
      const storedFlag = (await SecureStore.getItemAsync('ace_must_change')) === 'true';
      setAccessToken(storedAccess);
      setRefreshToken(storedRefresh);
      setMustChangePassword(storedFlag);

      if (storedAccess) {
        try {
          const profile = await authService.getMe();
          setCustomer(profile);
        } catch (e) {
          await logout();
        }
      }
      setIsLoading(false);
    };

    bootstrap();
  }, []);

  const persistTokens = async (payload: AuthResponse) => {
    await SecureStore.setItemAsync('ace_access_token', payload.accessToken);
    await SecureStore.setItemAsync('ace_refresh_token', payload.refreshToken);
    const flag = payload.mustChangePassword ?? payload.customer?.mustChangePassword ?? false;
    await SecureStore.setItemAsync('ace_must_change', String(flag));
    setAccessToken(payload.accessToken);
    setRefreshToken(payload.refreshToken);
    setMustChangePassword(flag);
  };

  const login = async (customerId: string, password: string) => {
    const response = await authService.login(customerId, password);
    await persistTokens(response);
    setCustomer(response.customer);
    return response;
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    const response = await authService.changePassword(oldPassword, newPassword);
    await persistTokens(response);
    setMustChangePassword(false);
    setCustomer(response.customer);
    return response;
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('ace_access_token');
    await SecureStore.deleteItemAsync('ace_refresh_token');
    await SecureStore.deleteItemAsync('ace_must_change');
    setAccessToken(null);
    setRefreshToken(null);
    setCustomer(null);
    setMustChangePassword(false);
  };

  const value = useMemo(
    () => ({
      customer,
      accessToken,
      refreshToken,
      mustChangePassword,
      isLoading,
      login,
      changePassword,
      logout,
    }),
    [customer, accessToken, refreshToken, mustChangePassword, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
