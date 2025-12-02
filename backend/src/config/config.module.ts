import * as Joi from 'joi';

export const ConfigValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  ADMIN_API_KEY: Joi.string().required(),
  WEATHER_API_KEY: Joi.string().required(),
  WEATHER_API_BASE_URL: Joi.string().required(),
});
