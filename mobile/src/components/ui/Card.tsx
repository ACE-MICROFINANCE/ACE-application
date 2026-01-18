import React from 'react';
import { View, ViewProps } from 'react-native';

export const Card: React.FC<ViewProps> = ({ children, style, ...props }) => (
  <View
    className="w-full rounded-2xl border border-black/5 bg-white p-5 shadow-md"
    style={style}
    {...props}
  >
    {children}
  </View>
);
