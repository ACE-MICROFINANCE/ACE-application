'use client';

import { axiosClient } from '@/lib/axiosClient';

export interface Customer {
  id: string | number;
  memberNo: string;
  fullName: string;
  mustChangePassword?: boolean;
  gender?: string | null;
  idCardNumber?: string | null;
  phoneNumber?: string | null;
  groupName?: string | null;
  groupCode?: string | null;
  villageName?: string | null;
  membershipStartDate?: string | null;
}

export interface LoginRequest {
  identifier: string; // CHANGED: support email or memberNo
  password: string;
}

export type AuthProfile = {
  actorKind: 'CUSTOMER' | 'STAFF'; // CHANGED: RBAC profile
  role?: 'ADMIN' | 'BRANCH_MANAGER';
  branchCode?: string | null;
  branchName?: string | null;
  groupCode?: string | null;
  groupName?: string | null;
  memberNo?: string;
  email?: string;
  fullName?: string | null;
};

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string; // CHANGED: staff login may not return refresh token
  customer?: Customer; // CHANGED: staff login has no customer payload
  profile?: AuthProfile; // CHANGED: staff/customer profile
}

export interface ChangePasswordRequest {
  oldPassword?: string;
  newPassword: string;
  confirmPassword?: string;
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
  const response = await axiosClient.get<Customer>('/me');
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
