'use client';

import { type KeyboardEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
// import { ChevronsDown } from 'lucide-react'; // CHANGED: bỏ icon chevrons theo yêu cầu
import { Phone } from 'lucide-react';
import { AceCard } from '@/share/ui/AceCard';
import { Card } from '@/share/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';

type InfoItem = {
  imageUrl: string;
  alt: string;
  text: string;
};

type ContactDetail = {
  label: string;
  phone: string;
};

const contactItem: InfoItem = {
  imageUrl: '/img/ACE-1529.png',
  alt: 'Liên hệ',
  text: 'Liên hệ',
};

const knowledgeItem: InfoItem = {
  imageUrl: '/img/caylua_info.jpg',
  alt: 'Kiến thức nông nghiệp',
  text: 'Kiến thức nông nghiệp Việt Nam',
};

const contactDetails: ContactDetail[] = [
  { label: 'Đường dây nóng', phone: '1900000' },
  { label: 'SĐT Cán bộ trồng trọt & chăn nuôi', phone: '0766667505' },
  { label: 'SĐT Cán bộ xã hội', phone: '0766667507' },
];

export default function InfoPage() {
  const { isAuthenticated, isInitializing, mustChangePassword } = useAuth();
  const router = useRouter();
  const [expandedContact, setExpandedContact] = useState(true); // CHANGED: mở sẵn, click để đóng

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace(routes.login);
    } else if (mustChangePassword) {
      router.replace(`${routes.dashboard}?tab=account`);
    }
  }, [isAuthenticated, isInitializing, mustChangePassword, router]);

  const handleYoutube = () => {
    if (typeof window !== 'undefined') {
      window.open('https://www.accessagriculture.org/search/all/vi', '_blank', 'noopener');
    }
  };

  const toggleContact = () => {
    setExpandedContact((prev) => !prev);
  };

  const handleContactKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleContact();
    }
  };

  const handleCall = (phone: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `tel:${phone}`;
    }
  };

  const renderContactDetails = () => (
    <AnimatePresence initial={false}>
      {expandedContact ? (
        <motion.div
          key="contact-details"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="mt-4 overflow-hidden border-t border-black/5 pt-3"
        >
          <div className="space-y-2">
            {contactDetails.map((detail) => (
              <button
                key={detail.phone}
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-[#333] transition hover:bg-black/5 active:bg-black/10"
                onClick={(event) => {
                  event.stopPropagation();
                  handleCall(detail.phone);
                }}
              >
                <span className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#6b7280]" />
                  {detail.label}
                </span>
                <span className="font-medium text-[#111]">{detail.phone}</span>
              </button>
            ))}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  const renderContactCard = () => (
    <Card
      className="rounded-2xl bg-white shadow p-4"
      role="button"
      tabIndex={0}
      aria-expanded={expandedContact}
      onClick={toggleContact}
      onKeyDown={handleContactKeyDown}
    >
      <div className="grid grid-cols-[56px_1fr_56px] items-center cursor-pointer">
        <div className="flex justify-center">
          <div className="relative h-14 w-14 overflow-hidden rounded-full bg-gray-100">
            <Image src={contactItem.imageUrl} alt={contactItem.alt} fill className="object-cover" />
          </div>
        </div>
        <div className="text-xl font-bold text-[#333] leading-5 text-center">{contactItem.text}</div>
        <div className="h-14 w-14" aria-hidden />
      </div>

      {/* CHANGED: bỏ icon chevrons, giữ card luôn mở mặc định */}
      {/* <div className="mt-3 flex justify-center">
        <motion.div
          animate={{ rotate: expandedContact ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1 text-[#0F5132] opacity-70"
          aria-hidden="true"
        >
          <ChevronsDown className="h-4 w-4" />
        </motion.div>
      </div> */}

      {renderContactDetails()}
    </Card>
  );

  return (
    <div className="min-h-screen px-4 pb-28 pt-8 w-full">
      <div className="flex w-full flex-col space-y-4">
        <AceCard className="text-center !bg-[#BFD8B8]">
          <h1 className="text-xl font-semibold text-[#333]">Thông tin</h1>
        </AceCard>

        <div className="space-y-3">
          {renderContactCard()}
          <Card
            className="rounded-2xl bg-white shadow p-4"
            role="button"
            isPressable
            onPress={handleYoutube}
          >
            <div className="flex items-center gap-4 cursor-pointer">
              <div className="w-3/12 flex justify-center">
                <div className="relative h-14 w-14 overflow-hidden rounded-full bg-gray-100">
                  <Image
                    src={knowledgeItem.imageUrl}
                    alt={knowledgeItem.alt}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="w-9/12 text-sm text-[#333] leading-5">{knowledgeItem.text}</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
