import apiClient from '@lib/apiClient';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  mustChangePassword?: boolean;
  customer: {
    id: string;
    customerId: string;
    fullName: string;
    mustChangePassword?: boolean;
  };
}

export const authService = {
  login: async (customerId: string, password: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post('/auth/login', { customerId, password });
    return data;
  },
  changePassword: async (oldPassword: string, newPassword: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post('/auth/change-password', { oldPassword, newPassword });
    return data;
  },
  getMe: async () => {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },
  refreshToken: async (refreshToken: string) => {
    const { data } = await apiClient.post('/auth/refresh', { refreshToken });
    return data;
  },
};
