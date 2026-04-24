import {} from '@nestjs/config';

//? el config sirve para centralizar la configuracion de la aplicacion, como las variables de entorno, y para validar que estas variables sean correctas antes de iniciar la aplicacion. Esto ayuda a evitar errores de configuracion y a mantener el codigo limpio y organizado.
export const databaseConfig = () => ({
  nodeEnv: process.env.NODE_ENV || 'development',

  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    username: process.env.POSTGRES_USER || 'user',
    password: process.env.POSTGRES_PASSWORD || 'password',
    database: process.env.POSTGRES_DB || 'mydb',
    schema: process.env.POSTGRES_SCHEMA || 'public',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default_jwt_secret',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || 'default_jwt_refresh_secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  sunat: {
    token: process.env.SUNAT_TOKEN || 'default_sunat_token',
  },
  frontend: {
    host: process.env.FRONTEND_HOST || 'http://localhost:3000',
  },
});
