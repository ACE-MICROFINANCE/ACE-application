import * as Joi from 'joi';

export const ConfigValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  ADMIN_API_KEY: Joi.string().required(),
  MAIL_HOST: Joi.string().required(),
  MAIL_PORT: Joi.number().required(),
  MAIL_SECURE: Joi.boolean().default(false),
  MAIL_USER: Joi.string().required(),
  MAIL_PASS: Joi.string().required(),
  MAIL_FROM: Joi.string().email().required(),
  MAIL_TO: Joi.string().email().required(),
  WEATHER_API_KEY: Joi.string().required(),
  WEATHER_API_BASE_URL: Joi.string().required(),
  PAYMENT_BANK_BIN: Joi.string().required(),
  PAYMENT_BANK_ACCOUNT_NO: Joi.string().required(),
  PAYMENT_BANK_ACCOUNT_NAME: Joi.string().required(),
});
