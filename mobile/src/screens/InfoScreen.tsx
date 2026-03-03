import React, { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { MobileFrame } from '@components/layout/MobileFrame';
import { Card } from '@components/ui/Card';
import { useScreenGuard } from '../hooks/useScreenGuard';
import { appApi, type ContactItem } from '@services/appApi';
import { withExternalOpenGuard } from '@lib/permissionPromptGuard';

type InfoItem = {
  image: any;
  alt: string;
  text: string;
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

const isGenericSocialLabel = (label?: string | null) => {
  const value = (label || '').trim().toLowerCase();
  if (!value) return true;
  return /(cán bộ|sđt|social|xã hội|tín dụng)/i.test(value);
};

const InfoScreen = () => {
  const { loading, allowed, profile } = useScreenGuard((p) => p?.actorKind !== 'STAFF');
  const [expandedContact, setExpandedContact] = useState(true);
  const [openError, setOpenError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    setOpenError(null);
  }, [expandedContact]);

  const branchCode = useMemo(() => profile?.branchCode, [profile]);
  const groupName = useMemo(() => profile?.groupName, [profile]);

  useEffect(() => {
    let mounted = true;
    if (!branchCode) {
      setContacts([]);
      setContactError('Không có thông tin chi nhánh.');
      return () => {
        mounted = false;
      };
    }

    (async () => {
      try {
        setContactError(null);
        const res = await appApi.getContactsByBranchCode(branchCode, groupName);
        if (!mounted) return;
        setContacts(Array.isArray(res?.contacts) ? res.contacts : []);
      } catch {
        if (mounted) {
          setContacts([]);
          setContactError('Không tải được danh sách liên hệ.');
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [branchCode, groupName]);

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
      await withExternalOpenGuard(() => Linking.openURL(`tel:${phone}`));
    } catch {
      setOpenError('Không mở được ứng dụng gọi điện.');
    }
  };

  const handleKnowledge = async () => {
    try {
      setOpenError(null);
      await withExternalOpenGuard(() => Linking.openURL('https://www.accessagriculture.org/search/all/vi'));
    } catch {
      setOpenError('Không mở được đường dẫn.');
    }
  };

  const hotline = contacts.filter((c) => c.type === 'HOTLINE');
  const agri = contacts.filter((c) => c.type === 'AGRI');
  const livestock = contacts.filter((c) => c.type === 'LIVESTOCK');
  const socialOfficer = useMemo(() => {
    const socialContacts = contacts.filter((c) => c.type === 'SOCIAL_OFFICER' || c.type === 'SOCIAL');
    if (!socialContacts.length) return [] as ContactItem[];

    const score = (item: ContactItem) => {
      const hasRealName = !isGenericSocialLabel(item.label);
      const fromOfficerType = item.type === 'SOCIAL_OFFICER';
      return (hasRealName ? 2 : 0) + (fromOfficerType ? 1 : 0);
    };

    const best = socialContacts
      .filter((item) => (item.phone || '').trim())
      .sort((a, b) => score(b) - score(a))[0];

    return best ? [best] : [];
  }, [contacts]);
  const others = contacts.filter(
    (c) => !['HOTLINE', 'AGRI', 'LIVESTOCK', 'SOCIAL', 'SOCIAL_OFFICER'].includes(c.type),
  );

  const renderContactRow = (detail: ContactItem) => (
    <TouchableOpacity
      key={`${detail.type}-${detail.phone}-${detail.label}`}
      className="flex-row items-center justify-between rounded-lg px-2 py-2"
      activeOpacity={0.8}
      onPress={() => handleCall(detail.phone)}
    >
      <Text className="text-sm text-[#333]">{detail.label}</Text>
      <Text className="font-medium text-[#111]">{detail.phone}</Text>
    </TouchableOpacity>
  );

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
                {hotline.length ? (
                  <View className="space-y-1">
                    <Text className="text-xs font-semibold text-[#6B7280]">Đường dây nóng</Text>
                    {hotline.map(renderContactRow)}
                  </View>
                ) : null}

                {agri.length ? (
                  <View className="space-y-1 pt-1">
                    <Text className="text-xs font-semibold text-[#6B7280]">Cán bộ trồng trọt</Text>
                    {agri.map(renderContactRow)}
                  </View>
                ) : null}

                {livestock.length ? (
                  <View className="space-y-1 pt-1">
                    <Text className="text-xs font-semibold text-[#6B7280]">Cán bộ chăn nuôi</Text>
                    {livestock.map(renderContactRow)}
                  </View>
                ) : null}

                {socialOfficer.length ? (
                  <View className="space-y-1 pt-1">
                    <Text className="text-xs font-semibold text-[#6B7280]">Cán bộ công tác xã hội</Text>
                    {socialOfficer.map(renderContactRow)}
                  </View>
                ) : null}

                {others.length ? (
                  <View className="space-y-1 pt-1">
                    <Text className="text-xs font-semibold text-[#6B7280]">Khác</Text>
                    {others.map(renderContactRow)}
                  </View>
                ) : null}

                {contactError ? <Text className="text-sm text-red-500 text-center">{contactError}</Text> : null}
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
