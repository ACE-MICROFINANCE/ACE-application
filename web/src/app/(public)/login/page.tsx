'use client';

import { motion } from 'framer-motion';
import { CenteredAuthLayout } from '@/share/layout/CenteredAuthLayout';
import { AceCard } from '@/share/ui/AceCard';
import { LoginForm } from '@/share/forms/LoginForm';

export default function LoginPage() {
  return (
    <CenteredAuthLayout>
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <AceCard className="max-w-md w-full flex flex-col space-y-5">
          <div className="flex flex-col items-center text-center space-y-1">
            <h1 className="text-2xl font-semibold text-[#333]">Đăng nhập</h1>
            <p className="text-sm text-[#666]">Ứng dụng ACE cho khách hàng</p>
          </div>
          <LoginForm />
        </AceCard>
      </motion.div>
    </CenteredAuthLayout>
  );
}
