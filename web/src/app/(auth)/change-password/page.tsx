'use client';

import { motion } from 'framer-motion';
import { CenteredAuthLayout } from '@/share/layout/CenteredAuthLayout';
import { AceCard } from '@/share/ui/AceCard';
import { ChangePasswordForm } from '@/share/forms/ChangePasswordForm';

export default function ChangePasswordPage() {
  return (
    <CenteredAuthLayout>
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <AceCard>
          <div className="text-center mb-5 space-y-1">
            <h1 className="text-2xl font-semibold text-[#333]">Đổi mật khẩu</h1>
            <p className="text-sm text-[#666]">
              Vì lý do bảo mật, bạn cần đổi mật khẩu trước khi sử dụng ứng dụng.
            </p>
          </div>
          <ChangePasswordForm />
        </AceCard>
      </motion.div>
    </CenteredAuthLayout>
  );
}
