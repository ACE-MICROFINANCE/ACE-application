import React, { useEffect, useState } from 'react';
import { Image, Linking, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { MobileFrame } from '@components/layout/MobileFrame';
import { Card } from '@components/ui/Card';
import { useScreenGuard } from '../hooks/useScreenGuard';

type InfoItem = {
  image: any;
  alt: string;
  text: string;
};

type ContactDetail = {
  label: string;
  phone: string;
};

const contactItem: InfoItem = {
  image: require('../../assets/img/infomation_icon.jpg'),
  alt: 'Liên hệ',
  text: 'Liên hệ',
};

const knowledgeItem: InfoItem = {
  image: require('../../assets/img/Schedule_icon.png'),
  alt: 'Kiến thức nông nghiệp',
  text: 'Kiến thức nông nghiệp Việt Nam',
};

const contactDetails: ContactDetail[] = [
  { label: 'Đường dây nóng', phone: '1900000' },
  { label: 'SDT Cán bộ trồng trọt & chăn nuôi', phone: '0766667505' },
  { label: 'SDT Cán bộ xã hội', phone: '0766667507' },
];

const InfoScreen = () => {
  const { loading, allowed } = useScreenGuard((profile) => profile?.actorKind !== 'STAFF');
  const [expandedContact, setExpandedContact] = useState(true);
  const [openError, setOpenError] = useState<string | null>(null);

  useEffect(() => {
    setOpenError(null);
  }, [expandedContact]);

  if (loading || !allowed) {
    return (
      <MobileFrame withBottomPadding>
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-slate-600">Đang tải...</Text>
        </View>
      </MobileFrame>
    );
  }

  const handleCall = async (phone: string) => {
    try {
      setOpenError(null);
      await Linking.openURL(`tel:${phone}`);
    } catch {
      setOpenError('Không mở được ứng dụng gọi điện.');
    }
  };

  const handleKnowledge = async () => {
    try {
      setOpenError(null);
      await Linking.openURL('https://www.accessagriculture.org/search/all/vi');
    } catch {
      setOpenError('Không mở được đường dẫn.');
    }
  };

  return (
    <MobileFrame withBottomPadding>
      <View className="pt-8 space-y-4">
        <Card className="rounded-2xl !bg-[#BFD8B8] shadow p-5 items-center">
          <Text className="text-xl font-semibold text-[#333] text-center">Thông tin</Text>
        </Card>

        <Pressable onPress={() => setExpandedContact((prev) => !prev)}>
          <Card className="rounded-2xl bg-white shadow p-4">
            <View className="flex-row items-center justify-between">
              <View className="h-14 w-14 rounded-full overflow-hidden bg-gray-100 justify-center items-center">
                <Image source={contactItem.image} accessibilityLabel={contactItem.alt} className="h-14 w-14" />
              </View>
              <Text className="flex-1 text-xl font-bold text-[#333] text-center">{contactItem.text}</Text>
              <View className="h-14 w-14" />
            </View>

            {expandedContact ? (
              <View className="mt-4 border-t border-black/5 pt-3 space-y-2">
                {contactDetails.map((detail) => (
                  <TouchableOpacity
                    key={detail.phone}
                    className="flex-row items-center justify-between rounded-lg px-2 py-2"
                    activeOpacity={0.8}
                    onPress={() => handleCall(detail.phone)}
                  >
                    <Text className="text-sm text-[#333]">{detail.label}</Text>
                    <Text className="font-medium text-[#111]">{detail.phone}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </Card>
        </Pressable>

        <Pressable onPress={handleKnowledge}>
          <Card className="rounded-2xl bg-white shadow p-4">
            <View className="flex-row items-center" style={{ gap: 16 }}>
              <View className="h-14 w-14 rounded-full overflow-hidden bg-gray-100 justify-center items-center">
                <Image
                  source={knowledgeItem.image}
                  accessibilityLabel={knowledgeItem.alt}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
              <Text className="flex-1 text-sm text-[#333] leading-5">{knowledgeItem.text}</Text>
            </View>
          </Card>
        </Pressable>

        {openError ? <Text className="text-sm text-red-500 text-center">{openError}</Text> : null}
      </View>
    </MobileFrame>
  );
};

export default InfoScreen;
