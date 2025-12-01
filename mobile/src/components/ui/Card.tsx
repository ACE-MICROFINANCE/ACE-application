import React from 'react';
import { View, ViewProps } from 'react-native';

export const Card: React.FC<ViewProps> = ({ children, style, ...props }) => (
  <View
    className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    style={style}
    {...props}
  >
    {children}
  </View>
);
