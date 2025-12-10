'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace(routes.login);
    } else if (mustChangePassword) {
      router.replace(`${routes.changePassword}?mode=force`);
    }
  }, [isAuthenticated, isInitializing, mustChangePassword, router]);

  return (
    <div className="min-h-screen px-4 pb-28 pt-8 w-full">
      <div className="flex w-full flex-col space-y-4">
        <AceCard className="text-center !bg-[#BFD8B8]">
          <h1 className="text-xl font-semibold text-[#333]">Thông tin</h1>
        </AceCard>

        <div className="space-y-3">
          {infoItems.map((item) => (
            <Card key={item.text} className="rounded-2xl bg-white shadow p-4">
              <div className="flex items-center gap-4">
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
    </div>
  );
}
