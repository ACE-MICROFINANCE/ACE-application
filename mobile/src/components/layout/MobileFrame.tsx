import React from "react";
import { View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type MobileFrameProps = {
  children: React.ReactNode;
  /** Có bottom nav thì chừa thềm padding dưới một chút */
  withBottomPadding?: boolean;
  /** Có muốn bo viền nội dung không */
  contentClassName?: string;
};

export const BOTTOM_TAB_HEIGHT = 98;
export const EXTRA_BOTTOM_SPACING = 24;

export const useBottomPadding = () => {
  const insets = useSafeAreaInsets();
  return insets.bottom + BOTTOM_TAB_HEIGHT + EXTRA_BOTTOM_SPACING;
};

export const MobileFrame: React.FC<MobileFrameProps> = ({
  children,
  withBottomPadding = true,
  contentClassName,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = withBottomPadding ? insets.bottom + BOTTOM_TAB_HEIGHT + EXTRA_BOTTOM_SPACING : insets.bottom;

  return (
    <SafeAreaView className="flex-1 bg-[#e8f3ff]">
      <View
        className={`flex-1 w-full max-w-md mx-auto px-4 ${contentClassName ?? ""}`}
        style={{ paddingBottom: bottomPadding }}
      >
        {children}
      </View>
    </SafeAreaView>
  );
};
