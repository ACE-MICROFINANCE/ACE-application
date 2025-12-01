'use client';

import { axiosClient } from '@/lib/axiosClient';

export interface Customer {
  id: string;
  customerId: string;
  fullName: string;
  mustChangePassword?: boolean;
}

export interface LoginRequest {
  customerId: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
  customer: Customer;
}

export interface ChangePasswordRequest {
  oldPassword?: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message?: string;
  accessToken: string;
  refreshToken: string;
  customer: Customer;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

const login = async (payload: LoginRequest): Promise<LoginResponse> => {
  const response = await axiosClient.post<LoginResponse>('/auth/login', payload);
  return response.data;
};

const changePassword = async (
  payload: ChangePasswordRequest,
): Promise<ChangePasswordResponse> => {
  const response = await axiosClient.post<ChangePasswordResponse>(
    '/auth/change-password',
    payload,
  );
  return response.data;
};

const getMe = async (): Promise<Customer> => {
  const response = await axiosClient.get<Customer>('/auth/me');
  return response.data;
};

const refreshToken = async (): Promise<RefreshResponse> => {
  const response = await axiosClient.post<RefreshResponse>('/auth/refresh');
  return response.data;
};

export const authService = {
  login,
  changePassword,
  getMe,
  refreshToken,
};
