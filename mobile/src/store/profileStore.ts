import { create } from 'zustand';
import { appApi } from '@services/appApi';

type ProfileStatus = 'idle' | 'loading' | 'ready' | 'error';

type ProfileState = {
  profile: any | null;
  status: ProfileStatus;
  lastFetchedAt: number | null;
  error: string | null;
  refreshProfile: () => Promise<void>;
  reset: () => void;
};

const TTL_MS = 5 * 60 * 1000; // 5 phút cache

let inFlight: Promise<void> | null = null;

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  status: 'idle',
  lastFetchedAt: null,
  error: null,

  refreshProfile: async () => {
    const now = Date.now();
    const { lastFetchedAt, status } = get();
    if (status === 'loading') return;
    if (lastFetchedAt && now - lastFetchedAt < TTL_MS && get().profile) return;

    if (inFlight) return inFlight;

    const job = (async () => {
      set({ status: 'loading', error: null });
      try {
        const data = await appApi.getProfile?.();
        set({ profile: data ?? null, status: 'ready', lastFetchedAt: Date.now(), error: null });
      } catch (e: any) {
        set({ status: 'error', error: 'Không tải được thông tin tài khoản.' });
      } finally {
        inFlight = null;
      }
    })();
    inFlight = job;
    return job;
  },

  reset: () => {
    inFlight = null;
    set({ profile: null, status: 'idle', lastFetchedAt: null, error: null });
  },
}));
