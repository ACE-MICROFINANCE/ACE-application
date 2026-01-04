'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import clsx from 'clsx';
import { motion } from 'framer-motion';

type NavKey = 'home' | 'loans' | 'saving' | 'schedule' | 'info' | 'account';

const navItems: { key: NavKey; label: string; iconSrc: string; href: string }[] = [
  { key: 'loans', label: 'Khoản vay', iconSrc: '/img/loan_icon.jpg', href: '/dashboard/loan' },
  { key: 'saving', label: 'Tiết kiệm', iconSrc: '/img/saving_icon.jpg', href: '/dashboard/saving' },
  { key: 'schedule', label: 'Họp Nhóm và Tập Huấn', iconSrc: '/img/Schedule_icon.png', href: '/dashboard/schedule' },
  { key: 'info', label: 'Thông tin', iconSrc: '/img/infomation_icon.jpg', href: '/dashboard/info' },
  { key: 'account', label: 'Tài khoản', iconSrc: '/img/account_icon.jpg', href: '/dashboard?tab=account' },
];

export const BottomNav = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [clickedKey, setClickedKey] = useState<NavKey | null>(null);
  const popTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeKey = useMemo<NavKey>(() => {
    if (pathname.startsWith('/dashboard/loan')) return 'loans';
    if (pathname.startsWith('/dashboard/saving')) return 'saving';
    if (pathname.startsWith('/dashboard/schedule')) return 'schedule';
    if (pathname.startsWith('/dashboard/info')) return 'info';
    if (searchParams.get('tab') === 'account') return 'account';
    return 'home';
  }, [pathname, searchParams]);

  useEffect(() => {
    return () => {
      if (popTimeoutRef.current) clearTimeout(popTimeoutRef.current);
    };
  }, []);

  const handleClick = (item: (typeof navItems)[number]) => {
    const isActive = activeKey === item.key;

    // pop animation vẫn giữ
    setClickedKey(item.key);
    if (popTimeoutRef.current) clearTimeout(popTimeoutRef.current);
    popTimeoutRef.current = setTimeout(() => setClickedKey(null), 160);

    // NEW: đang active thì về /dashboard
    if (isActive) {
      router.push('/dashboard');
      return;
    }

    // không active thì đi tới trang đó
    router.push(item.href);
  };

  return (
    <div className="fixed inset-x-0 bottom-4 flex justify-center">
      <div className="flex w-full max-w-md items-center justify-between rounded-2xl bg-white px-3 py-2 shadow-lg overflow-visible">
        {navItems.map((item) => {
          const isActive = activeKey === item.key;
          const isClicked = clickedKey === item.key;

          const baseScale = isActive ? 1.15 : 1;
          const scaleMotion = isClicked ? 1.25 : baseScale;

          return (
            <div key={item.key} className="relative flex h-16 items-center justify-center overflow-visible">
              <button
                onClick={() => handleClick(item)}
                className={clsx(
                  'flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 transition',
                  isActive ? 'bg-[#e7f3ff] text-[#2b6cb0]' : 'text-[#555] hover:bg-slate-100',
                )}
                aria-label={item.label}
              >
                <motion.div
                  className="flex items-center justify-center"
                  animate={isActive ? { y: [-22, -30, -22] } : { y: 0 }}
                  transition={
                    isActive
                      ? { duration: 1.25, repeat: Infinity, ease: 'easeInOut' }
                      : { type: 'spring', stiffness: 600, damping: 24 }
                  }
                >
                  <motion.span
                    className={clsx(
                      'relative h-12 w-12 rounded-full bg-white p-1 shadow-sm border-4 overflow-hidden',
                      isActive ? 'border-red-700' : 'border-transparent',
                    )}
                    animate={{ scale: scaleMotion }}
                    whileHover={isActive ? undefined : { scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 24 }}
                  >
                    <Image
                      src={item.iconSrc}
                      alt={item.label}
                      fill
                      sizes="44px"
                      className="object-contain"
                      priority
                    />
                  </motion.span>
                </motion.div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
