import React, { useEffect, useMemo, useRef } from 'react';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfileStore } from '@store/profileStore';

// CHANGED: dùng icon giống web (copy từ web/public/img)
const iconMap: Record<string, any> = {
  Loans: require('../../assets/img/loan_icon.jpg'),
  Savings: require('../../assets/img/saving_icon.jpg'),
  Schedule: require('../../assets/img/Schedule_icon.png'),
  Info: require('../../assets/img/infomation_icon.jpg'),
  Account: require('../../assets/img/account_icon.jpg'),
  StaffCustomers: require('../../assets/img/staff_management_icon.jpg'),
  StaffManage: require('../../assets/img/staff_management_icon.jpg'), // fallback nếu không có contact_sso
};

const labelMap: Record<string, string> = {
  Loans: 'Khoản vay',
  Savings: 'Tiết kiệm',
  Schedule: 'Lịch',
  Info: 'Thông tin',
  Account: 'Tài khoản',
  StaffCustomers: 'Quản lý khách hàng',
  StaffManage: 'Quản lý nhân viên',
};

type TabItemProps = {
  routeKey: string;
  isFocused: boolean;
  iconSource?: any;
  onPress: () => void;
};

const TabItem: React.FC<TabItemProps> = ({ routeKey, isFocused, iconSource, onPress }) => {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isFocused) {
      bounce.stopAnimation();
      bounce.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -10,
          duration: 340,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: -2,
          duration: 340,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => {
      loop.stop();
      bounce.setValue(0);
    };
  }, [bounce, isFocused]);

  const content = (
    <View
      className="h-14 w-14 items-center justify-center rounded-full border-4 shadow-sm overflow-hidden"
      style={[
        isFocused ? styles.activeRing : styles.inactiveRing,
        Platform.OS === 'web'
          ? undefined
          : null,
      ]}
    >
      {iconSource ? (
        <Image
          source={iconSource}
          resizeMode="contain"
          className="h-12 w-12 rounded-full"
          style={{ borderRadius: 9999 }}
        />
      ) : null}
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <Pressable
        key={routeKey}
        onPress={onPress}
        className="flex-1 items-center justify-center py-1"
        style={styles.webPressable}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <Pressable
      key={routeKey}
      onPress={onPress}
      className="flex-1 items-center justify-center py-1"
      android_ripple={{ color: '#e2e8f0', radius: 40, borderless: true }}
      style={({ pressed }) =>
        pressed ? styles.pressablePressed : styles.pressableBase
      }
    >
      <Animated.View
        className="h-14 w-14 items-center justify-center rounded-full border-4 shadow-sm overflow-hidden"
        style={[
          isFocused ? styles.activeRing : styles.inactiveRing,
          {
            transform: [{ translateY: bounce }],
          },
        ]}
      >
        {iconSource ? (
          <Image
            source={iconSource}
            resizeMode="contain"
            className="h-12 w-12 rounded-full"
            style={{ borderRadius: 9999 }}
          />
        ) : null}
      </Animated.View>
    </Pressable>
  );
};

export const TabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const { profile } = useProfileStore();
  const isStaff = profile?.actorKind === 'STAFF';

  const routes = useMemo(
    () => state.routes.filter((route) => route.name !== 'Dashboard'),
    [state.routes],
  );

  return (
    <View pointerEvents="box-none" style={styles.root}>
      <View className="pointer-events-auto mx-auto w-full max-w-md px-4">
        <View style={[styles.shadow, styles.outer, { marginBottom: insets.bottom + 10 }]}>
          {/* Glass layer */}
          <View style={styles.glass}>
            <BlurView
              tint="light"
              intensity={Platform.OS === 'android' ? 35 : 45}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.glassOverlay} />
          </View>

          {/* Content layer (overflow visible for bounce) */}
          <View
            style={[
              styles.contentRow,
              isStaff
                ? { justifyContent: 'center', columnGap: 20 }
                : { justifyContent: 'space-between' },
            ]}
          >
            {routes.map((route, index) => {
              const isFocused = state.index === state.routes.findIndex((r) => r.key === route.key);

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name as never, route.params as never);
                  return;
                }

                if (isFocused) {
                  navigation.navigate('Dashboard' as never);
                }
              };

              return (
                <TabItem
                  key={route.key}
                  routeKey={route.key}
                  isFocused={isFocused}
                  iconSource={iconMap[route.name]}
                  onPress={onPress}
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 0,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 10,
  },
  outer: {
    borderRadius: 28,
    overflow: 'visible',
  },
  glass: {
    borderRadius: 28,
    overflow: 'hidden', // CHANGED: cắt blur đúng bo góc
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor:
      Platform.OS === 'android' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.10)',
    ...StyleSheet.absoluteFillObject,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pressableBase: {},
  pressablePressed: {
    transform: [{ scale: 0.96 }],
  },
  webPressable: {},
  contentRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    overflow: 'visible', // CHANGED: cho icon nhảy vượt ra ngoài
  },
  activeRing: {
    borderColor: '#c1121f',
    backgroundColor: 'rgba(255,255,255,0.98)',
  },
  inactiveRing: {
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
});
