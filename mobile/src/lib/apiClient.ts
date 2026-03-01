// Use browser build to avoid pulling Node-only axios entry (crypto/http) in Expo native bundle.
import axios from 'axios/dist/browser/axios.cjs';
import Constants from 'expo-constants';
import { useAuthStore } from '@store/authStore';
import { tokenStore } from './tokenStore';

const baseURL =
  (Constants.expoConfig?.extra as any)?.API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'https://api.anhchiem.org';

const API_TIMEOUT_MS = 30000;
const REFRESH_TIMEOUT_MS = 10000;

const apiClient = axios.create({ baseURL, timeout: API_TIMEOUT_MS });

apiClient.interceptors.request.use(async (config) => {
  const token = await tokenStore.getItemAsync('ace_access_token');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    if (error?.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = await tokenStore.getItemAsync('ace_refresh_token');
      if (!refreshToken) {
        await useAuthStore.getState().clear();
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(
          `${baseURL}/auth/refresh`,
          { refreshToken },
          { timeout: REFRESH_TIMEOUT_MS },
        );

        const { accessToken, refreshToken: newRefresh } = refreshResponse.data;
        await tokenStore.setItemAsync('ace_access_token', accessToken);
        await tokenStore.setItemAsync('ace_refresh_token', newRefresh || refreshToken);

        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${accessToken}`,
        };

        return apiClient(originalRequest);
      } catch (refreshErr) {
        // Clear storage + in-memory auth state to avoid session spinner deadlock.
        await useAuthStore.getState().clear();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
