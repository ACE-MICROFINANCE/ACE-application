import React from 'react';
import { View, Text } from 'react-native';
import { MobileFrame } from '@components/layout/MobileFrame';
import { Card } from '@components/ui/Card';

const ScheduleScreen = () => {
  return (
    <MobileFrame withBottomPadding>
      <View className="pt-8 space-y-4">
        <Card>
          <Text className="text-lg font-semibold text-slate-900">Lịch công tác</Text>
          <Text className="mt-2 text-slate-600">
            Danh sách sự kiện sắp tới sẽ được đồng bộ và hiển thị tại đây.
          </Text>
        </Card>
      </View>
    </MobileFrame>
  );
};

export default ScheduleScreen;

