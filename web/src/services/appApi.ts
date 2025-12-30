'use client';

import { axiosClient } from '@/lib/axiosClient';

export type LoanCurrentResponse = {
  loanNo: string;
  disbursementDate?: string;
  principalAmount: number;
  remainingPrincipal: number;
  interestRate: number;
  loanType?: 'BULLET' | 'DEGRESSIVE' | string; // [BIJLI-LOAN-RULE]
  loanTypeLabel?: string; // [BIJLI-LOAN-RULE]
  nextPayment?: {
    dueDate: string;
    principalDue: number;
    interestDue: number;
    totalDue?: number; // [BIJLI-LOAN-RULE]
  };
  qrPayload?: {
    bankBin: string;
    accountNumber: string;
    accountName: string;
    description: string;
    amount?: number;
  };
};

export type SavingsItem = {
  type: 'COMPULSORY' | 'VOLUNTARY' | string;
  principalAmount: number;
  currentBalance: number;
  interestAccrued: number;
  lastDepositAmount?: number | null;
  lastDepositDate?: string | null;
};

export type ScheduleItem = {
  id: number;
  title: string;
  eventType: 'MEETING' | 'FIELD_SCHOOL' | 'FARMING_TASK' | 'OTHER' | string;
  startDate: string;
  daysUntilEvent: number;
};

export type ScheduleDetail = {
  id: number;
  title: string;
  eventType: string;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
};

export type ProfileResponse = {
  id: number;
  memberNo: string;
  fullName: string;
  gender?: string | null;
  idCardNumber?: string | null;
  phoneNumber?: string | null;
  locationType?: string | null;
  villageName?: string | null;
  groupCode?: string | null;
  groupName?: string | null;
  membershipStartDate?: string | null;
  mustChangePassword?: boolean;
};

export const appApi = {
  getCurrentLoan: async (): Promise<LoanCurrentResponse> => {
    const response = await axiosClient.get<LoanCurrentResponse>('/loan/current');
    return response.data;
  },
  getSavings: async (): Promise<SavingsItem[]> => {
    const response = await axiosClient.get<SavingsItem[]>('/savings');
    return response.data;
  },
  getSchedule: async (): Promise<ScheduleItem[]> => {
    const response = await axiosClient.get<ScheduleItem[]>('/schedule');
    return response.data;
  },
  getScheduleDetail: async (id: number): Promise<ScheduleDetail> => {
    const response = await axiosClient.get<ScheduleDetail>(`/schedule/${id}`);
    return response.data;
  },
  getProfile: async (): Promise<ProfileResponse> => {
    const response = await axiosClient.get<ProfileResponse>('/me');
    return response.data;
  },
  sendFeedback: async (content: string) => {
    const response = await axiosClient.post('/feedback', { content });
    return response.data;
  },
  requestPasswordReset: async (memberNo: string) => {
    const response = await axiosClient.post('/auth/request-password-reset', { memberNo });
    return response.data;
  },
};
