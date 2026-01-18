import { create } from 'zustand';
import { appApi } from '@services/appApi';

type LoanState = {
  loan: any | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  lastFetchedAt: number | null;
  error: string | null;
  refresh: () => Promise<void>;
};

const TTL_MS = 5 * 60 * 1000;
let inFlight: Promise<void> | null = null;

export const useLoanStore = create<LoanState>((set, get) => ({
  loan: null,
  status: 'idle',
  lastFetchedAt: null,
  error: null,
  refresh: async () => {
    const now = Date.now();
    const { lastFetchedAt, status } = get();
    if (status === 'loading') return;
    if (lastFetchedAt && now - lastFetchedAt < TTL_MS && get().loan) return;
    if (inFlight) return inFlight;

    const job = (async () => {
      set({ status: 'loading', error: null });
      try {
        const data = await appApi.getCurrentLoan();
        set({ loan: data ?? null, status: 'ready', lastFetchedAt: Date.now(), error: null });
      } catch (e: any) {
        set({ status: 'error', error: 'Không tải được dữ liệu khoản vay.' });
      } finally {
        inFlight = null;
      }
    })();
    inFlight = job;
    return job;
  },
}));
