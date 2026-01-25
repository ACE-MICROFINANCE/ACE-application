export default () => ({
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  admin: {
    apiKey: process.env.ADMIN_API_KEY,
  },
  weather: {
    apiKey: process.env.WEATHER_API_KEY,
    baseUrl: process.env.WEATHER_API_BASE_URL,
  },
  mail: {
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT ? Number(process.env.MAIL_PORT) : undefined,
    secure: process.env.MAIL_SECURE === 'true',
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    from: process.env.MAIL_FROM,
    to: process.env.MAIL_TO,
  },
  payment: {
    bankBin: process.env.PAYMENT_BANK_BIN,
    accountNumber: process.env.PAYMENT_BANK_ACCOUNT_NO,
    accountName: process.env.PAYMENT_BANK_ACCOUNT_NAME,
  },
  defaults: {
    customerPassword: process.env.DEFAULT_CUSTOMER_PASSWORD || '123456', // CHANGED: default stub password
  },
  security: {
    tempPasswordEncKey: process.env.TEMP_PASSWORD_ENC_KEY, // CHANGED: AES-GCM key for temp password
  },
  notifications: {
    pushMode: process.env.PUSH_MODE || 'stub', // stub|fcm
    enableRealtime: process.env.ENABLE_REALTIME === 'true',
    enableScheduleReminder: process.env.ENABLE_SCHEDULE_REMINDER === 'true',
    scheduleReminderDays: process.env.SCHEDULE_REMINDER_DAYS
      ? Number(process.env.SCHEDULE_REMINDER_DAYS)
      : 7,
    scheduleReminderHour: process.env.SCHEDULE_REMINDER_HOUR
      ? Number(process.env.SCHEDULE_REMINDER_HOUR)
      : 8,
    enableLoanReminder: process.env.ENABLE_LOAN_REMINDER === 'true',
    loanReminderDays: process.env.LOAN_REMINDER_DAYS ? Number(process.env.LOAN_REMINDER_DAYS) : 7,
    loanReminderHour: process.env.LOAN_REMINDER_HOUR ? Number(process.env.LOAN_REMINDER_HOUR) : 8,
  },
  contacts: {
    byBranchJson: process.env.CONTACTS_BY_BRANCH_JSON || '',
  },
});
