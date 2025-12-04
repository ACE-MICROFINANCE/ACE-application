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
});
