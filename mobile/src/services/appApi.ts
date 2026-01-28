import apiClient from '@lib/apiClient';

export type ScheduleItem = {
  id?: string | number;
  title: string;
  eventType: 'MEETING' | 'FIELD_SCHOOL' | 'FARMING_TASK' | string;
  startDate: string;
  endDate?: string | null;
  durationMinutes?: number | null;
  status?: string | null;
  displayStatus?: string | null;
  hidden?: boolean | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  updatedAt?: string | null;
  targetType?: 'BRANCH_ALL' | 'GROUPS' | string;
  targetText?: string | null;
  targetGroups?: Array<{ groupCode: string; groupName?: string | null }>;
  branchCode?: string | null;
  daysUntilEvent?: number; // CHANGED: hẹn ngày tới giống web
};

export type LoanCurrentResponse = {
  loanNo?: string;
  memberNo?: string | null; // CHANGED: fallback hiển thị mã KH
  loanType?: string | null;
  loanTypeLabel?: string | null;
  loanPaymentType?: string | null;
  loanPaymentTypeLabel?: string | null;
  principalAmount?: number | null; // CHANGED: số tiền vay ban đầu
  remainingInstallments?: string | number | null; // CHANGED: số kỳ còn phải trả (text/ratio)
  termInstallments?: number | null; // CHANGED: tổng số kỳ
  disbursementDate?: string | null;
  disbursementDateInferred?: string | null; // CHANGED: ngày giải ngân ước tính
  remainingPrincipal?: number | null;
  interestRate?: number | null;
  nextPayment?: {
    dueDate?: string;
    principalDue?: number | null;
    interestDue?: number | null;
    totalDue?: number | null;
  } | null;
  lateAmount?: number | null;
  qrPayload?: LoanQrPayload | null; // CHANGED: dữ liệu QR từ BE
};

export type LoanQrPayload = {
  bankBin: string;
  accountNumber: string;
  accountName: string;
  description: string;
  amount?: number | null;
};

export type LoanQrResponse = {
  qrImageUrl: string;
  amount: number;
};

export type StaffCustomerItem = {
  memberNo: string;
  fullName: string;
  phoneNumber?: string | null;
  groupName?: string | null;
  branchName?: string | null;
  isActive?: boolean | null;
  accessibilityEnabled?: boolean | null;
}; // CHANGED: staff customer list

export type StaffCustomerDetail = {
  memberNo: string;
  fullName: string;
  phoneNumber?: string | null;
  groupName?: string | null;
  branchName?: string | null;
  accessibilityEnabled?: boolean | null;
  credential?: {
    isActive: boolean;
    mustChangePassword: boolean;
    tempPassword?: string | null;
  } | null;
}; // CHANGED: staff customer detail

export type CreateCustomerAccountPayload = {
  memberNo: string;
  initialPassword: string;
};

export type ResetCustomerPasswordPayload = {
  newPassword: string;
};

export type StaffUserItem = {
  id: number;
  fullName?: string | null;
  email?: string | null;
  role?: 'ADMIN' | 'SUPER_ADMIN' | 'BA' | 'BM' | string | null;
  branchCode?: string | null;
  branchName?: string | null;
  isActive?: boolean | null;
};

export type StaffBranchItem = {
  branchCode: string;
  displayName: string;
};

export type ContactItem = {
  type: 'HOTLINE' | 'AGRI' | 'SOCIAL' | string;
  label: string;
  phone: string;
};

export type ContactsResponse = {
  branchCode: string;
  contacts: ContactItem[];
  socialPhone: string | null;
};

export type CreateStaffUserPayload = {
  email: string;
  password: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'BA' | 'BM' | string;
  branchCode?: string | null;
  fullName?: string | null;
};

export type UpdateStaffUserPayload = {
  email?: string | null;
  role?: 'ADMIN' | 'SUPER_ADMIN' | 'BA' | 'BM' | string | null;
  branchCode?: string | null;
  fullName?: string | null;
};

export type ScheduleDetail = {
  id: number;
  title: string;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
  locationName?: string | null;
  durationMinutes?: number | null;
  audienceType?: string | null;
  eventType?: string | null;
  status?: string | null;
  hidden?: boolean | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  updatedAt?: string | null;
  displayStatus?: string | null;
  target?: {
    targetType: 'BRANCH_ALL' | 'GROUPS';
    targetText?: string | null;
    branchCode?: string | null;
    branchName?: string | null;
    groups?: Array<{ groupCode: string; groupName?: string | null }>;
  } | null;
  targetGroups?: Array<{ groupCode: string; groupName?: string | null }>;
};

export type ScheduleUpdatePayload = {
  title?: string;
  description?: string;
  eventType?: string;
  startDate?: string;
  durationMinutes?: number;
  locationName?: string;
  audienceType?: 'BRANCH_ALL' | 'GROUPS';
  targetGroups?: Array<{ groupCode: string; groupName?: string }>;
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
}; // CHANGED: nhóm staff theo chi nhánh

export type SavingsTransactionItem = {
  date: string;
  title: string;
  amount: number;
  runningBalance: number;
  rawType?: string | null;
  deposit?: number;
  withdrawal?: number;
}; // CHANGED: schema giao dịch tiết kiệm

export type SavingsItem = {
  type: 'COMPULSORY' | 'VOLUNTARY' | string;
  principalAmount: number;
  currentBalance: number;
  interestAccrued: number;
  lastDepositAmount?: number | null;
  lastDepositDate?: string | null;
  lastTxnDate?: string | null;
  interestRun?: { amount: number; date: string } | null;
  transactions?: SavingsTransactionItem[];
}; // CHANGED: tiết kiệm bắt buộc/tự nguyện

export type WeatherResponse = {
  current: {
    temp: number;
    description: string;
    min?: number | null;
    max?: number | null;
    icon?: string | null;
  };
  location?: string;
  daily?: Array<{
    date: string;
    min: number;
    max: number;
    icon: string;
  }>;
};

export const appApi = {
  getCurrentLoan: async (): Promise<LoanCurrentResponse> => {
    const { data } = await apiClient.get('/loan/current');
    return data;
  },
  createLoanQr: async (amount: number): Promise<LoanQrResponse> => {
    // CHANGED: tạo QR theo số tiền
    const { data } = await apiClient.post('/loan/qr', { amount });
    return data;
  },
  getSavings: async (): Promise<SavingsItem[]> => {
    const { data } = await apiClient.get('/savings'); // CHANGED: lấy sổ tiết kiệm
    return data;
  },
  getStaffCustomers: async (q?: string): Promise<StaffCustomerItem[]> => {
    const { data } = await apiClient.get('/staff/customers', { params: q ? { q } : undefined }); // CHANGED
    return data;
  },
  getStaffCustomerDetail: async (memberNo: string): Promise<StaffCustomerDetail> => {
    const { data } = await apiClient.get(`/staff/customers/${memberNo}`); // CHANGED
    return data;
  },
  createCustomerAccountForStaff: async (payload: CreateCustomerAccountPayload) => {
    const { data } = await apiClient.post('/staff/customers/accounts', payload); // CHANGED
    return data;
  },
  resetCustomerPasswordForStaff: async (memberNo: string, payload: ResetCustomerPasswordPayload) => {
    const { data } = await apiClient.post(`/staff/customers/${memberNo}/reset-password`, payload); // CHANGED
    return data;
  },
  lockCustomerForStaff: async (memberNo: string, locked: boolean) => {
    const { data } = await apiClient.patch(`/staff/customers/${memberNo}/lock`, { locked }); // CHANGED
    return data;
  },
  setCustomerAccessibilityForStaff: async (memberNo: string, enabled: boolean) => {
    const { data } = await apiClient.patch(`/staff/customers/${memberNo}/accessibility`, { enabled }); // CHANGED
    return data;
  },
  getStaffUsers: async (q?: string): Promise<StaffUserItem[]> => {
    const { data } = await apiClient.get('/staff-users', { params: q ? { q } : undefined });
    return data;
  },
  getStaffBranches: async (): Promise<StaffBranchItem[]> => {
    const { data } = await apiClient.get('/staff-users/branches');
    return data;
  },
  createStaffUser: async (payload: CreateStaffUserPayload) => {
    const { data } = await apiClient.post('/staff-users', payload);
    return data;
  },
  updateStaffUser: async (id: number, payload: UpdateStaffUserPayload) => {
    const { data } = await apiClient.patch(`/staff-users/${id}`, payload);
    return data;
  },
  resetStaffPassword: async (id: number, newPassword: string) => {
    const { data } = await apiClient.post(`/staff-users/${id}/reset-password`, { newPassword });
    return data;
  },
  lockStaffUser: async (id: number, locked: boolean) => {
    const { data } = await apiClient.patch(`/staff-users/${id}/lock`, { locked });
    return data;
  },
  deleteStaffUser: async (id: number) => {
    const { data } = await apiClient.delete(`/staff-users/${id}`);
    return data;
  },
  getAdmins: async (): Promise<StaffUserItem[]> => {
    const { data } = await apiClient.get('/super-admin/admins');
    return data;
  },
  createAdmin: async (payload: { fullName?: string | null; email: string; password: string }) => {
    const { data } = await apiClient.post('/super-admin/admins', payload);
    return data;
  },
  deleteAdmin: async (id: number) => {
    const { data } = await apiClient.delete(`/super-admin/admins/${id}`);
    return data;
  },
  getSchedule: async (): Promise<ScheduleItem[]> => {
    const { data } = await apiClient.get('/schedule');
    return data;
  },
  getScheduleDetail: async (id: number): Promise<ScheduleDetail> => {
    const { data } = await apiClient.get(`/schedule/${id}`); // CHANGED: chi tiết lịch
    return data;
  },
  updateSchedule: async (id: number, payload: ScheduleUpdatePayload) => {
    const { data } = await apiClient.patch(`/events/${id}`, payload); // CHANGED: staff update schedule
    return data;
  },
  approveSchedule: async (id: number) => {
    const { data } = await apiClient.post(`/events/${id}/approve`);
    return data;
  },
  rejectSchedule: async (id: number) => {
    const { data } = await apiClient.post(`/events/${id}/reject`);
    return data;
  },
  hideSchedule: async (id: number, hidden: boolean) => {
    const { data } = await apiClient.post(`/events/${id}/hide`, { hidden });
    return data;
  },
  createSchedule: async (payload: ScheduleCreatePayload) => {
    const { data } = await apiClient.post('/events', payload); // CHANGED: staff create schedule
    return data;
  },
  createEvent: async (payload: ScheduleCreatePayload) => {
    const { data } = await apiClient.post('/events', payload); // CHANGED: alias create schedule
    return data;
  },
  getStaffGroups: async (): Promise<StaffGroupItem[]> => {
    const { data } = await apiClient.get('/staff/groups'); // CHANGED: nhóm staff
    return data;
  },
  getWeather: async (lat: number, lon: number): Promise<WeatherResponse> => {
    const { data } = await apiClient.get('/weather', {
      params: { lat, lon },
    });
    return data;
  },
  getProfile: async () => {
    const { data } = await apiClient.get('/me');
    return data;
  },
  registerDeviceToken: async (token: string, platform: 'android' | 'ios') => {
    const { data } = await apiClient.post('/notifications/device-token', { token, platform });
    return data;
  },
  sendFeedback: async (content: string) => {
    const { data } = await apiClient.post('/feedback', { content });
    return data;
  },
  getContactsByBranchCode: async (branchCode: string): Promise<ContactsResponse> => {
    const { data } = await apiClient.get('/public/contacts', {
      params: { branchCode },
    });
    return data;
  },
};
