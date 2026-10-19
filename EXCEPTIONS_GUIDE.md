# Guía de Custom Exceptions - Concar Backend

## Propósito de los Custom Exceptions

Los custom exceptions en este proyecto tienen como objetivos principales:

1. **Standarización de Errores**: Proporcionar una estructura consistente para todos los errores
2. **Códigos de Error Únicos**: Facilitar debugging y rastreo de errores en producción
3. **Mensajes en Español**: Consistencia en el lenguaje de negocio
4. **HTTP Status Apropiados**: Mapear errores al código HTTP correcto
5. **Arquitectura Modular**: Organizar exceptions por módulo manteniendo reutilización
6. **DRY (Don't Repeat Yourself)**: Reutilizar exceptions comunes, evitar duplicación

## Estrategia de Reutilización

Para evitar duplicación y mantener una única fuente de verdad:

### ✅ REUTILIZAR Exceptions (No crear duplicados)

Cuando otros módulos necesitan el mismo tipo de error, importan la exception desde su módulo origen:

**NOT FOUND (404) - Reutilizable:**
- `UsersNotFoundException` (code 20) - desde `users.exceptions` 
  - Usado en: auth, deliverys, quotes, visits, etc.
- `ClientNotFoundException` (code 10) - desde `clients.exceptions`
  - Usado en: quotes, visits, invoices, orders, etc.
- `DepartmentNotFoundException` (code 40) - desde `departments.exceptions`
  - Usado en: users, quotes, visits, etc.
- `ContactNotFoundException` (code 23) - desde `users.exceptions`
  - Usado en: clients, quotes, visits, etc.
- `QuoteNotFoundException` (code 50) - desde `quotes.exceptions`
  - Usado en: invoices, orders, etc.

**CONFLICT (409) - Reutilizable:**
- `UsersEmailAlreadyExistsException` (code 21)
- `ClientRucAlreadyExistsException` (code 11)
- `DepartmentAlreadyExistsException` (code 41)
- `QuoteNumberAlreadyExistsException` (code 51)
- `SegmentCodeAlreadyExistsException` (code 80)
- `PortfolioCodeAlreadyExistsException` (code 120)
- `InvoiceNumberAlreadyExistsException` (code 101)
- `PoNumberAlreadyExistsException` (code 112)

### ❌ NO CREAR Exceptions para Validaciones de Formato

**class-validator maneja automáticamente:**
```typescript
// ❌ NO hacer esto:
throw new InvalidUserEmailFormatException(email);

// ✅ HACER esto en DTO:
@IsEmail({}, { message: 'El formato del correo es inválido' })
email: string;
```

Eliminadas estas exceptions (class-validator responsable):
- `InvalidUserEmailFormatException`
- `InvalidUserCodUserFormatException` 
- `InvalidUserPasswordException`
- `InvalidRucFormatException`
- `InvalidDeliveryDateException`
- `InvalidInvoiceDateException`
- `InvalidOrderDateException`
- `InvalidVisitDateException`
- `InvalidDepartmentNameException`
- `InvalidSegmentCodeFormatException`
- `InvalidPortfolioCodeFormatException`
- `InvalidDeliveryItemsException`
- `InvalidInvoiceAmountException`
- `InvalidOrderAmountException`

### ✅ CREAR Custom Exceptions (Lógica de Negocio)

Solo para reglas específicas del negocio que class-validator no puede validar:

- **Transiciones de Estado**: `QuoteInvalidStatusTransitionException`
- **Relaciones Inválidas**: `QuoteContactNotBelongToClientException`, `VisitContactNotBelongToClientException`
- **Reglas de Negocio**: `QuoteNotApprovedException`, `DepartmentInUseException`
- **Datos Específicos**: `EmptyPortfolioUsersException`, `EmptyDeliveryItemsException`
- **Errores Externos**: `SunatApiException`, `SunatRucNotFoundAdvException`
- **Lógica Específica**: `SegmentAlreadyDeactivatedException`, `PortfolioAlreadyDeactivatedException`

---

## Rango de Códigos por Módulo

| Rango | Módulo | Qty | Exceptions |
|-------|--------|-----|------------|
| 10-19 | **Clients** | 6 | ClientNotFoundException, ClientRucAlreadyExistsException, ContactNotFoundException, SunatApiException, SunatRucNotFoundAdvException, ClientDataInvalidException |
| 20-29 | **Users** | 5 | UsersNotFoundException, UsersEmailAlreadyExistsException, UsersCodUserAlreadyExistsException, ContactNotFoundException, UserDataInvalidException |
| 30-39 | **Visits** | 3 | VisitNotFoundException, VisitContactNotBelongToClientException, VisitDataInvalidException |
| 40-49 | **Departments** | 4 | DepartmentNotFoundException, DepartmentAlreadyExistsException, DepartmentInUseException, DepartmentDataInvalidException |
| 50-59 | **Quotes** | 6 | QuoteNotFoundException, QuoteNumberAlreadyExistsException, QuoteContactNotBelongToClientException, QuoteInvalidStatusTransitionException, QuoteDataInvalidException, QuoteNotEditableException |
| 60-69 | **Analytics** | 3 | InvalidDateRangeException, NoDataAvailableForMetricsException, InvalidMetricsParametersException |
| 70-79 | **Auth** | 6 | InvalidCredentialsException, InvalidRefreshTokenException, SessionNotFoundException, SessionExpiredException, InvalidTokenHashException, UserInactiveException |
| 80-89 | **Catalogs** | 5 | SegmentCodeAlreadyExistsException, SegmentNotFoundException, SegmentAlreadyDeactivatedException, SegmentAlreadyActivatedException, SegmentDataInvalidException |
| 90-99 | **Deliverys** | 3 | DeliveryNotFoundException, EmptyDeliveryItemsException, InvalidDeliveryDataException |
| 100-109 | **Invoices** | 7 | InvoiceNotFoundException, InvoiceNumberAlreadyExistsException, InvoiceAmountExceedsOrderException, InvoiceDataInvalidException, InvoiceCreationFailedException, InvoiceAnnulledException, InvoiceCurrencyMismatchException |
| 110-119 | **Orders** | 9 | PurchaseOrderNotFoundException, QuoteNotApprovedException, PoNumberAlreadyExistsException, OrderDataInvalidException, OrderCreationFailedException, OrderAnnulledException, OrderHasActiveInvoicesException, OrderAmountBelowInvoicedException, QuoteHasActiveOrderException |
| 120-129 | **Portfolios** | 7 | PortfolioCodeAlreadyExistsException, PortfolioNotFoundException, PortfolioAlreadyDeactivatedException, PortfolioAlreadyActivatedException, EmptyPortfolioUsersException, PortfolioDataInvalidException, PortfolioUpdateFailedException |
| 130-139 | **Access** | 6 | DepartmentAccessDeniedException, ResourceOwnershipException, TargetUserNotInDepartmentException, ClientAccessDeniedException, PortfolioNotAssignedException, InvalidCollaboratorException |

**Total: 67 custom exceptions refactorizadas**

---

## Documentación por Módulo

### 1. CLIENTS (10-19)
**Archivo:** `src/clients/exceptions/client.exceptions.ts`

| Código | Nombre | HTTP | Descripción |
|--------|--------|------|-------------|
| 10 | `ClientNotFoundException` | 404 | Cliente no existe (REUTILIZABLE) |
| 11 | `ClientRucAlreadyExistsException` | 409 | RUC ya existe (REUTILIZABLE) |
| 12 | `ContactNotFoundException` | 404 | Contacto no existe (REUTILIZABLE) |
| 13 | `SunatApiException` | 503 | Error consultando SUNAT API |
| 14 | `SunatRucNotFoundAdvException` | 404 | RUC no encontrado en SUNAT |
| 15 | `ClientDataInvalidException` | 400 | Datos inválidos (lógica negocio) |

**Validaciones que maneja class-validator:**
- Email formato: `@IsEmail()`
- Nombre no vacío: `@IsNotEmpty()`
- RUC 11 dígitos: `@Matches(/^[0-9]{11}$/)`

---

### 2. USERS (20-29)
**Archivo:** `src/users/exceptions/users.exceptions.ts`

| Código | Nombre | HTTP | Descripción |
|--------|--------|------|-------------|
| 20 | `UsersNotFoundException` | 404 | Usuario no existe (REUTILIZABLE) |
| 21 | `UsersEmailAlreadyExistsException` | 409 | Email duplicado (REUTILIZABLE) |
| 22 | `UsersCodUserAlreadyExistsException` | 409 | CodUser duplicado (REUTILIZABLE) |
| 23 | `ContactNotFoundException` | 404 | Contacto no existe (REUTILIZABLE) |
| 27 | `UserDataInvalidException` | 400 | Datos inválidos (lógica negocio) |

**Validaciones que maneja class-validator:**
- Email válido: `@IsEmail()`
- Email requerido: `@IsNotEmpty()`
- CodUser alfanumérico: `@Matches(/^[a-zA-Z0-9]+$/)`
- Contraseña 6-50 chars: `@Length(6, 50)`
- Primer nombre requerido: `@IsNotEmpty()`
- Último nombre requerido: `@IsNotEmpty()`

---

### 3. VISITS (30-39)
**Archivo:** `src/visits/exceptions/visit.exceptions.ts`

| Código | Nombre | HTTP | Descripción |
|--------|--------|------|-------------|
| 30 | `VisitNotFoundException` | 404 | Visita no existe |
| 31 | `VisitContactNotBelongToClientException` | 400 | Contacto-cliente inválido |
| 32 | `VisitDataInvalidException` | 400 | Datos inválidos (lógica negocio) |

**Importa y reutiliza:**
- `UsersNotFoundException` desde users.exceptions
- `ClientNotFoundException` desde clients.exceptions
- `DepartmentNotFoundException` desde departments.exceptions
- `ContactNotFoundException` desde users.exceptions

**Validaciones que maneja class-validator:**
- Fecha ISO 8601: `@IsISO8601()`
- Propósito no vacío: `@IsNotEmpty()`
- ID usuario numérico: `@IsNumber()`
- ID cliente numérico: `@IsNumber()`

---

### 4. DEPARTMENTS (40-49)
**Archivo:** `src/departments/exceptions/department.exceptions.ts`

| Código | Nombre | HTTP | Descripción |
|--------|--------|------|-------------|
| 40 | `DepartmentNotFoundException` | 404 | Departamento no existe (REUTILIZABLE) |
| 41 | `DepartmentAlreadyExistsException` | 409 | Nombre duplicado (REUTILIZABLE) |
| 42 | `DepartmentInUseException` | 400 | No se puede eliminar (en uso) |
| 43 | `DepartmentDataInvalidException` | 400 | Datos inválidos (lógica negocio) |

**Validaciones que maneja class-validator:**
- Nombre no vacío: `@IsNotEmpty()`
- Nombre string: `@IsString()`
- Descripción string: `@IsString()`

---

### 5. QUOTES (50-59)
**Archivo:** `src/quotes/exceptions/quote.exceptions.ts`

| Código | Nombre | HTTP | Descripción |
|--------|--------|------|-------------|
| 50 | `QuoteNotFoundException` | 404 | Cotización no existe (REUTILIZABLE) |
| 51 | `QuoteNumberAlreadyExistsException` | 409 | Número duplicado (REUTILIZABLE) |
| 52 | `QuoteContactNotBelongToClientException` | 400 | Relación inválida |
| 53 | `QuoteInvalidStatusTransitionException` | 400 | Transición estado inválida |
| 54 | `QuoteDataInvalidException` | 400 | Datos inválidos (lógica negocio) |
| 55 | `QuoteNotEditableException` | 409 | Edición de cotización que no está en PENDIENTE |

**Importa y reutiliza:**
- `UsersNotFoundException` desde users.exceptions
- `ClientNotFoundException` desde clients.exceptions
- `DepartmentNotFoundException` desde departments.exceptions
- `ContactNotFoundException` desde users.exceptions

**Validaciones que maneja class-validator:**
- Número no vacío: `@IsNotEmpty()`
- Monto > 0: `@Min(0.01)`
- Monto numérico: `@IsNumber()`
- Fecha ISO 8601: `@IsISO8601()`
- Status válido: `@IsEnum(QuoteStatus)`

---

### 6. ANALYTICS (60-69)
**Archivo:** `src/analytics/exceptions/analytics.exceptions.ts`

| Código | Nombre | HTTP | Descripción |
|--------|--------|------|-------------|
| 60 | `InvalidDateRangeException` | 400 | Fecha inicio > fin |
| 61 | `NoDataAvailableForMetricsException` | 200 | Sin datos disponibles |
| 62 | `InvalidMetricsParametersException` | 400 | Parámetros inválidos |

**Importa y reutiliza:**
- `UsersNotFoundException` desde users.exceptions

**Validaciones que maneja class-validator:**
- Fecha inicio ISO 8601: `@IsISO8601()`
- Fecha fin ISO 8601: `@IsISO8601()`
- ID usuario numérico: `@IsNumber()`

---

### 7. AUTH (70-79)
**Archivo:** `src/auth/exceptions/auth.exceptions.ts`

| Código | Nombre | HTTP | Descripción |
|--------|--------|------|-------------|
| 70 | `InvalidCredentialsException` | 401 | Email/password incorrectos |
| 71 | `InvalidRefreshTokenException` | 401 | Token inválido/expirado |
| 72 | `SessionNotFoundException` | 404 | Sesión no existe |
| 73 | `SessionExpiredException` | 401 | Sesión expirada |
| 74 | `InvalidTokenHashException` | 401 | Hash no coincide |
| 75 | `UserInactiveException` | 403 | Usuario inactivo |

**Importa y reutiliza:**
- `UsersNotFoundException` desde users.exceptions
- `UsersEmailAlreadyExistsException` desde users.exceptions

**Validaciones que maneja class-validator:**
- Email válido: `@IsEmail()`
- Contraseña presente: `@IsNotEmpty()`
- Token presente: `@IsNotEmpty()`

---

### 8. CATALOGS (80-89)
**Archivo:** `src/catalogs/exceptions/catalog.exceptions.ts`

| Código | Nombre | HTTP | Descripción |
|--------|--------|------|-------------|
| 80 | `SegmentCodeAlreadyExistsException` | 409 | Código duplicado (REUTILIZABLE) |
| 81 | `SegmentNotFoundException` | 404 | Segmento no existe |
| 82 | `SegmentAlreadyDeactivatedException` | 400 | Ya desactivado |
| 83 | `SegmentAlreadyActivatedException` | 400 | Ya activo |
| 84 | `SegmentDataInvalidException` | 400 | Datos inválidos (lógica negocio) |

**Validaciones que maneja class-validator:**
- Código mayúscula/números/&: `@Matches(/^[A-Z0-9&]+$/)`
- Código max 20: `@MaxLength(20)`
- Nombre no vacío: `@IsNotEmpty()`
- Nombre max 100: `@MaxLength(100)`

---

### 9. DELIVERYS (90-99)
**Archivo:** `src/deliverys/exceptions/delivery.exceptions.ts`

| Código | Nombre | HTTP | Descripción |
|--------|--------|------|-------------|
| 90 | `DeliveryNotFoundException` | 404 | Entrega no existe |
| 91 | `EmptyDeliveryItemsException` | 400 | Sin items |
| 92 | `InvalidDeliveryDataException` | 400 | Datos inválidos (lógica negocio) |

**Importa y reutiliza:**
- `UsersNotFoundException` desde users.exceptions
- `ClientNotFoundException` desde clients.exceptions

**Validaciones que maneja class-validator:**
- Fecha ISO 8601: `@IsISO8601()`
- Items es array: `@IsArray()`
- ID usuario numérico: `@IsNumber()`
- ID cliente numérico: `@IsNumber()`
- Items mínimo: `@ArrayMinSize(1)`

---

### 10. INVOICES (100-109)
**Archivo:** `src/invoices/exceptions/invoice.exceptions.ts`

| Código | Nombre | HTTP | Descripción |
|--------|--------|------|-------------|
| 100 | `InvoiceNotFoundException` | 404 | Factura no existe |
| 101 | `InvoiceNumberAlreadyExistsException` | 409 | Número duplicado (REUTILIZABLE) |
| 102 | `InvoiceAmountExceedsOrderException` | 400 | Monto excede disponible |
| 103 | `InvoiceDataInvalidException` | 400 | Datos inválidos (lógica negocio) |
| 104 | `InvoiceCreationFailedException` | 500 | Error al crear |
| 105 | `InvoiceAnnulledException` | 409 | Editar o anular una factura ya anulada |
| 106 | `InvoiceCurrencyMismatchException` | 400 | Moneda distinta a la de la OC |

**Importa y reutiliza:**
- `QuoteNotFoundException` desde quotes.exceptions
- `ClientNotFoundException` desde clients.exceptions

**Validaciones que maneja class-validator:**
- Número no vacío: `@IsNotEmpty()`
- Monto > 0: `@Min(0.01)`
- Monto 2 decimales: `@Matches(/^\d+(\.\d{1,2})?$/)`
- Fecha ISO 8601: `@IsISO8601()`
- ID orden numérico: `@IsNumber()`

---

### 11. ORDERS (110-119)
**Archivo:** `src/orders/exceptions/order.exceptions.ts`

| Código | Nombre | HTTP | Descripción |
|--------|--------|------|-------------|
| 110 | `PurchaseOrderNotFoundException` | 404 | Orden no existe |
| 111 | `QuoteNotApprovedException` | 400 | Quote no aprobada |
| 112 | `PoNumberAlreadyExistsException` | 409 | Número duplicado (REUTILIZABLE) |
| 113 | `OrderDataInvalidException` | 400 | Datos inválidos (lógica negocio) |
| 114 | `OrderCreationFailedException` | 500 | Error al crear |
| 115 | `OrderAnnulledException` | 409 | Editar, anular o facturar una OC anulada |
| 116 | `OrderHasActiveInvoicesException` | 409 | Anular o cambiar la moneda de una OC con facturas vigentes |
| 117 | `OrderAmountBelowInvoicedException` | 400 | Monto de la OC menor a lo facturado |
| 118 | `QuoteHasActiveOrderException` | 409 | La cotización ya tiene una OC vigente |

**Importa y reutiliza:**
- `QuoteNotFoundException` desde quotes.exceptions
- `ClientNotFoundException` desde clients.exceptions

**Validaciones que maneja class-validator:**
- Número no vacío: `@IsNotEmpty()`
- Monto > 0: `@Min(0.01)`
- Monto 2 decimales: `@Matches(/^\d+(\.\d{1,2})?$/)`
- Fecha ISO 8601: `@IsISO8601()`
- ID cotización numérico: `@IsNumber()`
- Moneda válida: `@IsEnum(Currency)`

---

### 12. PORTFOLIOS (120-129)
**Archivo:** `src/portfolios/exceptions/portfolio.exceptions.ts`

| Código | Nombre | HTTP | Descripción |
|--------|--------|------|-------------|
| 120 | `PortfolioCodeAlreadyExistsException` | 409 | Código duplicado (REUTILIZABLE) |
| 121 | `PortfolioNotFoundException` | 404 | Cartera no existe |
| 122 | `PortfolioAlreadyDeactivatedException` | 400 | Ya desactivada |
| 123 | `PortfolioAlreadyActivatedException` | 400 | Ya activa |
| 124 | `EmptyPortfolioUsersException` | 400 | Sin usuarios |
| 125 | `PortfolioDataInvalidException` | 400 | Datos inválidos (lógica negocio) |
| 126 | `PortfolioUpdateFailedException` | 500 | Error al actualizar |

**Importa y reutiliza:**
- `UsersNotFoundException` desde users.exceptions

**Validaciones que maneja class-validator:**
- Código formato C#####: `@Matches(/^C[0-9]+$/)`
- Código max 20: `@MaxLength(20)`
- Tipo no vacío: `@IsNotEmpty()`
- Tipo max 50: `@MaxLength(50)`
- Provincia max 100: `@MaxLength(100)`
- Zona max 50: `@MaxLength(50)`
- Usuarios es array: `@IsArray()`
- Usuarios mínimo: `@ArrayMinSize(1)`

### 13. ACCESS (130-139)
**Archivo:** `src/common/access/access.exceptions.ts`

| Código | Nombre | HTTP | Descripción |
|--------|--------|------|-------------|
| 130 | `DepartmentAccessDeniedException` | 403 | El usuario no pertenece al área (REUTILIZABLE) |
| 131 | `ResourceOwnershipException` | 403 | El registro no pertenece al usuario (REUTILIZABLE) |
| 132 | `TargetUserNotInDepartmentException` | 400 | El admin registra a nombre de un usuario inactivo o fuera del área |
| 133 | `ClientAccessDeniedException` | 403 | El cliente no está en las carteras del usuario ni tiene una excepción de acceso activa |
| 134 | `PortfolioNotAssignedException` | 403 | El usuario no está asignado a la cartera |
| 135 | `InvalidCollaboratorException` | 400 | El colaborador de la cotización no está activo, no pertenece al área o es el mismo responsable |

**Las lanza:** `AccessScopeService` (130-132 y 135, `src/common/access/access-scope.service.ts`), compartido por visits, quotes, orders, invoices y deliverys; y `ClientAccessService` (133-134, `src/common/access/client-access.service.ts`), compartido por clients, portfolios, visits, quotes y deliverys.

---

## Patrones de Uso

### En Services

```typescript
import { ClientNotFoundException } from './exceptions/client.exceptions';
import { UsersNotFoundException } from '../users/exceptions/users.exceptions';

export class ClientsService {
  async findOne(id: number) {
    try {
      this.logger.log('Fetching client...');
      const client = await this.clientRepository.findOne({ where: { id } });
      
      if (!client) {
        // Lanzar exception específica del módulo
        throw new ClientNotFoundException(id);
      }
      
      this.logger.log(`Client ${id} fetched successfully`);
      return { message: 'Cliente encontrado', data: client };
    } catch (error) {
      // Re-lanzar si ya es ApiException
      if (error instanceof ApiException) throw error;
      
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error: ${errorMessage}`);
      throw new ApiException(500, 'Error procesando solicitud', [errorMessage], HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async addContactToClient(clientId: number, contactId: number) {
    try {
      // Reutilizar exception de otro módulo
      const client = await this.clientRepository.findOne({ where: { id: clientId } });
      if (!client) {
        throw new ClientNotFoundException(clientId);
      }

      // Importar de su módulo origen
      const contact = await this.contactRepository.findOne({ where: { id: contactId } });
      if (!contact) {
        throw new ContactNotFoundException(contactId);
      }

      return { message: 'Contacto agregado exitosamente', data: contact };
    } catch (error) {
      if (error instanceof ApiException) throw error;
      
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error: ${errorMessage}`);
      throw new ApiException(500, 'Error procesando solicitud', [errorMessage], HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
```

### En Controllers

```typescript
@Controller('clients')
export class ClientsController {
  @Get(':id')
  @Auth(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Obtener cliente por ID' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    // Los erroresmanejar automáticamente:
    // - ValidationError (class-validator) → BAD_REQUEST (400)
    // - ClientNotFoundException → NOT_FOUND (404)
    // - ApiException → Código y status configurado
    return await this.clientsService.findOne(id);
  }
}
```

### En DTOs

```typescript
import { IsEmail, IsNotEmpty, Matches, Length } from 'class-validator';

export class CreateClientDto {
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString()
  name: string;

  // ✅ class-validator valida formato RUC
  // No necesita exception custom
  @IsNotEmpty({ message: 'El RUC es requerido' })
  @Matches(/^[0-9]{11}$/, { message: 'El RUC debe contener exactamente 11 dígitos' })
  ruc: string;

  // ✅ class-validator valida email
  // No necesita exception custom
  @IsEmail({}, { message: 'El email debe ser válido' })
  email: string;

  // ✅ class-validator valida longitud
  // No necesita exception custom
  @IsNotEmpty()
  @Length(6, 50, { message: 'La contraseña debe tener entre 6 y 50 caracteres' })
  password: string;
}
```

---

## Resumen de Cambios Realizados

### Creadas (Nuevas Carpetas):
- ✅ `src/analytics/exceptions/` - 3 exceptions
- ✅ `src/auth/exceptions/` - 6 exceptions
- ✅ `src/catalogs/exceptions/` - 5 exceptions
- ✅ `src/deliverys/exceptions/` - 3 exceptions
- ✅ `src/invoices/exceptions/` - 5 exceptions
- ✅ `src/orders/exceptions/` - 5 exceptions
- ✅ `src/portfolios/exceptions/` - 7 exceptions

### Refactorizadas (Eliminadas Duplicadas):
- ✅ `src/clients/exceptions/` - Eliminadas 2 (InvalidRucFormatException)
- ✅ `src/users/exceptions/` - Eliminadas 5 (formato/validación)
- ✅ `src/visits/exceptions/` - Eliminadas 6 (NOT_FOUND duplicadas)
- ✅ `src/departments/exceptions/` - Eliminadas 1 (formato)
- ✅ `src/quotes/exceptions/` - Eliminadas 6 (NOT_FOUND duplicadas)
- ✅ `src/auth/exceptions/` - Eliminadas 2 (validaciones)
- ✅ `src/catalogs/exceptions/` - Eliminadas 2 (formato)
- ✅ `src/invoices/exceptions/` - Eliminadas 4 (validaciones)
- ✅ `src/orders/exceptions/` - Eliminadas 4 (validaciones)
- ✅ `src/portfolios/exceptions/` - Eliminadas 3 (formato)

### Resultados:
- **Antes**: 92 exceptions (con mucha duplicación)
- **Después**: 57 exceptions (optimizadas)
- **Eliminadas**: 35 exceptions redundantes
- **Reutilización**: 16 exceptions compartidas entre módulos

---

## Beneficios de Esta Arquitectura

1. **DRY (Don't Repeat Yourself)**: Una única fuente de verdad por tipo de error
2. **Mantenibilidad**: Cambios en un lugar afectan a todos los módulos que reutilizan
3. **Consistencia**: Todos los módulos usan los mismos exceptions para casos similares
4. **Reducción de Código**: 35 menos exceptions que mantener
5. **Escalabilidad**: Fácil agregar nuevos exceptions sin duplicar
6. **Debugging**: Códigos numéricos únicos para rastreo en logs
7. **Performance**: Menos codigo compilado
8. **Claridad**: Separación clara entre validación (class-validator) y lógica (custom exceptions)

---

## Próximos Pasos Recomendados

1. **Integración Inmediata**: Usar estos exceptions en todos los services
2. **Importaciones Correctas**: Importar exceptions desde su módulo origen (no duplicar)
3. **DTOs Completos**: Aprovechar class-validator al máximo para validaciones
4. **Swagger**: Documentar códigos de error en respuestas
5. **Error Monitoring**: Usar códigos numéricos para alertas en producción
6. **Testing**: Validar que cada exception se lanza en el escenario correcto
7. **Documentación**: Actualizar README.md con esta guía

---

## Importación de Exceptions (Ejemplo de Reutilización)

```typescript
// ❌ NO HACER - En deliverys.exceptions.ts
export class UserNotFoundDeliveryException extends ApiException { }

// ✅ HACER - En deliverys.service.ts
import { UsersNotFoundException } from '../users/exceptions/users.exceptions';

// Uso en service
if (!user) {
  throw new UsersNotFoundException(userId);
}
```

```typescript
// ❌ NO HACER - En quotes.exceptions.ts
export class QuoteClientNotFoundException extends ApiException { }
export class QuoteUserNotFoundException extends ApiException { }
export class QuoteContactNotFoundException extends ApiException { }
export class QuoteDepartmentNotFoundException extends ApiException { }

// ✅ HACER - En quotes.service.ts
import { ClientNotFoundException } from '../clients/exceptions/client.exceptions';
import { UsersNotFoundException } from '../users/exceptions/users.exceptions';
import { DepartmentNotFoundException } from '../departments/exceptions/department.exceptions';
import { ContactNotFoundException } from '../users/exceptions/users.exceptions';

// Uso en service
if (!client) throw new ClientNotFoundException(clientId);
if (!user) throw new UsersNotFoundException(userId);
if (!department) throw new DepartmentNotFoundException(deptId);
if (!contact) throw new ContactNotFoundException(contactId);
```

---

## Matriz de Reutilización

| Exception | Código | Módulo Origen | Reutilizada en |
|-----------|--------|---------------|-----------------|
| UsersNotFoundException | 20 | users | auth, analytics, deliverys, quotes, visits, portfolios |
| ClientNotFoundException | 10 | clients | deliverys, quotes, visits, invoices, orders |
| DepartmentNotFoundException | 40 | departments | users, quotes, visits |
| ContactNotFoundException | 23 | users | clients, quotes, visits |
| QuoteNotFoundException | 50 | quotes | invoices, orders |
| UsersEmailAlreadyExistsException | 21 | users | auth |
| ClientRucAlreadyExistsException | 11 | clients | (verificación en create) |
| DepartmentAlreadyExistsException | 41 | departments | (verificación en create) |

---

**Total de Exceptions: 57** | **Reutilizadas: 16** | **Específicas del módulo: 41**
