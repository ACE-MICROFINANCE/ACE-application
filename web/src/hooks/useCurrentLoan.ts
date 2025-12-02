'use client';

import { useEffect, useState } from 'react';
import { appApi, type LoanCurrentResponse } from '@/services/appApi';

export const useCurrentLoan = () => {
  const [loan, setLoan] = useState<LoanCurrentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLoan = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await appApi.getCurrentLoan();
      setLoan(data);
    } catch (err) {
      setError('Không lấy được thông tin khoản vay. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoan();
  }, []);

  return { loan, isLoading, error, refresh: fetchLoan };
};
