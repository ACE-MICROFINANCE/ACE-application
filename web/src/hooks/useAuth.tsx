'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  authService,
  type ChangePasswordResponse,
  type Customer,
  type LoginRequest,
  type LoginResponse,
} from '@/services/authService';

type StoredAuth = {
  customer: Customer | null;
  accessToken?: string;
  refreshToken?: string;
  mustChangePassword?: boolean;
};

type AuthState = {
  customer: Customer | null;
  accessToken?: string;
  refreshToken?: string;
  mustChangePassword: boolean;
  isAuthenticated: boolean;
  isInitializing: boolean;
};

type AuthContextValue = AuthState & {
  login: (payload: LoginRequest) => Promise<LoginResponse>;
  logout: () => void;
  setTokensAndCustomerFromLoginResponse: (
    payload: LoginResponse | ChangePasswordResponse,
  ) => void;
  setMustChangePassword: (value: boolean) => void;
};

const AUTH_STORAGE_KEY = 'ace-auth';
const initialState: AuthState = {
  customer: null,
  accessToken: undefined,
  refreshToken: undefined,
  mustChangePassword: false,
  isAuthenticated: false,
  isInitializing: true,
};

const parseAuth = (value: string | null): StoredAuth | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as StoredAuth;
  } catch (error) {
    console.warn('Failed to parse auth from storage', error);
    return null;
  }
};

let memoryAuth: StoredAuth | null = null;
const subscribers = new Set<(auth: StoredAuth | null) => void>();

const readAuthFromStorage = (): StoredAuth | null => {
  if (typeof window === 'undefined') return memoryAuth;
  const stored = parseAuth(localStorage.getItem(AUTH_STORAGE_KEY));
  memoryAuth = stored;
  return stored;
};

const persistAuth = (auth: StoredAuth | null) => {
  memoryAuth = auth;
  if (typeof window !== 'undefined') {
    if (!auth) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    }
  }
  subscribers.forEach((listener) => listener(auth));
};

export const authStore = {
  getAuth: (): StoredAuth | null => memoryAuth ?? readAuthFromStorage(),
  getAccessToken: () => authStore.getAuth()?.accessToken,
  getRefreshToken: () => authStore.getAuth()?.refreshToken,
  setAuth: (auth: StoredAuth) => persistAuth(auth),
  updateTokens: (tokens: Partial<Pick<StoredAuth, 'accessToken' | 'refreshToken'>>) => {
    const current = authStore.getAuth() ?? { customer: null, mustChangePassword: false };
    persistAuth({ ...current, ...tokens });
  },
  clear: () => persistAuth(null),
  subscribe: (listener: (auth: StoredAuth | null) => void) => {
    subscribers.add(listener);
    return () => {
      subscribers.delete(listener);
    };
  },
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const normalizeAuthState = (auth: StoredAuth | null): AuthState => ({
  customer: auth?.customer ?? null,
  accessToken: auth?.accessToken,
  refreshToken: auth?.refreshToken,
  mustChangePassword: Boolean(auth?.mustChangePassword),
  isAuthenticated: Boolean(auth?.accessToken && auth?.customer),
  isInitializing: false,
});

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [state, setState] = useState<AuthState>(initialState);

  useEffect(() => {
    const stored = authStore.getAuth();
    setState(stored ? normalizeAuthState(stored) : { ...initialState, isInitializing: false });

    const unsubscribe = authStore.subscribe((next) => {
      setState(normalizeAuthState(next));
    });

    return unsubscribe;
  }, []);

  const setTokensAndCustomerFromLoginResponse = (
    payload: LoginResponse | ChangePasswordResponse,
  ) => {
    const nextAuth: StoredAuth = {
      customer: payload.customer,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      mustChangePassword: Boolean(payload.customer?.mustChangePassword),
    };

    authStore.setAuth(nextAuth);
  };

  const setMustChangePassword = (value: boolean) => {
    const current = authStore.getAuth() ?? { customer: null };
    authStore.setAuth({
      ...current,
      mustChangePassword: value,
    });
  };

  const login = async (payload: LoginRequest) => {
    const response = await authService.login(payload);
    setTokensAndCustomerFromLoginResponse(response);
    return response;
  };

  const logout = () => {
    authStore.clear();
    setState({ ...initialState, isInitializing: false });
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      setTokensAndCustomerFromLoginResponse,
      setMustChangePassword,
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
