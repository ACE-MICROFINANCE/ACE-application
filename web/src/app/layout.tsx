import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/providers/AppProviders';

export const metadata: Metadata = {
  title: 'ACE Customer',
  description: 'Ứng dụng ACE cho khách hàng',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-[#e7f3ff]">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
