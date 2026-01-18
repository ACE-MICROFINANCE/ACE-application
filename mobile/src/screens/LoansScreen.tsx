import React from 'react';
import { View, Text } from 'react-native';
import { MobileFrame } from '@components/layout/MobileFrame';
import { Card } from '@components/ui/Card';
import { useScreenGuard } from '../hooks/useScreenGuard';

const LoansScreen = () => {
  const { loading, allowed } = useScreenGuard((profile) => profile?.actorKind !== 'STAFF');

  if (loading || !allowed) {
    return (
      <MobileFrame withBottomPadding>
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-slate-600">Đang tải...</Text>
        </View>
      </MobileFrame>
    );
  }

  return (
    <MobileFrame withBottomPadding>
      <View className="pt-8 space-y-4">
        <Card>
          <Text className="text-lg font-semibold text-slate-900">Khoản vay</Text>
          <Text className="mt-2 text-slate-600">Dữ liệu khoản vay sẽ đồng bộ giống bản web.</Text>
        </Card>
      </View>
    </MobileFrame>
  );
};

export default LoansScreen;
