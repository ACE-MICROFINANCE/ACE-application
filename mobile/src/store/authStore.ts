import { create } from 'zustand';
import { tokenStore } from '@lib/tokenStore';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  mustChangePassword: boolean;
  isHydrating: boolean;
  hydrated: boolean;
  setTokens: (access: string | null, refresh: string | null, mustChange?: boolean) => Promise<void>;
  clear: () => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  mustChangePassword: false,
  isHydrating: false,
  hydrated: false,

  setTokens: async (access, refresh, mustChange = false) => {
    if (access) await tokenStore.setItemAsync('ace_access_token', access);
    else await tokenStore.deleteItemAsync('ace_access_token');
    if (refresh) await tokenStore.setItemAsync('ace_refresh_token', refresh);
    else await tokenStore.deleteItemAsync('ace_refresh_token');
    await tokenStore.setItemAsync('ace_must_change', String(mustChange));
    set({ accessToken: access, refreshToken: refresh, mustChangePassword: mustChange });
  },

  clear: async () => {
    await tokenStore.deleteItemAsync('ace_access_token');
    await tokenStore.deleteItemAsync('ace_refresh_token');
    await tokenStore.deleteItemAsync('ace_must_change');
    set({ accessToken: null, refreshToken: null, mustChangePassword: false });
  },

  hydrate: async () => {
    if (get().isHydrating || get().hydrated) return;
    set({ isHydrating: true });
    try {
      const [a, r, m] = await Promise.all([
        tokenStore.getItemAsync('ace_access_token'),
        tokenStore.getItemAsync('ace_refresh_token'),
        tokenStore.getItemAsync('ace_must_change'),
      ]);
      set({
        accessToken: a ?? null,
        refreshToken: r ?? null,
        mustChangePassword: m === 'true',
      });
    } finally {
      set({ isHydrating: false, hydrated: true });
    }
  },
}));
