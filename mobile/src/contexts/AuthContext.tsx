import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService, AuthResponse } from '@services/authService';
import { tokenStore } from '@lib/tokenStore';
import { isSoftLockBypassed } from '@lib/permissionPromptGuard';
import { useAuthStore } from '@store/authStore';
import { useProfileStore } from '@store/profileStore';
import { AppState, AppStateStatus, Platform } from 'react-native';

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
  const hardLockMinutes = Number(process.env.EXPO_PUBLIC_HARD_LOCK_MINUTES ?? '10');

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await authStore.hydrate();
        const hydratedAuth = useAuthStore.getState();
        setAccessToken(hydratedAuth.accessToken);
        setRefreshToken(hydratedAuth.refreshToken);
        setMustChangePassword(hydratedAuth.mustChangePassword);
        if (hydratedAuth.accessToken) {
          await profileStore.refreshProfile();
          const latestProfile = useProfileStore.getState().profile;
          setCustomer(latestProfile ?? null);
        }
      } catch {
        await authStore.clear();
        profileStore.reset();
        setAccessToken(null);
        setRefreshToken(null);
        setMustChangePassword(false);
        setCustomer(null);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrap();
  }, [authStore, profileStore]);

  const persistTokens = async (payload: AuthResponse) => {
    const flag =
      payload.mustChangePassword ??
      payload.customer?.mustChangePassword ??
      (payload as any)?.profile?.mustChangePassword ??
      false;
    await authStore.setTokens(payload.accessToken, payload.refreshToken, flag);
    setAccessToken(payload.accessToken);
    setRefreshToken(payload.refreshToken);
    setMustChangePassword(flag);
  };

  // CHANGED: login dùng identifier (email hoặc mã KH) giống web
  const login = async (identifier: string, password: string) => {
    const normalizedIdentifier = identifier.trim();
    const response = await authService.login(normalizedIdentifier, password);
    await persistTokens(response);
    if (normalizedIdentifier) {
      await tokenStore.setItemAsync('ace_last_identifier', normalizedIdentifier);
    }
    await tokenStore.deleteItemAsync('ace_bg_at');
    // Staff login returns profile (not customer); keep either to avoid transient unauthenticated state.
    setCustomer((response as any).customer ?? (response as any).profile ?? null);
    await profileStore.refreshProfile();
    const latestProfile = useProfileStore.getState().profile;
    setCustomer(latestProfile ?? (response as any).profile ?? (response as any).customer ?? null);
    return response;
  };

  const changePassword = async (oldPassword: string | undefined, newPassword: string) => {
    const response = await authService.changePassword(oldPassword, newPassword);

    // Nếu backend không trả accessToken (staff change password), giữ nguyên token hiện tại
    if (!response.accessToken && accessToken) {
      await authStore.setTokens(accessToken, refreshToken, false);
      setMustChangePassword(false);
      await profileStore.refreshProfile();
      const latestProfile = useProfileStore.getState().profile;
      setCustomer(latestProfile ?? customer);
      return response;
    }

    await persistTokens(response);
    setMustChangePassword(false);
    await profileStore.refreshProfile();
    const latestProfile = useProfileStore.getState().profile;
    setCustomer(latestProfile ?? (response as any).profile ?? (response as any).customer ?? null);
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

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    let lastState: AppStateStatus = AppState.currentState;
    let locking = false;

    const clearSessionToLogin = async (reason: 'SOFT' | 'HARD') => {
      if (locking) return;
      locking = true;
      try {
        await tokenStore.setItemAsync('ace_last_lock_reason', reason);
        await tokenStore.setItemAsync('ace_last_lock_at', String(Date.now()));
        await authStore.clear();
        profileStore.reset();
        setAccessToken(null);
        setRefreshToken(null);
        setCustomer(null);
        setMustChangePassword(false);
      } finally {
        locking = false;
      }
    };

    const hardMs =
      (Number.isFinite(hardLockMinutes) && hardLockMinutes > 0 ? hardLockMinutes : 10) * 60 * 1000;

    const sub = AppState.addEventListener('change', async (nextState) => {
      // Skip session lock transitions while OS permission dialog is visible.
      if (isSoftLockBypassed()) {
        lastState = nextState;
        return;
      }

      // Only lock when app actually goes to background.
      // "inactive" can happen transiently (system dialogs) and should not force logout.
      if (lastState === 'active' && nextState === 'background') {
        if (accessToken && customer) {
          await tokenStore.setItemAsync('ace_bg_at', String(Date.now()));
          await clearSessionToLogin('SOFT');
        }
      }

      if (nextState === 'active') {
        const bgAtRaw = await tokenStore.getItemAsync('ace_bg_at');
        const bgAt = Number(bgAtRaw ?? '0');
        if (bgAt > 0 && Date.now() - bgAt >= hardMs) {
          await tokenStore.setItemAsync('ace_last_lock_reason', 'HARD');
        }
        if (bgAt > 0) {
          await tokenStore.deleteItemAsync('ace_bg_at');
        }
      }

      lastState = nextState;
    });

    return () => {
      sub.remove();
    };
  }, [accessToken, customer, authStore, profileStore, hardLockMinutes]);

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
