'use client';

import { axiosClient } from '@/lib/axiosClient';

export type LoanCurrentResponse = {
  memberNo?: string; // CHANGED: thêm mã số khách hàng cho màn khoản vay
  loanNo: string;
  disbursementDate?: string;
  disbursementDateInferred?: string; // CHANGED: ngay giai ngan uoc tinh tu lai ky dau
  firstInterestDays?: number; // CHANGED: so ngay tinh tu lai ky dau
  loanPaymentTypeLabel?: string | null; // CHANGED: nhãn hình thức trả nợ (tính ở BE)
  termInstallments?: number | null; // CHANGED: tổng số kỳ (BE tính sẵn)
  remainingInstallments?: number | null; // CHANGED: số kỳ còn lại (BE tính sẵn)
  principalAmount: number;
  remainingPrincipal: number;
  interestRate: number;
  lateAmount?: number; // CHANGED: so tien cham tra tu BE
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

export type LoanQrResponse = {
  qrImageUrl: string;
  amount: number;
}; // CHANGED: response tao QR theo so tien

export type SavingsTransactionItem = {
  date: string;
  title: string;
  amount: number;
  runningBalance: number;
  rawType?: string | null;
  deposit?: number;
  withdrawal?: number;
}; // CHANGED: schema giao dịch tiết kiệm cho FE

export type SavingsItem = {
  type: 'COMPULSORY' | 'VOLUNTARY' | string;
  principalAmount: number;
  currentBalance: number;
  interestAccrued: number;
  lastDepositAmount?: number | null;
  lastDepositDate?: string | null;
  lastTxnDate?: string | null; // CHANGED: ngày giao dịch gần nhất (VOLUNTARY)
  interestRun?: { amount: number; date: string } | null; // CHANGED: kỳ chạy lãi gần nhất (VOLUNTARY)
  transactions?: SavingsTransactionItem[]; // CHANGED: lịch sử giao dịch từ BIJLI
};

export type ScheduleItem = {
  id: number;
  title: string;
  eventType: 'MEETING' | 'FIELD_SCHOOL' | 'FARMING_TASK' | 'OTHER' | string;
  startDate: string;
  daysUntilEvent: number;
  scope?: string | null; // CHANGED: hỗ trợ phân biệt GLOBAL/LOCAL khi hiển thị
};

export type ScheduleDetail = {
  id: number;
  title: string;
  eventType: string;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
  scope?: string | null; // CHANGED: hỗ trợ phân biệt GLOBAL/LOCAL khi chỉnh sửa
  audienceType?: 'BRANCH_ALL' | 'GROUPS' | string | null; // CHANGED: hỗ trợ staff edit
  targetGroups?: Array<{ groupCode: string; groupName?: string | null }>; // CHANGED: hỗ trợ staff edit
};

export type ScheduleUpdatePayload = {
  title?: string;
  description?: string;
  eventType?: string;
  startDate?: string;
  durationMinutes?: number;
  locationName?: string;
  audienceType?: 'BRANCH_ALL' | 'GROUPS'; // CHANGED: hỗ trợ patch audienceType
  targetGroups?: Array<{ groupCode: string; groupName?: string }>; // CHANGED: hỗ trợ patch targetGroups
}; // CHANGED: payload update schedule for staff

export type ScheduleCreatePayload = {
  title: string;
  description?: string;
  eventType: string;
  startDate: string;
  durationMinutes?: number;
  locationName?: string;
  audienceType: 'BRANCH_ALL' | 'GROUPS';
  targetGroups?: Array<{ groupCode: string; groupName?: string }>;
}; // CHANGED: payload create schedule for staff

export type StaffGroupItem = {
  groupCode: string;
  groupName: string;
  branchId?: string;
  branchName?: string | null;
}; // CHANGED: nhóm theo chi nhánh staff

export type ProfileResponse = {
  id: number;
  actorKind?: 'CUSTOMER' | 'STAFF' | string; // CHANGED: support staff profile from /me
  memberNo?: string | null; // CHANGED: optional for staff
  email?: string | null; // CHANGED: staff email
  role?: 'ADMIN' | 'BRANCH_MANAGER' | string; // CHANGED: staff role
  branchCode?: string | null; // CHANGED: staff/customer branch
  branchName?: string | null; // CHANGED: staff/customer branch name
  fullName?: string | null;
  loanCycle?: number | null; //
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
  createLoanQr: async (amount: number): Promise<LoanQrResponse> => {
    const response = await axiosClient.post<LoanQrResponse>('/loan/qr', { amount }); // CHANGED: tao QR theo so tien
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
  updateSchedule: async (id: number, payload: ScheduleUpdatePayload) => {
    const response = await axiosClient.patch(`/events/${id}`, payload); // CHANGED: staff update schedule
    return response.data;
  },
  createSchedule: async (payload: ScheduleCreatePayload) => {
    const response = await axiosClient.post('/events', payload); // CHANGED: staff create schedule
    return response.data;
  },
  getStaffGroups: async (): Promise<StaffGroupItem[]> => {
    const response = await axiosClient.get<StaffGroupItem[]>('/staff/groups'); // CHANGED: lấy nhóm theo chi nhánh staff
    return response.data;
  },
  createEvent: async (payload: ScheduleCreatePayload) => {
    // return await axiosClient.post('/events', payload); // TODO: replaced by createEvent wrapper // CHANGED
    const response = await axiosClient.post('/events', payload); // CHANGED: tạo lịch cho staff
    return response.data;
  },
  deleteEvent: async (id: number) => {
    const response = await axiosClient.delete(`/events/${id}`); // CHANGED: xóa lịch cho staff
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

/* NOTE: Mở rộng SavingsItem để nhận lịch sử giao dịch từ BE. */

