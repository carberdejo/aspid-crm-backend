# ASPID CRM · Backend

API de **ASPID CRM**: gestión comercial de clientes, carteras, visitas, cotizaciones,
órdenes de compra, facturas y entregas, con acceso por empleado y por área.

NestJS 11 · TypeORM 0.3 · PostgreSQL 16 · JWT (access + refresh) · Swagger.

## Puesta en marcha

1. Levanta la base de datos con el repo `aspid-crm-database` (contenedor `postgres_db_aspid`,
   base `db_aspid`, schema `aspid`).
2. Copia `.env.template` como `.env` y completa los valores. Se validan al arrancar
   (`src/config/joi.validation.ts`): si falta alguno, la API no inicia.

   | Variable | Para qué |
   |---|---|
   | `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Conexión a Postgres |
   | `POSTGRES_DB`, `POSTGRES_SCHEMA` | `db_aspid` y `aspid` |
   | `PORT` | Puerto de la API (usamos `4000`) |
   | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Tokens |
   | `SUNAT_TOKEN` | Consulta de RUC |
   | `EXCHANGE_RATE_API_KEY` | Tipo de cambio |
   | `FRONTEND_HOST` | Origen permitido por CORS |

3. Instala dependencias, aplica las migraciones y arranca:

   ```bash
   pnpm install
   pnpm migration:run
   pnpm start:dev
   ```

4. API en `http://localhost:4000/api/v1` y Swagger en `http://localhost:4000/api/docs`.
   Con la semilla de desarrollo de `aspid-crm-database` puedes entrar como `admin@aspid.com`.

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm start:dev` | Desarrollo con recarga |
| `pnpm build` / `pnpm start:prod` | Compila a `dist/` y lo ejecuta |
| `pnpm lint` | ESLint (con `--fix`) |
| `pnpm format` | Prettier |
| `pnpm test` | Tests unitarios (`pnpm test -- visits` para filtrar) |
| `pnpm test:cov` | Tests con cobertura |
| `npx tsc --noEmit` | Verificación de tipos |

## Migraciones

El esquema de la base de datos se versiona con migraciones de TypeORM en `src/migrations`
(`synchronize` está desactivado). La primera, `Baseline`, contiene el esquema existente al
2026-10-06: en una base nueva lo crea y en una existente no hace nada. El repositorio
`aspid-crm-database` guarda la infraestructura, la foto `schema/baseline.sql` y las semillas.

Los comandos usan las variables `POSTGRES_*` del `.env`. La tabla de control es `public.migrations`.

```bash
# ver qué migraciones están aplicadas y cuáles faltan
$ pnpm migration:show

# aplicar las pendientes
$ pnpm migration:run

# revertir la última aplicada
$ pnpm migration:revert

# crear una migración vacía (el nombre describe el cambio)
$ pnpm migration:create src/migrations/AddStatusToVisit
```

**Reglas:**

- Nunca modificar una migración que ya se aplicó en algún entorno: crear una nueva.
- Usar el esquema de `process.env.POSTGRES_SCHEMA` (por defecto `aspid`), como las existentes.
- Implementar siempre `down()` para poder revertir.
- Desplegar en este orden: **primero las migraciones, luego la nueva versión de la API**
  (si la API espera una columna que aún no existe, sus consultas fallan).

## Docker

La API corre en el contenedor `aspid-backend-api`, en la red externa `red_global_aspid`
compartida con la base de datos y el frontend. Toma la configuración del `.env`; dentro de
Docker, `POSTGRES_HOST` debe ser el nombre del contenedor de la base (`postgres_db_aspid`).

```bash
docker network create red_global_aspid   # una sola vez
docker compose up -d --build

# migraciones dentro del contenedor (código compilado)
docker compose exec aspid-backend pnpm migration:run:prod
```

## Documentación

- [`AGENTS.md`](AGENTS.md): arquitectura, formato de la API, autenticación, reglas de acceso
  y de negocio, migraciones, convenciones y problemas conocidos.
- [`EXCEPTIONS_GUIDE.md`](EXCEPTIONS_GUIDE.md): códigos de error por módulo.
- [`NGINX-CONFIG.md`](NGINX-CONFIG.md): configuración de Nginx como proxy (IP real del cliente).
