import apiClient from '@lib/apiClient';

export type ScheduleItem = {
  id?: string | number;
  title: string;
  eventType: 'MEETING' | 'FIELD_SCHOOL' | 'FARMING_TASK' | string;
  startDate: string;
};

export type LoanCurrentResponse = {
  loanNo?: string;
  remainingPrincipal?: number | null;
  interestRate?: number | null;
  nextPayment?: {
    dueDate?: string;
    principalDue?: number | null;
    interestDue?: number | null;
    totalDue?: number | null;
  } | null;
  lateAmount?: number | null;
};

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
  getSchedule: async (): Promise<ScheduleItem[]> => {
    const { data } = await apiClient.get('/schedule');
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
};
