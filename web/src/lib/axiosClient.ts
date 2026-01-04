'use client';

import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type AxiosRequestHeaders,
} from 'axios';
import { authStore } from '@/hooks/useAuth';

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

type RetriableAxiosConfig = AxiosRequestConfig & { _retry?: boolean };

axiosClient.interceptors.request.use((config) => {
  const token = authStore.getAccessToken();
  const headers = (config.headers ?? {}) as AxiosRequestHeaders;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  config.headers = headers;
  return config;
});

// TODO: replaced by ACE Farmer implementation
// let refreshPromise: Promise<string | null> | null = null;
//
// const refreshTokens = async (): Promise<string | null> => {
//   const refreshToken = authStore.getRefreshToken();
//   if (!refreshToken) {
//     authStore.clear();
//     return null;
//   }
//
//   try {
//     const response = await axios.post(
//       `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/auth/refresh`,
//       {},
//       {
//         headers: {
//           Authorization: `Bearer ${refreshToken}`,
//         },
//       },
//     );
//
//     const data = response.data as { accessToken: string; refreshToken: string };
//     authStore.updateTokens(data);
//     return data.accessToken;
//   } catch (error) {
//     authStore.clear();
//     return null;
//   } finally {
//     refreshPromise = null;
//   }
// };

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // TODO: replaced by ACE Farmer implementation
    // const originalRequest = error.config as RetriableAxiosConfig | undefined;
    // if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
    //   originalRequest._retry = true;
    //   if (!refreshPromise) {
    //     refreshPromise = refreshTokens();
    //   }
    //
    //   const newAccessToken = await refreshPromise;
    //   if (newAccessToken) {
    //     originalRequest.headers = {
    //       ...(originalRequest.headers ?? {}),
    //       Authorization: `Bearer ${newAccessToken}`,
    //     };
    //     return axiosClient(originalRequest);
    //   }
    // }

    return Promise.reject(error);
  },
);

export { axiosClient };
