'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AceCard } from '@/share/ui/AceCard';
import { Card } from '@/share/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';

type InfoItem = {
  imageUrl: string;
  alt: string;
  text: string;
};

const infoItems: InfoItem[] = [
  { imageUrl: '/img/policy.png', alt: 'ACE policy', text: "ACE's product & Policy" },
  { imageUrl: '/img/youtube.jpg', alt: 'ACE Youtube', text: 'Go to ACE Youtube channel to study training tips' },
  { imageUrl: '/img/contact_sso.png', alt: 'Contact Social worker', text: 'Contact Social worker: 0877500429' },
];

export default function InfoPage() {
  const { isAuthenticated, isInitializing, mustChangePassword } = useAuth();
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace(routes.login);
    } else if (mustChangePassword) {
      router.replace(`${routes.changePassword}?mode=force`);
    }
  }, [isAuthenticated, isInitializing, mustChangePassword, router]);

  const handleYoutube = () => {
    if (typeof window !== 'undefined') {
      window.open('https://www.youtube.com/@user-nb4kl5mf8e', '_blank', 'noopener');
    }
  };

  return (
    <div className="min-h-screen px-4 pb-28 pt-8 w-full">
      <div className="flex w-full flex-col space-y-4">
        <AceCard className="text-center !bg-[#BFD8B8]">
          <h1 className="text-xl font-semibold text-[#333]">Thông tin</h1>
        </AceCard>

        <div className="space-y-3">
          {infoItems.map((item, idx) => (
            <Card
              key={item.text}
              className="rounded-2xl bg-white shadow p-4"
              role="button"
              isPressable
              onPress={() => {
                if (idx === 0) {
                  setShowIntro(true);
                } else if (idx === 1) {
                  handleYoutube();
                } else if (idx === 2) {
                  if (typeof window !== 'undefined') {
                    window.location.href = 'tel:0877500429';
                  }
                }
              }}
            >
              <div className="flex items-center gap-4 cursor-pointer">
                <div className="w-3/12 flex justify-center">
                  <div className="relative h-14 w-14 overflow-hidden rounded-full bg-gray-100">
                    <Image src={item.imageUrl} alt={item.alt} fill className="object-cover" />
                  </div>
                </div>
                <div className="w-9/12 text-sm text-[#333] leading-5">{item.text}</div>
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-3 pt-2">
          <button
            className="w-full rounded-full bg-[#F4A424] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
            onClick={() => router.push('/dashboard?tab=account')}
          >
            Gửi phản hồi
          </button>
          <button
            className="w-full rounded-full bg-[#12B886] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = 'tel:0877500429';
              }
            }}
          >
            Liên hệ CCO
          </button>
        </div>
      </div>

      {showIntro ? (
        <div className="fixed inset-0 z-50 bg-black/40 px-4 flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg relative space-y-3">
            <button
              aria-label="Đóng"
              onClick={() => setShowIntro(false)}
              className="absolute right-3 top-3 text-[#666] hover:text-[#111]"
            >
              ×
            </button>
            <h2 className="text-lg font-semibold text-[#2b6cb0] text-center">Giới thiệu về ACE</h2>
            <div className="space-y-2 text-sm text-[#333] leading-relaxed max-h-[70vh] overflow-y-auto pr-1">
              <p>
                ACE là một tổ chức tài chính vi mô hỗ trợ cộng đồng vùng sâu vùng xa với phương châm “trao
                cơ hội – tạo thay đổi”, cung cấp nguồn vốn an toàn, minh bạch và bền vững.
              </p>
              <p className="font-semibold text-[#1f2937]">Giá trị cốt lõi:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Tính minh bạch, trách nhiệm.</li>
                <li>Gần gũi cộng đồng, phát triển bền vững.</li>
                <li>Đội ngũ cán bộ tín dụng, kiểm soát, kế toán, quản lý vùng làm việc trực tiếp tại địa phương.</li>
              </ul>
              <p>
                ACE đang chuyển đổi số toàn diện để nâng cao hiệu quả vận hành, rút ngắn thời gian xử lý và
                tối ưu trải nghiệm cho nhân viên và khách hàng, hướng tới mô hình tài chính vi mô hiện đại
                theo chuẩn quốc tế nhưng vẫn giữ tinh thần nhân văn.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
