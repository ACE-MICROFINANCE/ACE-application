import React from 'react';
import { ActivityIndicator, GestureResponderEvent, Text, TouchableOpacity } from 'react-native';

type Props = {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  bgColor?: string; // CHANGED: ưu tiên màu nền truyền thẳng để không bị đè
};

export const AppButton: React.FC<Props> = ({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  className = '',
  bgColor,
}) => {
  const hasCustomBg = className.includes('bg-') || Boolean(bgColor);
  const baseBg = !hasCustomBg
    ? variant === 'primary'
      ? 'bg-[#2b6cb0]'
      : variant === 'danger'
      ? 'bg-red-600'
      : 'bg-slate-200'
    : '';

  const baseClasses = [
    'w-full flex-row items-center justify-center rounded-full px-4 py-3 mt-2',
    baseBg,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <TouchableOpacity
      className={`${baseClasses} ${className}`}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={bgColor ? { backgroundColor: bgColor, opacity: disabled ? 0.6 : 1, minHeight: 44 } : { minHeight: 44 }}
    >
      {loading && <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />}
      <Text className="text-center text-white font-semibold">{title}</Text>
    </TouchableOpacity>
  );
};
