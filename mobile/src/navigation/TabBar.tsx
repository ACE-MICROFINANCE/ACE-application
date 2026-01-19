import React, { useEffect, useRef } from 'react';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Image, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated, Easing } from 'react-native';
import { useProfileStore } from '@store/profileStore';

// CHANGED: dùng đúng icon giống web (đã copy từ web/public/img)
const iconMap: Record<string, any> = {
  Loans: require('../../assets/img/loan_icon.jpg'),
  Savings: require('../../assets/img/saving_icon.jpg'),
  Schedule: require('../../assets/img/Schedule_icon.png'),
  Info: require('../../assets/img/infomation_icon.jpg'),
  Account: require('../../assets/img/account_icon.jpg'),
  StaffCustomers: require('../../assets/img/staff_management_icon.jpg'),
  StaffManage: require('../../assets/img/staff_management_icon.jpg'), // fallback: dùng icon staff management
};

export const TabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const { profile } = useProfileStore();
  const isStaff = profile?.actorKind === 'STAFF';

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: 8,
      }}
    >
      <View className="pointer-events-auto mx-auto w-full max-w-md px-4">
        <View
          className={`flex-row items-center rounded-3xl bg-white px-4 py-3 shadow-lg ${
            isStaff ? 'justify-center' : 'justify-evenly'
          }`}
          style={{ marginBottom: insets.bottom + 12}}
        >
          {state.routes.map((route, index) => {
            if (route.name === 'Dashboard') return null; // CHANGED: ẩn icon Dashboard nhưng giữ index để state khớp
            const { options } = descriptors[route.key];
            const label =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                ? options.title
                : route.name;
            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
                return;
              }

              // Nếu đang ở tab hiện tại thì quay về Dashboard giống web
              if (isFocused) {
                navigation.navigate('Dashboard' as never);
              }
            };

            const iconSource = iconMap[route.name];

            const bounce = useRef(new Animated.Value(0)).current;
            useEffect(() => {
              if (isFocused) {
                const loop = Animated.loop(
                  Animated.sequence([
                    Animated.timing(bounce, {
                      toValue: -8,
                      duration: 320,
                      easing: Easing.inOut(Easing.ease),
                      useNativeDriver: true,
                    }),
                    Animated.timing(bounce, {
                      toValue: 0,
                      duration: 320,
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
              } else {
                bounce.setValue(0);
              }
            }, [isFocused, bounce]);

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                className="flex-1 items-center justify-center py-1"
                android_ripple={{ color: '#e2e8f0', radius: 40, borderless: true }}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <Animated.View
                  className={`h-14 w-14 items-center justify-center rounded-full border-4 shadow-sm overflow-hidden ${
                    isFocused ? 'border-[#c1121f] bg-white' : 'border-transparent bg-white'
                  }`}
                  style={{
                    transform: [
                      { translateY: isFocused ? Animated.add(new Animated.Value(-22), bounce) : new Animated.Value(0) },
                      { scale: isFocused ? 1.2 : 1 },
                    ],
                  }}
                >
                  {iconSource ? (
                    <Image
                      source={iconSource}
                      resizeMode="contain"
                      className="h-12 w-12 rounded-full"
                      style={{ tintColor: undefined, borderRadius: 9999 }}
                    />
                  ) : null}
                </Animated.View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};
