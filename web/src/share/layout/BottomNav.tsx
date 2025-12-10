'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import clsx from 'clsx';

type NavKey = 'home' | 'loans' | 'saving' | 'schedule' | 'info' | 'account';

const navItems: { key: NavKey; label: string; iconSrc: string; href: string }[] = [
  { key: 'loans', label: 'Khoản vay', iconSrc: '/img/loan_icon.jpg', href: '/dashboard/loan' },
  { key: 'saving', label: 'Tiết kiệm', iconSrc: '/img/saving_icon.jpg', href: '/dashboard/saving' },
  { key: 'schedule', label: 'Lịch', iconSrc: '/img/Schedule_icon.png', href: '/dashboard/schedule' },
  { key: 'info', label: 'Thông tin', iconSrc: '/img/infomation_icon.jpg', href: '/dashboard/info' },
  { key: 'account', label: 'Tài khoản', iconSrc: '/img/account_icon.jpg', href: '/dashboard?tab=account' },
];

export const BottomNav = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeKey = useMemo<NavKey>(() => {
    if (pathname.startsWith('/dashboard/loan')) return 'loans';
    if (pathname.startsWith('/dashboard/saving')) return 'saving';
    if (pathname.startsWith('/dashboard/schedule')) return 'schedule';
    if (pathname.startsWith('/dashboard/info')) return 'info';
    if (searchParams.get('tab') === 'account') return 'account';
    return 'home';
  }, [pathname, searchParams]);

  const handleClick = (item: (typeof navItems)[number]) => {
    if (activeKey === item.key) {
      router.push('/dashboard');
      return;
    }
    router.push(item.href);
  };

  return (
    <div className="fixed inset-x-0 bottom-4 flex justify-center">
      <div className="flex w-full max-w-md items-center justify-between rounded-2xl bg-white px-3 py-2 shadow-lg">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => handleClick(item)}
            className={clsx(
              'flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 transition',
              activeKey === item.key ? 'bg-[#e7f3ff] text-[#2b6cb0]' : 'text-[#555] hover:bg-slate-100',
            )}
            aria-label={item.label}
          >
            <span
              className={clsx(
                'relative h-12 w-12 rounded-full bg-white p-1 shadow-sm border-4 overflow-hidden',
                activeKey === item.key ? 'border-red-700' : 'border-transparent',
              )}
            >
              <Image
                src={item.iconSrc}
                alt={item.label}
                fill
                sizes="44px"
                className="object-contain"
                priority
              />
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  // TODO: replaced by ACE Farmer implementation
  // Các nhãn điều hướng cũ (mã hóa lỗi) đã được thay bằng tiếng Việt chuẩn.
};
