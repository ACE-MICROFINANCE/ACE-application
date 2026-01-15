'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

type NavKey = 'home' | 'loans' | 'saving' | 'schedule' | 'info' | 'account' | 'manage' | 'customer-manage'; // CHANGED

const CUSTOMER_NAV_ITEMS: { key: NavKey; label: string; iconSrc: string; href: string }[] = [
  { key: 'loans', label: 'Khoản vay', iconSrc: '/img/loan_icon.jpg', href: '/dashboard/loan' },
  { key: 'saving', label: 'Tiết kiệm', iconSrc: '/img/saving_icon.jpg', href: '/dashboard/saving' },
  {
    key: 'schedule',
    label: 'Họp Nhóm và Tập Huấn',
    iconSrc: '/img/Schedule_icon.png',
    href: '/dashboard/schedule',
  },
  { key: 'info', label: 'Thông tin', iconSrc: '/img/infomation_icon.jpg', href: '/dashboard/info' },
  { key: 'account', label: 'Tài khoản', iconSrc: '/img/account_icon.jpg', href: '/dashboard?tab=account' },
];

const STAFF_NAV_ITEMS: { key: NavKey; label: string; iconSrc: string; href: string }[] = [
  {
    key: 'schedule',
    label: 'Họp Nhóm và Tập Huấn',
    iconSrc: '/img/Schedule_icon.png',
    href: '/dashboard/schedule',
  },
  {
    key: 'customer-manage',
    label: 'Quản lý khách hàng',
    iconSrc: '/img/staff_management_icon.jpg',
    href: '/dashboard/admin/customer-management',
  },
  {
    key: 'account',
    label: 'Tài khoản',
    iconSrc: '/img/account_icon.jpg',
    href: '/dashboard?tab=account',
  },
];

// CHANGED: admin tab quản lý
const ADMIN_NAV_ITEMS: { key: NavKey; label: string; iconSrc: string; href: string }[] = [
   {
    key: 'customer-manage',
    label: 'Quản lý khách hàng',
    iconSrc: '/img/staff_management_icon.jpg',
    href: '/dashboard/admin/customer-management',
  },
  {
    key: 'manage',
    label: 'Quản lý',
    iconSrc: '/img/contact_sso.png',
    href: '/dashboard/admin/staff-management',
  },
  {
    key: 'account',
    label: 'Tài khoản',
    iconSrc: '/img/account_icon.jpg',
    href: '/dashboard?tab=account',
  },
];

export const BottomNav = () => {
  const { profile } = useAuth(); // giữ nguyên
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const navRef = useRef<HTMLDivElement | null>(null);

  const [clickedKey, setClickedKey] = useState<NavKey | null>(null);
  const popTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isStaff = profile?.actorKind === 'STAFF';
  const isAdmin = isStaff && profile?.role === 'ADMIN'; // CHANGED

  // CHANGED: chọn nav theo role
  const navItems = isAdmin ? ADMIN_NAV_ITEMS : isStaff ? STAFF_NAV_ITEMS : CUSTOMER_NAV_ITEMS;

  const activeKey = useMemo<NavKey>(() => {
    // CHANGED: admin staff-management active
    if (pathname.startsWith('/dashboard/admin/staff-management')) return 'manage';
    if (pathname.startsWith('/dashboard/admin/customer-management')) return 'customer-manage'; // CHANGED: staff customer-management

    if (pathname.startsWith('/dashboard/loan')) return 'loans';
    if (pathname.startsWith('/dashboard/saving')) return 'saving';

    if (
      pathname.startsWith('/dashboard/schedule') ||
      pathname.startsWith('/dashboard/staff/schedule') ||
      pathname.startsWith('/staff/dashboard/schedule') // CHANGED: thêm để chắc ăn, không phá logic
    )
      return 'schedule';

    if (pathname.startsWith('/dashboard/info')) return 'info';
    if (searchParams.get('tab') === 'account') return 'account';
    return 'home';
  }, [pathname, searchParams]);

  useEffect(() => {
    return () => {
      if (popTimeoutRef.current) clearTimeout(popTimeoutRef.current);
    };
  }, []);

  // giữ nguyên: đo chiều cao bottom nav để dùng cho FAB/spacing nếu cần
  useEffect(() => {
    const root = document.documentElement;
    const fallback = 98;
    const getViewportHeight = () => window.visualViewport?.height ?? window.innerHeight; // CHANGED: use visualViewport when available

    const updateNavHeight = () => {
      if (!navRef.current) {
        root.style.setProperty('--ace-bottom-nav-h', `${fallback}px`);
        return;
      }
      const rect = navRef.current.getBoundingClientRect();
      const heightFromBottom = Math.round(getViewportHeight() - rect.top); // CHANGED: align with visual viewport
      const nextValue = heightFromBottom || Math.round(rect.height) || fallback;
      root.style.setProperty('--ace-bottom-nav-h', `${nextValue}px`);
    };

    updateNavHeight();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && navRef.current) {
      observer = new ResizeObserver(() => updateNavHeight());
      observer.observe(navRef.current);
    }

    const vv = window.visualViewport; // CHANGED: track visual viewport changes (iOS)
    vv?.addEventListener('resize', updateNavHeight);
    vv?.addEventListener('scroll', updateNavHeight);
    window.addEventListener('resize', updateNavHeight);

    return () => {
      observer?.disconnect();
      vv?.removeEventListener('resize', updateNavHeight);
      vv?.removeEventListener('scroll', updateNavHeight);
      window.removeEventListener('resize', updateNavHeight);
    };
  }, []);

  const handleClick = (item: (typeof navItems)[number]) => {
    const isActive = activeKey === item.key;

    // pop animation vẫn giữ
    setClickedKey(item.key);
    if (popTimeoutRef.current) clearTimeout(popTimeoutRef.current);
    popTimeoutRef.current = setTimeout(() => setClickedKey(null), 160);

    // đang active thì về /dashboard
    if (isActive) {
      router.push('/dashboard');
      return;
    }

    router.push(item.href);
  };

  return (
    <div className="fixed inset-x-0 bottom-4 flex justify-center">
      <div
        ref={navRef}
        className={clsx(
          'flex w-full max-w-md items-center rounded-2xl bg-white px-3 py-2 shadow-lg overflow-visible',
          isStaff ? 'justify-center gap-6' : 'justify-between',
        )}
      >
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
