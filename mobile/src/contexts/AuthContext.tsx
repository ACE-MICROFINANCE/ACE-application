import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService, AuthResponse } from '@services/authService';
import { tokenStore } from '@lib/tokenStore';
import { useAuthStore } from '@store/authStore';
import { useProfileStore } from '@store/profileStore';

type AuthContextType = {
  customer: any;
  accessToken: string | null;
  refreshToken: string | null;
  mustChangePassword: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<AuthResponse>;
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
  const authStore = useAuthStore();
  const profileStore = useProfileStore();

  useEffect(() => {
    const bootstrap = async () => {
      await authStore.hydrate();
      setAccessToken(authStore.accessToken);
      setRefreshToken(authStore.refreshToken);
      setMustChangePassword(authStore.mustChangePassword);
      if (authStore.accessToken) {
        await profileStore.refreshProfile();
        setCustomer(profileStore.profile);
      }
      setIsLoading(false);
    };
    bootstrap();
  }, [authStore, profileStore]);

  const persistTokens = async (payload: AuthResponse) => {
    const flag = payload.mustChangePassword ?? payload.customer?.mustChangePassword ?? false;
    await authStore.setTokens(payload.accessToken, payload.refreshToken, flag);
    setAccessToken(payload.accessToken);
    setRefreshToken(payload.refreshToken);
    setMustChangePassword(flag);
  };

  // CHANGED: login dùng identifier (email hoặc mã KH) giống web
  const login = async (identifier: string, password: string) => {
    const response = await authService.login(identifier, password);
    await persistTokens(response);
    setCustomer(response.customer);
    await profileStore.refreshProfile();
    setCustomer(profileStore.profile ?? response.customer);
    return response;
  };

  const changePassword = async (oldPassword: string | undefined, newPassword: string) => {
    const response = await authService.changePassword(oldPassword, newPassword);
    await persistTokens(response);
    setMustChangePassword(false);
    await profileStore.refreshProfile();
    setCustomer(profileStore.profile ?? response.customer);
    return response;
  };

  const logout = async () => {
    await authStore.clear();
    profileStore.reset();
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
