'use client';

import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { CenteredAuthLayout } from '@/share/layout/CenteredAuthLayout';
import { AceCard } from '@/share/ui/AceCard';
import { ChangePasswordForm } from '@/share/forms/ChangePasswordForm';

export default function ChangePasswordPage() {
  const searchParams = useSearchParams();
  const mode = searchParams?.get('mode');

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
              {mode === 'force'
                ? 'Bạn cần đổi mật khẩu để tiếp tục sử dụng ứng dụng.'
                : 'Vì bảo mật, hãy nhập mật khẩu hiện tại và tạo mật khẩu mới.'}
            </p>
          </div>
          <ChangePasswordForm />
        </AceCard>
      </motion.div>
    </CenteredAuthLayout>
  );
}
