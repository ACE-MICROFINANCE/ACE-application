import React from 'react';
import { ActivityIndicator, GestureResponderEvent, Text, TouchableOpacity } from 'react-native';

type Props = {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
};

export const AppButton: React.FC<Props> = ({ title, onPress, disabled, loading, variant = 'primary' }) => {
  const baseClasses =
    'w-full flex-row items-center justify-center rounded-md px-4 py-3 mt-2 ' +
    (variant === 'primary'
      ? 'bg-brand'
      : variant === 'danger'
      ? 'bg-red-600'
      : 'bg-slate-200');

  return (
    <TouchableOpacity className={baseClasses} onPress={onPress} disabled={disabled || loading} activeOpacity={0.8}>
      {loading && <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />}
      <Text className="text-center text-white font-semibold">{title}</Text>
    </TouchableOpacity>
  );
};
