'use client';

/**
 * Định dạng số tiền VND với phân cách ngàn.
 */
export const formatCurrencyVND = (value?: number | null): string => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '0 VND';
  }
  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
};

/**
 * Định dạng ngày (ISO string hoặc Date) về dd/MM/yyyy.
 */
export const formatDate = (value?: string | Date | null): string => {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};
