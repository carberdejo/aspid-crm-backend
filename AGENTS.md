# AGENTS.md - ASPID CRM Backend

Guía para agentes de IA (y personas) que trabajan en el backend de **ASPID CRM**.
Es la fuente única de contexto: `CLAUDE.md` la importa.

El sistema tiene tres repos hermanos: `aspid-crm-backend` (este), `aspid-crm-frontend`
(Next.js) y `aspid-crm-database` (infraestructura de PostgreSQL, foto del esquema y semillas).
**Las reglas de negocio y de acceso viven aquí**; el frontend solo las refleja.

## Stack

- **NestJS 11** (TypeScript), **TypeORM 0.3**, **PostgreSQL 16** (base `db_aspid`, schema `aspid`)
- Passport JWT (access + refresh con sesiones en BD), class-validator, Swagger, Joi para validar el `.env`
- `@nestjs/schedule` y `@nestjs/cache-manager` (tipo de cambio)
- Gestor de paquetes: **pnpm** (`pnpm-lock.yaml`)
- Mensajes de error y comentarios en **español**; nombres de código en inglés

## Comandos

```bash
pnpm start:dev           # Desarrollo (watch)
pnpm build               # Compilar a dist/
npx tsc --noEmit         # Verificación de tipos
pnpm lint                # ESLint (con --fix)
pnpm test                # Tests unitarios (Jest)
pnpm test -- visits      # Solo los specs que coinciden con el patrón
pnpm migration:show      # Migraciones aplicadas y pendientes
pnpm migration:run       # Aplicar pendientes
pnpm migration:revert    # Revertir la última
```

Antes de dar un cambio por terminado: `npx tsc --noEmit`, los tests de los módulos tocados
y lint sin errores nuevos. Hay fallos previos conocidos (ver "Problemas conocidos"): no los
confundas con regresiones.

## Configuración

- Variables en `.env` (plantilla en `.env.template`), validadas con Joi en `src/config/joi.validation.ts`: `POSTGRES_*`, `JWT_*`, `COGNITO_*` y `AWS_*` (salen de `terraform output` en `aspid-crm-infra`), `SUNAT_TOKEN`, `EXCHANGE_RATE_API_KEY`, `FRONTEND_HOST` (CORS).
- Puerto: **4000** en el `.env` (si falta `PORT`, el código cae en 5000).
- API en `http://localhost:4000/api/v1`; Swagger en `/api/docs`.
- `synchronize: false`: **el esquema solo cambia con migraciones**.

## Estructura

```
src/
  main.ts              Prefijo api/v1, ValidationPipe, filtro de errores, interceptor de respuesta, Swagger, CORS
  config/              configuration.ts, joi.validation.ts, data-source.ts (solo para el CLI de migraciones)
  migrations/          Migraciones TypeORM (la primera, Baseline, es el esquema al 2026-10-06)
  common/
    access/            AccessScopeService, ClientAccessService y sus excepciones (130-139)
    exceptions/        ApiException
    filters/           HttpExceptionFilter (formato de error)
    interceptor/       TransformResponseInterceptor (formato de éxito)
    helpers/           unique-violation, duration, ip
    dto/               PaginationDto (limit, offset, startDate, endDate, order)
  auth/                Login, refresh, logout, guards globales, decoradores
  users/ departments/ clients/ portfolios/ catalogs/
  visits/ quotes/ orders/ invoices/ deliverys/ analytics/
```

Cada módulo sigue `dto/`, `entities/`, `exceptions/`, `interfaces/`, `*.controller.ts`,
`*.service.ts`, `*.module.ts` y specs junto al código.

## Formato de la API

- **Éxito**: el interceptor envuelve todo en `{ code: 1, message, data }`. Un servicio puede devolver `{ message, data, total? }` o el objeto directamente.
- **Error**: `{ code, message, errors? }`, donde `code` es el código de negocio de la excepción.
- `ValidationPipe` con `whitelist` y `forbidNonWhitelisted`: un campo no declarado en el DTO devuelve 400.
- Los `bigint` llegan de Postgres como **string**: normaliza con `Number()` al comparar ids.

## Autenticación

- `JwtAuthGuard` y `UserRoleGuard` están registrados como **`APP_GUARD`**: todo endpoint exige JWT por defecto.
  - `@Public()` abre un endpoint (login, refresh).
  - `@Auth(Role.ADMIN)` restringe por rol y documenta Swagger; sin roles, basta con estar autenticado.
  - `@CurrentUser()` entrega la entidad `User` con `userDepartments.department`.
- El access token lleva `{ sub, codUser, email, role, depts }`, pero `JwtStrategy` **recarga el usuario y sus áreas desde la BD** en cada request: las reglas de alcance usan siempre la BD, no el token. Un usuario inactivo recibe 401.
- El refresh token se guarda hasheado en `user_session`.

## Reglas de acceso (`src/common/access/`)

**`AccessScopeService`** (actividades con dueño y área: visitas, cotizaciones, entregas, OC y facturas vía su cotización):

| Método | Uso |
|---|---|
| `resolveOwner(user, deptId, userId?)` | Al crear: un user registra siempre a su nombre y en sus áreas; el admin puede indicar otro usuario activo del área |
| `resolveOwnerOnUpdate(user, resource, changes)` | Al editar, si cambia el dueño o el área (después de `assertCanModify`) |
| `applyScope(qb, alias, user, opts)` | En listados: admin sin filtro; user = (dueño OR lectores) AND área ∈ sus áreas. `readerFields: ['collaboratorId']` para cotizaciones |
| `assertCanRead(resource, user, label, readers?)` | Detalle: admin, dueño o lector, dentro de sus áreas |
| `assertCanModify(resource, user, label)` | Editar, eliminar o anular: solo admin o dueño |
| `assertValidCollaborator(...)` | Colaborador activo, del área y distinto del dueño |
| `findDepartmentMembers(user, deptId)` | Usuarios activos de un área para selectores |

**`ClientAccessService`**: un user accede a los clientes de sus carteras (`portfolio_users`) y a los
que tenga con excepción activa (`user_client_exception`); el admin, a todos.

Todo servicio nuevo de una actividad debe pasar por estas validaciones: **no** filtres por
usuario a mano.

## Reglas de negocio importantes

- **Eliminado lógico** en visitas y entregas: `deleted_at` (`@DeleteDateColumn`) + `deleted_by`. Las consultas de TypeORM los excluyen solas; en SQL crudo filtra `deleted_at IS NULL`.
- **OC y facturas no se borran: se anulan** (`status` `VIGENTE` → `ANULADA` con `annulled_at`, `annulled_by`, `annul_reason`). Los totales solo cuentan documentos vigentes.
  - Una cotización tiene como máximo **una OC vigente** (`uk_po_active_quote`); al anular la OC, la cotización vuelve a `PENDIENTE`.
  - El número de OC se puede reusar si la anterior está anulada (`uk_po_number_active`); el número de factura queda reservado siempre.
  - Una OC con facturas vigentes no se anula; su monto no puede bajar de lo ya facturado.
- **Concurrencia en facturación**: todo lo que cambia lo facturado de una OC usa `lockOrderWithQuote` (`SELECT ... FOR UPDATE`, `orders/order-billing.helpers.ts`) dentro de una transacción; el estado de facturación se recalcula con `computeBillingStatus` (en céntimos, `orders/billing-status.util.ts`).
- **Carreras con índices únicos**: captura el error `23505` con `uniqueViolationConstraint(error)` y tradúcelo a la excepción de negocio según el nombre del índice.
- **Cotizaciones**: solo se editan o rechazan en `PENDIENTE`; las transiciones de estado se validan en el servicio.

## Migraciones

- Viven en `src/migrations/`; la tabla de control es `public.migrations`.
- El schema **nunca va escrito a mano**: en migraciones usa `const s = process.env.POSTGRES_SCHEMA || 'aspid'`, y en entidades no pongas `schema:` (lo da `POSTGRES_SCHEMA` en la conexión).
- Cada migración lleva un comentario que explique el porqué y su `down()` completo.
- Tras cambiar una entidad, crea la migración (`pnpm migration:create src/migrations/NombreDelCambio`) y escribe el SQL; no hay `synchronize`.
- La foto `schema/baseline.sql` del repo `aspid-crm-database` no se toca: el historial está en las migraciones.

## Errores

- Toda regla de negocio lanza una subclase de `ApiException(code, message, errors?, httpStatus)` definida en `<módulo>/exceptions/`.
- Cada módulo tiene su rango de códigos (clients 10-19, users 20-29, visits 30-39, departments 40-49, quotes 50-59, analytics 60-69, auth 70-79, catalogs 80-89, deliverys 90-99, invoices 100-109, orders 110-119, portfolios 120-129, access 130-139). Detalle completo en `EXCEPTIONS_GUIDE.md`.
- Reutiliza las excepciones existentes (p. ej. `ClientNotFoundException`) en vez de duplicarlas.
- Las validaciones de formato van en el DTO con class-validator (mensajes en español), no en excepciones.

## Convenciones

- Propiedades de entidad en camelCase y columnas en snake_case con `name` explícito: `@Column({ name: 'cod_user' }) codUser`.
- Sin `eager: true`: carga relaciones con QueryBuilder (`leftJoinAndSelect`) o `relations`.
- Rutas específicas antes que genéricas en el controlador (`/sunat/:ruc` antes de `/:ruc`).
- Ids de ruta con `ParseIntPipe`; Swagger con `@ApiOperation` y `@ApiResponse`.
- Logger de Nest (`new Logger(Service.name)`), no `console.log`.
- Prettier: comillas simples, comas finales, 2 espacios. Imports internos con el alias `src/`.

## Tests

- Jest con specs junto al código, patrón **AAA** (Arrange, Act, Assert).
- Mockea todas las dependencias del constructor; repositorios con `getRepositoryToken(Entity)`; `jest.clearAllMocks()` en `afterEach`.
- Simula los ids `bigint` como string, igual que Postgres (ver `access-scope.service.spec.ts`).
- Prueba reglas de negocio, errores y casos borde; no getters triviales ni librerías externas.

## Problemas conocidos

- Hay suites de tests que ya fallaban antes de los últimos cambios (entre ellas 2 tests de DTO de usuarios) y un error de lint en `common/exchange-rate.service.ts`.
- El decorador `get-refresh-token.decorator.ts` imprime el refresh token en consola, y quedan algunos `console.log` sueltos.
- El login revela si falló el correo o la contraseña, y valida la contraseña antes de mirar si el usuario está activo.
- `bcrypt` se usa en su versión síncrona.
- Los datos de analytics del frontend son simulados; los reportes reales están pendientes.
- `.gitlab-ci.yml` todavía usa los nombres de imagen antiguos.
