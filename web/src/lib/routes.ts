export const routes = {
  login: '/login',
  forgotPassword: '/forgot-password',
  changePassword: '/change-password',
  dashboard: '/dashboard',
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];
