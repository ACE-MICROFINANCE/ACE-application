import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

const apiClient = axios.create({ baseURL });

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('ace_access_token');
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
      const refreshToken = await SecureStore.getItemAsync('ace_refresh_token');
      if (!refreshToken) {
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = refreshResponse.data;
        await SecureStore.setItemAsync('ace_access_token', accessToken);
        await SecureStore.setItemAsync('ace_refresh_token', newRefresh || refreshToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
