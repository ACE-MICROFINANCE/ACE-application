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
  // CHANGED: cho phép đăng nhập bằng identifier (email hoặc mã KH) giống web
  login: async (identifier: string, password: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post('/auth/login', { identifier, password });
    return data;
  },
  // CHANGED: oldPassword optional để mode bắt buộc không gửi trường này
  changePassword: async (oldPassword: string | undefined, newPassword: string): Promise<AuthResponse> => {
    const payload: Record<string, any> = { newPassword };
    if (oldPassword) payload.oldPassword = oldPassword;
    const { data } = await apiClient.post('/auth/change-password', payload);
    return data;
  },
  // CHANGED: thêm timeout để tránh treo "Loading session..." trên web khi không truy cập được backend
  getMe: async () => {
    const { data } = await apiClient.get('/auth/me', { timeout: 30000 });
    return data;
  },
  refreshToken: async (refreshToken: string) => {
    const { data } = await apiClient.post('/auth/refresh', { refreshToken });
    return data;
  },
};

