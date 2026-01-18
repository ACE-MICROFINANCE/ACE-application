import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MobileFrameProps = {
  children: React.ReactNode;
  /** Có bottom nav thì chừa thêm padding dưới một chút */
  withBottomPadding?: boolean;
  /** Có muốn bo viền nội dung không */
  contentClassName?: string;
};

export const MobileFrame: React.FC<MobileFrameProps> = ({
  children,
  withBottomPadding = true,
  contentClassName,
}) => {
  return (
    <SafeAreaView className="flex-1 bg-[#e8f3ff]">
      <View
        className={`flex-1 w-full max-w-md mx-auto px-4 ${withBottomPadding ? 'pb-8' : ''} ${
          contentClassName ?? ''
        }`}
      >
        {children}
      </View>
    </SafeAreaView>
  );
};
