import { Suspense } from 'react';
import { CenteredAuthLayout } from '@/share/layout/CenteredAuthLayout';
import { AceCard } from '@/share/ui/AceCard';
import ChangePasswordClient from './ChangePasswordClient';

export default function ChangePasswordPage() {
  return (
    <CenteredAuthLayout>
      <Suspense
        fallback={
          <div className="w-full max-w-sm">
            <AceCard>
              <div className="mb-5 space-y-1 text-center">
                <h1 className="text-2xl font-semibold text-[#333]">Đổi mật khẩu</h1>
                <p className="text-sm text-[#666]">Đang tải...</p>
              </div>
              <div className="space-y-3">
                <div className="h-10 rounded-lg bg-slate-100" />
                <div className="h-10 rounded-lg bg-slate-100" />
              </div>
            </AceCard>
          </div>
        }
      >
        <ChangePasswordClient />
      </Suspense>
    </CenteredAuthLayout>
  );
}
