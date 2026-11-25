import * as Joi from 'joi';

export const ValidationSchema = Joi.object({
  // Application Configurations
  PORT: Joi.number().default(5000).description('HTTP server port'),
  // POSTGRESQL Configurations
  POSTGRES_PORT: Joi.number().required().description('HTTP server port'),
  POSTGRES_HOST: Joi.string().required().description('Database host'),
  POSTGRES_USER: Joi.string().required().description('Database username'),
  POSTGRES_PASSWORD: Joi.string().required().description('Database password'),
  POSTGRES_DB: Joi.string().required().description('Database name'),
  POSTGRES_SCHEMA: Joi.string().required().description('Database schema'),

  // Node Environment
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .description('Node environment'),

  JWT_SECRET: Joi.string().required().description('Secret key for JWT signing'),
  JWT_REFRESH_SECRET: Joi.string()
    .required()
    .description('Secret key for refresh token signing'),
  JWT_ACCESS_EXPIRES_IN: Joi.string()
    .required()
    .description('Expiration time for access tokens (e.g., 15m, 1h)'),
  JWT_REFRESH_EXPIRES_IN: Joi.string()
    .required()
    .description('Expiration time for refresh tokens (e.g., 7d)'),

  // Amazon Cognito (valores: terraform output en aspid-crm-infra/envs/<entorno>)
  COGNITO_REGION: Joi.string()
    .default('us-east-1')
    .description('Región del user pool de Cognito'),
  COGNITO_USER_POOL_ID: Joi.string()
    .pattern(/^[\w-]+_[0-9a-zA-Z]+$/)
    .required()
    .description('ID del user pool (ej. us-east-1_xxxxxxx)'),
  COGNITO_CLIENT_ID: Joi.string()
    .required()
    .description('ID del app client confidencial del backend'),
  COGNITO_CLIENT_SECRET: Joi.string()
    .required()
    .description('Secret del app client (para calcular SECRET_HASH)'),

  // Credenciales del usuario IAM del backend. Opcionales: el SDK de AWS las lee
  // del entorno; en un servidor con rol IAM no hacen falta.
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),

  // SUNAT API Token
  SUNAT_TOKEN: Joi.string()
    .required()
    .description('Token de acceso para la API de SUNAT'),

  // Exchange Rate API Key
  EXCHANGE_RATE_API_KEY: Joi.string()
    .required()
    .description('API Key para acceder a ExchangeRate-API'),

  // Frontend Host
  FRONTEND_HOST: Joi.string()
    .uri()
    .required()
    .description('URL del frontend para configurar CORS'),
});
