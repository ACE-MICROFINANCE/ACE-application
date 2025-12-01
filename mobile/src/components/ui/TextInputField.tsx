import React, { useState } from 'react';
import { Text, TextInput, View, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = TextInputProps & {
  label: string;
  error?: string;
  secureToggle?: boolean;
};

export const TextInputField: React.FC<Props> = ({ label, error, secureToggle, secureTextEntry, ...props }) => {
  const [hidden, setHidden] = useState<boolean>(Boolean(secureTextEntry));
  const actualSecure = secureToggle ? hidden : secureTextEntry;

  return (
    <View className="mb-3">
      <Text className="mb-1 text-sm text-slate-700">{label}</Text>
      <View className="relative">
        <TextInput
          className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10"
          placeholderTextColor="#9ca3af"
          secureTextEntry={actualSecure}
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
