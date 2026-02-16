import axios from 'axios';
import Constants from 'expo-constants';
import { tokenStore } from './tokenStore';

const baseURL =
  (Constants.expoConfig?.extra as any)?.API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'https://ace.phucpink.io.vn';

// CHANGED: đặt timeout mặc định để tránh treo "Loading session..." nếu backend không phản hồi
const apiClient = axios.create({ baseURL, timeout: 30000 });

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
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await tokenStore.getItemAsync('ace_refresh_token');
      if (!refreshToken) {
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = refreshResponse.data;
        await tokenStore.setItemAsync('ace_access_token', accessToken);
        await tokenStore.setItemAsync('ace_refresh_token', newRefresh || refreshToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        // clear token khi refresh thất bại
        await tokenStore.deleteItemAsync('ace_access_token');
        await tokenStore.deleteItemAsync('ace_refresh_token');
        await tokenStore.deleteItemAsync('ace_must_change');
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
