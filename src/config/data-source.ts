import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';

// DataSource exclusivo del CLI de migraciones (pnpm migration:*).
// En desarrollo las variables vienen del .env; en producción las inyecta el contenedor
// (loadEnvFile no sobrescribe variables que ya existen).
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) process.loadEnvFile(envPath);

// Con ts-node se cargan los .ts de src; compilado, los .js de dist (evitando los .d.ts)
const migrationsExtension = __filename.endsWith('.ts') ? 'ts' : 'js';

export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  // La tabla de control queda en el esquema public: debe existir antes de que la
  // migración Baseline cree el esquema de la aplicación en una base nueva.
  migrationsTableName: 'migrations',
  migrations: [join(__dirname, '..', 'migrations', `*.${migrationsExtension}`)],
});
