import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export type RootNavigationParams = {
  MainTabs?: { screen?: string; params?: Record<string, unknown> };
  ForceChangePassword?: undefined;
};
