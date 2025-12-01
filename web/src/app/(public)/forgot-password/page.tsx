'use client';

import { motion } from 'framer-motion';
import { CenteredAuthLayout } from '@/share/layout/CenteredAuthLayout';
import { AceCard } from '@/share/ui/AceCard';
import { ForgotPasswordForm } from '@/share/forms/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <CenteredAuthLayout>
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <AceCard>
          <div className="text-center mb-5">
            <h1 className="text-2xl font-semibold text-[#333]">Quên mật khẩu</h1>
            <p className="text-sm text-[#666] mt-1">
              Tính năng đang được phát triển. Vui lòng liên hệ cán bộ ACE để được hỗ trợ.
            </p>
          </div>
          <ForgotPasswordForm />
        </AceCard>
      </motion.div>
    </CenteredAuthLayout>
  );
}
