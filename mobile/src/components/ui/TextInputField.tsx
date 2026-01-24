import React, { useMemo, useState } from 'react';
import { Platform, Text, TextInput, View, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = TextInputProps & {
  label: string;
  error?: string;
  secureToggle?: boolean;
};

export const TextInputField: React.FC<Props> = ({
  label,
  error,
  secureToggle,
  secureTextEntry,
  keyboardType,
  ...props
}) => {
  const [hidden, setHidden] = useState<boolean>(Boolean(secureTextEntry));
  const actualSecure = secureToggle ? hidden : secureTextEntry;

  // ✅ Fix Android: secureTextEntry + numeric hay bị trắng
  const finalKeyboardType = useMemo(() => {
    if (Platform.OS === 'android' && actualSecure && keyboardType === 'numeric') {
      return 'number-pad' as const;
    }
    return keyboardType;
  }, [actualSecure, keyboardType]);
  const baseColor = '#111';
  const placeholderColor = '#9ca3af';

  return (
    <View className="mb-3">
      <Text className="mb-1 text-sm" style={{ color: '#1f2937' }}>
        {label}
      </Text>
      <View className="relative">
        <TextInput
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-base"
          placeholderTextColor={props.placeholderTextColor ?? placeholderColor}
          secureTextEntry={actualSecure}
          keyboardType={finalKeyboardType}
          autoCorrect={false}
          autoCapitalize="none"
          style={[{ minHeight: 44, color: baseColor, backgroundColor: '#fff' }, props.style]}
          selectionColor="#4f46e5"
          cursorColor={baseColor}
          {...props}
        />
        {secureToggle && (
          <TouchableOpacity
            onPress={() => setHidden((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={18} color="#1f7a8c" />
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text className="mt-1 text-xs text-red-500">{error}</Text>}
    </View>
  );
};
